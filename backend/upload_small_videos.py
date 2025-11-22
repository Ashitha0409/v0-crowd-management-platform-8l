"""
Upload smaller YT videos that Gemini can actually process
"""
import requests
import os

BASE_URL = "http://localhost:5000"

# Use SMALLER videos that w on't exceed Gemini limits
videos_to_upload = [
    {
        'path': r'..\..\uploads\yt_fire_emergency_evacuation_crowd_mall_1763777439.mp4',  # 2.4MB - FIRE!
        'endpoint': f'{BASE_URL}/api/cameras/testing/upload',
        'name': 'Testing - FIRE EMERGENCY'
    },
    {
        'path': r'..\..\uploads\yt_parking_lot_accident_emergency_1763773056.mp4',  # 19MB
        'endpoint': f'{BASE_URL}/api/cameras/parking/upload',
        'name': 'Parking - Accident'
    },
    {
        'path': r'..\..\uploads\yt_concert_crowd_main_stage_1763771338.mp4',  # 11MB
        'endpoint': f'{BASE_URL}/api/cameras/main-stage/upload',
        'name': 'Main Stage - Concert'
    },
    {
        'path': r'..\..\uploads\yt_crowd_walking_in_shopping_mall_1763771265.mp4',  # 2.3MB
        'endpoint': f'{BASE_URL}/api/cameras/food-court/upload',
        'name': 'Food Court - Shopping'
    },
]

print("="*70)
print("UPLOADING SMALL VIDEOS FOR DEMO")
print("="*70)

for i, video in enumerate(videos_to_upload, 1):
    print(f"\n[{i}/4] {video['name']}")
    
    if not os.path.exists(video['path']):
        print(f"  ❌ Not found: {video['path']}")
        continue
    
    size_mb = os.path.getsize(video['path']) / (1024*1024)
    print(f"  📊 Size: {size_mb:.1f} MB")
    print(f"  ⏳ Uploading...")
    
    try:
        with open(video['path'], 'rb') as f:
            response = requests.post(video['endpoint'], files={'video': f}, timeout=300)
        
        if response.ok:
            data = response.json()
            print(f"  ✅ SUCCESS!")
            
            analysis = data.get('analysis')
            if analysis:
                print(f"     Crowd: {analysis.get('crowd_count')}")
                print(f"     Density: {analysis.get('density_level')}")
                
                anomalies = analysis.get('anomalies', [])
                if anomalies:
                    print(f"     🚨 {len(anomalies)} ANOMALIES!")
                    for a in anomalies:
                        if isinstance(a, dict):
                            print(f"        - {a.get('type')}: {a.get('description')}")
            else:
                print(f"     ⚠️ No analysis data")
        else:
            print(f"  ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n" + "="*70)
print("UPLOAD COMPLETE!")
print("="*70)
print("\nCheck dashboards:")
print(" - User: http://localhost:3000/dashboard/user")
print(" - Admin: http://localhost:3000/dashboard/admin")
print(" - Responder: http://localhost:3000/dashboard/responder?type=fire")
