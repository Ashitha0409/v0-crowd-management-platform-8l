# Real-Time Monitoring System Guide

## Overview
This system provides **4 dedicated camera endpoints** with **Gemini AI analysis** and **real-time dynamic graphs** for crowd management.

---

## 📹 Camera Endpoints

### 1. Food Court Region
**Endpoint:** `POST /api/cameras/food-court/upload`
- **Purpose:** Monitor crowd density and activity in food court area
- **Zone ID:** `food_court`

### 2. Parking Area Region
**Endpoint:** `POST /api/cameras/parking/upload`
- **Purpose:** Monitor vehicle and pedestrian traffic in parking zones
- **Zone ID:** `parking`

### 3. Main Stage Region
**Endpoint:** `POST /api/cameras/main-stage/upload`
- **Purpose:** Monitor main stage crowd density and performer safety
- **Zone ID:** `main_stage`

### 4. Testing Region
**Endpoint:** `POST /api/cameras/testing/upload`
- **Purpose:** Testing and calibration zone for new camera feeds
- **Zone ID:** `testing`

---

## 📊 Real-Time Data Endpoints

### Get All Camera Endpoints
```bash
GET http://localhost:5000/api/cameras/endpoints
```
Returns list of all available camera endpoints.

### Get Zone History (for graphs)
```bash
GET http://localhost:5000/api/realtime/zone-history/{zone_id}
```
**Parameters:**
- `zone_id`: `food_court`, `parking`, `main_stage`, or `testing`

**Returns:** Historical data points (last 20 entries) for dynamic graphs

### Get All Zones Real-Time Data
```bash
GET http://localhost:5000/api/realtime/all-zones
```
Returns current analysis, trends, and latest data for all zones.

### Get Dashboard Summary
```bash
GET http://localhost:5000/api/realtime/dashboard-summary
```
Returns comprehensive metrics:
- Total crowd count across all zones
- Total active anomalies
- Critical zones
- Zone breakdown with crowd counts and density levels

---

## 🧪 Testing the System

### Step 1: Upload Videos to Each Zone

#### Food Court
```bash
curl -X POST http://localhost:5000/api/cameras/food-court/upload \
  -F "video=@path/to/food_court_video.mp4"
```

#### Parking
```bash
curl -X POST http://localhost:5000/api/cameras/parking/upload \
  -F "video=@path/to/parking_video.mp4"
```

#### Main Stage
```bash
curl -X POST http://localhost:5000/api/cameras/main-stage/upload \
  -F "video=@path/to/main_stage_video.mp4"
```

#### Testing
```bash
curl -X POST http://localhost:5000/api/cameras/testing/upload \
  -F "video=@path/to/test_video.mp4"
```

### Step 2: View Gemini Analysis
After uploading, each endpoint returns:
```json
{
  "message": "Video analyzed successfully",
  "zone": "Food Court",
  "analysis": {
    "crowd_count": 150,
    "density_level": "Medium",
    "anomalies": [
      {
        "type": "crowd_behavior",
        "description": "Large gathering near entrance",
        "timestamp": "00:45",
        "confidence": 85
      }
    ],
    "description": "Moderate crowd activity...",
    "sentiment": "Calm"
  }
}
```

### Step 3: Get Real-Time Graph Data
```bash
# Get historical data for Food Court
curl http://localhost:5000/api/realtime/zone-history/food_court

# Get all zones data
curl http://localhost:5000/api/realtime/all-zones

# Get dashboard summary
curl http://localhost:5000/api/realtime/dashboard-summary
```

---

## 📈 Dynamic Graphs

The system tracks the following metrics over time (last 20 data points):

1. **Crowd Count Trend**
   - Shows crowd count over time for each zone
   - Data: `ZONE_HISTORY[zone_id]`

2. **Density Level Changes**
   - Tracks density level (Low/Medium/High/Critical)
   - Visualizes crowd pressure over time

3. **Anomaly Count**
   - Number of detected anomalies per analysis
   - Helps identify incident patterns

