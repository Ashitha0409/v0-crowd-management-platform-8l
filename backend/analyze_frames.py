"""
Quick fix: Extract frames from videos and analyze those instead
This avoids Gemini video size limits
"""
import cv2
import os
import requests
import json

def extract_frame(video_path, output_path):
    """Extract a single frame from video"""
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(output_path, frame)
    cap.release()
    return ret

def analyze_image_direct(image_path, zone_id):
    """Directly analyze image frame and store in backend"""
    import google.generativeai as genai
    
    # Load key
    with open('gemini_key.txt') as f:
        api_key = f.read().strip()
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    prompt = """
    Analyze this crowd surveillance image. Return JSON with:
    - crowd_count (int): Number of people
    - density_level (string): "Low", "Medium", "High", or "Critical"
    - anomalies (list): Each with type, description, confidence (0-100)
      Types: "fire", "violence", "crowd_behavior", "medical", "suspicious_activity"
    - description (string): Brief summary
    - sentiment (string): "Calm", "Agitated", "Panic", or "Happy"
    
    For fire emergency videos, look for:
    - Flames, smoke, or fire
    - People evacuating or running
    - Emergency response
    """
    
    img = genai.upload_file(image_path)
    response = model.generate_content([img, prompt])
    
    # Parse JSON
    text = response.text
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0]
    
    return json.loads(text.strip())

# Process all videos
videos = [
    ('..\\..\\uploads\\yt_fire_emergency_evacuation_crowd_mall_1763777439.mp4', 'testing', 'Testing - FIRE'),
    ('..\\..\\uploads\\yt_parking_lot_accident_emergency_1763773056.mp4', 'parking', 'Parking'),
    ('..\\..\\uploads\\yt_concert_crowd_main_stage_1763771338.mp4', 'main_stage', 'Main Stage'),
    ('..\\..\\uploads\\yt_crowd_walking_in_shopping_mall_1763771265.mp4', 'food_court', 'Food Court'),
]

print("="*70)
print("ANALYZING VIDEO FRAMES WITH GEMINI")
print("="*70)

for video_path, zone_id, name in videos:
    print(f"\n📹 {name}")
    
    if not os.path.exists(video_path):
        print(f"  ❌ Not found")
        continue
    
    # Extract frame
    frame_path = f'temp_{zone_id}_frame.jpg'
    print(f"  📸 Extracting frame...")
    if not extract_frame(video_path, frame_path):
        print(f"  ❌ Failed to extract frame")
        continue
    
    # Analyze with Gemini
    print(f"  🤖 Analyzing with Gemini...")
    try:
        analysis = analyze_image_direct(frame_path, zone_id)
        
        print(f"  ✅ Analysis complete!")
        print(f"     Crowd: {analysis.get('crowd_count')}")
        print(f"     Density: {analysis.get('density_level')}")
        
        anomalies = analysis.get('anomalies', [])
        if anomalies:
            print(f"     🚨 {len(anomalies)} ANOMALIES DETECTED:")
            for a in anomalies:
                print(f"        - [{a.get('type', '').upper()}] {a.get('description')}")
                print(f"          Confidence: {a.get('confidence')}%")
        
        # Store in backend
        print(f"  💾 Storing data in backend...")
        requests.post(f'http://localhost:5000/api/zones/{zone_id}/update-analysis', json=analysis)
        
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n" + "="*70)
print("✅ ALL FRAMES ANALYZED!")
print("="*70)
print("\nDashboards should now show data:")
print(" - User: http://localhost:3000/dashboard/user")
print(" - Admin: http://localhost:3000/dashboard/admin  ")
print(" - Responder: http://localhost:3000/dashboard/responder?type=fire")
