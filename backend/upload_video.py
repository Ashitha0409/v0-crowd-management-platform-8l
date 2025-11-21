"""
Simple video upload script for testing camera endpoints
Upload videos to any of the 4 camera zones
"""

import requests
import os
import sys

BASE_URL = "http://localhost:5000"

ENDPOINTS = {
    "1": {"name": "Food Court", "url": f"{BASE_URL}/api/cameras/food-court/upload"},
    "2": {"name": "Parking", "url": f"{BASE_URL}/api/cameras/parking/upload"},
    "3": {"name": "Main Stage", "url": f"{BASE_URL}/api/cameras/main-stage/upload"},
    "4": {"name": "Testing", "url": f"{BASE_URL}/api/cameras/testing/upload"},
}

def upload_video(video_path, endpoint_choice):
    """Upload video to selected endpoint"""
    
    if not os.path.exists(video_path):
        print(f"[ERROR] Video file not found: {video_path}")
        return False
    
    endpoint = ENDPOINTS.get(endpoint_choice)
    if not endpoint:
        print(f"[ERROR] Invalid endpoint choice: {endpoint_choice}")
        return False
    
    print(f"\n{'='*60}")
    print(f"Uploading to: {endpoint['name']}")
    print(f"Endpoint: {endpoint['url']}")
    print(f"Video: {video_path}")
    print(f"{'='*60}\n")
    
    try:
        with open(video_path, 'rb') as video_file:
            files = {'video': video_file}
            
            print("Uploading... (this may take a moment)")
            response = requests.post(endpoint['url'], files=files, timeout=300)
            
            if response.status_code == 200:
                data = response.json()
                print("\n[SUCCESS] Video uploaded and analyzed!")
                print(f"\nZone: {data.get('zone', 'Unknown')}")
                print(f"Message: {data.get('message', 'No message')}")
                
                analysis = data.get('analysis')
                if analysis:
                    print(f"\n--- Gemini AI Analysis ---")
                    print(f"Crowd Count: {analysis.get('crowd_count', 'N/A')}")
                    print(f"Density Level: {analysis.get('density_level', 'N/A')}")
                    print(f"Sentiment: {analysis.get('sentiment', 'N/A')}")
                    print(f"Description: {analysis.get('description', 'N/A')}")
                    
                    anomalies = analysis.get('anomalies', [])
                    if anomalies:
                        print(f"\nAnomalies Detected: {len(anomalies)}")
                        for i, anomaly in enumerate(anomalies, 1):
                            if isinstance(anomaly, dict):
                                print(f"  {i}. [{anomaly.get('type', 'Unknown')}] {anomaly.get('description', 'No description')}")
                                print(f"     Time: {anomaly.get('timestamp', 'N/A')}, Confidence: {anomaly.get('confidence', 'N/A')}%")
                    else:
                        print("\nNo anomalies detected")
                else:
                    print("\n[WARNING] No analysis data returned (Gemini API may have failed)")
                
                return True
            else:
                print(f"\n[ERROR] Upload failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
    except requests.exceptions.Timeout:
        print("\n[ERROR] Request timed out. Video analysis may take longer.")
        print("The video might still be processing. Check the backend logs.")
        return False
    except Exception as e:
        print(f"\n[ERROR] Upload failed: {e}")
        return False

def main():
    print("="*60)
    print("VIDEO UPLOAD TOOL - Real-Time Monitoring System")
    print("="*60)
    
    # Show available endpoints
    print("\nAvailable Camera Endpoints:")
    for key, endpoint in ENDPOINTS.items():
        print(f"  {key}. {endpoint['name']}")
    
    # Get endpoint choice
    print("\nSelect endpoint (1-4): ", end="")
    choice = input().strip()
    
    if choice not in ENDPOINTS:
        print(f"[ERROR] Invalid choice: {choice}")
        return
    
    # Get video path
    print("\nEnter video file path: ", end="")
    video_path = input().strip()
    
    # Remove quotes if present
    video_path = video_path.strip('"').strip("'")
    
    # Upload video
    success = upload_video(video_path, choice)
    
    if success:
        print("\n" + "="*60)
        print("NEXT STEPS:")
        print("1. Run test_realtime_endpoints.py to see updated data")
        print("2. Check the dashboard to see real-time graphs")
        print("3. Upload more videos to other zones for comparison")
        print("="*60)
    else:
        print("\n" + "="*60)
        print("TROUBLESHOOTING:")
        print("1. Ensure backend server is running (python app.py)")
        print("2. Check that Gemini API key is configured")
        print("3. Verify video file exists and is accessible")
        print("4. Check backend logs for detailed error messages")
        print("="*60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[INFO] Upload cancelled by user")
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
