from flask import Flask, request, jsonify
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

load_dotenv() # Load .env if present

# Global storage for analysis results
ZONE_ANALYSIS = {}
MESSAGES = []

app = Flask(__name__)
CORS(app)

# Swagger UI Configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
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
UPLOAD_FOLDER = 'uploads'
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

def analyze_video_with_gemini(video_path, zone_id):
    try:
        import google.generativeai as genai
        
        # Load API Key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            # Fallback to file - check multiple locations
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
            print("Gemini API Key not found or invalid.")
            return None

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
        
        prompt = """
        Analyze this CCTV footage for crowd management. 
        Return a JSON object with the following fields:
        - crowd_count (integer): Estimated number of people.
        - density_level (string): "Low", "Medium", "High", or "Critical".
        - anomalies (list of objects): List of anomalies. Each object should have:
            - type (string): "violence", "crowd_behavior", "abandoned_object", "unusual_movement", "gathering", or "other".
            - description (string): Brief description.
            - timestamp (string): Time of occurrence in "MM:SS" format.
            - confidence (integer): 0-100.
        - description (string): Brief summary of the scene.
        - sentiment (string): "Calm", "Agitated", "Panic", or "Happy".
        """
        
        response = model.generate_content([video_file, prompt], request_options={"timeout": 600})
        
        # Parse JSON from response
        text = response.text
        # Extract JSON block if wrapped in markdown
        match = re.search(r'```json\n(.*?)\n```', text, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            json_str = text
            
        analysis = json.loads(json_str)
        analysis['timestamp'] = datetime.utcnow().isoformat() + "Z"
        
        # Store in global
        ZONE_ANALYSIS[zone_id] = analysis
        print(f"Analysis complete for {zone_id}: {analysis}")
        return analysis
        
    except Exception as e:
        print(f"Gemini Analysis Error: {e}")
        return None

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
    Get all active anomalies across all zones
    """
    active_anomalies = []
    for zone_id, analysis in ZONE_ANALYSIS.items():
        raw_anomalies = analysis.get('anomalies', [])
        for a in raw_anomalies:
            if isinstance(a, dict):
                active_anomalies.append({
                    "id": f"{zone_id}_{a.get('timestamp', '0000')}_{random.randint(1000,9999)}",
                    "type": a.get('type', 'other'),
                    "description": a.get('description'),
                    "location": zone_id, # In real app, map ID to Name
                    "timestamp": analysis.get('timestamp'),
                    "video_timestamp": a.get('timestamp'),
                    "confidence": a.get('confidence', 80),
                    "status": "active",
                    "imageUrl": "/placeholder.svg" # Placeholder for now
                })
            else:
                active_anomalies.append({
                    "id": f"{zone_id}_{random.randint(1000,9999)}",
                    "type": "other",
                    "description": str(a),
                    "location": zone_id,
                    "timestamp": analysis.get('timestamp'),
                    "confidence": 80,
                    "status": "active",
                    "imageUrl": "/placeholder.svg"
                })
    return jsonify(active_anomalies)

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
