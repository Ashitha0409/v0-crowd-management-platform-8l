# Continuous Video Analysis Guide

## Overview
The system now supports **continuous video analysis** that processes uploaded videos frame-by-frame and continuously updates the dashboard with real-time data using the Gemini API.

## How It Works

### 1. **Video Upload with Continuous Mode**
When you upload a video to any camera endpoint, the system:
- Performs an initial full video analysis
- Starts a background thread that continuously processes the video
- Analyzes frames every 10 seconds
- Loops the video when it reaches the end
- Updates the dashboard in real-time

### 2. **Frame-by-Frame Analysis**
The continuous processor:
- Extracts frames at 10-second intervals
- Sends each frame to Gemini API for analysis
- Updates `ZONE_ANALYSIS` and `ZONE_HISTORY` with new data
- Detects anomalies and sends SMS alerts
- Searches for lost persons in each frame

### 3. **Real-Time Dashboard Updates**
The frontend polls the backend every 5 seconds and receives:
- Updated crowd counts
- Current density levels
- New anomalies detected
- Found persons matches
- Trend analysis (increasing/decreasing/stable)

## API Endpoints

### Upload Video with Continuous Analysis

**Default Behavior**: Continuous mode is **enabled by default**

```bash
# Food Court
curl -X POST "http://localhost:5000/api/cameras/food-court/upload" \
  -F "video=@your_video.mp4"

# Parking
curl -X POST "http://localhost:5000/api/cameras/parking/upload" \
  -F "video=@your_video.mp4"

# Main Stage
curl -X POST "http://localhost:5000/api/cameras/main-stage/upload" \
  -F "video=@your_video.mp4"

# Testing
curl -X POST "http://localhost:5000/api/cameras/testing/upload" \
  -F "video=@your_video.mp4"
```

### Disable Continuous Mode (One-Time Analysis Only)

```bash
curl -X POST "http://localhost:5000/api/cameras/food-court/upload" \
  -F "video=@your_video.mp4" \
  -F "continuous=false"
```

### Check Continuous Processing Status

```bash
curl http://localhost:5000/api/cameras/continuous/status
```

**Response:**
```json
{
  "active_processors": 2,
  "processors": {
    "food_court": {
      "active": true,
      "video_path": "uploads/food_court_video.mp4",
      "started_at": "2025-11-21T19:30:00.000Z"
    },
    "parking": {
      "active": true,
      "video_path": "uploads/parking_video.mp4",
      "started_at": "2025-11-21T19:31:00.000Z"
    }
  }
}
```

### Stop Continuous Processing for a Zone

```bash
curl -X POST "http://localhost:5000/api/cameras/continuous/stop/food_court"
```

### Stop All Continuous Processing

```bash
curl -X POST "http://localhost:5000/api/cameras/continuous/stop-all"
```

## Configuration

### Analysis Interval
By default, frames are analyzed every **10 seconds**. To modify this:

1. Open `backend/app.py`
2. Find the `continuous_video_processor` function
3. Modify this line:
   ```python
   frame_interval = int(fps * 10)  # Change 10 to desired seconds
   ```

### Video Looping
Videos automatically loop when they reach the end. This ensures continuous monitoring even with short test videos.

## Requirements

### Python Dependencies
```bash
pip install opencv-python
```

All other dependencies are already installed:
- `google-generativeai` (Gemini API)
- `flask`, `flask-cors`
- `threading` (built-in)

### API Key
Ensure your Gemini API key is configured:
- Set `GEMINI_API_KEY` in `.env`, OR
- Place your key in `backend/gemini_key.txt`

## Usage Example

### Step 1: Upload Video
```bash
curl -X POST "http://localhost:5000/api/cameras/food-court/upload" \
  -F "video=@WhatsApp Video 2025-11-21 at 11.19.43 PM.mp4"
```

**Response:**
```json
{
  "message": "Food Court video analyzed successfully",
  "zone": "Food Court",
  "video_url": "/uploads/food_court_WhatsApp_Video_2025-11-21_at_11.19.43_PM.mp4",
  "analysis": {
    "crowd_count": 32,
    "density_level": "Low",
    "description": "The scene depicts a large, open-air restaurant...",
    "anomalies": [],
    "sentiment": "Calm",
    "timestamp": "2025-11-21T19:28:11.572372Z"
  },
  "continuous_mode": true,
  "status": "Processing continuously"
}
```

