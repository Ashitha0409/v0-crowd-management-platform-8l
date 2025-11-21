"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, Tooltip } from "react-leaflet"
import L from "leaflet"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Pencil, Check, MapPin, Calendar, User, Phone, FileText, ArrowRight, ArrowLeft } from "lucide-react"

// Fix for default marker icons
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

L.Marker.prototype.options.icon = defaultIcon

interface EventRegistrationMapProps {
    onEventCreated: (eventData: any) => void
}

function LocationSelector({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}

function DraggableMarker({ position, label, onDragEnd }: { position: [number, number], label: string, onDragEnd: (lat: number, lng: number) => void }) {
    const markerRef = useRef<L.Marker>(null)
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current
                if (marker != null) {
                    const { lat, lng } = marker.getLatLng()
                    onDragEnd(lat, lng)
                }
            },
        }),
        [onDragEnd],
    )

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}>
            <Popup minWidth={90}>
                <span>{label}</span>
            </Popup>
            <Tooltip permanent direction="top" offset={[0, -20]} opacity={0.8} className="text-xs font-bold">
                {label}
            </Tooltip>
        </Marker>
    )
}

export default function EventRegistrationMap({ onEventCreated }: EventRegistrationMapProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1)

    // Step 1: Event Details
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        type: "",
        description: "",
        organizer: "",
        contact: ""
    })

    // Step 2 & 3: Map & Zones
    const [center, setCenter] = useState<[number, number]>([12.9716, 77.5946]) // Bangalore
    const [radius, setRadius] = useState([500]) // meters
    const [eventLocation, setEventLocation] = useState<[number, number] | null>(null)
    const [zones, setZones] = useState<any[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingZoneId, setEditingZoneId] = useState<string | null>(null)

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleLocationSelect = (lat: number, lng: number) => {
        if (step === 2) {
            setEventLocation([lat, lng])
        }
    }

    const handlePreviewZones = async () => {
        if (!eventLocation) {
            toast.error("Please select a location on the map.")
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch('http://localhost:5000/api/events/preview-zones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location: { lat: eventLocation[0], lng: eventLocation[1] },
                    radius: radius[0]
                })
            })

            if (response.ok) {
                const data = await response.json()
                setZones(data)
                setStep(3)
                toast.success("Zones auto-calculated. You can now edit them.")
            } else {
                toast.error("Failed to calculate zones")
            }
        } catch (error) {
            console.error("Error previewing zones:", error)
            toast.error("Network error.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleZoneDrag = (index: number, lat: number, lng: number) => {
        const newZones = [...zones]
        newZones[index] = { ...newZones[index], lat, lng }
        setZones(newZones)
    }

    const handleZoneRename = (index: number, newName: string) => {
        const newZones = [...zones]
        newZones[index] = { ...newZones[index], name: newName }
        setZones(newZones)
    }

    const handleFinalSubmit = async () => {
        setIsSubmitting(true)
        try {
            const response = await fetch('http://localhost:5000/api/events/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    location: { lat: eventLocation![0], lng: eventLocation![1] },
                    radius: radius[0],
                    zones: zones
                })
            })

            const data = await response.json()

            if (response.ok) {
                onEventCreated(data)
            } else {
                toast.error("Failed to create event")
            }
        } catch (error) {
            console.error("Error creating event:", error)
            toast.error("Network error.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const nextStep = () => {
        if (step === 1) {
            if (!formData.name || !formData.date || !formData.type) {
                toast.error("Please fill in all required fields.")
                return
            }
            setStep(2)
        }
    }

    const prevStep = () => {
        if (step > 1) setStep(step - 1 as 1 | 2 | 3)
    }

    return (
        <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-6">
                <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-white' : 'border-muted-foreground'}`}>1</div>
                    <span className="text-sm font-medium hidden sm:inline">Details</span>
                </div>
                <div className="w-12 h-0.5 bg-slate-200"></div>
                <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-white' : 'border-muted-foreground'}`}>2</div>
                    <span className="text-sm font-medium hidden sm:inline">Location</span>
                </div>
                <div className="w-12 h-0.5 bg-slate-200"></div>
                <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-primary bg-primary text-white' : 'border-muted-foreground'}`}>3</div>
                    <span className="text-sm font-medium hidden sm:inline">Zones</span>
                </div>
            </div>

            {/* Step 1: Event Details */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                        <Label htmlFor="name">Event Name *</Label>
                        <Input
                            id="name"
                            placeholder="e.g., Summer Music Festival"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Event Date *</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="date"
                                type="date"
                                className="pl-9"
                                value={formData.date}
                                onChange={(e) => handleInputChange('date', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Event Type *</Label>
                        <Select value={formData.type} onValueChange={(val) => handleInputChange('type', val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="music">Music Concert</SelectItem>
                                <SelectItem value="sports">Sports Match</SelectItem>
                                <SelectItem value="conference">Conference</SelectItem>
                                <SelectItem value="exhibition">Exhibition</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="organizer">Organizer Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="organizer"
                                placeholder="Organization or Person"
                                className="pl-9"
                                value={formData.organizer}
                                onChange={(e) => handleInputChange('organizer', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Brief description of the event..."
                            className="resize-none"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="contact">Contact Information</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="contact"
                                placeholder="Phone number or email for emergency contact"
                                className="pl-9"
                                value={formData.contact}
                                onChange={(e) => handleInputChange('contact', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Location Selection */}
            {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-sm text-blue-800">
                        <p className="font-medium flex items-center"><MapPin className="h-4 w-4 mr-2" /> Set Event Location</p>
                        <p>Click on the map to pin the center of your event. Adjust the slider to set the event boundary.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Event Radius: {radius} meters</Label>
                        <Slider
                            value={radius}
                            onValueChange={setRadius}
                            max={2000}
                            step={50}
                            className="py-2"
                        />
                    </div>
                </div>
            )}

            {/* Step 3: Zone Preview */}
            {step === 3 && (
                <div className="bg-green-50 p-4 rounded-md border border-green-200 text-sm text-green-800 mb-2 animate-in fade-in slide-in-from-right-8 duration-500">
                    <p className="font-medium flex items-center"><Check className="h-4 w-4 mr-2" /> Review & Edit Zones</p>
                    <p>Drag markers to adjust zone locations. Rename zones in the list if needed.</p>
                </div>
            )}

            {/* Map Container - Visible in Step 2 & 3 */}
            {(step === 2 || step === 3) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[300px]">
                    <div className={`lg:col-span-${step === 3 ? '2' : '3'} h-full rounded-lg overflow-hidden border border-slate-200 relative shadow-inner`}>
                        <MapContainer
                            center={center}
                            zoom={14}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {step === 2 && <LocationSelector onLocationSelect={handleLocationSelect} />}

                            {eventLocation && (
                                <>
                                    <Marker position={eventLocation}>
                                        <Popup>Event Center</Popup>
                                    </Marker>
                                    <Circle
                                        center={eventLocation}
                                        radius={radius[0]}
                                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
                                    />
                                </>
                            )}

                            {step === 3 && zones.map((zone, idx) => (
                                <DraggableMarker
                                    key={idx}
                                    position={[zone.lat, zone.lng]}
                                    label={zone.name}
                                    onDragEnd={(lat, lng) => handleZoneDrag(idx, lat, lng)}
                                />
                            ))}
                        </MapContainer>

                        {step === 2 && !eventLocation && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 px-6 py-3 rounded-full shadow-xl z-[1000] text-sm font-medium text-slate-700 border animate-pulse">
                                Click map to set location
                            </div>
                        )}
                    </div>

                    {step === 3 && (
                        <div className="h-full flex flex-col">
                            <Label className="mb-2 font-semibold">Zone List ({zones.length})</Label>
                            <ScrollArea className="flex-1 border rounded-md p-2 bg-slate-50">
                                <div className="space-y-2">
                                    {zones.map((zone, idx) => (
                                        <Card key={idx} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-3 flex items-center justify-between">
                                                {editingZoneId === `zone-${idx}` ? (
                                                    <div className="flex items-center space-x-2 w-full">
                                                        <Input
                                                            value={zone.name}
                                                            onChange={(e) => handleZoneRename(idx, e.target.value)}
                                                            className="h-8 text-sm"
                                                            autoFocus
                                                        />
                                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingZoneId(null)}>
                                                            <Check className="h-4 w-4 text-green-600" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center space-x-2 overflow-hidden">
                                                            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                            <span className="text-sm font-medium truncate" title={zone.name}>{zone.name}</span>
                                                        </div>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={() => setEditingZoneId(`zone-${idx}`)}>
                                                            <Pencil className="h-3 w-3 text-slate-400 hover:text-slate-700" />
                                                        </Button>
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            )}

            {/* Navigation Buttons - Sticky Bottom */}
            <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-4 z-10 flex justify-between">
                <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={step === 1}
                    className={step === 1 ? "invisible" : ""}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                {step === 1 && (
                    <Button onClick={nextStep}>
                        Next: Location <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}

                {step === 2 && (
                    <Button onClick={handlePreviewZones} disabled={isSubmitting || !eventLocation}>
                        {isSubmitting ? "Calculating..." : "Next: Preview Zones"} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}

                {step === 3 && (
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Creating..." : "Create Event"} <Check className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
