"""
PRESENTATION DEMO SCRIPT
========================
This script uploads pre-selected videos to demonstrate:
1. Real-time zonal crowd analysis
2. Crowd density charts and predictions
3. Fire anomaly detection
4. Responder dashboard with navigation

Run this before your presentation to populate the dashboard with realistic data.
"""

import requests
import os
import time
from pathlib import Path

BASE_URL = "http://localhost:5000"

# Define the demo scenario with existing videos
DEMO_VIDEOS = {
    "1_food_court": {
        "name": "Food Court - Normal Crowd",
        "path": "uploads/yt_crowded_shopping_mall_busy_people_1763773116.mp4",
        "endpoint": f"{BASE_URL}/api/cameras/food-court/upload",
        "description": "Shows moderate crowd density in food court area"
    },
    "2_parking": {
        "name": "Parking - Light Activity", 
        "path": "uploads/yt_parking_lot_accident_emergency_1763773056.mp4",
        "endpoint": f"{BASE_URL}/api/cameras/parking/upload",
        "description": "Parking area with some activity"
    },
    "3_main_stage": {
        "name": "Main Stage - High Crowd",
        "path": "uploads/yt_concert_crowd_main_stage_1763771338.mp4",
        "endpoint": f"{BASE_URL}/api/cameras/main-stage/upload",
        "description": "High density crowd at main stage - concert scenario"
    },
    "4_fire_emergency": {
        "name": "Testing Zone - FIRE EMERGENCY",
        "path": "uploads/yt_fire_emergency_evacuation_crowd_mall_1763777439.mp4",
        "endpoint": f"{BASE_URL}/api/cameras/testing/upload",
        "description": "⚠️ FIRE ANOMALY - Will trigger emergency response"
    }
}

