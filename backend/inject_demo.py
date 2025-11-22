"""
DIRECT BACKEND DATA INJECTION
Directly modifies backend in-memory globals via HTTP to populate demo data
"""
import requests

BASE_URL = "http://localhost:5000"

print("="*70)
print("INJECTING DEMO Data DIRECTLY INTO BACKEND")
print("="*70)

# This will hit the backend endpoints to trigger storage
demo_scenarios = [
    {
        'zone': 'testing',
        'url': f'{BASE_URL}/api/anomaly/detect',  # Use existing anomaly detection endpoint
        'method': 'POST',
        'name': '🔥 FIRE EMERGENCY'
    }
]

for scenario in demo_scenarios:
    print(f"\n{scenario['name']}")
    try:
        response = requests.post(scenario['url'])
        if response.ok:
            print("  ✅ Triggered successfully")
            data = response.json()
            print(f"     Type: {data.get('anomaly_type')}")
            print(f"     Location: {data.get('location')}")
        else:
            print(f"  ⚠️  Status: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Error: {e}")

# Now verify
print("\n" + "="*70)
print("CHECKING RESULTS...")
print("="*70)

try:
    response = requests.get(f'{BASE_URL}/api/anoflies/active')
    if response.ok:
        anomalies = response.json()
        print(f"\n✅ Active anomalies: {len(anomalies)}")
        for a in anomalies:
            print(f"  - [{a.get('type')}] {a.get('description', '')[:50]}...")
    else:
        print(f"⚠️  Anomalies API returned: {response.status_code}")
except Exception as e:
    print(f"❌ Error checking anomalies: {e}")

print("\n✅ READY! Open dashboards to see fire anomaly")
print("   Admin: http://localhost:3000/dashboard/admin")
print("   Responder: http://localhost:3000/dashboard/responder?type=fire")
