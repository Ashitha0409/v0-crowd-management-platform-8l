import requests
import os

BASE_URL = "http://localhost:5000/api"
VIDEO_DIR = "public/videos"

def upload_video(filename, zone_id):
    filepath = os.path.join(VIDEO_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    print(f"Uploading {filename} for {zone_id}...")
    with open(filepath, 'rb') as f:
        files = {'video': f}
        data = {'zone_id': zone_id}
        try:
            res = requests.post(f"{BASE_URL}/cameras/upload-video", files=files, data=data)
            print(f"Status: {res.status_code}")
            if res.status_code == 200:
                print("Success!")
                print(res.json().get('analysis', {}).get('description', 'No description'))
            else:
                print(res.text)
        except Exception as e:
            print(f"Failed: {e}")

if __name__ == "__main__":
    # Use zone IDs that match the frontend expectations
    upload_video("cam1.mp4", "main_stage") 
    upload_video("food.mp4", "food_court")
