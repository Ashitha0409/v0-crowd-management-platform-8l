"""
PRESENTATION READY SCRIPT
Run this to instantly populate all dashboards with realistic demo data
Including FIRE ANOMALY for responder demo
"""

print("="*70)
print("🎬 POPULATING PRESENTATION DATA...")
print("="*70)

# Import the backend's global variables directly
import sys
sys.path.insert(0, '.')

# We'll send minimal HTTP request to trigger the backend's endpoints
import requests
import json

BASE = "http://localhost:5000"

# The backend already has an anomaly detection endpoint that creates fire anomalies
# Let's just trigger it
print("\n🔥 Creating FIRE anomaly...")
try:
    response = requests.post(f"{BASE}/api/anomaly/detect")
    if response.ok:
        print("   ✅ FIRE anomaly created successfully!")
        data = response.json()
        print(f"   Type: {data.get('anomaly_type')}")
        print(f"   Location: {data.get('location')}")
        print(f"   Severity: {data.get('severity')}")
except Exception as e:
    print(f"   ⚠️  Could not create anomaly: {e}")

# Verify
print("\n🔍 Verifying...")
try:
    response = requests.get(f"{BASE}/api/anomalies/active")
    if response.ok:
        anomalies = response.json()
        print(f"✅ Found {len(anomalies)} active anomalies")
        for a in anomalies:
            print(f"   - [{a.get('type', '').upper()}] at {a.get('location')}")
except Exception as e:
    print(f"⚠️  Error: {e}")

print("\n" + "="*70)
print("✅ PRESENTATION DATA READY!")
print("="*70)
print("\n📊 Open Dashboards:")
print("   • User: http://localhost:3000/dashboard/user")
print("   • Admin: http://localhost:3000/dashboard/admin")
print("   • Responder (Fire): http://localhost:3000/dashboard/responder?type=fire")
print("\n🔥 The fire anomaly should appear in:")
print("   - Admin dashboard alerts section")
print("   - Responder dashboard active incidents")
print("   - Click 'Accept & Navigate' to see shortest path!")
