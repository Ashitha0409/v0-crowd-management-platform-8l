"""
Test script for continuous video analysis
Uploads a video and monitors the continuous processing status
"""

import requests
import time
import os

BASE_URL = "http://localhost:5000"

def test_continuous_analysis():
    print("="*60)
    print("TESTING CONTINUOUS VIDEO ANALYSIS")
    print("="*60)
    
    # Check if video exists
    video_path = "WhatsApp Video 2025-11-21 at 11.19.43 PM.mp4"
    if not os.path.exists(video_path):
        print(f"\n[ERROR] Video file not found: {video_path}")
        print("Please place your video file in the current directory")
        return
    
    print(f"\n1. Uploading video: {video_path}")
    print("   Endpoint: /api/cameras/food-court/upload")
    print("   Mode: Continuous (default)")
    
    try:
        with open(video_path, 'rb') as f:
            files = {'video': f}
            response = requests.post(
                f"{BASE_URL}/api/cameras/food-court/upload",
                files=files,
                timeout=300  # 5 minutes for initial analysis
            )
        
        if response.status_code == 200:
            data = response.json()
            print("\n   ✓ Upload successful!")
            print(f"   Status: {data.get('status')}")
            print(f"   Continuous Mode: {data.get('continuous_mode')}")
            print(f"   Initial Analysis:")
            analysis = data.get('analysis', {})
            print(f"     - Crowd Count: {analysis.get('crowd_count')}")
            print(f"     - Density Level: {analysis.get('density_level')}")
            print(f"     - Description: {analysis.get('description', '')[:100]}...")
        else:
            print(f"\n   ✗ Upload failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    
    except Exception as e:
        print(f"\n   ✗ Upload error: {e}")
        return
    
    # Check continuous processing status
    print("\n2. Checking continuous processing status...")
    time.sleep(2)
    
    try:
        response = requests.get(f"{BASE_URL}/api/cameras/continuous/status")
        if response.status_code == 200:
            data = response.json()
            print(f"\n   Active Processors: {data.get('active_processors')}")
            for zone_id, info in data.get('processors', {}).items():
                print(f"\n   Zone: {zone_id}")
                print(f"     - Active: {info.get('active')}")
                print(f"     - Video: {info.get('video_path')}")
                print(f"     - Started: {info.get('started_at')}")
        else:
            print(f"   ✗ Status check failed: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Status check error: {e}")
    
    # Monitor real-time updates
    print("\n3. Monitoring real-time updates (30 seconds)...")
    print("   Fetching data every 5 seconds...\n")
    
    for i in range(6):  # 6 iterations = 30 seconds
        try:
            response = requests.get(f"{BASE_URL}/api/realtime/all-zones")
            if response.status_code == 200:
                data = response.json()
                zones = data.get('zones', [])
                
                for zone in zones:
                    if zone.get('zone_id') == 'food_court':
                        analysis = zone.get('current_analysis', {})
                        print(f"   [{i+1}/6] Food Court:")
                        print(f"         Crowd: {analysis.get('crowd_count', 'N/A')}")
                        print(f"         Density: {analysis.get('density_level', 'N/A')}")
                        print(f"         Timestamp: {analysis.get('timestamp', 'N/A')}")
                        break
        except Exception as e:
            print(f"   ✗ Update fetch error: {e}")
        
        if i < 5:
            time.sleep(5)
    
    print("\n4. Test complete!")
    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("="*60)
    print("1. Check backend terminal for continuous analysis logs")
    print("2. Open dashboard: http://localhost:3000/dashboard/user")
    print("3. Watch real-time data updates on the dashboard")
    print("4. To stop processing:")
    print("   curl -X POST http://localhost:5000/api/cameras/continuous/stop/food_court")
    print("="*60)

if __name__ == "__main__":
    try:
        test_continuous_analysis()
    except KeyboardInterrupt:
        print("\n\n[INFO] Test interrupted by user")
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
