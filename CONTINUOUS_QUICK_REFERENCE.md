# 🎥 Continuous Video Analysis - Quick Reference

## Upload Video (Continuous Mode ON by Default)

```bash
curl -X POST "http://localhost:5000/api/cameras/food-court/upload" \
  -F "video=@your_video.mp4"
```

**Response:**
```json
{
  "continuous_mode": true,
  "status": "Processing continuously",
  "analysis": { "crowd_count": 32, "density_level": "Low", ... }
}
```

## Check Status

```bash
curl http://localhost:5000/api/cameras/continuous/status
```

## Stop Processing

```bash
# Stop specific zone
curl -X POST "http://localhost:5000/api/cameras/continuous/stop/food_court"

# Stop all zones
curl -X POST "http://localhost:5000/api/cameras/continuous/stop-all"
```

## Test Script

```bash
cd backend
python test_continuous_analysis.py
```

## View Dashboard

- **User Dashboard**: http://localhost:3000/dashboard/user
- **Admin Dashboard**: http://localhost:3000/dashboard/admin

Data refreshes automatically every 5 seconds!

## Backend Logs

```
[food_court] Starting continuous analysis: 3600 frames @ 30 FPS
[food_court] Analyzing every 300 frames (~10 seconds)
[food_court] Analysis #1: 32 people, Low density
[food_court] Analysis #2: 35 people, Low density
```

## All Camera Endpoints

1. **Food Court**: `/api/cameras/food-court/upload`
2. **Parking**: `/api/cameras/parking/upload`
3. **Main Stage**: `/api/cameras/main-stage/upload`
4. **Testing**: `/api/cameras/testing/upload`

## Disable Continuous Mode (One-Time Analysis)

```bash
curl -X POST "http://localhost:5000/api/cameras/food-court/upload" \
  -F "video=@your_video.mp4" \
  -F "continuous=false"
```

## Configuration

**Change analysis interval** (default: 10 seconds):
- Edit `backend/app.py` line ~753
- Change: `frame_interval = int(fps * 10)`

## Key Features

✅ Analyzes frames every 10 seconds  
✅ Videos loop automatically  
✅ Dashboard updates in real-time  
✅ SMS alerts for anomalies  
✅ Lost person detection  
✅ Multi-zone support  

## Documentation

- **Complete Guide**: `CONTINUOUS_ANALYSIS_GUIDE.md`
- **Implementation Summary**: `CONTINUOUS_IMPLEMENTATION_SUMMARY.md`
