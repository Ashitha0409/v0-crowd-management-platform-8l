import requests
import json
import time

# Wait for server to be ready
print("Waiting for server to be ready...")
time.sleep(2)

try:
    response = requests.post('http://localhost:5000/api/emergency/fire-alert', timeout=10)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Text: {response.text[:500]}")
    
    if response.status_code != 200:
        print(f"[ERROR] Server returned status {response.status_code}")
        print(f"Response: {response.text}")
        exit(1)
    
    data = response.json()
    
    print("[OK] FIRE EMERGENCY TRIGGERED")
    print(f"   Incident ID: {data['incident_id']}")
    print(f"   Type: {data['type']}")
    print(f"   Location: {data['location']}")
    print(f"   Confidence: {data['confidence']}%")
    print(f"\n{data['message']}")
    print(f"\n[!] Fire anomaly is now active on responder dashboard!")
    
    # Verify Graphs and Predictions
    print("\n[INFO] Verifying Graph Data & Predictions...")
    zones = ['testing', 'food_court', 'main_stage', 'parking']
    
    for zone in zones:
        try:
            # Check Prediction
            pred_response = requests.get(f'http://localhost:5000/api/crowd/prediction/{zone}')
            if pred_response.status_code == 200:
                pred_data = pred_response.json()
                print(f"   [OK] {zone.replace('_', ' ').title()} Prediction: Current {pred_data['current_count']} -> Forecast {pred_data['predicted_count_15min']} ({pred_data['trend']})")
            else:
                print(f"   [WARN] {zone.replace('_', ' ').title()} Prediction: Failed ({pred_response.status_code})")
    
            # Check History (Graph Data)
            hist_response = requests.get(f'http://localhost:5000/api/realtime/zone-history/{zone}')
            if hist_response.status_code == 200:
                hist_data = hist_response.json()
                points = hist_data.get('data_points', 0)
                print(f"      Graph History: {points} data points available")
            else:
                print(f"      Graph History: Failed ({hist_response.status_code})")
                
        except Exception as e:
            print(f"   [ERR] Error checking {zone}: {e}")
    
    print("\n[OK] System ready for demo!")
    
except requests.exceptions.ConnectionError:
    print("[ERROR] Cannot connect to server at http://localhost:5000")
    print("Make sure the Flask server is running: python app.py")
    exit(1)
except requests.exceptions.Timeout:
    print("[ERROR] Server request timed out")
    exit(1)
except Exception as e:
    print(f"[ERROR] {type(e).__name__}: {e}")
    exit(1)
