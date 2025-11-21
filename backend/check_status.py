import requests
import json

def check_endpoints():
    try:
        # Check active anomalies
        print("--- Active Anomalies ---")
        response = requests.get('http://localhost:5000/api/anomalies/active', timeout=5)
        if response.status_code == 200:
            anomalies = response.json()
            print(json.dumps(anomalies, indent=2))
        else:
            print(f"Error: {response.status_code}")

        # Check all zones status
        print("\n--- All Zones Status ---")
        response = requests.get('http://localhost:5000/api/realtime/all-zones', timeout=5)
        if response.status_code == 200:
            zones = response.json()
            print(json.dumps(zones, indent=2))
        else:
            print(f"Error: {response.status_code}")

    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    check_endpoints()
