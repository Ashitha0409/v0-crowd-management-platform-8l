# 📚 Swagger UI API Documentation

## 🚀 Access Swagger UI

Once your Flask backend is running, access the interactive API documentation at:

**http://localhost:5000/api/docs**

## 🎯 How to Upload Videos Using Swagger UI

### Step 1: Start the Flask Backend
```bash
cd backend
python app.py
```

### Step 2: Open Swagger UI
Navigate to: **http://localhost:5000/api/docs**

### Step 3: Upload a Video

1. **Find the "Camera Management" section**
2. **Click on** `POST /api/cameras/upload-video`
3. **Click "Try it out"** button
4. **Fill in the parameters**:
   - **video**: Click "Choose File" and select your crowd video (MP4, AVI, MOV)
   - **zone_id** (optional): e.g., "zone1", "zone2", "main-stage"
   - **camera_id** (optional): e.g., "camera_01", "camera_entrance"

5. **Click "Execute"**

### Step 4: View Response
You'll see a JSON response like:
```json
{
  "message": "Video uploaded successfully",
  "video_url": "/uploads/crowd_video.mp4",
  "metadata": {
    "duration": "10:00",
    "resolution": "1080p",
    "zone_id": "zone1",
    "camera_id": "camera_01",
    "uploaded_at": "2025-11-20T17:30:00.000000Z"
  }
}
```

## 📋 All Available Endpoints

The Swagger UI will show all your API endpoints:

### Camera Management
- `POST /api/cameras/upload-video` - Upload crowd surveillance video

### Responder Management
- `GET /api/responders` - Get all responders
- `POST /api/call` - Initiate call to responder

### Zone Management
- `POST /api/zones/divide` - Divide venue into zones
- `POST /api/zones/{zone_id}/density` - Get zone crowd density

### Anomaly Detection
- `POST /api/anomaly/detect` - Detect anomalies in crowd

### Navigation
- `POST /api/path/calculate` - Calculate shortest path
- `POST /api/path/find` - Find path between locations

### Crowd Prediction
- `POST /api/crowd/predict` - Predict crowd behavior

### Missing Person
- `POST /api/missing/register` - Register missing person
- `POST /api/missing/search` - Search for missing person

## 🎨 Swagger UI Features

- **Interactive Testing**: Test all endpoints directly from the browser
- **Request/Response Examples**: See example payloads
- **Parameter Documentation**: Know exactly what to send
- **File Upload Support**: Upload videos with drag & drop
- **Response Codes**: See all possible HTTP responses

## 💡 Tips

1. **Video Formats**: Supported formats are MP4, AVI, MOV
2. **File Size**: No limit set (adjust in production)
3. **Zone IDs**: Use meaningful names like "main-stage", "food-court", "parking"
4. **Camera IDs**: Use identifiers like "camera_01", "cam_entrance", etc.

## 🔧 Testing with cURL

You can also test with cURL:
```bash
curl -X POST "http://localhost:5000/api/cameras/upload-video" \
  -F "video=@/path/to/your/video.mp4" \
  -F "zone_id=main-stage" \
  -F "camera_id=camera_01"
```

## 📁 Uploaded Files Location

All uploaded videos are saved in:
```
backend/uploads/
```

## 🎯 Next Steps

After uploading a video, you can:
1. **Detect Anomalies**: Use `/api/anomaly/detect` endpoint
2. **Get Crowd Density**: Use `/api/zones/{zone_id}/density`
3. **Predict Behavior**: Use `/api/crowd/predict`

---

**Swagger UI is now live at: http://localhost:5000/api/docs** 🎉
