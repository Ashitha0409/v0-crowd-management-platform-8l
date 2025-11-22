from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from twilio.rest import Client
from flasgger import Swagger, swag_from
import os
from werkzeug.utils import secure_filename
from datetime import datetime
import heapq
import json
import time
import re
import random
import uuid
from dotenv import load_dotenv
import threading
import cv2
import PIL.Image

load_dotenv() # Load .env if present

# Global storage for analysis results
ZONE_ANALYSIS = {}
MESSAGES = []

# Persistent anomaly storage - never cleared, accumulates all anomalies
PERSISTENT_ANOMALIES = []  # List of all anomalies detected across all zones

# Historical data for real-time graphs (stores last 20 data points per zone)
ZONE_HISTORY = {
    'food_court': [],
    'parking': [],
    'main_stage': [],
    'testing': []
}

# Video processing state
ACTIVE_VIDEO_PROCESSORS = {}  # {zone_id: {'thread': thread_obj, 'stop_flag': bool, 'video_path': str}}
VIDEO_PROCESSING_LOCK = threading.Lock()

# Lost and Found storage
LOST_PERSONS = []
FOUND_MATCHES = []

# Gemini API Key Management
GEMINI_KEYS = [
    "AIzaSyBdtYLpUucxwys-2KIHELwKT6OQPb7VWL0", # Primary key provided by user
]
CURRENT_KEY_INDEX = 0

def get_gemini_key():
    """
    Get the next available Gemini API key from the pool.
    Rotates through keys to distribute load.
    """
    global CURRENT_KEY_INDEX, GEMINI_KEYS
    
    # Try to load more keys from env or file if not already loaded
    if len(GEMINI_KEYS) == 1:
        env_key = os.getenv("GEMINI_API_KEY")
        if env_key and env_key not in GEMINI_KEYS:
            GEMINI_KEYS.append(env_key)
            
        key_files = ["gemini_key.txt", "../gemini_key.txt", "backend/gemini_key.txt"]
        for kf in key_files:
            if os.path.exists(kf):
                try:
                    with open(kf, "r") as f:
                        file_key = f.read().strip()
                    if file_key and "PASTE" not in file_key and file_key not in GEMINI_KEYS:
                        GEMINI_KEYS.append(file_key)
                except:
                    pass
    
    # Round-robin selection
    key = GEMINI_KEYS[CURRENT_KEY_INDEX]
    CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX + 1) % len(GEMINI_KEYS)
    return key

# Predefined camera endpoints for specific zones
CAMERA_ENDPOINTS = {
    'food_court': {
        'id': 'food_court',
        'name': 'Food Court Region',
        'description': 'Monitor crowd density and activity in food court area',
        'upload_endpoint': '/api/cameras/food-court/upload'
    },
    'parking': {
        'id': 'parking',
        'name': 'Parking Area Region',
        'description': 'Monitor vehicle and pedestrian traffic in parking zones',
        'upload_endpoint': '/api/cameras/parking/upload'
    },
    'main_stage': {
        'id': 'main_stage',
        'name': 'Main Stage Region',
        'description': 'Monitor main stage crowd density and performer safety',
        'upload_endpoint': '/api/cameras/main-stage/upload'
    },
    'testing': {
        'id': 'testing',
        'name': 'Testing Region',
        'description': 'Testing and calibration zone for new camera feeds',
        'upload_endpoint': '/api/cameras/testing/upload'
    }
}

app = Flask(__name__)
CORS(app)

# Swagger UI Configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/docs"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "CrowdGuard API",
        "description": "Crowd Management Platform API - Upload videos, detect anomalies, and manage responders",
        "version": "1.0.0"
    },
    "host": "localhost:5000",
    "basePath": "/",
    "schemes": ["http"],
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Go up one level if we are in backend dir
if os.path.basename(BASE_DIR) == 'backend':
    BASE_DIR = os.path.dirname(BASE_DIR)

UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '+15005550006')

try:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
except Exception as e:
    print(f"Warning: Twilio client failed to initialize: {e}")
    twilio_client = None

# Mock Data
RESPONDERS = [
    {"id": 1, "name": "Dr. Sarah Johnson", "type": "Medical", "status": "active", "zone": "Food Court", "incidents": 2, "phone": "+917337743545"},
    {"id": 2, "name": "Officer Mike Chen", "type": "Security", "status": "investigating", "zone": "Parking", "incidents": 1, "phone": "+917337743545"},
    {"id": 3, "name": "Captain Lisa Wong", "type": "Fire", "status": "available", "zone": "Backstage", "incidents": 0, "phone": "+917337743545"},
    {"id": 4, "name": "Tech Lead Alex Kim", "type": "Technical", "status": "active", "zone": "Control Room", "incidents": 1, "phone": "+917337743545"},
]

EVENTS = [
    {
        "id": "evt_default",
        "name": "Summer Music Festival 2025",
        "location": {"lat": 12.9716, "lng": 77.5946}
    }
]

# --- Venue Graph for Pathfinding ---
# Extended graph with more waypoints for longer routes
VENUE_GRAPH = {
    "Entrance": {"Security Gate": 3, "Parking": 2},
    "Security Gate": {"Entrance": 3, "Main Stage": 4, "Food Court": 2},
    "Main Stage": {"Security Gate": 4, "Medical Bay": 3, "VIP Area": 2},
    "Food Court": {"Security Gate": 2, "Medical Bay": 2, "Parking": 4},
    "Parking": {"Entrance": 2, "Food Court": 4},
    "Medical Bay": {"Main Stage": 3, "Food Court": 2, "Backstage": 3},
    "Backstage": {"Medical Bay": 3, "VIP Area": 2, "Control Room": 2},
    "VIP Area": {"Main Stage": 2, "Backstage": 2},
    "Control Room": {"Backstage": 2}
}

# Real-world coordinates spread across ~3km area in Bangalore
VENUE_COORDINATES = {
    "Entrance": [12.9716, 77.5946],        # Starting point
    "Security Gate": [12.9750, 77.5970],   # ~500m northeast
    "Main Stage": [12.9850, 77.6050],      # ~1.5 km northeast
    "Food Court": [12.9780, 77.5980],      # ~800m northeast (avoid zone)
    "Parking": [12.9650, 77.5900],         # ~1 km southwest
    "Medical Bay": [12.9800, 77.6000],     # ~1 km northeast
    "Backstage": [12.9920, 77.6100],       # ~2.5 km northeast
    "VIP Area": [12.9880, 77.6070],        # ~2 km northeast
    "Control Room": [12.9950, 77.6120],    # ~3 km northeast
}

# --- Helper Functions ---
def send_sms_alert(to_number, message):
    try:
        if twilio_client:
            print(f"Sending SMS to {to_number}: {message}")
            # message = twilio_client.messages.create(
            #     body=message,
            #     from_=TWILIO_PHONE_NUMBER,
            #     to=to_number
            # )
            return True
    except Exception as e:
        print(f"Failed to send SMS: {str(e)}") 
        return False
    return False

def calculate_shortest_path(start, end, avoid_zones=[]):
    # Dijkstra's Algorithm
    queue = [(0, start, [])]
    visited = set()
    
    while queue:
        (cost, node, path) = heapq.heappop(queue)
        
        if node in visited:
            continue
        
        visited.add(node)
        path = path + [node]
        
        if node == end:
            return path
        
        if node in VENUE_GRAPH:
            for neighbor, weight in VENUE_GRAPH[node].items():
                if neighbor not in visited:
                    # Increase weight if neighbor is in avoid_zones (simulate crowd density)
                    current_weight = weight
                    if neighbor in avoid_zones:
                        current_weight *= 5 # High penalty for crowded zones
                    
                    heapq.heappush(queue, (cost + current_weight, neighbor, path))
                    
    return None

# --- API Endpoints ---

@app.route('/api')
def api_portal():
    return app.send_static_file('../api_portal.html') if os.path.exists('api_portal.html') else open('api_portal.html').read()

