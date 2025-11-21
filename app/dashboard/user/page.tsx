"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  MapPin,
  Clock,
  Users,
  AlertTriangle,
  Search,
  Upload,
  TrendingUp,
  Activity,
  MessageCircle,
  Camera,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { AIChatbot } from "@/components/ai-chatbot"
import { AIAnomalyDetection } from "@/components/ai-anomaly-detection"
import { Navigation } from "@/components/navigation"
import { LostAndFound } from "@/components/lost-and-found"

// Data interfaces
interface Zone {
  id: string
  name: string
  density: number
  status: string
  prediction: number
}

interface AlertItem {
  id: string | number
  type: string
  severity: string
  message: string
  time: string
  zone: string
}


export default function UserDashboard() {
  // State for dashboard data
  const [zones, setZones] = useState<Zone[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [crowdData, setCrowdData] = useState<any[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch zones
        const resZones = await fetch('http://localhost:5000/api/realtime/all-zones')
        if (resZones.ok) {
          const data = await resZones.json()

          const formattedZones: Zone[] = (data.zones || []).map((z: any) => ({
            id: z.zone_id,
            name: z.zone_name || z.zone_id,
            density: z.current_analysis?.crowd_count || 0,
            status: z.current_analysis?.density_level?.toLowerCase() || 'low',
            prediction: 0
          }))

          if (!selectedZone && formattedZones.length > 0) {
            setSelectedZone(formattedZones[0].id)
          }

          // Fetch predictions
          for (const zone of formattedZones) {
            try {
              const resPred = await fetch(`http://localhost:5000/api/crowd/prediction/${zone.id}`)
              if (resPred.ok) {
                const predData = await resPred.json()
                zone.prediction = predData.predicted_count_15min
                // If selected zone, update chart data
                if (zone.id === selectedZone) {
                  setCrowdData(predData.history || [])
                }
              }
            } catch (e) { console.error(e) }
          }
          setZones(formattedZones)
        }

        // Fetch alerts
        const resAlerts = await fetch('http://localhost:5000/api/anomalies/active')
        if (resAlerts.ok) {
          const data = await resAlerts.json()
          setAlerts(data.map((a: any) => ({
            id: a.id,
            type: a.type,
            severity: a.confidence > 80 ? 'high' : 'medium',
            message: a.description,
            time: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            zone: a.location
          })))
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [selectedZone])
  const [lostPersonForm, setLostPersonForm] = useState({
    name: "",
    description: "",
    lastSeen: "",
    contact: "",
    image: null as File | null,
  })
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "high":
        return "text-destructive"
      case "medium":
        return "text-warning"
      case "low":
        return "text-success"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  const handleLostPersonSearch = async () => {
    if (!lostPersonForm.name || !lostPersonForm.description) return

    setIsSearching(true)
    // Mock search delay
    setTimeout(() => {
      setSearchResults([
        {
          id: 1,
          confidence: 92,
          location: "Food Court - Camera 3",
          timestamp: "11:23 AM",
          image: "/placeholder-irf4t.png",
        },
        {
          id: 2,
          confidence: 78,
          location: "Main Stage - Camera 1",
          timestamp: "11:18 AM",
          image: "/person-near-stage.jpg",
        },
      ])
      setIsSearching(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Component */}
      <Navigation userRole="user" userName="John Doe" eventName="Summer Music Festival 2025" unreadAlerts={3} />

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Real-time Alerts */}
            <div className="space-y-3">
              {alerts.length === 0 && <p className="text-muted-foreground text-sm">No active alerts.</p>}
              {alerts.map((alert) => (
                <Alert key={alert.id} className={alert.severity === "high" ? "border-destructive" : ""}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{alert.message}</span>
                      <span className="text-muted-foreground ml-2">• {alert.zone}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{alert.time}</span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>

            <Tabs defaultValue="heatmap" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="heatmap">Heat Map</TabsTrigger>
                <TabsTrigger value="predictions">Predictions</TabsTrigger>
                <TabsTrigger value="lost-found">Lost & Found</TabsTrigger>
              </TabsList>

              {/* Heat Map Tab */}
              <TabsContent value="heatmap" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5" />
                      <span>Real-time Crowd Heat Map</span>
                    </CardTitle>
                    <CardDescription>Interactive crowd density visualization by zone</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Mock Heat Map Visualization -> Real Data */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {zones.map((zone) => (
                        <Card
                          key={zone.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${selectedZone === zone.id ? "ring-2 ring-primary" : ""
                            }`}
                          onClick={() => setSelectedZone(zone.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium text-sm">{zone.name}</h3>
                              <Badge variant={getStatusBadge(zone.status)}>{zone.status}</Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Current</span>
                                <span className={getStatusColor(zone.status)}>{zone.density}%</span>
                              </div>
                              <Progress value={zone.density} className="h-2" />
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Predicted</span>
                                <span>{zone.prediction}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {selectedZone && (
                      <Card className="bg-muted/30">
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {zones.find((z) => z.id === selectedZone)?.name} - Detailed View
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-medium mb-3">Crowd Density Trend</h4>
                              <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={crowdData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="time" />
                                  <YAxis />
                                  <Tooltip />
                                  <Area
                                    type="monotone"
                                    dataKey="density"
                                    stroke="hsl(var(--primary))"
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.3}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                            <div>
                              <h4 className="font-medium mb-3">Zone Statistics</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Current Capacity</span>
                                  <span className="font-medium">
                                    {zones.find((z) => z.id === selectedZone)?.density}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Peak Today</span>
                                  <span className="font-medium">89%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Average</span>
                                  <span className="font-medium">64%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Active Cameras</span>
                                  <span className="font-medium">4/4</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Predictions Tab */}
              <TabsContent value="predictions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>15-Minute Crowd Predictions</span>
                    </CardTitle>
                    <CardDescription>AI-powered crowd flow forecasting using WE-GCN model</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={crowdData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="density"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            name="Current Density"
                          />
                          <Line
                            type="monotone"
                            dataKey="prediction"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Predicted Density"
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      <div className="grid md:grid-cols-3 gap-4">
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium">Next 5 Minutes</span>
                            </div>
                            <p className="text-2xl font-bold text-primary">+8%</p>
                            <p className="text-sm text-muted-foreground">Density increase expected</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-warning/5 border-warning/20">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-warning" />
                              <span className="font-medium">Peak Prediction</span>
                            </div>
                            <p className="text-2xl font-bold text-warning">11:30 AM</p>
                            <p className="text-sm text-muted-foreground">Expected peak time</p>
                          </CardContent>
                        </Card>

                        <Card className="bg-success/5 border-success/20">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Activity className="h-4 w-4 text-success" />
                              <span className="font-medium">Confidence</span>
                            </div>
                            <p className="text-2xl font-bold text-success">87%</p>
                            <p className="text-sm text-muted-foreground">Model accuracy</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Lost & Found Tab */}
              <TabsContent value="lost-found" className="space-y-6">
                <LostAndFound userType="user" />
              </TabsContent>
            </Tabs>

            {/* AI Anomaly Detection */}
            <AIAnomalyDetection context="user" />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Attendees</span>
                  <span className="font-medium">12,847</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">15,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className="font-medium text-success">85.6%</span>
                </div>
                <Progress value={85.6} className="h-2" />
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
                  Report Incident
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => window.open('tel:9886744362', '_self')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Users className="h-4 w-4 mr-2" />
                  Find Lost Person
                </Button>
              </CardContent>
            </Card>


            {/* AI Assistant */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Assistant</CardTitle>
                <CardDescription>Ask questions about the event</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">CrowdGuard AI</p>
                    <p className="text-muted-foreground">
                      Hello! I can help you with crowd information, safety updates, and finding people. What would you
                      like to know?
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Input placeholder="Ask me anything..." className="flex-1" />
                    <Button size="sm">Send</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Chatbot */}
      <AIChatbot context="user" />
    </div>
  )
}
