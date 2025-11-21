"""
Test script for Real-Time Monitoring Endpoints
Run this to verify all endpoints are working correctly
"""

import requests
import json
import sys

# Fix encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:5000"

def test_endpoints():
    print("=" * 60)
    print("TESTING REAL-TIME MONITORING ENDPOINTS")
    print("=" * 60)
    
    # Test 1: Get Camera Endpoints
    print("\n1. Testing GET /api/cameras/endpoints")
    try:
        response = requests.get(f"{BASE_URL}/api/cameras/endpoints")
        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] SUCCESS: Found {data['total_cameras']} camera endpoints")
            for endpoint in data['endpoints']:
                print(f"      - {endpoint['name']}: {endpoint['upload_endpoint']}")
        else:
            print(f"   [FAIL] FAILED: Status {response.status_code}")
    except Exception as e:
        print(f"   [ERROR] ERROR: {e}")
    
    # Test 2: Get All Zones Real-Time Data
    print("\n2. Testing GET /api/realtime/all-zones")
    try:
        response = requests.get(f"{BASE_URL}/api/realtime/all-zones")
        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] SUCCESS: Retrieved data for {len(data['zones'])} zones")
            for zone in data['zones']:
                print(f"      - {zone['zone_name']}: {zone['history_points']} data points, trend: {zone['trend']}")
        else:
            print(f"   [FAIL] FAILED: Status {response.status_code}")
    except Exception as e:
        print(f"   [ERROR] ERROR: {e}")
    
    # Test 3: Get Dashboard Summary
    print("\n3. Testing GET /api/realtime/dashboard-summary")
    try:
        response = requests.get(f"{BASE_URL}/api/realtime/dashboard-summary")
        if response.status_code == 200:
            data = response.json()
            summary = data['summary']
            print(f"   [OK] SUCCESS: Dashboard summary retrieved")
            print(f"      - Total Crowd Count: {summary['total_crowd_count']}")
            print(f"      - Total Active Anomalies: {summary['total_active_anomalies']}")
            print(f"      - Critical Zones: {summary['critical_zones_count']}")
            print(f"      - Monitored Zones: {summary['monitored_zones']}")
        else:
            print(f"   [FAIL] FAILED: Status {response.status_code}")
    except Exception as e:
        print(f"   [ERROR] ERROR: {e}")
    
    # Test 4: Get Zone History for each zone
    zones = ['food_court', 'parking', 'main_stage', 'testing']
    print("\n4. Testing GET /api/realtime/zone-history/{zone_id}")
    for zone_id in zones:
        try:
            response = requests.get(f"{BASE_URL}/api/realtime/zone-history/{zone_id}")
            if response.status_code == 200:
                data = response.json()
                print(f"   [OK] {zone_id}: {data['data_points']} data points")
            else:
                print(f"   [FAIL] {zone_id}: Status {response.status_code}")
        except Exception as e:
            print(f"   [ERROR] {zone_id}: ERROR - {e}")
    
    # Test 5: Check if zones have analysis data
    print("\n5. Checking Zone Analysis Status")
    zones_to_check = ['food_court', 'parking', 'main_stage', 'testing']
    for zone_id in zones_to_check:
        try:
            response = requests.post(f"{BASE_URL}/api/zones/{zone_id}/density")
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'no_data':
                    print(f"   [WARN] {zone_id}: No video uploaded yet")
                else:
                    print(f"   [OK] {zone_id}: Crowd count = {data.get('people_count', 0)}, Density = {data.get('density_level', 'Unknown')}")
            else:
                print(f"   [FAIL] {zone_id}: Status {response.status_code}")
        except Exception as e:
            print(f"   [ERROR] {zone_id}: ERROR - {e}")
    
    print("\n" + "=" * 60)
    print("ENDPOINT TESTING COMPLETE")
    print("=" * 60)
    print("\nNEXT STEPS:")
    print("1. If zones show 'No video uploaded yet', upload videos using:")
    print("   - Swagger UI: http://localhost:5000/api/docs")
    print("   - Or use curl commands from REALTIME_MONITORING_GUIDE.md")
    print("\n2. After uploading videos, run this script again to see data")
    print("\n3. Add <RealtimeMonitoring /> component to your dashboard")
    print("=" * 60)

if __name__ == "__main__":
    test_endpoints()

