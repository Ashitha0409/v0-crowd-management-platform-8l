"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MapPin,
  AlertTriangle,
  NavigationIcon,
  Phone,
  MessageCircle,
  Activity,
  Users,
  Heart,
  Flame,
  Wrench,
  ShieldCheck,
  Timer,
  Route,
  Volume2,
  VolumeX,
} from "lucide-react"
import { AIChatbot } from "@/components/ai-chatbot"
import { Navigation } from "@/components/navigation"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { useVoiceNavigation } from "@/hooks/use-voice-navigation"

// Dynamically import VenueMap to avoid SSR issues with Leaflet
const VenueMap = dynamic(() => import("@/components/venue-map-leaflet"), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-slate-100 flex items-center justify-center">Loading Map...</div>
})

const mockIncidents: any = {} // Deprecated, using real data

const responderTypes = {
  medical: { name: "Medical Responder", icon: Heart, color: "text-red-500" },
  security: { name: "Security Responder", icon: ShieldCheck, color: "text-blue-500" },
  fire: { name: "Fire Responder", icon: Flame, color: "text-orange-500" },
  technical: { name: "Technical Responder", icon: Wrench, color: "text-purple-500" },
}

export default function ResponderDashboard() {
  const searchParams = useSearchParams()
  const responderType = (searchParams.get("type") as keyof typeof responderTypes) || "medical"
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null)
  const [responderStatus, setResponderStatus] = useState("available")
  const [currentLocationName, setCurrentLocationName] = useState("Entrance") // For display
  const [currentLocationCoords, setCurrentLocationCoords] = useState<[number, number]>([12.9716, 77.5946]) // Default Entrance coords
  const [updateForm, setUpdateForm] = useState({
    status: "",
    notes: "",
    evidence: null as File | null,
  })

  // Navigation State
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationPath, setNavigationPath] = useState<[number, number][]>([])
  const [avoidZones, setAvoidZones] = useState<{ lat: number; lng: number; radius: number }[]>([])
  const [instructions, setInstructions] = useState<string[]>([])
  const [targetLocationName, setTargetLocationName] = useState("")
  const [targetLocationCoords, setTargetLocationCoords] = useState<[number, number] | undefined>(undefined)
  const [enableGPSTracking, setEnableGPSTracking] = useState(false)
  const [distanceToTarget, setDistanceToTarget] = useState<number>(0)
  const [estimatedTime, setEstimatedTime] = useState<string>("")
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [voiceInstructions, setVoiceInstructions] = useState<string[]>([])

  // Voice Navigation
  const { speak, stop, toggle, isSpeaking, isEnabled: isVoiceEnabled, setIsEnabled: setVoiceEnabled } = useVoiceNavigation()

  const [incidents, setIncidents] = useState<any[]>([])
  const [messageText, setMessageText] = useState("")

  const fetchIncidents = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/anomalies/active')
      if (res.ok) {
        const data = await res.json()
        const formatted = data.map((a: any) => ({
          id: a.id,
          type: a.type,
          severity: a.confidence > 80 ? "high" : "medium",
          status: a.status,
          location: a.location,
          zone: a.location.toLowerCase().replace(/ /g, '-'),
          description: a.description,
          reportedBy: "AI System",
          timeReported: new Date(a.timestamp || Date.now()).toLocaleTimeString(),
          estimatedTime: "Unknown",
          distance: "Unknown",
          assignedTo: null,
          image_url: a.image_url || null
        }))
        setIncidents(formatted)
      }
    } catch (e) {
      console.error("Failed to fetch incidents", e)
    }
  }

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, 5000)
    return () => clearInterval(interval)
  }, [])

  // const incidents = mockIncidents[responderType] || [] // Replaced by state
  const ResponderIcon = responderTypes[responderType]?.icon || Activity
  const responderColor = responderTypes[responderType]?.color || "text-primary"

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-destructive"
      case "claimed":
        return "text-warning"
      case "investigating":
        return "text-primary"
      case "resolved":
        return "text-success"
      default:
        return "text-muted-foreground"
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }

  // Update distance and ETA when location changes
  const handleLocationUpdate = (newLocation: [number, number]) => {
    setCurrentLocationCoords(newLocation)

    if (targetLocationCoords && isNavigating) {
      const distance = calculateDistance(
        newLocation[0], newLocation[1],
        targetLocationCoords[0], targetLocationCoords[1]
      )
      setDistanceToTarget(distance)

      // Calculate ETA (assuming average walking speed of 5 km/h)
      const timeInHours = distance / 5
      const timeInMinutes = Math.round(timeInHours * 60)
      setEstimatedTime(timeInMinutes < 1 ? "< 1 min" : `${timeInMinutes} min`)

      // Check if arrived (within 20 meters)
      if (distance < 0.02) {
        toast.success("You have arrived at the incident location!")
        setIsNavigating(false)
        setEnableGPSTracking(false)
      }
    }
  }

  const handleClaimIncident = (incidentId: string) => {
    setSelectedIncident(incidentId)
    setResponderStatus("responding")
    toast.success("Incident claimed. Status updated to Responding.")
  }

  const handleAcceptAndNavigate = async (incident: any) => {
    handleClaimIncident(incident.id)
    setIsNavigating(true)

    const targetName = incident.zone === "testing" ? "Testing Region" :
      incident.zone === "main-stage" ? "Main Stage" :
        incident.zone === "food-court" ? "Food Court" :
          incident.zone === "entrance-b" ? "Entrance" :
            incident.zone === "parking-c" ? "Parking" :
              incident.zone === "parking" ? "Parking" :
                incident.zone === "backstage" ? "Backstage" :
                  incident.zone === "control-room" ? "Control Room" : "Testing Region"

    setTargetLocationName(targetName)

    try {
      // Mock fetching avoid zones (high density)
      // In real app, fetch from /api/zones/density
      const mockAvoid = ["Food Court"]

      // Coordinates for Food Court (mock) - increased radius for visibility
      const avoidZonesList = [{ lat: 12.9780, lng: 77.5980, radius: 200 }]
      setAvoidZones(avoidZonesList)

      console.log("🗺️ Navigation Request:", {
        start: currentLocationName,
        end: targetName,
        avoid: mockAvoid
      })

      const response = await fetch('http://localhost:5000/api/path/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: currentLocationName,
          end: targetName,
          avoid: mockAvoid
        })
      })

      if (response.ok) {
        const data = await response.json()

        console.log("📍 Backend Response:", data)

        // Realistic venue coordinates (within 500m radius - typical large venue)
        const NODE_COORDS: Record<string, [number, number]> = {
          "Entrance": [12.9716, 77.5946],
          "Security Gate": [12.9726, 77.5951],       // 130m from Entrance
          "Main Stage": [12.9741, 77.5961],          // 300m from Entrance  
          "Food Court": [12.9731, 77.5956],          // 200m from Entrance (avoid zone)
          "Parking": [12.9706, 77.5941],             // 150m from Entrance
          "Medical Bay": [12.9736, 77.5956],         // 250m from Entrance
          "Testing Region": [12.9746, 77.5951],      // 350m from Entrance (FIRE LOCATION)
          "Backstage": [12.9751, 77.5966],           // 450m from Entrance
          "VIP Area": [12.9746, 77.5961],            // 370m from Entrance
          "Control Room": [12.9721, 77.5946]         // 60m from Entrance
        }

        const pathCoords = data.path_nodes.map((node: string) => NODE_COORDS[node] || [12.9716, 77.5946])

        console.log("🛣️ Path Nodes:", data.path_nodes)
        console.log("📌 Path Coordinates:", pathCoords)
        console.log("🔴 Avoid Zones:", avoidZonesList)

        // Update all navigation state
        setNavigationPath(pathCoords)
        setTargetLocationCoords(NODE_COORDS[targetName])
        setInstructions(data.instructions || [])

        // Force current location to start node (Entrance)
        const startCoords = NODE_COORDS["Entrance"]
        setCurrentLocationCoords(startCoords)

        // Calculate distance using backend data OR calculate from coordinates
        const totalDistance = data.total_distance_meters || calculateDistance(
          startCoords[0], startCoords[1],
          NODE_COORDS[targetName][0], NODE_COORDS[targetName][1]
        )

        setDistanceToTarget(totalDistance) // Store in meters

        const timeInMinutes = data.estimated_time_minutes || Math.round((totalDistance / 1000 / 5) * 60)
        setEstimatedTime(timeInMinutes < 1 ? "< 1 min" : `${timeInMinutes} min`)

        // Enable voice and speak immediately
        if (data.voice_instructions && data.voice_instructions.length > 0) {
          setVoiceInstructions(data.voice_instructions)
          setVoiceEnabled(true)

          // Speak the first instruction immediately
          console.log("🔊 Speaking navigation instruction:", data.voice_instructions[0])
          speak(data.voice_instructions[0], true)
        }

        toast.success(`Route calculated: ${(totalDistance / 1000).toFixed(1)}km to ${targetName}`, {
          description: `ETA: ${timeInMinutes} min. Voice navigation active.`
        })
      } else {
        toast.error("Failed to calculate path.")
      }
    } catch (error) {
      console.error("Navigation error:", error)
      toast.error("Navigation service unreachable.")
    }
  }

  const handleUpdateIncident = () => {
    // Mock update - in real app, send to backend
    console.log("Updating incident:", selectedIncident, updateForm)
    setUpdateForm({ status: "", notes: "", evidence: null })
    toast.success("Incident report updated.")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Component */}
      <Navigation
        userRole="responder"
        userName="Dr. Sarah Johnson"
        eventName="Summer Music Festival 2025"
        unreadAlerts={5}
      />

      <div className="container mx-auto px-4 py-6">
        {/* Navigation Overlay/Modal */}
        {isNavigating && (
          <Card className="mb-6 border-primary border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <NavigationIcon className="h-5 w-5 text-primary animate-pulse" />
                  <span>Active Navigation</span>
                  {enableGPSTracking && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      📍 GPS Active
                    </Badge>
                  )}
                  {isVoiceEnabled && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      {isSpeaking ? "🔊 Speaking" : "🎙️ Voice On"}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setIsNavigating(false)
                  setEnableGPSTracking(false)
                  stop()
                }}>Close Map</Button>
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>Optimized route to {targetLocationName} avoiding crowd congestion</span>
                <div className="flex items-center space-x-4 text-sm font-medium">
                  <div className="flex items-center space-x-1">
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="text-primary">{distanceToTarget.toFixed(0)}m</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-muted-foreground">ETA:</span>
                    <span className="text-primary">{estimatedTime}</span>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 h-[400px]">
                  <VenueMap
                    key={`map-${targetLocationName}-${isNavigating}`}
                    path={navigationPath}
                    currentLocation={currentLocationCoords}
                    targetLocation={targetLocationCoords}
                    avoidZones={avoidZones}
                    enableTracking={enableGPSTracking}
                    onLocationUpdate={handleLocationUpdate}
                  />
                </div>
                <div className="space-y-4">
                  <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                    <h4 className="font-semibold flex items-center text-primary mb-2">
                      <Route className="h-4 w-4 mr-2" /> Navigation Info
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance:</span>
                        <span className="font-medium">{distanceToTarget.toFixed(0)} meters</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ETA:</span>
                        <span className="font-medium">{estimatedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GPS:</span>
                        <span className={`font-medium ${enableGPSTracking ? 'text-green-600' : 'text-gray-400'}`}>
                          {enableGPSTracking ? '✓ Active' : '✗ Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold flex items-center mb-2">
                      <Route className="h-4 w-4 mr-2" /> Turn-by-Turn
                    </h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {instructions.map((instruction, index) => (
                        <div
                          key={index}
                          className={`flex items-start space-x-2 p-2 rounded transition-all ${index === currentStepIndex
                            ? 'bg-primary/20 border border-primary'
                            : 'bg-muted/50'
                            }`}
                        >
                          <Badge
                            variant={index === currentStepIndex ? "default" : "outline"}
                            className="mt-0.5"
                          >
                            {index + 1}
                          </Badge>
                          <span className="text-sm">{instruction}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        if (targetLocationCoords) {
                          setCurrentLocationCoords(targetLocationCoords)
                          setCurrentLocationName(targetLocationName)
                        }
                        setIsNavigating(false)
                        setEnableGPSTracking(false)
                        stop()
                        toast.success("Arrived at location.")
                      }}
                    >
                      ✓ Mark as Arrived
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setEnableGPSTracking(!enableGPSTracking)
                        toast.info(enableGPSTracking ? "GPS tracking disabled" : "GPS tracking enabled")
                      }}
                    >
                      {enableGPSTracking ? "📍 Disable GPS" : "📍 Enable GPS"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        toggle()
                        toast.info(isVoiceEnabled ? "Voice navigation disabled" : "Voice navigation enabled")
                      }}
                    >
                      {isVoiceEnabled ? (
                        <><Volume2 className="h-4 w-4 mr-2" /> Disable Voice</>
                      ) : (
                        <><VolumeX className="h-4 w-4 mr-2" /> Enable Voice</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Incident Queue */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Active Incidents</span>
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <ResponderIcon className={`h-3 w-3 ${responderColor}`} />
                      <span>{responderTypes[responderType]?.name}</span>
                    </Badge>
                  </div>
                  <Badge variant="outline">{incidents.length} incidents</Badge>
                </CardTitle>
                <CardDescription>Priority incidents in your assigned zones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incidents.map((incident) => (
                    <Card
                      key={incident.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${selectedIncident === incident.id ? "ring-2 ring-primary" : ""
                        } ${incident.severity === "high" ? "border-destructive/50" : ""}`}
                      onClick={() => setSelectedIncident(incident.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                            <Badge variant="outline">{incident.id}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{incident.timeReported}</p>
                            <p className="text-xs text-muted-foreground">
                              {incident.estimatedTime} • {incident.distance}
                            </p>
                          </div>
                        </div>
                        <h3 className="font-semibold mb-1">{incident.type}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{incident.location}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>{incident.reportedBy}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {incident.status === "active" && !incident.assignedTo && (
                              <>
                                <Button size="sm" onClick={(e) => {
                                  e.stopPropagation()
                                  handleClaimIncident(incident.id)
                                }}>
                                  Claim
                                </Button>
                                <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={(e) => {
                                  e.stopPropagation()
                                  handleAcceptAndNavigate(incident)
                                }}>
                                  <NavigationIcon className="h-3 w-3 mr-1" />
                                  Accept & Navigate
                                </Button>
                              </>
                            )}
                            {incident.assignedTo && (
                              <Badge className={getStatusColor(incident.status)}>{incident.status}</Badge>
                            )}
                            {incident.assignedTo && (
                              <Button variant="outline" size="sm" onClick={(e) => {
                                e.stopPropagation()
                                handleAcceptAndNavigate(incident)
                              }}>
                                <NavigationIcon className="h-3 w-3 mr-1" />
                                Navigate
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Incident Details */}
            {selectedIncident && (
              <Card>
                <CardHeader>
                  <CardTitle>Incident Details - {selectedIncident}</CardTitle>
                  <CardDescription>Manage and update incident status</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="details" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="update">Update</TabsTrigger>
                      <TabsTrigger value="communication">Communication</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4">
                      {(() => {
                        const incident = incidents.find((i) => i.id === selectedIncident)
                        if (!incident) return null
                        return (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium">Type</Label>
                                <p className="text-sm">{incident.type}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Location</Label>
                                <p className="text-sm">{incident.location}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Reported By</Label>
                                <p className="text-sm">{incident.reportedBy}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Time Reported</Label>
                                <p className="text-sm">{incident.timeReported}</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium">Severity</Label>
                                <Badge variant={getSeverityColor(incident.severity)} className="ml-2">
                                  {incident.severity}
                                </Badge>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <Badge className={`ml-2 ${getStatusColor(incident.status)}`}>{incident.status}</Badge>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Assigned To</Label>
                                <p className="text-sm">{incident.assignedTo || "Unassigned"}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">ETA</Label>
                                <p className="text-sm">{incident.estimatedTime}</p>
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-sm font-medium">Description</Label>
                              <p className="text-sm mt-1">{incident.description}</p>
                              {incident.image_url && (
                                <div className="mt-4">
                                  <Label className="text-sm font-medium mb-2 block">Incident Evidence</Label>
                                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                                    <img
                                      src={incident.image_url}
                                      alt="Incident Evidence"
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </TabsContent>

                    <TabsContent value="update" className="space-y-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">Update Status</Label>
                          <Select
                            value={updateForm.status}
                            onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select new status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="investigating">Investigating</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="escalated">Escalated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Progress Notes</Label>
                          <Textarea
                            id="notes"
                            placeholder="Describe actions taken, current situation, next steps..."
                            value={updateForm.notes}
                            onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="evidence">Upload Evidence</Label>
                          <Input
                            id="evidence"
                            type="file"
                            accept="image/*,video/*"
                            onChange={(e) => setUpdateForm({ ...updateForm, evidence: e.target.files?.[0] || null })}
                          />
                        </div>
                        <Button onClick={handleUpdateIncident} className="w-full">
                          Submit Update
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="communication" className="space-y-4">
                      <div className="space-y-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="font-medium mb-2">Communication Log</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>System: Incident claimed</span>
                              <Badge variant="outline">System</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Send Message to Admin</Label>
                          <Textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type your message here..."
                          />
                          <Button onClick={async () => {
                            if (!messageText) return
                            try {
                              await fetch('http://localhost:5000/api/messages', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sender: "Responder",
                                  text: messageText,
                                  incidentId: selectedIncident
                                })
                              })
                              toast.success("Message sent")
                              setMessageText("")
                            } catch (e) {
                              toast.error("Failed to send")
                            }
                          }}>Send Message</Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Responder Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Responder Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Status</span>
                  <Badge
                    variant={responderStatus === "available" ? "outline" : "default"}
                    className={
                      responderStatus === "available"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    }
                  >
                    {responderStatus === "available" ? "Available" : "Responding"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{currentLocationName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Incidents</span>
                  <span className="font-medium">{incidents.filter((i) => i.assignedTo).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Response Time Avg</span>
                  <span className="font-medium">4.2 min</span>
                </div>
              </CardContent>
            </Card>

            {/* Zone Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zone Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Main Stage</span>
                    <Badge variant="outline">Primary</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Food Court</span>
                    <Badge variant="outline">Secondary</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Entrance A</span>
                    <Badge variant="outline">Backup</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report New Incident
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Route className="h-4 w-4 mr-2" />
                  Request Backup
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Timer className="h-4 w-4 mr-2" />
                  Break Request
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => window.open('tel:9886744362', '_self')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Dispatch
                </Button>
              </CardContent>
            </Card>

            {/* Team Communication */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dr. Sarah Johnson</span>
                    <Badge className="bg-warning/10 text-warning border-warning/20">Busy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Officer Mike Chen</span>
                    <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tech Lead Alex Kim</span>
                    <Badge className="bg-success/10 text-success border-success/20">Available</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* AI Chatbot */}
      <AIChatbot context="responder" />
    </div>
  )
}
