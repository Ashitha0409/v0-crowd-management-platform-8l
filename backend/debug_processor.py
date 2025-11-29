"""
Debug script to check if continuous_video_processor has any errors
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test importing the function
try:
    from app import continuous_video_processor, ZONE_ANALYSIS, CAMERA_ENDPOINTS
    print("✅ Successfully imported continuous_video_processor")
    print(f"✅ ZONE_ANALYSIS: {ZONE_ANALYSIS}")
    print(f"✅ CAMERA_ENDPOINTS: {list(CAMERA_ENDPOINTS.keys())}")
except Exception as e:
    print(f"❌ Import error: {e}")
    import traceback
    traceback.print_exc()

# Try to check if Gemini is configured
try:
    import google.generativeai as genai
    print("✅ Gemini AI library imported successfully")
    
    # Check API key
    from app import get_gemini_key
    api_key = get_gemini_key()
    if api_key and "PASTE" not in api_key:
        print(f"✅ Gemini API key found: {api_key[:10]}...")
        genai.configure(api_key=api_key)
        print("✅ Gemini configured successfully")
        
        # Try to create model
        model = genai.GenerativeModel('models/gemini-2.0-flash-exp')
        print("✅ Gemini model created successfully")
    else:
        print("❌ No valid Gemini API key found")
except Exception as e:
    print(f"❌ Gemini error: {e}")
    import traceback
    traceback.print_exc()

# Check if video file exists
video_path = r'..\uploads\yt_crowd_walking_in_shopping_mall_1763771265.mp4'
if os.path.exists(video_path):
    print(f"✅ Video file exists: {video_path}")
    size_mb = os.path.getsize(video_path) / (1024*1024)
    print(f"   Size: {size_mb:.2f} MB")
else:
    print(f"❌ Video file not found: {video_path}")

print("\n" + "="*70)
print("DIAGNOSTIC COMPLETE")
print("="*70)
