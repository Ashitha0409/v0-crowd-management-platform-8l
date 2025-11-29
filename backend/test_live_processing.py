"""
Test Live Frame-by-Frame Processing with Gemini AI
This script uploads a video and monitors live updates from the API
"""

import requests
import time
import os
from datetime import datetime

BASE_URL = "http://localhost:5000"

def print_header(text):
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70)

def print_status(emoji, text):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {emoji} {text}")

def test_live_processing():
    print_header("🎥 LIVE FRAME-BY-FRAME GEMINI AI PROCESSING TEST")
    
    # Find a video to upload
    video_path = r'..\uploads\yt_crowd_walking_in_shopping_mall_1763771265.mp4'
    
    if not os.path.exists(video_path):
        print_status("❌", f"Video not found: {video_path}")
        # Try other location
        video_path = r'..\..\uploads\yt_crowd_walking_in_shopping_mall_1763771265.mp4'
        if not os.path.exists(video_path):
            print_status("❌", "No test videos found!")
            return
    
    file_size = os.path.getsize(video_path) / (1024*1024)
    print_status("📂", f"Using video: {os.path.basename(video_path)}")
    print_status("📊", f"File size: {file_size:.2f} MB")
    
    # Upload video with continuous processing
    print_header("⬆️  UPLOADING VIDEO")
    
    try:
        with open(video_path, 'rb') as f:
            response = requests.post(
                f'{BASE_URL}/api/cameras/food-court/upload',
                files={'video': f},
                data={'continuous': 'true'},
                timeout=60
            )
        
        if response.ok:
            data = response.json()
            print_status("✅", data.get('message', 'Upload successful'))
            print_status("🎬", data.get('status', 'Processing...'))
        else:
            print_status("❌", f"Upload failed: {response.status_code}")
            return
    except Exception as e:
        print_status("❌", f"Upload error: {e}")
        return
    
    # Monitor live updates
    print_header("📡 MONITORING LIVE UPDATES (3-second intervals)")
    print_status("ℹ️", "Watching for AI analysis updates...")
    print_status("ℹ️", "Press Ctrl+C to stop monitoring\n")
    
    update_count = 0
    last_crowd_count = None
    last_timestamp = None
    
    try:
        while True:
            time.sleep(2)  # Check every 2 seconds
            
            try:
                # Get latest analysis
                response = requests.post(
                    f'{BASE_URL}/api/zones/food_court/density',
                    json={},
                    timeout=5
                )
                
                if response.ok:
                    data = response.json()
                    
                    if data.get('status') == 'no_data':
                        print_status("⏳", "Waiting for first analysis...")
                        continue
                    
                    crowd_count = data.get('crowd_count', 0)
                    density = data.get('density_level', 'Unknown')
                    timestamp_val = data.get('timestamp', '')
                    anomalies = data.get('anomalies', [])
                    description = data.get('description', '')
                    sentiment = data.get('sentiment', '')
                    
                    # Check if this is a new update
                    if timestamp_val != last_timestamp:
                        update_count += 1
                        last_timestamp = timestamp_val
                        
                        print()
                        print(f"{'─'*70}")
                        print(f"🔄 UPDATE #{update_count} - {timestamp_val[11:19] if len(timestamp_val) > 11 else ''}")
                        print(f"{'─'*70}")
                        print(f"   👥 Crowd Count: {crowd_count}")
                        print(f"   📊 Density: {density}")
                        print(f"   💭 Sentiment: {sentiment}")
                        print(f"   📝 Scene: {description}")
                        
                        if anomalies:
                            print(f"   🚨 ANOMALIES DETECTED: {len(anomalies)}")
                            for i, anomaly in enumerate(anomalies, 1):
                                if isinstance(anomaly, dict):
                                    anom_type = anomaly.get('type', 'Unknown')
                                    anom_desc = anomaly.get('description', '')
                                    confidence = anomaly.get('confidence', 0)
                                    print(f"      {i}. {anom_type} ({confidence}%): {anom_desc}")
                                else:
                                    print(f"      {i}. {anomaly}")
                        else:
                            print(f"   ✅ No anomalies detected")
                        
                        # Show change indicator
                        if last_crowd_count is not None:
                            diff = crowd_count - last_crowd_count
                            if diff > 0:
                                print(f"   📈 Crowd increased by {diff}")
                            elif diff < 0:
                                print(f"   📉 Crowd decreased by {abs(diff)}")
                            else:
                                print(f"   ➡️  Crowd stable")
                        
                        last_crowd_count = crowd_count
                        
            except requests.exceptions.RequestException as e:
                print_status("⚠️", f"Request error: {e}")
                time.sleep(3)
                
    except KeyboardInterrupt:
        print()
        print_header("⏹️  MONITORING STOPPED")
        print_status("📊", f"Total updates received: {update_count}")
        print_status("✅", "Test complete!")

if __name__ == "__main__":
    test_live_processing()