def upload_demo_video(video_info, index, total):
    """Upload a single video and display results"""
    
    print(f"\n{'='*70}")
    print(f"STEP {index}/{total}: {video_info['name']}")
    print(f"{'='*70}")
    print(f"Description: {video_info['description']}")
    print(f"Video: {video_info['path']}")
    print(f"Endpoint: {video_info['endpoint']}")
    print(f"\n⏳ Uploading and analyzing (this may take 30-60 seconds)...")
    
    video_path = video_info['path']
    
    # Check if file exists
    if not os.path.exists(video_path):
        print(f"❌ ERROR: Video not found at {video_path}")
        print(f"   Please ensure the video file exists in the uploads folder")
        return False
    
    try:
        with open(video_path, 'rb') as video_file:
            files = {'video': video_file}
            
            start_time = time.time()
            response = requests.post(
                video_info['endpoint'], 
                files=files, 
                timeout=300  # 5 minute timeout for Gemini processing
            )
            elapsed_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"\n✅ SUCCESS - Processed in {elapsed_time:.1f} seconds")
                print(f"\n{'─'*70}")
                print("📊 GEMINI AI ANALYSIS RESULTS:")
                print(f"{'─'*70}")
                
                analysis = data.get('analysis', {})
                if analysis:
                    print(f"   Zone: {data.get('zone', 'Unknown')}")
                    print(f"   Crowd Count: {analysis.get('crowd_count', 'N/A')}")
                    print(f"   Density Level: {analysis.get('density_level', 'N/A')}")
                    print(f"   Sentiment: {analysis.get('sentiment', 'N/A')}")
                    print(f"   Description: {analysis.get('description', 'N/A')}")
                    
                    anomalies = analysis.get('anomalies', [])
                    if anomalies:
                        print(f"\n   🚨 ANOMALIES DETECTED: {len(anomalies)}")
                        for i, anomaly in enumerate(anomalies, 1):
                            if isinstance(anomaly, dict):
                                print(f"\n   [{i}] {anomaly.get('type', 'Unknown').upper()}")
                                print(f"       Description: {anomaly.get('description', 'N/A')}")
                                print(f"       Confidence: {anomaly.get('confidence', 'N/A')}%")
                                print(f"       Timestamp: {anomaly.get('timestamp', 'N/A')}")
                                
                                # Highlight fire anomaly
                                if 'fire' in anomaly.get('type', '').lower():
                                    print(f"\n       ⚠️⚠️⚠️ FIRE DETECTED - CHECK RESPONDER DASHBOARD ⚠️⚠️⚠️")
                    else:
                        print(f"\n   ✓ No anomalies detected - Normal operation")
                else:
                    print(f"   ⚠️ WARNING: No analysis data returned")
                    print(f"   This might indicate Gemini API issues")
                
                return True
            else:
                print(f"\n❌ UPLOAD FAILED - Status {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
                
    except requests.exceptions.Timeout:
        print(f"\n⚠️ REQUEST TIMED OUT")
        print(f"   Video might still be processing in background")
        print(f"   Check backend logs for completion status")
        return False
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False

def check_backend_status():
    """Verify backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/api/realtime/all-zones", timeout=5)
        return response.status_code == 200
    except:
        return False

def main():
    print("\n" + "="*70)
    print("🎬 CROWD MANAGEMENT PLATFORM - PRESENTATION DEMO SETUP")
    print("="*70)
    
    # Check backend
    print("\n🔍 Checking backend status...")
    if not check_backend_status():
        print("❌ Backend is not running!")
        print("\nPlease start the backend server:")
        print("   cd backend")
        print("   python app.py")
        return
    
    print("✅ Backend is running and ready")
    
    # Show demo scenario
    print("\n" + "="*70)
    print("📋 DEMO SCENARIO OVERVIEW")
    print("="*70)
    print("\nThis demo will upload 4 videos to simulate a complete event scenario:")
    print("1. Food Court - Moderate crowd activity")
    print("2. Parking - Light activity with incident")
    print("3. Main Stage - High density concert crowd")
    print("4. Testing Zone - FIRE EMERGENCY (triggers anomaly)")
    print("\nAfter upload, you can demonstrate:")
    print("   • Real-time zonal analysis on User Dashboard")
    print("   • Crowd density charts and predictions")
    print("   • Fire anomaly appears on Admin Dashboard")
    print("   • Navigate to Responder Dashboard to handle emergency")
    print("   • Show shortest path navigation to incident")
    
    print("\n🚀 Starting video uploads automatically...")
    time.sleep(1)
    
    # Upload videos sequentially
    total = len(DEMO_VIDEOS)
    success_count = 0
    
    for index, (key, video_info) in enumerate(DEMO_VIDEOS.items(), 1):
        if upload_demo_video(video_info, index, total):
            success_count += 1
        
        # Small delay between uploads
        if index < total:
            print(f"\n⏳ Waiting 3 seconds before next upload...")
            time.time()
    
    # Summary
    print("\n" + "="*70)
    print("📊 DEMO SETUP COMPLETE")
    print("="*70)
    print(f"\nSuccessfully uploaded: {success_count}/{total} videos")
    
    if success_count == total:
        print("\n✅ ALL VIDEOS UPLOADED SUCCESSFULLY!")
        print("\n🎯 PRESENTATION FLOW:")
        print("="*70)
        print("\n1. USER DASHBOARD (http://localhost:3000/dashboard/user)")
        print("   • Show real-time heat map with all 4 zones")
        print("   • Click on each zone to see detailed analysis")
        print("   • Show crowd density trends and charts")
        print("   • Demonstrate prediction graphs")
        
        print("\n2. ADMIN DASHBOARD (http://localhost:3000/dashboard/admin)")
        print("   • Go to 'Real-Time' tab to see ZoneSummary")
        print("   • Show all zones with current analysis")
        print("   • Fire anomaly should appear in alerts")
        print("   • Show zone management with predictions")
        
        print("\n3. RESPONDER DASHBOARD (http://localhost:3000/dashboard/responder?type=fire)")
        print("   • Fire anomaly will appear in Active Incidents")
        print("   • Click 'Accept & Navigate' button")
        print("   • Show GPS-enabled navigation with voice instructions")
        print("   • Demonstrate shortest path avoiding congested areas")
        print("   • Show turn-by-turn directions")
        
        print("\n" + "="*70)
        print("💡 TIP: Open all three dashboards in different browser tabs")
        print("    for a seamless presentation flow")
        print("="*70)
    else:
        print(f"\n⚠️ WARNING: Only {success_count}/{total} videos uploaded successfully")
        print("   Check error messages above and retry failed uploads")
    
    print("\n✨ Ready to present! Good luck!")
    print("="*70 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏸️  Demo setup cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
