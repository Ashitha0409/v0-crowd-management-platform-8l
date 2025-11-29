"use client"

import React, { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet"
import L from "leaflet"

// Fix for default marker icons in Next.js
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png"
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png"
const shadowUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png"

const defaultIcon = L.icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
})

// Custom icon for current location (blue dot)
const currentLocationIcon = L.divIcon({
    className: 'current-location-marker',
    html: `<div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
})

// Custom icon for target location (red pin)
const targetLocationIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

interface VenueMapProps {
    path?: [number, number][]
    currentLocation?: [number, number]
    targetLocation?: [number, number]
    avoidZones?: { lat: number; lng: number; radius: number }[]
    onLocationUpdate?: (location: [number, number]) => void
    enableTracking?: boolean
}

// Component to update map view and track user location
function MapController({ center, enableTracking, onLocationUpdate }: {
    center: [number, number]
    enableTracking?: boolean
    onLocationUpdate?: (location: [number, number]) => void
}) {
    const map = useMap()

    useEffect(() => {
        if (map) {
            map.setView(center, map.getZoom())
        }
    }, [center, map])

    useEffect(() => {
        if (!enableTracking || !onLocationUpdate || !map) return

        let watchId: number | null = null

        if ('geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const newLocation: [number, number] = [
                        position.coords.latitude,
                        position.coords.longitude
                    ]
                    onLocationUpdate(newLocation)
                    map.setView(newLocation, map.getZoom())
                },
                (error) => {
                    let errorMessage = 'Unable to get your location. '
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Please allow location access in your browser settings.'
                            break
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Location information is unavailable.'
                            break
                        case error.TIMEOUT:
                            errorMessage += 'Location request timed out.'
                            break
                        default:
                            errorMessage += 'An unknown error occurred.'
                    }
                    console.warn('Geolocation error:', errorMessage)
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000
                }
            )
        } else {
            console.warn('Geolocation is not supported by your browser')
        }

        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId)
            }
        }
    }, [enableTracking, onLocationUpdate, map])

    return null
}

export default function VenueMap({
    path = [],
    currentLocation,
    targetLocation,
    avoidZones = [],
    onLocationUpdate,
    enableTracking = false
}: VenueMapProps) {
    const defaultCenter: [number, number] = [12.9716, 77.5946]
    const center = currentLocation || defaultCenter

    console.log("🗺️ VenueMap Render:", {
        pathLength: path.length,
        path,
        currentLocation,
        targetLocation
    })

    return (
        <div className="w-full h-[400px] rounded-lg overflow-hidden border border-slate-700 relative z-0">
            <MapContainer
                center={center}
                zoom={16}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController
                    center={center}
                    enableTracking={enableTracking}
                    onLocationUpdate={onLocationUpdate}
                />

                {/* Avoid Zones (Heatmap/Circles) */}
                {avoidZones.map((zone, index) => (
                    <Circle
                        key={`avoid-${index}`}
                        center={[zone.lat, zone.lng]}
                        radius={zone.radius}
                        pathOptions={{
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.4,
                            weight: 3
                        }}
                    >
                        <Popup>
                            <div className="text-center">
                                <strong className="text-red-600">⚠️ High Density Zone</strong>
                                <br />
                                <small>Avoid this area</small>
                            </div>
                        </Popup>
                    </Circle>
                ))}

                {/* PATH - THICK BLUE LINE */}
                {path && path.length > 1 && (
                    <>
                        <Polyline
                            positions={path}
                            pathOptions={{
                                color: '#2563eb',
                                weight: 10,
                                opacity: 1,
                                lineCap: 'round',
                                lineJoin: 'round'
                            }}
                        />
                        {/* Waypoint markers */}
                        {path.map((point, idx) => (
                            <Circle
                                key={`waypoint-${idx}`}
                                center={point}
                                radius={30}
                                pathOptions={{
                                    color: '#2563eb',
                                    fillColor: '#2563eb',
                                    fillOpacity: 1,
                                    weight: 3
                                }}
                            >
                                <Popup>
                                    <strong>Waypoint {idx + 1}</strong>
                                    <br />
                                    {point[0].toFixed(4)}, {point[1].toFixed(4)}
                                </Popup>
                            </Circle>
                        ))}
                    </>
                )}

                {/* Current Location Marker */}
                {currentLocation && (
                    <Marker position={currentLocation} icon={currentLocationIcon}>
                        <Popup>
                            <div className="text-center">
                                <strong>Your Location</strong>
                                <br />
                                <small>{currentLocation[0].toFixed(6)}, {currentLocation[1].toFixed(6)}</small>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Target Location Marker */}
                {targetLocation && (
                    <Marker position={targetLocation} icon={targetLocationIcon}>
                        <Popup>
                            <div className="text-center">
                                <strong>Incident Location</strong>
                                <br />
                                <small>{targetLocation[0].toFixed(6)}, {targetLocation[1].toFixed(6)}</small>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Pulsing animation CSS */}
            <style jsx global>{`
                @keyframes pulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
                    }
                }
                .current-location-marker div {
                    animation: pulse 2s infinite;
                }
            `}</style>
        </div>
    )
}
