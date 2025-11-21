# Lost and Found Feature - Implementation Summary

## ✅ Overview
A complete "Lost and Found" system powered by Gemini AI to help locate lost persons in the crowd using CCTV feeds.

---

## 🔍 **How It Works**

1.  **Report**: User/Admin submits a report with photo and description.
2.  **Store**: Report is stored in the system (`LOST_PERSONS` list).
3.  **Scan**: Every time a video is analyzed by Gemini (via camera endpoints), the AI checks for matches against active lost person reports.
4.  **Match**: If a match is found, it's added to `FOUND_MATCHES` and displayed on the dashboard.
5.  **Notify**: Users see the match with location, confidence score, and timestamp.

---

## 🛠️ **Components**

### 1. Backend (`backend/app.py`)
-   **Storage**: `LOST_PERSONS` and `FOUND_MATCHES` (in-memory).
-   **Endpoints**:
    -   `POST /api/lost-found/report`: Submit a new report.
    -   `GET /api/lost-found/reports`: Get active reports.
    -   `GET /api/lost-found/matches`: Get found matches.
-   **AI Logic**: Updated `analyze_video_with_gemini` to include lost person descriptions in the prompt.

### 2. Frontend (`components/lost-and-found.tsx`)
-   **Report Form**: Name, Age, Description, Last Seen, Contact, Photo upload.
-   **Active Reports**: List of currently missing persons.
-   **Matches**: Real-time display of found persons with:
    -   Confidence Score (e.g., 92% Match)
    -   Location (Zone Name)
    -   Timestamp
    -   "Navigate to Location" button (placeholder)

### 3. Dashboard Integration
-   **User Dashboard**: Added "Lost & Found" tab.
-   **Admin Dashboard**: Added "Lost & Found" tab.

---

## 🚀 **Usage Guide**

### Reporting a Lost Person
1.  Go to **User Dashboard** > **Lost & Found**.
2.  Click **Report Lost Person**.
3.  Fill in details (Name, Description, etc.) and upload a photo.
4.  Click **Submit Report**.

### Finding a Person
1.  Upload videos to the camera endpoints (as usual).
2.  Gemini will automatically check for the lost person in the video.
3.  If found, a notification card appears in the **Found Matches** tab.
4.  The card shows **Location** and **Confidence**.

---

## 🧪 **Testing**

1.  **Submit Report**: Use the dashboard or `test_lost_found.py`.
2.  **Upload Video**: Upload a video containing the person to any camera endpoint.
3.  **Check Matches**: See if the person is detected and listed in the dashboard.

---

## 📝 **Notes**
-   The system uses **Gemini 1.5 Flash** for analysis.
-   Matching relies on the **text description** provided to the AI (e.g., "Wearing red shirt").
-   For better accuracy, ensure the description is detailed.
-   Data is stored in memory and resets on server restart.

## 🗄️ **Supabase Integration (Optional)**
The system is configured to work with Supabase for data persistence.
1.  **Credentials**: The project is connected to `https://qzxqxgcbtxfdemijxxty.supabase.co`.
2.  **Setup**: Run the SQL script in `SUPABASE_SCHEMA.sql` in your Supabase SQL Editor to create the necessary tables.
3.  **Activation**: Once tables are created, the backend can be updated to read/write from Supabase instead of in-memory lists.

