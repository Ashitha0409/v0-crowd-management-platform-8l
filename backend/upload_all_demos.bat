@echo off
echo ============================================
echo UPLOADING DEMO VIDEOS
echo ============================================
echo.

echo [1/4] Uploading Food Court video...
echo 1 | python upload_video.py uploads\yt_crowded_shopping_mall_busy_people_1763773116.mp4
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Uploading Parking video...
echo 2 | python upload_video.py uploads\yt_parking_lot_accident_emergency_1763773056.mp4
timeout /t 2 /nobreak >nul

echo.
echo [3/4] Uploading Main Stage video...
echo 3 | python upload_video.py uploads\yt_concert_crowd_main_stage_1763771338.mp4
timeout /t 2 /nobreak >nul

echo.
echo [4/4] Uploading Testing (FIRE) video...
echo 4 | python upload_video.py uploads\yt_fire_emergency_evacuation_crowd_mall_1763777439.mp4

echo.
echo ============================================
echo ALL VIDEOS UPLOADED!
echo ============================================
pause