### Step 2: Monitor Backend Logs
You'll see continuous updates in the terminal:
```
[food_court] Starting continuous analysis: 3600 frames @ 30 FPS
[food_court] Analyzing every 300 frames (~10 seconds)
[food_court] Analyzing frame 300/3600 (0:10)
[food_court] Analysis #1: 32 people, Low density
[food_court] Analyzing frame 600/3600 (0:20)
[food_court] Analysis #2: 35 people, Low density
[food_court] Looping video...
```

### Step 3: View Real-Time Data on Dashboard
Open the User Dashboard or Admin Dashboard:
- **User Dashboard**: `http://localhost:3000/dashboard/user`
- **Admin Dashboard**: `http://localhost:3000/dashboard/admin`

The dashboard automatically fetches updated data every 5 seconds.

### Step 4: Stop Processing (Optional)
```bash
curl -X POST "http://localhost:5000/api/cameras/continuous/stop/food_court"
```

## Benefits

### 1. **Continuous Monitoring**
- No need to repeatedly upload videos
- Simulates live camera feeds
- Dashboard stays updated automatically

### 2. **Real-Time Alerts**
- Anomalies detected in each frame trigger SMS alerts
- Lost persons are continuously searched for
- Density changes are tracked over time

### 3. **Historical Data**
- Each analysis updates the zone history
- Trends are calculated (increasing/decreasing/stable)
- Prediction data is continuously refreshed

### 4. **Resource Efficient**
- Analyzes frames at intervals (not every frame)
- Background threads don't block API requests
- Videos loop automatically for continuous simulation

## Troubleshooting

### Issue: "Gemini API Key not found"
**Solution**: 
- Set `GEMINI_API_KEY` in `backend/.env`
- Or create `backend/gemini_key.txt` with your API key

### Issue: "Failed to open video"
**Solution**:
- Ensure the video file exists in the uploads folder
- Check file permissions
- Verify the video format is supported (MP4, AVI, MOV)

### Issue: Continuous processing not updating dashboard
**Solution**:
1. Check backend logs for errors
2. Verify the processor is active: `GET /api/cameras/continuous/status`
3. Ensure frontend is polling: Check browser console for API calls
4. Restart the backend server

### Issue: High CPU usage
**Solution**:
- Increase the frame interval (analyze less frequently)
- Stop unnecessary processors: `POST /api/cameras/continuous/stop-all`
- Use shorter videos for testing

## Advanced Usage

### Multiple Zones Simultaneously
You can run continuous analysis on all 4 zones at once:

```bash
# Upload to all zones
curl -X POST "http://localhost:5000/api/cameras/food-court/upload" -F "video=@video1.mp4"
curl -X POST "http://localhost:5000/api/cameras/parking/upload" -F "video=@video2.mp4"
curl -X POST "http://localhost:5000/api/cameras/main-stage/upload" -F "video=@video3.mp4"
curl -X POST "http://localhost:5000/api/cameras/testing/upload" -F "video=@video4.mp4"

# Check all active processors
curl http://localhost:5000/api/cameras/continuous/status
```

### Custom Analysis Logic
To modify what gets analyzed in each frame, edit the `continuous_video_processor` function in `backend/app.py`:

```python
# Around line 800
prompt = f"""
Analyze this CCTV frame for crowd management.
{lost_persons_desc}
Return a JSON object with:
- crowd_count (integer): Estimated number of people.
- density_level (string): "Low", "Medium", "High", or "Critical".
# Add your custom analysis requirements here
"""
```

## Summary

✅ **Continuous video analysis is now enabled by default**  
✅ **Videos are analyzed frame-by-frame every 10 seconds**  
✅ **Dashboard receives real-time updates automatically**  
✅ **Videos loop continuously for ongoing monitoring**  
✅ **Multiple zones can be monitored simultaneously**  
✅ **Processing can be stopped/started via API**

Your crowd management platform now provides true real-time monitoring capabilities! 🎉
