---
description: How to add a new camera zone to the system
---

# How to Add a New Camera Zone

This workflow describes how to add a new camera zone (e.g., "Entrance B") to the Crowd Management Platform.

## 1. Update Backend Configuration (`backend/app.py`)

1.  Open `backend/app.py`.
2.  Locate the `CAMERA_ENDPOINTS` dictionary.
3.  Add a new entry for your zone.
    ```python
    "entrance-b": {"name": "Entrance B", "coords": [12.9750, 77.5950]},
    ```
4.  (Optional) Add a dedicated upload endpoint for this zone if you want a specific URL (e.g., `/api/cameras/entrance-b/upload`).
    -   Copy an existing endpoint function (like `upload_video_food_court`).
    -   Change the function name and decorator path.
    -   Update the `zone_id` variable inside the function.

## 2. Update Frontend Configuration (`app/dashboard/user/page.tsx`)

The frontend dynamically fetches zones from `/api/realtime/all-zones`, so **no code changes are usually needed** in the frontend if you just want the zone to appear in the list!

However, if you want to add specific icons or colors for the new zone:
1.  Open `app/dashboard/user/page.tsx`.
2.  Check if there are any static maps or lists that need manual updating (currently, the system is designed to be dynamic).

## 3. Restart the Backend

1.  Stop the running backend process (Ctrl+C).
2.  Start it again:
    ```powershell
    python app.py
    ```

## 4. Verify

1.  Go to the Swagger UI: `http://localhost:5000/api/docs`.
2.  Upload a video to the new zone endpoint (or use the generic one if you didn't create a specific one).
3.  Check the User Dashboard. The new zone should appear in the "Heat Map" and "Predictions" tabs automatically.
