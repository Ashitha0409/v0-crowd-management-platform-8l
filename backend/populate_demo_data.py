"""
MANUAL DEMO DATA POPULATOR
Directly populates the backend in-memory data structures for demo
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5000"

# Realistic demo data based on video types
demo_data = {
    'testing': {
        'crowd_count': 35,
       'density_level': 'Medium',
        'anomalies': [
            {
                'type': 'fire',
                'description': 'Fire emergency detected in building - smoke and flames visible, people evacuating',
                'timestamp': '00:15',
                'confidence': 95
            },
            {
                'type': 'crowd_behavior',
                'description': 'Emergency evacuation in progress - people moving towards exits',
                'timestamp': '00:20',
                'confidence': 88
            }
        ],
        'description': 'Fire emergency situation - building evacuation underway with visible smoke',
        'sentiment': 'Panic'
    },
    'parking': {
        'crowd_count': 12,
        'density_level': 'Low',
        'anomalies': [
            {
                'type': 'medical',
                'description': 'Possible vehicle accident - person on ground near vehicle',
                'timestamp': '01:30',
                'confidence': 75
            }
        ],
        'description': 'Parking lot with light vehicle and pedestrian traffic, incident detected',
        'sentiment': 'Calm'
    },
    'main_stage': {
        'crowd_count': 450,
        'density_level': 'Critical',
        'anomalies': [
            {
                'type': 'crowd_behavior',
                'description': 'Very high crowd density near stage - potential crowd surge risk',
                'timestamp': '02:15',
                'confidence': 82
            }
        ],
        'description': 'Concert event with large crowd concentrated near main stage area',
        'sentiment': 'Agitated'
    },
    'food_court': {
        'crowd_count': 78,
        'density_level': 'Medium',
        'anomalies': [],
        'description': 'Shopping mall food court with moderate crowd - normal busy activity',
        'sentiment': 'Calm'
    }
}

print("="*70)
print("POPULATING DEMO DATA DIRECTLY IN BACKEND")
print("="*70)

# First, post to each zone's density endpoint to trigger storage
for zone_id, analysis in demo_data.items():
    print(f"\n📊 {zone_id.replace('_', ' ').title()}")
    
    # Add timestamp
    analysis['timestamp'] = datetime.utcnow().isoformat() + 'Z'
    
    try:
        # Send POST to density endpoint
        response = requests.post(
            f'{BASE_URL}/api/zones/{zone_id}/density',
            json=analysis
        )
        
        if response.ok:
            print(f"  ✅ Data stored successfully")
            print(f"     Crowd: {analysis['crowd_count']} people")
            print(f"     Density: {analysis['density_level']}")
            
            if analysis['anomalies']:
                print(f"     🚨 {len(analysis['anomalies'])} ANOMALIES:")
                for a in analysis['anomalies']:
                    print(f"        - [{a['type'].upper()}] {a['description']}")
        else:
            print(f"  ⚠️  Response: {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n" + "="*70)
print("✅ DEMO DATA POPULATED!")
print("="*70)

# Verify
print("\n🔍 Verifying data...")
try:
    response = requests.get(f'{BASE_URL}/api/realtime/all-zones')
    if response.ok:
        data = response.json()
        print(f"\n✅ Found {len(data.get('zones', []))} zones with data")
        for zone in data.get('zones', []):
            analysis = zone.get('current_analysis')
            if analysis:
                count = analysis.get('crowd_count', 0)
                print(f"  - {zone.get('zone_name')}:  {count} people")
    
    # Check anomalies
    response = requests.get(f'{BASE_URL}/api/anomalies/active')
    if response.ok:
        anomalies = response.json()
        print(f"\n🚨 Active anomalies: {len(anomalies)}")
        for a in anomalies:
            print(f"  - [{a.get('type')}] {a.get('description')[:60]}...")
            
except Exception as e:
    print(f"Verification failed: {e}")

print("\n" + "="*70)
print("🎯 READY FOR PRESENTATION!")
print("="*70)
print("\nOpen these URLs:")
print(" 1. User Dashboard: http://localhost:3000/dashboard/user")
print(" 2. Admin Dashboard: http://localhost:3000/dashboard/admin")
print(" 3. Responder Dashboard: http://localhost:3000/dashboard/responder?type=fire")
print("\nThe FIRE anomaly should appear on admin dashboard and responder dashboard!")
