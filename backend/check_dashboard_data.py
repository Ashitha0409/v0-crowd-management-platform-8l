import requests

print("Checking dashboard data...")

# Check zones
response = requests.get("http://localhost:5000/api/realtime/all-zones")
if response.ok:
    data = response.json()
    print(f"\n✅ Zones endpoint working")
    print(f"Found {len(data.get('zones', []))} zones")
    for zone in data.get('zones', []):
        analysis = zone.get('current_analysis') or {}
        crowd = analysis.get('crowd_count', 0) if analysis else 0
        print(f"  - {zone.get('zone_name')}: {crowd} people")
else:
    print(f"❌ Zones endpoint failed: {response.status_code}")

# Check anomalies
response = requests.get("http://localhost:5000/api/anomalies/active")
if response.ok:
    data = response.json()
    print(f"\n✅ Anomalies endpoint working")
    print(f"Found {len(data)} active anomalies")
    for anom in data:
        print(f"  - [{anom.get('type')}] {anom.get('description')} at {anom.get('location')}")
else:
    print(f"❌ Anomalies endpoint failed: {response.status_code}")