### Example Graph Data Structure
```json
{
  "zone_id": "food_court",
  "history": [
    {
      "timestamp": "2025-11-21T16:30:00Z",
      "crowd_count": 120,
      "density_level": "Medium",
      "anomaly_count": 2
    },
    {
      "timestamp": "2025-11-21T16:35:00Z",
      "crowd_count": 150,
      "density_level": "High",
      "anomaly_count": 3
    }
  ],
  "data_points": 2
}
```

---

## 🎯 Frontend Integration

### Fetching Real-Time Data in React/Next.js

```typescript
// Fetch all zones data
const fetchZonesData = async () => {
  const response = await fetch('http://localhost:5000/api/realtime/all-zones')
  const data = await response.json()
  return data.zones
}

// Fetch zone history for graphs
const fetchZoneHistory = async (zoneId: string) => {
  const response = await fetch(`http://localhost:5000/api/realtime/zone-history/${zoneId}`)
  const data = await response.json()
  return data.history
}

// Fetch dashboard summary
const fetchDashboardSummary = async () => {
  const response = await fetch('http://localhost:5000/api/realtime/dashboard-summary')
  const data = await response.json()
  return data
}

// Auto-refresh every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchZonesData()
    fetchDashboardSummary()
  }, 30000)
  
  return () => clearInterval(interval)
}, [])
```

### Creating Dynamic Charts with Recharts

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CrowdTrendChart = ({ zoneId }: { zoneId: string }) => {
  const [history, setHistory] = useState([])
  
  useEffect(() => {
    const loadHistory = async () => {
      const data = await fetchZoneHistory(zoneId)
      setHistory(data)
    }
    loadHistory()
  }, [zoneId])
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={history}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="crowd_count" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## 🔄 Auto-Refresh Strategy

For real-time dashboards:

1. **Dashboard Summary:** Refresh every 30 seconds
2. **Zone History:** Refresh every 60 seconds
3. **Individual Zone Analysis:** Refresh on-demand or every 2 minutes

---

## 🚀 Quick Start

1. **Start Backend:**
   ```bash
   cd backend
   python app.py
   ```

2. **Upload Test Videos:**
   - Use Swagger UI: http://localhost:5000/api/docs
   - Or use curl commands above

3. **View Results:**
   - Check Swagger UI for responses
   - Use frontend dashboard to see graphs
   - Monitor real-time updates

---

## 📝 API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cameras/food-court/upload` | POST | Upload Food Court video |
| `/api/cameras/parking/upload` | POST | Upload Parking video |
| `/api/cameras/main-stage/upload` | POST | Upload Main Stage video |
| `/api/cameras/testing/upload` | POST | Upload Testing video |
| `/api/cameras/endpoints` | GET | List all camera endpoints |
| `/api/realtime/zone-history/{zone_id}` | GET | Get zone historical data |
| `/api/realtime/all-zones` | GET | Get all zones real-time data |
| `/api/realtime/dashboard-summary` | GET | Get dashboard summary |
| `/api/zones/{zone_id}/density` | POST | Get zone density (legacy) |

---

## 🎨 Dashboard Features

Your admin and user dashboards will show:

✅ **Real-time crowd counts** for all 4 zones
✅ **Dynamic line charts** showing crowd trends
✅ **Density level indicators** (Low/Medium/High/Critical)
✅ **Anomaly detection alerts** from Gemini AI
✅ **Historical trend analysis** (last 20 data points)
✅ **Auto-refreshing data** every 30-60 seconds

---

## 🔧 Troubleshooting

**No data showing?**
- Ensure videos are uploaded to each zone
- Check backend logs for Gemini API errors
- Verify Gemini API key is set correctly

**Graphs not updating?**
- Check if auto-refresh is enabled
- Verify API endpoints are accessible
- Check browser console for errors

**Analysis taking too long?**
- Gemini video analysis can take 30-60 seconds
- Use shorter videos for testing
- Check network connectivity

---

## 📞 Support

For issues or questions:
1. Check backend logs: `python app.py`
2. View Swagger docs: http://localhost:5000/api/docs
3. Test endpoints with curl or Postman
