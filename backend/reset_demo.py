import requests

try:
    response = requests.post('http://localhost:5000/api/demo/reset')
    if response.ok:
        print("✅ SYSTEM RESET COMPLETE")
        print("   All anomalies and zone data have been cleared.")
        print("   You can now run 'python trigger_fire.py' to start the demo scenario again.")
    else:
        print("❌ Reset failed")
except Exception as e:
    print(f"❌ Error: {e}")
