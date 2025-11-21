# Video Upload Guide - Multiple Methods

## 🎥 How to Upload Videos to Camera Endpoints

You have **3 methods** to upload videos. Choose the one that works best for you:

---

## ✅ **Method 1: Python Upload Script (RECOMMENDED)**

### Step 1: Run the upload script
```bash
cd backend
python upload_video.py
```

### Step 2: Follow the prompts
1. Select endpoint (1-4):
   - 1 = Food Court
   - 2 = Parking
   - 3 = Main Stage
   - 4 = Testing

2. Enter video file path (drag & drop the file or type the path)

### Example:
```
Select endpoint (1-4): 1
Enter video file path: C:\Users\inchara P\Videos\crowd_video.mp4
```

The script will:
- ✅ Upload the video
- ✅ Wait for Gemini AI analysis
- ✅ Display results (crowd count, density, anomalies)
- ✅ Show detailed anomaly information

---

## ✅ **Method 2: PowerShell/Command Line**

### For Food Court:
```powershell
curl.exe -X POST "http://localhost:5000/api/cameras/food-court/upload" `
  -F "video=@C:\path\to\your\video.mp4"
```

### For Parking:
```powershell
curl.exe -X POST "http://localhost:5000/api/cameras/parking/upload" `
  -F "video=@C:\path\to\your\video.mp4"
```

### For Main Stage:
```powershell
curl.exe -X POST "http://localhost:5000/api/cameras/main-stage/upload" `
  -F "video=@C:\path\to\your\video.mp4"
```

### For Testing:
```powershell
curl.exe -X POST "http://localhost:5000/api/cameras/testing/upload" `
  -F "video=@C:\path\to\your\video.mp4"
```

**Note:** Replace `C:\path\to\your\video.mp4` with your actual video path.

---

## ✅ **Method 3: Fix Swagger UI (if you prefer using it)**

### The "Failed to fetch" error in Swagger UI can be caused by:

1. **Browser CORS restrictions**
   - Try using a different browser (Chrome, Firefox, Edge)
   - Or disable CORS temporarily in browser settings

2. **Large file size**
   - Swagger UI may timeout on large videos
   - Use Method 1 or 2 for large files

3. **Backend not responding**
   - Check if backend is running: `python app.py`
   - Check backend logs for errors

### To use Swagger UI successfully:
1. Go to: http://localhost:5000/api/docs
2. Find the endpoint (e.g., `/api/cameras/food-court/upload`)
3. Click "Try it out"
4. Click "Choose File" and select a **small video** (< 50MB)
5. Click "Execute"
6. Wait for response (may take 30-60 seconds for Gemini analysis)

---

## 📹 **Video Requirements**

- **Formats:** MP4, AVI, MOV
- **Size:** Smaller is better for testing (< 100MB recommended)
- **Duration:** 10-60 seconds ideal for quick testing
- **Content:** Crowd scenes, parking areas, stage performances, etc.

---

## 🧪 **Testing Workflow**

### Step 1: Upload videos to all 4 zones
```bash
# Run the upload script 4 times
python upload_video.py

# Upload to:
# 1. Food Court
# 2. Parking
# 3. Main Stage
# 4. Testing
```

### Step 2: Verify data is stored
```bash
python test_realtime_endpoints.py
```

You should see:
- Crowd counts for each zone
- Density levels
- Anomaly counts
- Data points > 0

### Step 3: View in dashboard
Add the component to your admin dashboard:
```tsx
import { RealtimeMonitoring } from "@/components/realtime-monitoring"

<RealtimeMonitoring />
```

---

## 🔍 **Troubleshooting**

### Problem: "No video file provided"
**Solution:** Make sure you're using the correct parameter name `video` in the form data.

### Problem: "Gemini API Key not found"
**Solution:** 
1. Check `gemini_key.txt` exists in backend folder
2. Verify the key is valid (not "PASTE YOUR KEY HERE")
3. Or set environment variable: `GEMINI_API_KEY`

### Problem: "Video processing failed"
**Solution:**
1. Check backend logs for detailed error
2. Verify video format is supported (MP4, AVI, MOV)
3. Try a smaller/shorter video
4. Check internet connection (Gemini API requires internet)

### Problem: Upload takes too long
**Solution:**
- Gemini video analysis takes 30-60 seconds
- This is normal for AI processing
- Use smaller videos for faster testing
- Check backend logs to see progress

### Problem: "TypeError: Failed to fetch" in Swagger UI
**Solution:**
- Use Method 1 (Python script) instead
- Or use Method 2 (curl command)
- Swagger UI has known issues with large file uploads

---

## 📊 **Expected Response**

After successful upload, you'll get:

```json
{
  "message": "Food Court video analyzed successfully",
  "zone": "Food Court",
  "video_url": "/uploads/food_court_video.mp4",
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
    "description": "Moderate crowd activity in food court area...",
    "sentiment": "Calm",
    "timestamp": "2025-11-21T17:30:00Z"
  },
  "endpoint": {
    "id": "food_court",
    "name": "Food Court Region",
    "description": "Monitor crowd density and activity in food court area",
    "upload_endpoint": "/api/cameras/food-court/upload"
  }
}
```

---

## 🎯 **Quick Start**

**Fastest way to test:**

1. Open terminal in backend folder:
   ```bash
   cd backend
   ```

2. Run upload script:
   ```bash
   python upload_video.py
   ```

3. Select endpoint: `1` (Food Court)

4. Enter video path (drag & drop file into terminal)

5. Wait for analysis (30-60 seconds)

6. See results!

7. Repeat for other zones (2, 3, 4)

8. Run test script to verify:
   ```bash
   python test_realtime_endpoints.py
   ```

9. View dashboard to see graphs!

---

## 📝 **Notes**

- First upload to each zone takes longer (Gemini initialization)
- Subsequent uploads are faster
- Analysis results are stored in memory (lost on server restart)
- For production, use database for persistence
- Auto-refresh on dashboard shows updates every 30 seconds

---

## 🆘 **Still Having Issues?**

1. **Check backend is running:**
   ```bash
   # Should see Flask server output
   python app.py
   ```

2. **Check backend logs** for detailed error messages

3. **Verify Gemini API key:**
   ```bash
   # Should show your API key
   type gemini_key.txt
   ```

4. **Test with a simple endpoint:**
   ```bash
   curl http://localhost:5000/api/cameras/endpoints
   ```

5. **Use the Python upload script** - it has better error handling than Swagger UI

---

## ✅ **Success Checklist**

- [ ] Backend server running (`python app.py`)
- [ ] Gemini API key configured
- [ ] Video file ready (MP4/AVI/MOV)
- [ ] Upload script executed (`python upload_video.py`)
- [ ] Video uploaded successfully
- [ ] Gemini analysis received
- [ ] Test script shows data (`python test_realtime_endpoints.py`)
- [ ] Dashboard component added
- [ ] Real-time graphs visible

**You're all set! 🚀**
