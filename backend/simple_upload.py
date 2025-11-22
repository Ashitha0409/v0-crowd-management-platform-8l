"""
Simple video uploader for presentation demo
Uploads videos one by one with detailed progress
"""

import requests
import os
import time

BASE_URL = "http://localhost:5000"

# Videos to upload
videos = [
    ("uploads/yt_crowded_shopping_mall_busy_people_1763773116.mp4", "food-court", "Food Court"),
    ("uploads/yt_parking_lot_accident_emergency_1763773056.mp4", "parking", "Parking"),
    ("uploads/yt_concert_crowd_main_stage_1763771338.mp4", "main-stage", "Main Stage"),
    ("uploads/yt_fire_emergency_evacuation_crowd_mall_1763777439.mp4", "testing", "Testing - FIRE"),
]

print("="*70)
print("UPLOADING DEMO VIDEOS")
print("="*70)

for i, (video_path, zone, name) in enumerate(videos, 1):
    print(f"\n[{i}/4] Uploading {name}...")
    
    if not os.path.exists(video_path):
        print(f"   ❌ File not found: {video_path}")
        continue
    
    try:
        url = f"{BASE_URL}/api/cameras/{zone}/upload"
        with open(video_path, 'rb') as f:
            files = {'video': f}
            print(f"   📤 Sending to {url}")
            
            start = time.time()
            response = requests.post(url, files=files, timeout=300)
            elapsed = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Success! ({elapsed:.1f}s)")
                
                analysis = data.get('analysis', {})
                if analysis:
                    print(f"   📊 Crowd: {analysis.get('crowd_count')}, Density: {analysis.get('density_level')}")
                    
                    anomalies = analysis.get('anomalies', [])
                    if anomalies:
                        print(f"   🚨 {len(anomalies)} ANOMALIES DETECTED!")
                        for a in anomalies:
                            if isinstance(a, dict):
                                print(f"      - {a.get('type').upper()}: {a.get('description')}")
            else:
                print(f"   ❌ Failed: {response.status_code}")
                
    except Exception as e:
        print(f"   ❌ Error: {e}")

print("\n" + "="*70)
print("DONE!")
print("="*70)