@app.route('/api/responders', methods=['GET'])
def get_responders():
    """
    Get list of all active responders
    ---
    tags:
      - Responder Management
    responses:
      200:
        description: List of responders retrieved successfully
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              name:
                type: string
              type:
                type: string
              status:
                type: string
              zone:
                type: string
              phone:
                type: string
    """
    return jsonify(RESPONDERS)

@app.route('/api/call', methods=['POST'])
def call_responder():
    """
    Initiate a call to a responder
    ---
    tags:
      - Responder Management
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            responder_id:
              type: integer
              example: 1
    responses:
      200:
        description: Call initiated successfully
      404:
        description: Responder not found
    """
    data = request.json
    responder_id = data.get('responder_id')
    responder = next((r for r in RESPONDERS if r["id"] == responder_id), None)
    
    if not responder:
        return jsonify({"error": "Responder not found"}), 404
        
    try:
        to_number = responder.get("phone", "+917337743545") 
        print(f"Initiating call to {responder['name']} ({to_number})...")
        return jsonify({"message": f"Initiating call to {responder['name']} ({to_number})... (Mock)", "status": "success"})
    except Exception as e:
        print(f"Twilio Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


def calculate_auto_zones(center_lat, center_lng, radius):
    # Calculate offset in degrees (approximate)
    # 1 degree lat = ~111km. 500m = 0.5km. 0.5/111 = ~0.0045 degrees
    offset = (radius / 1000) / 111
    
    return {
        "Event Center": [center_lat, center_lng],
        "North Zone": [center_lat + offset, center_lng],
        "South Zone": [center_lat - offset, center_lng],
        "East Zone": [center_lat, center_lng + offset],
        "West Zone": [center_lat, center_lng - offset],
        "North East Sector": [center_lat + offset/1.5, center_lng + offset/1.5],
        "North West Sector": [center_lat + offset/1.5, center_lng - offset/1.5],
        "South East Sector": [center_lat - offset/1.5, center_lng + offset/1.5],
        "South West Sector": [center_lat - offset/1.5, center_lng - offset/1.5],
    }

@app.route('/api/events/preview-zones', methods=['POST'])
def preview_zones():
    """
    Preview auto-calculated zones based on location
    ---
    tags:
      - Event Management
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            location:
              type: object
              properties:
                lat:
                  type: number
                lng:
                  type: number
            radius:
              type: number
    responses:
      200:
        description: List of calculated zones
    """
    data = request.json
    location = data.get('location')
    radius = data.get('radius', 500)
    
    zones_map = calculate_auto_zones(location['lat'], location['lng'], radius)
    
    # Convert to list for frontend
    zones_list = []
    for name, coords in zones_map.items():
        zones_list.append({
            "name": name,
            "lat": coords[0],
            "lng": coords[1]
        })
        
    return jsonify(zones_list)

@app.route('/api/events/create', methods=['POST'])
def create_event():
    """
    Create a new event with optional custom zones
    ---
    tags:
      - Event Management
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
            location:
              type: object
            radius:
              type: number
            zones:
              type: array
              items:
                type: object
    responses:
      200:
        description: Event created
    """
    global VENUE_COORDINATES, VENUE_GRAPH
    
    data = request.json
    name = data.get('name')
    location = data.get('location')
    radius = data.get('radius', 500)
    custom_zones = data.get('zones') # List of {name, lat, lng}
    
    # Additional details
    date = data.get('date')
    event_type = data.get('type')
    description = data.get('description')
    organizer = data.get('organizer')
    contact = data.get('contact')
    
    if custom_zones:
        # Use provided zones
        new_zones = {z['name']: [z['lat'], z['lng']] for z in custom_zones}
    else:
        # Auto-calculate
        new_zones = calculate_auto_zones(location['lat'], location['lng'], radius)
    
    # Update global coordinates
    VENUE_COORDINATES = new_zones
    
    # Update global graph (fully connected for simplicity)
    VENUE_GRAPH = {}
    zone_names = list(new_zones.keys())
    
    for i, zone in enumerate(zone_names):
        VENUE_GRAPH[zone] = {}
        for other_zone in zone_names:
            if zone != other_zone:
                VENUE_GRAPH[zone][other_zone] = 2
    
    # Save to EVENTS list
    event_id = "evt_" + secure_filename(name).lower()
    EVENTS.append({
        "id": event_id,
        "name": name,
        "location": location,
        "date": date,
        "type": event_type,
        "description": description,
        "organizer": organizer,
        "contact": contact,
        "venue_coordinates": new_zones,
        "venue_graph": VENUE_GRAPH
    })
    save_events()
    
    # Generate response with camera endpoints
    zones_response = []
    for zone_name, coords in new_zones.items():
        zone_id = secure_filename(zone_name).lower()
        zones_response.append({
            "id": zone_id,
            "name": zone_name,
            "center": {"lat": coords[0], "lng": coords[1]},
            "camera_endpoint": f"/api/cameras/upload-video?zone_id={zone_id}",
            "camera_docs": f"Use POST /api/cameras/upload-video with zone_id='{zone_id}' to simulate camera feed."
        })
    
    return jsonify({
        "message": f"Event '{name}' configured. Area divided into {len(new_zones)} zones.",
        "event_id": event_id,
        "zones": zones_response,
        "navigation_graph_updated": True
    })

@app.route('/api/events', methods=['GET'])
def get_events():
    """
    Get list of all registered events
    ---
    tags:
      - Event Management
    responses:
      200:
        description: List of events
        schema:
          type: array
          items:
            type: object
    """
    return jsonify(EVENTS)

@app.route('/api/events/select', methods=['POST'])
def select_event():
    """
    Select an event to be active
    ---
    tags:
      - Event Management
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            event_id:
              type: string
    responses:
      200:
        description: Event selected
    """
    global VENUE_COORDINATES, VENUE_GRAPH
    data = request.json
    event_id = data.get('event_id')
    
    event = next((e for e in EVENTS if e['id'] == event_id), None)
    if not event:
        return jsonify({"error": "Event not found"}), 404
        
    # Update global state
    if 'venue_coordinates' in event:
        VENUE_COORDINATES = event['venue_coordinates']
    if 'venue_graph' in event:
        VENUE_GRAPH = event['venue_graph']
        
    return jsonify({"message": f"Event '{event['name']}' selected", "active": True})

@app.route('/api/zones/divide', methods=['POST'])
def divide_zones():
    """
    Divide venue into logical zones
    ---
    tags:
      - Zone Management
    responses:
      200:
        description: Zones divided successfully
        schema:
          type: object
          properties:
            message:
              type: string
            zones:
              type: array
              items:
                type: object
    """
    return jsonify({
        "message": "Zones divided successfully",
        "zones": [
            {"id": "zone1", "name": "Main Stage", "capacity": 5000},
            {"id": "zone2", "name": "Food Court", "capacity": 2000},
            {"id": "zone3", "name": "Entrance", "capacity": 1000}
        ]
    })

def send_anomaly_alert(zone_id, anomaly_type, description):
    """Send SMS alert to responders assigned to the zone"""
    if not twilio_client:
        print("Twilio client not initialized. Skipping SMS.")
        return

    # Find responders for this zone
    zone_name = CAMERA_ENDPOINTS.get(zone_id, {}).get('name', zone_id)
    responders = [r for r in RESPONDERS if r['zone'].lower() in zone_name.lower() or r['zone'] == 'Control Room']
    
    if not responders:
        # Fallback to all responders if no specific zone match
        responders = RESPONDERS

    message_body = f"🚨 CRITICAL ALERT: {anomaly_type} detected in {zone_name}. {description}. Please respond immediately."

    for responder in responders:
        try:
            message = twilio_client.messages.create(
                body=message_body,
                from_=TWILIO_PHONE_NUMBER,
                to=responder['phone']
            )
            print(f"SMS sent to {responder['name']}: {message.sid}")
        except Exception as e:
            print(f"Failed to send SMS to {responder['name']}: {e}")

@app.route('/api/crowd/prediction/<zone_id>', methods=['GET'])
def get_crowd_prediction(zone_id):
    """
    Get 15-minute crowd prediction for a zone
    ---
    tags:
      - Analytics
    parameters:
      - name: zone_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Prediction data
    """
    history = ZONE_HISTORY.get(zone_id, [])
    if not history:
        return jsonify({"error": "No data for prediction"}), 404

    # Simple linear projection based on last 5 points
    recent_data = history[-5:]
    if len(recent_data) < 2:
        current_count = recent_data[-1]['crowd_count']
        predicted_count = current_count # No trend yet
    else:
        # Calculate average rate of change
        changes = []
        for i in range(1, len(recent_data)):
            change = recent_data[i]['crowd_count'] - recent_data[i-1]['crowd_count']
            changes.append(change)
        
        avg_change = sum(changes) / len(changes)
        current_count = recent_data[-1]['crowd_count']
        # Predict 15 mins (assuming 30 sec updates -> 30 intervals? No, let's say 15 mins from now)
        # If update is every 30s, 15 mins = 30 updates. 
        # Let's project the trend.
        predicted_count = int(current_count + (avg_change * 5)) # Project 5 steps ahead as a proxy
        if predicted_count < 0: predicted_count = 0

    return jsonify({
        "zone_id": zone_id,
        "current_count": current_count,
        "predicted_count_15min": predicted_count,
        "trend": "increasing" if predicted_count > current_count else "decreasing" if predicted_count < current_count else "stable",
        "confidence": 85, # Mock confidence
        "history": [{"time": h['timestamp'][11:16], "density": h['crowd_count']} for h in recent_data]
    })




def analyze_video_with_gemini(video_path, zone_id):
    try:
        import google.generativeai as genai
        
        # Load API Key
        api_key = get_gemini_key()
        
        if not api_key or "PASTE" in api_key:
            print(f"[{zone_id}] Gemini API Key not found or invalid.")
            return {
                'crowd_count': 0,
                'density_level': 'Low',
                'anomalies': [],
                'description': "Analysis failed: API Key missing",
                'sentiment': "Unknown"
            }
            
        genai.configure(api_key=api_key)
        
        # Upload file
        print(f"Uploading {video_path} to Gemini...")
        video_file = genai.upload_file(path=video_path)
        
        # Wait for processing
        print("Waiting for video processing...", end='')
        while video_file.state.name == "PROCESSING":
            print('.', end='')
            time.sleep(2)
            video_file = genai.get_file(video_file.name)

        if video_file.state.name == "FAILED":
            print("Video processing failed.")
            return None

        print(" Analyzing...")
        # Use a model that is definitely available
        model = genai.GenerativeModel('models/gemini-flash-latest')
        
        # Construct prompt with lost persons
        lost_persons_desc = ""
        active_lost_persons = [p for p in LOST_PERSONS if p['status'] == 'active']
        if active_lost_persons:
            lost_persons_desc = "Also, check if any of the following lost persons are present in the video:\\n"
            for p in active_lost_persons:
                lost_persons_desc += f"- ID: {p['id']}, Name: {p['name']}, Age: {p['age']}, Description: {p['description']}\\n"
            lost_persons_desc += "If found, include a 'found_persons' list in the JSON with: person_id, timestamp, confidence, and description of where they are in the frame."

        prompt = f"""
        Analyze this CCTV footage for crowd management. 
        {lost_persons_desc}
        Return a JSON object with the following fields:
        - crowd_count (integer): Estimated number of people.
        - density_level (string): "Low", "Medium", "High", or "Critical".
        - anomalies (list of objects): List of anomalies. Each object should have:
            - type (string): "violence", "crowd_behavior", "abandoned_object", "unusual_movement", "gathering", or "other".
            - description (string): Brief description.
            - timestamp (string): Time of occurrence in "MM:SS" format.
            - confidence (integer): 0-100.
        - found_persons (list of objects): List of found lost persons (if any).
        - description (string): Brief summary of the scene.
        - sentiment (string): "Calm", "Agitated", "Panic", or "Happy".
        """
        
        response = model.generate_content([video_file, prompt], request_options={"timeout": 600})
        
        # Parse JSON from response
        text = response.text
        # Extract JSON block if wrapped in markdown
        match = re.search(r'```json\\n(.*?)\\n```', text, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            json_str = text
            
        analysis = json.loads(json_str)
        analysis['timestamp'] = datetime.utcnow().isoformat() + "Z"
        
        # Handle found persons
        if 'found_persons' in analysis and analysis['found_persons']:
            for match in analysis['found_persons']:
                match['zone_id'] = zone_id
                match['found_at'] = datetime.utcnow().isoformat() + "Z"
                FOUND_MATCHES.append(match)
                
                # Update lost person status if confidence is high
                if match.get('confidence', 0) > 80:
                    for p in LOST_PERSONS:
                        if p['id'] == match.get('person_id'):
                            p['status'] = 'found'
                            p['found_location'] = zone_id
                            break
        
        # Store in global
        ZONE_ANALYSIS[zone_id] = analysis
        
        # Check for anomalies and send SMS
        if 'anomalies' in analysis and analysis['anomalies']:
            for anomaly in analysis['anomalies']:
                # Send alert for high confidence anomalies
                if anomaly.get('confidence', 0) > 70:
                    send_anomaly_alert(zone_id, anomaly.get('type', 'Unknown'), anomaly.get('description', 'No description'))
                    
        print(f"Analysis complete for {zone_id}: {analysis}")
        return analysis
        
    except Exception as e:
        print(f"Gemini Analysis Error: {e}")
        return None

def fast_continuous_video_processor(video_path, zone_id, stop_flag_dict):
    """
    Fast continuous processor using OpenCV for people detection
    Only calls Gemini for anomaly detection when needed
    Updates every 2-3 seconds for real-time dashboard
    """
    try:
        import numpy as np
        
        # Initialize OpenCV people detector (HOG)
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        
        # Open video file
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[{zone_id}] Failed to open video: {video_path}")
            return
        
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = int(fps * 2)  # Analyze every 2 seconds
        
        print(f"[{zone_id}] Starting FAST continuous analysis: {total_frames} frames @ {fps} FPS")
        print(f"[{zone_id}] Analyzing every {frame_interval} frames (~2 seconds)")
        
        frame_count = 0
        analysis_count = 0
        last_gemini_call = 0
        last_crowd_count = 0
        
        while not stop_flag_dict.get('stop', False):
            ret, frame = cap.read()
            
            if not ret:
                # Loop back to beginning
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_count = 0
                print(f"[{zone_id}] Looping video...")
                continue
            
            frame_count += 1
            
            # Analyze frame at intervals
            if frame_count % frame_interval == 0:
                analysis_count += 1
                timestamp_sec = frame_count / fps
                timestamp_min = int(timestamp_sec // 60)
                timestamp_sec_rem = int(timestamp_sec % 60)
                
                try:
                    # Resize frame for faster processing
                    resized = cv2.resize(frame, (640, 480))
                    
                    # Detect people using HOG
                    boxes, weights = hog.detectMultiScale(resized, winStride=(8, 8), padding=(4, 4), scale=1.05)
                    
                    crowd_count = len(boxes)
                    
                    # Determine density level
                    if crowd_count > 100:
                        density_level = "Critical"
                    elif crowd_count > 50:
                        density_level = "High"
                    elif crowd_count > 20:
                        density_level = "Medium"
                    else:
                        density_level = "Low"
                    
                    # Determine sentiment based on crowd density
                    if density_level == "Critical":
                        sentiment = "Agitated"
                    elif density_level == "High":
                        sentiment = "Busy"
                    else:
                        sentiment = "Calm"
                    
                    # Create analysis object
                    analysis = {
                        'crowd_count': crowd_count,
                        'density_level': density_level,
                        'sentiment': sentiment,
                        'description': f"Detected {crowd_count} people in the frame. Crowd density is {density_level.lower()}.",
                        'anomalies': [],
                        'timestamp': datetime.utcnow().isoformat() + "Z",
                        'video_timestamp': f"{timestamp_min}:{timestamp_sec_rem:02d}",
                        'detection_method': 'opencv_hog'
                    }
                    
                    # Call Gemini for detailed analysis if significant change or every 30 seconds
                    crowd_change = abs(crowd_count - last_crowd_count)
                    time_since_gemini = analysis_count - last_gemini_call
                    
                    should_call_gemini = (
                        crowd_change > 10 or  # Significant crowd change
                        density_level in ["High", "Critical"] or  # High density
                        time_since_gemini >= 15  # Every 30 seconds (15 * 2sec intervals)
                    )
                    
                    if should_call_gemini:
                        print(f"[{zone_id}] Calling Gemini for detailed analysis (change: {crowd_change}, density: {density_level})")
                        
                        # Save frame temporarily
                        temp_filename = f"temp_{zone_id}_{int(time.time())}.jpg"
                        temp_frame_path = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
                        cv2.imwrite(temp_frame_path, frame)
                        
                        # Get Gemini analysis in background (non-blocking)
                        try:
                            import google.generativeai as genai
                            
                            api_key = get_gemini_key()
                            
                            if api_key:
                                genai.configure(api_key=api_key)
                                model = genai.GenerativeModel('models/gemini-flash-latest')
                                
                                frame_file = genai.upload_file(path=temp_frame_path)
                                
                                # Wait for processing
                                while frame_file.state.name == "PROCESSING":
                                    time.sleep(1)
                                    frame_file = genai.get_file(frame_file.name)
                                
                                if frame_file.state.name != "FAILED":
                                    prompt = f"""
                                    Analyze this CCTV frame for anomalies and crowd behavior.
                                    Current OpenCV detection: {crowd_count} people, {density_level} density.
                                    
                                    Return JSON with:
                                    - anomalies (list): Any detected anomalies with type, description, confidence
                                    - sentiment (string): "Calm", "Agitated", "Panic", or "Happy"
                                    - description (string): Brief scene summary
                                    """
                                    
                                    response = model.generate_content([frame_file, prompt], request_options={"timeout": 30})
                                    
                                    # Parse response
                                    text = response.text
                                    match = re.search(r'```json\n(.*?)\n```', text, re.DOTALL)
                                    if match:
                                        json_str = match.group(1)
                                    else:
                                        json_str = text
                                    
                                    gemini_data = json.loads(json_str)
                                    
                                    # Merge Gemini data with OpenCV data
                                    analysis['anomalies'] = gemini_data.get('anomalies', [])
                                    analysis['sentiment'] = gemini_data.get('sentiment', sentiment)
                                    analysis['description'] = gemini_data.get('description', analysis['description'])
                                    analysis['detection_method'] = 'opencv_hog + gemini'
                                    
                                    last_gemini_call = analysis_count
                                    
                                    # If anomalies detected, save the frame permanently
                                    if analysis['anomalies']:
                                        # Create unique filename for the anomaly frame
                                        anomaly_filename = f"anomaly_{zone_id}_{int(time.time())}_{uuid.uuid4().hex[:8]}.jpg"
                                        anomaly_path = os.path.join(app.config['UPLOAD_FOLDER'], anomaly_filename)
                                        
                                        # Rename temp file to permanent file
                                        if os.path.exists(temp_frame_path):
                                            os.rename(temp_frame_path, anomaly_path)
                                            print(f"[{zone_id}] Saved anomaly frame: {anomaly_filename}")
                                            
                                            # Add image URL to each anomaly
                                            for anomaly in analysis['anomalies']:
                                                anomaly['imageUrl'] = f"/uploads/{anomaly_filename}"
                                                anomaly['timestamp'] = analysis['timestamp']
                                                anomaly['zone_id'] = zone_id
                                                anomaly['id'] = f"{zone_id}_{int(time.time())}_{uuid.uuid4().hex[:8]}"
                                                
                                                # Add to persistent storage
                                                PERSISTENT_ANOMALIES.append(anomaly.copy())
                                                
                                                if anomaly.get('confidence', 0) > 70:
                                                    send_anomaly_alert(zone_id, anomaly.get('type', 'Unknown'), anomaly.get('description', 'No description'))
                                    else:
                                        # No anomalies, delete temp file
                                        if os.path.exists(temp_frame_path):
                                            os.remove(temp_frame_path)
                                
                                # Clean up if still exists (fallback)
                                if os.path.exists(temp_frame_path):
                                    os.remove(temp_frame_path)
                        
                        except Exception as e:
                            print(f"[{zone_id}] Gemini call failed: {e}")
                            if os.path.exists(temp_frame_path):
                                os.remove(temp_frame_path)
                    
                    # Update global analysis
                    ZONE_ANALYSIS[zone_id] = analysis
                    update_zone_history(zone_id, analysis)
                    
                    last_crowd_count = crowd_count
                    
                    print(f"[{zone_id}] Analysis #{analysis_count}: {crowd_count} people, {density_level} density ({analysis.get('detection_method', 'opencv')})")
                    
                except Exception as e:
                    print(f"[{zone_id}] Frame analysis error: {e}")
            
            # Small delay to prevent CPU overload
            time.sleep(0.01)
        
        cap.release()
        print(f"[{zone_id}] Fast continuous analysis stopped")
        
    except Exception as e:
        print(f"[{zone_id}] Fast processor error: {e}")


def continuous_video_processor(video_path, zone_id, stop_flag_dict):
    """
    Continuously process video frames and send analysis to dashboard
    Runs in a background thread
    """
    try:
        import google.generativeai as genai
        
        # Load API Key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            key_files = ["gemini_key.txt", "../gemini_key.txt", "backend/gemini_key.txt"]
            for kf in key_files:
                if os.path.exists(kf):
                    try:
                        with open(kf, "r") as f:
                            possible_key = f.read().strip()
                        if possible_key and "PASTE" not in possible_key:
                            api_key = possible_key
                            break
                    except:
                        pass
        
        if not api_key or "PASTE" in api_key:
            print(f"[{zone_id}] Gemini API Key not found. Stopping continuous analysis.")
            return
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('models/gemini-flash-latest')
        
        # Open video file
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[{zone_id}] Failed to open video: {video_path}")
            return
        
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = int(fps * 10)  # Analyze every 10 seconds
        
        print(f"[{zone_id}] Starting continuous analysis: {total_frames} frames @ {fps} FPS")
        print(f"[{zone_id}] Analyzing every {frame_interval} frames (~10 seconds)")
        
        frame_count = 0
        analysis_count = 0
        
        while not stop_flag_dict.get('stop', False):
            ret, frame = cap.read()
            
            if not ret:
                # Loop back to beginning
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_count = 0
                print(f"[{zone_id}] Looping video...")
                continue
            
            frame_count += 1
            
            # Analyze frame at intervals
            if frame_count % frame_interval == 0:
                analysis_count += 1
                timestamp_sec = frame_count / fps
                timestamp_min = int(timestamp_sec // 60)
                timestamp_sec_rem = int(timestamp_sec % 60)
                
                print(f"[{zone_id}] Analyzing frame {frame_count}/{total_frames} ({timestamp_min}:{timestamp_sec_rem:02d})")
                
                try:
                    # Save frame temporarily
                    temp_frame_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_{zone_id}_frame.jpg")
                    cv2.imwrite(temp_frame_path, frame)
                    
                    # Upload frame to Gemini
                    frame_file = genai.upload_file(path=temp_frame_path)
                    
                    # Wait for processing
                    while frame_file.state.name == "PROCESSING":
                        time.sleep(1)
                        frame_file = genai.get_file(frame_file.name)
                    
                    if frame_file.state.name == "FAILED":
                        print(f"[{zone_id}] Frame processing failed")
                        continue
                    
                    # Construct prompt
                    lost_persons_desc = ""
                    active_lost_persons = [p for p in LOST_PERSONS if p['status'] == 'active']
                    if active_lost_persons:
                        lost_persons_desc = "Also, check if any of the following lost persons are present:\\n"
                        for p in active_lost_persons:
                            lost_persons_desc += f"- ID: {p['id']}, Name: {p['name']}, Age: {p['age']}, Description: {p['description']}\\n"
                    
                    prompt = f"""
                    Analyze this CCTV frame for crowd management.
                    {lost_persons_desc}
                    Return a JSON object with:
                    - crowd_count (integer): Estimated number of people.
                    - density_level (string): "Low", "Medium", "High", or "Critical".
                    - anomalies (list): List of anomalies with type, description, confidence (0-100).
                    - found_persons (list): List of found lost persons (if any).
                    - description (string): Brief summary.
                    - sentiment (string): "Calm", "Agitated", "Panic", or "Happy".
                    """
                    
                    response = model.generate_content([frame_file, prompt], request_options={"timeout": 120})
                    
                    # Parse response
                    text = response.text
                    match = re.search(r'```json\\n(.*?)\\n```', text, re.DOTALL)
                    if match:
                        json_str = match.group(1)
                    else:
                        json_str = text
                    
                    analysis = json.loads(json_str)
                    analysis['timestamp'] = datetime.utcnow().isoformat() + "Z"
                    analysis['video_timestamp'] = f"{timestamp_min}:{timestamp_sec_rem:02d}"
                    
                    # Handle found persons
                    if 'found_persons' in analysis and analysis['found_persons']:
                        for match_person in analysis['found_persons']:
                            match_person['zone_id'] = zone_id
                            match_person['found_at'] = datetime.utcnow().isoformat() + "Z"
                            FOUND_MATCHES.append(match_person)
                            
                            if match_person.get('confidence', 0) > 80:
                                for p in LOST_PERSONS:
                                    if p['id'] == match_person.get('person_id'):
                                        p['status'] = 'found'
                                        p['found_location'] = zone_id
                                        break
                    
                    # Update global analysis
                    ZONE_ANALYSIS[zone_id] = analysis
                    update_zone_history(zone_id, analysis)
                    
                    # Send alerts for anomalies
                    if 'anomalies' in analysis and analysis['anomalies']:
                        for anomaly in analysis['anomalies']:
                            if anomaly.get('confidence', 0) > 70:
                                send_anomaly_alert(zone_id, anomaly.get('type', 'Unknown'), anomaly.get('description', 'No description'))
                    
                    print(f"[{zone_id}] Analysis #{analysis_count}: {analysis.get('crowd_count', 0)} people, {analysis.get('density_level', 'Unknown')} density")
                    
                    # Clean up temp file
                    if os.path.exists(temp_frame_path):
                        os.remove(temp_frame_path)
                    
                except Exception as e:
                    print(f"[{zone_id}] Frame analysis error: {e}")
            
            # Small delay to prevent CPU overload
            time.sleep(0.01)
        
        cap.release()
        print(f"[{zone_id}] Continuous analysis stopped")
        
    except Exception as e:
        print(f"[{zone_id}] Continuous processor error: {e}")


@app.route('/api/cameras/upload-video', methods=['POST'])
def upload_video():
    """
    Upload crowd surveillance video for analysis
    ---
    tags:
      - Camera Management
    consumes:
      - multipart/form-data
    parameters:
      - name: video
        in: formData
        type: file
        required: true
        description: Video file to upload (MP4, AVI, MOV)
      - name: zone_id
        in: formData
        type: string
        required: false
        description: Zone identifier (e.g., zone1, zone2)
      - name: camera_id
        in: formData
        type: string
        required: false
        description: Camera identifier
    responses:
      200:
        description: Video uploaded successfully
        schema:
          type: object
          properties:
            message:
              type: string
            video_url:
              type: string
            analysis:
              type: object
            metadata:
              type: object
      400:
        description: No video file provided
    """
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    
    video = request.files['video']
    zone_id = request.form.get('zone_id', 'unknown')
    camera_id = request.form.get('camera_id', 'camera_01')
    
    filename = secure_filename(video.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    video.save(save_path)
    
    # Trigger Gemini Analysis
    analysis = analyze_video_with_gemini(save_path, zone_id)
    
    return jsonify({
        "message": "Video uploaded and analyzed successfully",
        "video_url": f"/uploads/{filename}",
        "analysis": analysis,
        "metadata": {
            "duration": "10:00",
            "resolution": "1080p",
            "zone_id": zone_id,
            "camera_id": camera_id,
            "uploaded_at": datetime.utcnow().isoformat() + "Z"
        }
    })

def update_zone_history(zone_id, analysis):
    """Update historical data for real-time graphs"""
    if zone_id not in ZONE_HISTORY:
        ZONE_HISTORY[zone_id] = []
    
    timestamp = datetime.utcnow().isoformat() + "Z"
    data_point = {
        "timestamp": timestamp,
        "crowd_count": analysis.get('crowd_count', 0) if analysis else 0,
        "density_level": analysis.get('density_level', 'Low') if analysis else 'Low',
        "anomaly_count": len(analysis.get('anomalies', [])) if analysis else 0
    }
    
    ZONE_HISTORY[zone_id].append(data_point)
    
    # Keep only last 20 data points
    if len(ZONE_HISTORY[zone_id]) > 20:
        ZONE_HISTORY[zone_id] = ZONE_HISTORY[zone_id][-20:]

# Dedicated Camera Endpoints for Specific Zones

@app.route('/api/cameras/food-court/upload', methods=['POST'])
def upload_food_court_video():
    """
    Upload video from Food Court camera
    ---
    tags:
      - Camera Management
    consumes:
      - multipart/form-data
    parameters:
      - name: video
        in: formData
        type: file
        required: true
      - name: continuous
        in: formData
        type: boolean
        required: false
        description: Enable continuous analysis (default is true)
    responses:
      200:
        description: Video uploaded and analyzed
    """
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    
    video = request.files['video']
    filename = secure_filename(video.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"food_court_{filename}")
    video.save(save_path)
    
    # Check if continuous mode is requested (default: True)
    continuous_mode = request.form.get('continuous', 'true').lower() == 'true'
    
    # Initial analysis
    analysis = analyze_video_with_gemini(save_path, 'food_court')
    update_zone_history('food_court', analysis)
    
    # Start continuous processing if requested
    if continuous_mode:
        with VIDEO_PROCESSING_LOCK:
            # Stop existing processor if any
            if 'food_court' in ACTIVE_VIDEO_PROCESSORS:
                ACTIVE_VIDEO_PROCESSORS['food_court']['stop_flag']['stop'] = True
                print("[food_court] Stopping previous continuous processor...")
            
            # Start new processor
            stop_flag = {'stop': False}
            thread = threading.Thread(
                target=fast_continuous_video_processor,
                args=(save_path, 'food_court', stop_flag),
                daemon=True
            )
            thread.start()
            
            ACTIVE_VIDEO_PROCESSORS['food_court'] = {
                'thread': thread,
                'stop_flag': stop_flag,
                'video_path': save_path,
                'started_at': datetime.utcnow().isoformat() + "Z"
            }
            
            print(f"[food_court] Started continuous analysis for {filename}")
    
    return jsonify({
        "message": "Food Court video analyzed successfully",
        "zone": "Food Court",
        "video_url": f"/uploads/food_court_{filename}",
        "analysis": analysis,
        "endpoint": CAMERA_ENDPOINTS['food_court'],
        "continuous_mode": continuous_mode,
        "status": "Processing continuously" if continuous_mode else "One-time analysis complete"
    })

@app.route('/api/cameras/parking/upload', methods=['POST'])
def upload_parking_video():
    """
    Upload video from Parking Area camera
    ---
    tags:
      - Camera Management
    consumes:
      - multipart/form-data
    parameters:
      - name: video
        in: formData
        type: file
        required: true
      - name: continuous
        in: formData
        type: boolean
        required: false
        description: Enable continuous analysis (default is true)
    responses:
      200:
        description: Video uploaded and analyzed
    """
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    
    video = request.files['video']
    filename = secure_filename(video.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"parking_{filename}")
    video.save(save_path)
    
    continuous_mode = request.form.get('continuous', 'true').lower() == 'true'
    analysis = analyze_video_with_gemini(save_path, 'parking')
    update_zone_history('parking', analysis)
    
    if continuous_mode:
        with VIDEO_PROCESSING_LOCK:
            if 'parking' in ACTIVE_VIDEO_PROCESSORS:
                ACTIVE_VIDEO_PROCESSORS['parking']['stop_flag']['stop'] = True
            stop_flag = {'stop': False}
            thread = threading.Thread(target=fast_continuous_video_processor, args=(save_path, 'parking', stop_flag), daemon=True)
            thread.start()
            ACTIVE_VIDEO_PROCESSORS['parking'] = {'thread': thread, 'stop_flag': stop_flag, 'video_path': save_path, 'started_at': datetime.utcnow().isoformat() + "Z"}
            print(f"[parking] Started continuous analysis for {filename}")
    
    return jsonify({
        "message": "Parking Area video analyzed successfully",
        "zone": "Parking",
        "video_url": f"/uploads/parking_{filename}",
        "analysis": analysis,
        "endpoint": CAMERA_ENDPOINTS['parking'],
        "continuous_mode": continuous_mode,
        "status": "Processing continuously" if continuous_mode else "One-time analysis complete"
    })

@app.route('/api/cameras/main-stage/upload', methods=['POST'])
def upload_main_stage_video():
    """
    Upload video from Main Stage camera
    ---
    tags:
      - Camera Management
    consumes:
      - multipart/form-data
    parameters:
      - name: video
        in: formData
        type: file
        required: true
      - name: continuous
        in: formData
        type: boolean
        required: false
        description: Enable continuous analysis (default is true)
    responses:
      200:
        description: Video uploaded and analyzed
    """
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    
    video = request.files['video']
    filename = secure_filename(video.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"main_stage_{filename}")
    video.save(save_path)
    
    continuous_mode = request.form.get('continuous', 'true').lower() == 'true'
    analysis = analyze_video_with_gemini(save_path, 'main_stage')
    update_zone_history('main_stage', analysis)
    
    if continuous_mode:
        with VIDEO_PROCESSING_LOCK:
            if 'main_stage' in ACTIVE_VIDEO_PROCESSORS:
                ACTIVE_VIDEO_PROCESSORS['main_stage']['stop_flag']['stop'] = True
            stop_flag = {'stop': False}
            thread = threading.Thread(target=fast_continuous_video_processor, args=(save_path, 'main_stage', stop_flag), daemon=True)
            thread.start()
            ACTIVE_VIDEO_PROCESSORS['main_stage'] = {'thread': thread, 'stop_flag': stop_flag, 'video_path': save_path, 'started_at': datetime.utcnow().isoformat() + "Z"}
            print(f"[main_stage] Started continuous analysis for {filename}")
    
    return jsonify({
        "message": "Main Stage video analyzed successfully",
        "zone": "Main Stage",
        "video_url": f"/uploads/main_stage_{filename}",
        "analysis": analysis,
        "endpoint": CAMERA_ENDPOINTS['main_stage'],
        "continuous_mode": continuous_mode,
        "status": "Processing continuously" if continuous_mode else "One-time analysis complete"
    })

@app.route('/api/cameras/testing/upload', methods=['POST'])
def upload_testing_video():
    """
    Upload video to Testing zone camera
    ---
    tags:
      - Camera Management
    consumes:
      - multipart/form-data
    parameters:
      - name: video
        in: formData
        type: file
        required: true
      - name: continuous
        in: formData
        type: boolean
        required: false
        description: Enable continuous analysis (default is true)
    responses:
      200:
        description: Video uploaded and analyzed
    """
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    
    video = request.files['video']
    filename = secure_filename(video.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"testing_{filename}")
    video.save(save_path)
    
    continuous_mode = request.form.get('continuous', 'true').lower() == 'true'
    analysis = analyze_video_with_gemini(save_path, 'testing')
    update_zone_history('testing', analysis)
    
    if continuous_mode:
        with VIDEO_PROCESSING_LOCK:
            if 'testing' in ACTIVE_VIDEO_PROCESSORS:
                ACTIVE_VIDEO_PROCESSORS['testing']['stop_flag']['stop'] = True
            stop_flag = {'stop': False}
            thread = threading.Thread(target=fast_continuous_video_processor, args=(save_path, 'testing', stop_flag), daemon=True)
            thread.start()
            ACTIVE_VIDEO_PROCESSORS['testing'] = {'thread': thread, 'stop_flag': stop_flag, 'video_path': save_path, 'started_at': datetime.utcnow().isoformat() + "Z"}
            print(f"[testing] Started continuous analysis for {filename}")
    
    return jsonify({
        "message": "Testing zone video analyzed successfully",
        "zone": "Testing",
        "video_url": f"/uploads/testing_{filename}",
        "analysis": analysis,
        "endpoint": CAMERA_ENDPOINTS['testing'],
        "continuous_mode": continuous_mode,
        "status": "Processing continuously" if continuous_mode else "One-time analysis complete"
    })

@app.route('/api/cameras/continuous/status', methods=['GET'])
def get_continuous_status():
    """
    Get status of all continuous video processors
    ---
    tags:
      - Camera Management
    responses:
      200:
        description: Status of all active processors
    """
    status = {}
    with VIDEO_PROCESSING_LOCK:
        for zone_id, processor in ACTIVE_VIDEO_PROCESSORS.items():
            status[zone_id] = {
                "active": processor['thread'].is_alive(),
                "video_path": processor['video_path'],
                "started_at": processor['started_at']
            }
    return jsonify({
        "active_processors": len(status),
        "processors": status
    })

@app.route('/api/cameras/continuous/stop/<zone_id>', methods=['POST'])
def stop_continuous_processing(zone_id):
    """
    Stop continuous processing for a specific zone
    ---
    tags:
      - Camera Management
    parameters:
      - name: zone_id
        in: path
        type: string
        required: true
        description: "Zone identifier (food_court, parking, main_stage, testing)"
    responses:
      200:
        description: Processing stopped successfully
    """
    with VIDEO_PROCESSING_LOCK:
        if zone_id in ACTIVE_VIDEO_PROCESSORS:
            ACTIVE_VIDEO_PROCESSORS[zone_id]['stop_flag']['stop'] = True
            del ACTIVE_VIDEO_PROCESSORS[zone_id]
            print(f"[{zone_id}] Stopped continuous processing")
            return jsonify({"message": f"Continuous processing stopped for {zone_id}"})
        else:
            return jsonify({"error": f"No active processor for {zone_id}"}), 404

@app.route('/api/cameras/continuous/stop-all', methods=['POST'])
def stop_all_continuous_processing():
    """
    Stop all continuous video processors
    ---
    tags:
      - Camera Management
    responses:
      200:
        description: All processors stopped
    """
    stopped_count = 0
    with VIDEO_PROCESSING_LOCK:
        for zone_id, processor in list(ACTIVE_VIDEO_PROCESSORS.items()):
            processor['stop_flag']['stop'] = True
            stopped_count += 1
        ACTIVE_VIDEO_PROCESSORS.clear()
    
    print(f"Stopped {stopped_count} continuous processors")
    return jsonify({
        "message": f"Stopped {stopped_count} continuous processors",
        "stopped_count": stopped_count
    })

@app.route('/api/cameras/search-stream', methods=['POST'])
def search_and_stream_video():
    """
    Search YouTube for a video and start continuous analysis
    ---
    tags:
      - Camera Management
    parameters:
      - name: body
        in: body
        required: true
        schema:
            type: object
            properties:
                query:
                    type: string
                    example: "crowd walking in mall"
                zone_id:
                    type: string
                    example: "food_court"
    responses:
      200:
        description: Video found and analysis started
    """
    try:
        data = request.json
        query = data.get('query')
        zone_id = data.get('zone_id', 'testing')
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
            
        print(f"[{zone_id}] Searching YouTube for: {query}")
        
        # Use yt-dlp to search and download
        import yt_dlp
        
        # Create a safe filename from query
        safe_query = "".join([c for c in query if c.isalnum() or c in (' ', '-', '_')]).strip().replace(' ', '_')
        filename = f"yt_{safe_query}_{int(time.time())}.mp4"
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'outtmpl': save_path,
            'noplaylist': True,
            'quiet': True,
            'default_search': 'ytsearch1:',  # Search and get 1st result
            'max_downloads': 1
        }
        
        video_info = None
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Search and download
                info = ydl.extract_info(query, download=True)
                if 'entries' in info:
                    video_info = info['entries'][0]
                else:
                    video_info = info
        except Exception as e:
            print(f"yt-dlp warning/error: {e}")
            # Continue if file exists, as max_downloads might trigger error
            if not os.path.exists(save_path):
                 return jsonify({"error": f"Failed to download video: {str(e)}"}), 500
                
        if not os.path.exists(save_path):
             return jsonify({"error": "Failed to download video"}), 500
             
        video_title = video_info.get('title', 'Unknown') if video_info else 'YouTube Video'
        print(f"[{zone_id}] Downloaded video: {video_title}")
        
        # Start continuous analysis
        with VIDEO_PROCESSING_LOCK:
            # Stop existing processor if any
            if zone_id in ACTIVE_VIDEO_PROCESSORS:
                ACTIVE_VIDEO_PROCESSORS[zone_id]['stop_flag']['stop'] = True
                print(f"[{zone_id}] Stopping previous processor...")
                time.sleep(1) # Give it a moment to stop
            
            # Start new processor
            stop_flag = {'stop': False}
            thread = threading.Thread(
                target=fast_continuous_video_processor,
                args=(save_path, zone_id, stop_flag),
                daemon=True
            )
            thread.start()
            
            ACTIVE_VIDEO_PROCESSORS[zone_id] = {
                'thread': thread,
                'stop_flag': stop_flag,
                'video_path': save_path,
                'started_at': datetime.utcnow().isoformat() + "Z"
            }
            
        return jsonify({
            "message": "Video found and analysis started",
            "video_title": video_title,
            "video_url": f"/uploads/{filename}",
            "zone_id": zone_id,
            "status": "Processing continuously"
        })
        
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": str(e)}), 500



@app.route('/api/cameras/endpoints', methods=['GET'])
def get_camera_endpoints():
    """
    Get list of all available camera endpoints
    ---
    tags:
      - Camera Management
    responses:
      200:
        description: List of camera endpoints
    """
    return jsonify({
        "endpoints": list(CAMERA_ENDPOINTS.values()),
        "total_cameras": len(CAMERA_ENDPOINTS)
    })


@app.route('/api/zones/<zone_id>/density', methods=['POST'])
def get_zone_density(zone_id):
    """
    Get real-time crowd density for a specific zone
    ---
    tags:
      - Zone Management
    parameters:
      - name: zone_id
        in: path
        type: string
        required: true
        description: ID of the zone (e.g., zone1)
    responses:
      200:
        description: Density data retrieved
        schema:
          type: object
          properties:
            density:
              type: number
            people_count:
              type: integer
    """
    # Check if we have real analysis data
    if zone_id in ZONE_ANALYSIS:
        analysis = ZONE_ANALYSIS[zone_id]
        # Map density level to numeric value for compatibility if needed
        density_map = {"Low": 0.2, "Medium": 0.5, "High": 0.8, "Critical": 1.0}
        density_val = density_map.get(analysis.get('density_level', 'Low'), 0.1)
        
        # Handle anomalies (convert objects to strings for backward compatibility)
        raw_anomalies = analysis.get('anomalies', [])
        simple_anomalies = []
        detailed_anomalies = []
        
        for a in raw_anomalies:
            if isinstance(a, dict):
                simple_anomalies.append(f"{a.get('type', 'Anomaly')}: {a.get('description', '')} at {a.get('timestamp', '')}")
                detailed_anomalies.append(a)
            else:
                simple_anomalies.append(str(a))
                detailed_anomalies.append({"description": str(a), "type": "other"})

        return jsonify({
            "zone_id": zone_id,
            "density": density_val,
            "people_count": analysis.get('crowd_count', 0),
            "density_level": analysis.get('density_level', 'Low'),
            "anomalies": simple_anomalies,
            "detailed_anomalies": detailed_anomalies,
            "description": analysis.get('description', ''),
            "sentiment": analysis.get('sentiment', ''),
            "timestamp": analysis.get('timestamp', datetime.utcnow().isoformat() + "Z")
        })

    # NO FALLBACK - Return empty/null status as requested
    return jsonify({
        "zone_id": zone_id,
        "status": "no_data",
        "message": "No analysis available. Please upload video."
    })

@app.route('/api/anomaly/detect', methods=['POST'])
def detect_anomaly():
    """
    Detect anomalies in crowd behavior
    ---
    tags:
      - Anomaly Detection
    responses:
      200:
        description: Anomaly detection result
        schema:
          type: object
          properties:
            anomaly_detected:
              type: boolean
            anomaly_type:
              type: string
            severity:
              type: string
            location:
              type: string
    """
    anomaly_data = {
        "anomaly_detected": True,
        "anomaly_type": "fire",
        "severity": "high",
        "location": "Food Court",
        "coordinates": [12.9780, 77.5980],
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "alert_summary": "Fire detected near Food Court. High severity."
    }
    
    message = f"ALERT: {anomaly_data['alert_summary']} Location: {anomaly_data['location']}. Please respond immediately."
    send_sms_alert("+917337743545", message)
    
    return jsonify(anomaly_data)

@app.route('/api/anomalies/active', methods=['GET'])
def get_active_anomalies():
    """
    Get all active anomalies across all zones from persistent storage
    """
    # Return all anomalies from persistent storage
    # They already have all required fields: id, type, description, location, timestamp, etc.
    return jsonify(PERSISTENT_ANOMALIES)

@app.route('/api/messages', methods=['GET', 'POST'])
def handle_messages():
    """
    Handle messaging between responders and admin
    """
    if request.method == 'POST':
        msg = request.json
        msg['id'] = str(uuid.uuid4())
        msg['timestamp'] = datetime.utcnow().isoformat() + "Z"
        MESSAGES.append(msg)
        return jsonify({"status": "sent", "message": msg})
    return jsonify(MESSAGES)

@app.route('/api/realtime/zone-history/<zone_id>', methods=['GET'])
def get_zone_history(zone_id):
    """
    Get historical data for real-time graphs
    ---
    tags:
      - Real-time Data
    parameters:
      - name: zone_id
        in: path
        type: string
        required: true
        description: Zone identifier (food_court, parking, main_stage, testing)
    responses:
      200:
        description: Historical data for the zone
    """
    if zone_id not in ZONE_HISTORY:
        return jsonify({"error": "Zone not found", "available_zones": list(ZONE_HISTORY.keys())}), 404
    
    return jsonify({
        "zone_id": zone_id,
        "history": ZONE_HISTORY[zone_id],
        "data_points": len(ZONE_HISTORY[zone_id])
    })

@app.route('/api/realtime/all-zones', methods=['GET'])
def get_all_zones_realtime():
    """
    Get real-time data for all zones
    ---
    tags:
      - Real-time Data
    responses:
      200:
        description: Real-time data for all zones
    """
    zones_data = []
    
    for zone_id in ['food_court', 'parking', 'main_stage', 'testing']:
        analysis = ZONE_ANALYSIS.get(zone_id)
        history = ZONE_HISTORY.get(zone_id, [])
        
        # Calculate trend
        trend = "stable"
        if len(history) >= 2:
            recent_count = history[-1].get('crowd_count', 0)
            previous_count = history[-2].get('crowd_count', 0)
            if recent_count > previous_count:
                trend = "increasing"
            elif recent_count < previous_count:
                trend = "decreasing"
        
        zones_data.append({
            "zone_id": zone_id,
            "zone_name": CAMERA_ENDPOINTS.get(zone_id, {}).get('name', zone_id),
            "current_analysis": analysis,
            "trend": trend,
            "history_points": len(history),
            "latest_data": history[-1] if history else None
        })
    
    return jsonify({
        "zones": zones_data,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

@app.route('/api/realtime/dashboard-summary', methods=['GET'])
def get_dashboard_summary():
    """
    Get comprehensive dashboard summary with all real-time metrics
    ---
    tags:
      - Real-time Data
    responses:
      200:
        description: Complete dashboard summary
    """
    total_crowd = 0
    total_anomalies = 0
    critical_zones = []
    
    for zone_id in ['food_court', 'parking', 'main_stage', 'testing']:
        analysis = ZONE_ANALYSIS.get(zone_id)
        if analysis:
            crowd_count = analysis.get('crowd_count', 0)
            total_crowd += crowd_count
            anomalies = analysis.get('anomalies', [])
            total_anomalies += len(anomalies)
            
            density_level = analysis.get('density_level', 'Low')
            if density_level in ['High', 'Critical']:
                critical_zones.append({
                    "zone": CAMERA_ENDPOINTS.get(zone_id, {}).get('name', zone_id),
                    "density": density_level,
                    "crowd_count": crowd_count
                })
    
    return jsonify({
        "summary": {
            "total_crowd_count": total_crowd,
            "total_active_anomalies": total_anomalies,
            "critical_zones_count": len(critical_zones),
            "monitored_zones": len(CAMERA_ENDPOINTS),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        },
        "critical_zones": critical_zones,
        "zone_breakdown": {
            zone_id: {
                "crowd_count": ZONE_ANALYSIS.get(zone_id, {}).get('crowd_count', 0),
                "density_level": ZONE_ANALYSIS.get(zone_id, {}).get('density_level', 'Unknown'),
                "anomaly_count": len(ZONE_ANALYSIS.get(zone_id, {}).get('anomalies', []))
            }
            for zone_id in ['food_court', 'parking', 'main_stage', 'testing']
        }
    })

@app.route('/api/lost-found/report', methods=['POST'])
def report_lost_person():
    """
    Report a lost person
    ---
    tags:
      - Lost and Found
    parameters:
      - name: name
        in: formData
        type: string
        required: true
      - name: age
        in: formData
        type: integer
        required: true
      - name: description
        in: formData
        type: string
        required: true
      - name: last_seen
        in: formData
        type: string
      - name: contact
        in: formData
        type: string
        required: true
      - name: image
        in: formData
        type: file
    responses:
      200:
        description: Report created
    """
    try:
        name = request.form.get('name')
        age = request.form.get('age')
        description = request.form.get('description')
        last_seen = request.form.get('last_seen')
        contact = request.form.get('contact')
        
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename:
                filename = secure_filename(file.filename)
                # Save with unique ID
                unique_filename = f"lost_{uuid.uuid4()}_{filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(filepath)
                image_url = f"/uploads/{unique_filename}"
        
        report_id = str(uuid.uuid4())
        report = {
            "id": report_id,
            "name": name,
            "age": age,
            "description": description,
            "last_seen": last_seen,
            "contact": contact,
            "image_url": image_url,
            "status": "active",
            "reported_at": datetime.utcnow().isoformat() + "Z"
        }
        
        LOST_PERSONS.append(report)
        return jsonify({"message": "Report submitted successfully", "report": report})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lost-found/reports', methods=['GET'])
def get_lost_reports():
    """
    Get all active lost person reports
    ---
    tags:
      - Lost and Found
    responses:
      200:
        description: List of lost persons
    """
    active_reports = [p for p in LOST_PERSONS if p['status'] == 'active']
    return jsonify({"reports": active_reports})

@app.route('/api/lost-found/matches', methods=['GET'])
def get_lost_matches():
    """
    Get found matches for lost persons
    ---
    tags:
      - Lost and Found
    responses:
      200:
        description: List of matches found by AI
    """
    return jsonify({"matches": FOUND_MATCHES})



@app.route('/api/crowd/predict', methods=['POST'])
def predict_crowd():
    """
    Predict future crowd levels
    ---
    tags:
      - Crowd Prediction
    responses:
      200:
        description: Prediction result
        schema:
          type: object
          properties:
            prediction:
              type: string
            confidence:
              type: integer
    """
    return jsonify({
        "prediction": "Crowd in Zone Z1 expected to increase slightly, stabilizing at moderate levels.",
        "confidence": 72
    })

@app.route('/api/path/find', methods=['POST'])
def find_path():
    """
    Find simple path between two points
    ---
    tags:
      - Navigation
    responses:
      200:
        description: Path found
    """
    return jsonify({
        "path": [[77.5946, 12.9716], [77.5915, 12.9715], [77.5946, 12.9721]],
        "distance": "500m",
        "estimated_time": "5 mins"
    })

@app.route('/api/path/calculate', methods=['POST'])
def calculate_path():
    """
    Calculate optimal path avoiding crowd zones
    ---
    tags:
      - Navigation
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            start:
              type: string
              example: "Entrance"
            end:
              type: string
              example: "Main Stage"
            avoid:
              type: array
              items:
                type: string
              example: ["Food Court"]
    responses:
      200:
        description: Calculated path with instructions
        schema:
          type: object
          properties:
            path_nodes:
              type: array
              items:
                type: string
            instructions:
              type: array
              items:
                type: string
    """
    data = request.json
    start_location = data.get('start', 'Entrance')
    end_location = data.get('end', 'Main Stage')
    avoid_zones = data.get('avoid', []) 
    
    path = calculate_shortest_path(start_location, end_location, avoid_zones)
    
    if not path:
        return jsonify({"error": "No path found"}), 404
        
    path_coordinates = [VENUE_COORDINATES.get(node, [0,0]) for node in path]
    
    # Generate detailed voice navigation instructions
    voice_instructions = []
    for i, node in enumerate(path):
        if i == 0:
            voice_instructions.append(f"Starting navigation from {node}. Total {len(path) - 1} steps to {end_location}.")
        elif i == len(path) - 1:
            voice_instructions.append(f"Arriving at your destination, {node}. Navigation complete.")
        else:
            voice_instructions.append(f"Continue to {node}. Step {i} of {len(path) - 1}.")
    
    # Calculate total distance based on actual coordinates
    total_distance = len(path) * 400  # Approximate 400m per segment for spread out venues
    
    return jsonify({
        "path_nodes": path,
        "path_coordinates": path_coordinates,
        "avoid_zones": avoid_zones,
        "instructions": [f"Step {i+1}: {instr}" for i, instr in enumerate(voice_instructions)],
        "voice_instructions": voice_instructions,
        "total_distance_meters": total_distance,
        "estimated_time_minutes": round(total_distance / 83)  # Average walking speed 5 km/h = 83 m/min
    })

@app.route('/api/missing/register', methods=['POST'])
def register_missing():
    return jsonify({"status": "registered", "case_id": "case123", "message": "Missing person case registered successfully."})

@app.route('/api/missing/search', methods=['POST'])
def search_missing():
    return jsonify({
        "matched": True,
        "person_id": "person456",
        "confidence": 0.85,
        "last_seen_location": "Zone B",
        "timestamp": "2025-11-16T10:00:00Z",
        "matching_frames": [{"timestamp": "2025-11-16T10:00:00Z", "confidence": 0.85, "frame_url": "https://example.com/frame123.jpg"}]
    })

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def check_supabase_connection():
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        if url and key:
            supabase = create_client(url, key)
            supabase.table("lost_persons").select("*").limit(1).execute()
            print("Supabase connected and 'lost_persons' table found.")
            return True
    except Exception as e:
        print(f"Supabase connection issue: {e}")
        print("Running in in-memory mode. Data will not be persisted.")
        return False

if __name__ == '__main__':
    check_supabase_connection()
    app.run(debug=True, port=5000)
