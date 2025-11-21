# GPS Navigation Testing Guide

## 🗺️ How to Test GPS Navigation Features

### Option 1: Enable Location Permissions (Recommended)

1. **Allow Location Access**:
   - When you click "Accept & Navigate", your browser will ask for location permission
   - Click "Allow" to enable real GPS tracking
   - The blue dot will show your actual location

2. **Chrome/Edge**: 
   - Click the lock icon in the address bar
   - Find "Location" and set to "Allow"
   - Refresh the page

3. **Firefox**:
   - Click the lock icon in the address bar
   - Click "Clear This Permission"
   - Refresh and allow when prompted

### Option 2: Simulate GPS Location (For Testing)

#### Chrome DevTools GPS Simulation:
1. Open Chrome DevTools (F12)
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "sensors" and select "Show Sensors"
4. In the Sensors tab, find "Location"
5. Select a preset location or enter custom coordinates:
   - **Bangalore coordinates**: `12.9716, 77.5946`
   - Or use "Other..." to enter custom lat/long

6. Click "Accept & Navigate" - the map will use your simulated location!

#### Firefox GPS Simulation:
1. Type `about:config` in the address bar
2. Search for `geo.enabled` and set to `true`
3. Install a location spoofing extension like "Location Guard"

### Option 3: Test Without GPS (Manual Mode)

If you don't enable GPS:
- The map will still work with the default starting location
- You can manually click "Mark as Arrived" when done
- Distance and ETA will be calculated from the default position
- Toggle GPS on/off using the "Enable GPS" button

## 🎯 Features to Test

### Real-Time Tracking:
- ✅ Blue pulsing dot shows your location
- ✅ Map auto-centers on your position
- ✅ Distance updates as you move
- ✅ ETA recalculates automatically

### Navigation:
- ✅ Turn-by-turn instructions
- ✅ Current step highlighted
- ✅ Avoid high-density zones (red circles)
- ✅ Optimal path shown (blue dashed line)

### Auto-Arrival:
- ✅ Detects when within 20 meters of destination
- ✅ Shows success notification
- ✅ Stops GPS tracking automatically

## 🔧 Troubleshooting

### "Geolocation error" in console:
- **Normal** - This appears when GPS permission is denied or unavailable
- The app will still work with default coordinates
- No action needed unless you want real GPS tracking

### GPS not updating:
1. Make sure you allowed location permissions
2. Check if location services are enabled on your device
3. Try refreshing the page
4. Use Chrome DevTools sensor simulation as fallback

### HTTPS Required for Production:
- Real GPS only works on HTTPS in production
- Localhost works for development
- Deploy to Vercel/Netlify for HTTPS in production

## 📱 Best Testing Approach

1. **Desktop Development**: Use Chrome DevTools sensor simulation
2. **Mobile Testing**: Deploy to HTTPS and test with real GPS
3. **Demo/Presentation**: Use simulated coordinates for consistent results

## 🚀 Quick Start

1. Go to `/dashboard/responder?type=medical`
2. Click "Accept & Navigate" on any incident
3. Allow location access when prompted
4. Watch the map track your location in real-time!

---

**Note**: The geolocation error in the console is expected behavior when GPS is not available. The app gracefully handles this and continues to work with default coordinates.
