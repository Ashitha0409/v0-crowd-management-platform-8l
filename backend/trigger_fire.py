import requests
import json

response = requests.post('http://localhost:5000/api/emergency/fire-alert')
data = response.json()

print("✅ FIRE EMERGENCY TRIGGERED")
print(f"   Incident ID: {data['incident_id']}")
print(f"   Type: {data['type']}")
print(f"   Location: {data['location']}")
print(f"   Confidence: {data['confidence']}%")
print(f"\n{data['message']}")
print(f"\n🔥 Fire anomaly is now active on responder dashboard!")
print(f"   Open: http://localhost:3000/dashboard/responder?type=fire")
