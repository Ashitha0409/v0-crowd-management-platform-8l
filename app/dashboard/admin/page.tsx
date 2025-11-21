"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Shield,
  Users,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock,
  Settings,
  Download,
  RefreshCw,
  Bell,
  MessageCircle,
  LogOut,
  Eye,
  UserCheck,
  BarChart3,
  PieChart,
  X,
  Play,
  Pause,
  Phone,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"
import { AIChatbot } from "@/components/ai-chatbot"
import { AIAnomalyDetection } from "@/components/ai-anomaly-detection"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import dynamic from "next/dynamic"

const EventRegistrationMap = dynamic(
  () => import("@/components/event-registration-map"),
  { ssr: false }
)

// Mock data for admin analytics
const mockAnalytics = {
  overview: {
    totalAttendees: 12847,
    capacity: 15000,
    utilization: 85.6,
    activeIncidents: 7,
    resolvedIncidents: 23,
    responseTime: 4.2,
    zones: 8,
    cameras: 24,
    responders: 16,
  },
  crowdFlow: [
    { time: "09:00", attendees: 2500, capacity: 15000 },
    { time: "10:00", attendees: 5200, capacity: 15000 },
    { time: "11:00", attendees: 8900, capacity: 15000 },
    { time: "12:00", attendees: 12847, capacity: 15000 },
    { time: "13:00", attendees: 14200, capacity: 15000 },
    { time: "14:00", attendees: 13800, capacity: 15000 },
  ],
  incidentTypes: [
    { name: "Medical", value: 12, color: "#ef4444" },
    { name: "Security", value: 8, color: "#3b82f6" },
    { name: "Technical", value: 5, color: "#8b5cf6" },
    { name: "Fire Safety", value: 3, color: "#f97316" },
    { name: "Crowd Control", value: 2, color: "#10b981" },
  ],
  zoneMetrics: [
    { zone: "Main Stage", density: 92, predictedDensity: 98, incidents: 4, cameras: 6, status: "critical" },
    { zone: "Food Court", density: 78, predictedDensity: 85, incidents: 2, cameras: 4, status: "high" },
    { zone: "Entrance A", density: 65, predictedDensity: 72, incidents: 1, cameras: 3, status: "medium" },
    { zone: "VIP Area", density: 45, predictedDensity: 38, incidents: 0, cameras: 2, status: "low" },
    { zone: "Parking", density: 58, predictedDensity: 65, incidents: 0, cameras: 4, status: "medium" },
    { zone: "Backstage", density: 35, predictedDensity: 42, incidents: 0, cameras: 3, status: "low" },
  ],
  // Fallback mock responders if API fails
  responderStatus: [
    { id: 1, name: "Dr. Sarah Johnson", type: "Medical", status: "active", zone: "Food Court", incidents: 2, phone: "+917337743545" },
    { id: 2, name: "Officer Mike Chen", type: "Security", status: "investigating", zone: "Parking", incidents: 1, phone: "+917337743545" },
    { id: 3, name: "Captain Lisa Wong", type: "Fire", status: "available", zone: "Backstage", incidents: 0, phone: "+917337743545" },
    { id: 4, name: "Tech Lead Alex Kim", type: "Technical", status: "active", zone: "Control Room", incidents: 1, phone: "+917337743545" },
  ],
}

const mockAlerts = [
  {
    id: 1,
    type: "critical",
    message: "Crowd density at Main Stage exceeds 90% capacity",
    time: "2 minutes ago",
    zone: "Main Stage",
    action: "Deploy additional security",
  },
  {
    id: 2,
    type: "warning",
    message: "CCTV Camera 7 offline - reduced coverage in Food Court",
    time: "5 minutes ago",
    zone: "Food Court",
    action: "Technical team dispatched",
  },
  {
    id: 3,
    type: "info",
    message: "Weather update: Light rain expected at 3 PM",
    time: "10 minutes ago",
    zone: "All Zones",
    action: "Prepare covered areas",
  },
]

export default function AdminDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("today")
  const [selectedZone, setSelectedZone] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedZoneVideo, setSelectedZoneVideo] = useState<{ zone: string, video: string } | null>(null)
  const [isZoneVideoPlaying, setIsZoneVideoPlaying] = useState(false)
  const [zoneAnalysis, setZoneAnalysis] = useState<any>(null)

  // Responders State
  const [responders, setResponders] = useState<any[]>(mockAnalytics.responderStatus)
  const [isLoadingResponders, setIsLoadingResponders] = useState(false)
  const [callingResponderId, setCallingResponderId] = useState<number | null>(null)

  console.log("[v0] Admin dashboard rendering with state:", { selectedTimeRange, selectedZone, isRefreshing })

  // Fetch responders from backend
  useEffect(() => {
    const fetchResponders = async () => {
      setIsLoadingResponders(true)
      try {
        const response = await fetch('http://localhost:5000/api/responders')
        if (response.ok) {
          const data = await response.json()
          setResponders(data)
        } else {
          console.error("Failed to fetch responders, using mock data")
          toast.error("Failed to connect to backend. Using offline data.")
        }
      } catch (error) {
        console.error("Error fetching responders:", error)
        toast.error("Backend unreachable. Ensure Flask server is running.")
      } finally {
        setIsLoadingResponders(false)
      }
    }

    fetchResponders()
  }, [])

  const handleRefresh = () => {
    console.log("[v0] Refresh button clicked")
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 2000)
  }

  const handleEventCreated = (eventData: any) => {
    console.log("Event created:", eventData)
    // In a real app, we would update the dashboard state with the new zones
    // For now, we just log it and maybe refresh the data
    handleRefresh()
  }

  const handleCallResponder = async (responderId: number, responderName: string) => {
    setCallingResponderId(responderId)
    toast.info(`Initiating call to ${responderName}...`)

    try {
      const response = await fetch('http://localhost:5000/api/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responder_id: responderId }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Call initiated: ${data.message}`)
      } else {
        toast.error(`Call failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error calling responder:", error)
      toast.error("Failed to initiate call. Check backend connection.")
    } finally {
      setCallingResponderId(null)
    }
  }

  const getZoneVideoSource = (zoneName: string) => {
    // Map zone names to video files
    if (zoneName === "Food Court") {
      return "/videos/food.mp4"
    } else if (zoneName === "Parking") {
      return "/videos/parking.mp4"
    }
    // Default fallback
    return "/videos/cam1.mp4"
  }

  const handleViewZone = async (zoneName: string) => {
    const videoSource = getZoneVideoSource(zoneName)
    setSelectedZoneVideo({ zone: zoneName, video: videoSource })
    setIsZoneVideoPlaying(true)

    // Fetch Gemini Analysis
    try {
      const zoneId = zoneName.toLowerCase().replace(/ /g, '_')
      const res = await fetch(`http://localhost:5000/api/zones/${zoneId}/density`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setZoneAnalysis(data)
      }
    } catch (e) {
      console.error("Failed to fetch analysis", e)
    }
  }

  const closeZoneVideoModal = () => {
    setSelectedZoneVideo(null)
    setIsZoneVideoPlaying(false)
    setZoneAnalysis(null)
  }

  const getZoneStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "text-destructive"
      case "high":
        return "text-warning"
      case "medium":
        return "text-primary"
      case "low":
        return "text-success"
      default:
        return "text-muted-foreground"
    }
  }

  const getZoneStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return "destructive"
      case "high":
        return "secondary"
      case "medium":
        return "outline"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">CrowdGuard</span>
              </div>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Settings className="h-3 w-3" />
                <span>Admin Control Panel</span>
              </Badge>
              <Badge className="bg-success/10 text-success border-success/20">Summer Music Festival 2025</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Critical Alerts */}
        <div className="mb-6 space-y-3">
          {mockAlerts.map((alert) => (
            <Alert key={alert.id} className={alert.type === "critical" ? "border-destructive" : ""}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{alert.message}</span>
                  <span className="text-muted-foreground ml-2">• {alert.zone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{alert.time}</span>
                  <Button size="sm" variant="outline">
                    {alert.action}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Total Attendees</span>
              </div>
              <p className="text-2xl font-bold">{mockAnalytics.overview.totalAttendees.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{mockAnalytics.overview.utilization}% capacity</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Active Incidents</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{mockAnalytics.overview.activeIncidents}</p>
              <p className="text-xs text-muted-foreground">{mockAnalytics.overview.resolvedIncidents} resolved today</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Avg Response</span>
              </div>
              <p className="text-2xl font-bold text-success">{mockAnalytics.overview.responseTime} min</p>
              <p className="text-xs text-muted-foreground">12% faster than yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">System Status</span>
              </div>
              <p className="text-2xl font-bold text-success">98.5%</p>
              <p className="text-xs text-muted-foreground">{mockAnalytics.overview.cameras}/24 cameras online</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="zones">Zones</TabsTrigger>
              <TabsTrigger value="responders">Responders</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            <div className="flex items-center space-x-2">
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Crowd Flow Trends</span>
                  </CardTitle>
                  <CardDescription>Real-time attendee count vs capacity</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={mockAnalytics.crowdFlow}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="attendees"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        name="Attendees"
                      />
                      <Line
                        type="monotone"
                        dataKey="capacity"
                        stroke="hsl(var(--destructive))"
                        strokeDasharray="5 5"
                        name="Capacity"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Incident Distribution</span>
                  </CardTitle>
                  <CardDescription>Breakdown by incident type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={mockAnalytics.incidentTypes}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {mockAnalytics.incidentTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <AIAnomalyDetection context="admin" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Health Overview</CardTitle>
                <CardDescription>Real-time status of all critical systems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">CCTV Network</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Online Cameras</span>
                        <span className="text-success">24/24</span>
                      </div>
                      <Progress value={100} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>Coverage</span>
                        <span className="text-success">98.5%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">AI Systems</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Anomaly Detection</span>
                        <span className="text-success">Active</span>
                      </div>
                      <Progress value={95} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>Prediction Model</span>
                        <span className="text-success">87% Accuracy</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Communication</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Radio Network</span>
                        <span className="text-success">Online</span>
                      </div>
                      <Progress value={100} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>WebSocket</span>
                        <span className="text-success">Connected</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zones Tab */}
          <TabsContent value="zones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Zone Management</span>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <Clock className="h-3 w-3 mr-1" />
                    15min AI Predictions
                  </Badge>
                </CardTitle>
                <CardDescription>Monitor and manage all event zones with AI-powered crowd density predictions</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Prediction Summary */}
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-warning" />
                    <span>Critical Predictions (Next 15 minutes)</span>
                  </h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-destructive/10 rounded border border-destructive/20">
                      <div className="text-lg font-bold text-destructive">Main Stage</div>
                      <div className="text-sm text-muted-foreground">92% → 98% (+6%)</div>
                      <div className="text-xs text-destructive">Critical Risk</div>
                    </div>
                    <div className="text-center p-3 bg-warning/10 rounded border border-warning/20">
                      <div className="text-lg font-bold text-warning">Food Court</div>
                      <div className="text-sm text-muted-foreground">78% → 85% (+7%)</div>
                      <div className="text-xs text-warning">High Risk</div>
                    </div>
                    <div className="text-center p-3 bg-success/10 rounded border border-success/20">
                      <div className="text-lg font-bold text-success">VIP Area</div>
                      <div className="text-sm text-muted-foreground">45% → 38% (-7%)</div>
                      <div className="text-xs text-success">Improving</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {mockAnalytics.zoneMetrics.map((zone) => (
                    <Card key={zone.zone} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{zone.zone}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant={getZoneStatusBadge(zone.status)}>{zone.status}</Badge>
                            <Button variant="outline" size="sm" onClick={() => handleViewZone(zone.zone)}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-5 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Current Density</Label>
                            <div className="flex items-center space-x-2">
                              <Progress value={zone.density} className="h-2 flex-1" />
                              <span className={`text-sm font-medium ${getZoneStatusColor(zone.status)}`}>
                                {zone.density}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">15min Prediction</Label>
                            <div className="flex items-center space-x-2">
                              <Progress value={zone.predictedDensity} className="h-2 flex-1" />
                              <div className="flex items-center space-x-1">
                                <span className={`text-sm font-medium ${getZoneStatusColor(zone.status)}`}>
                                  {zone.predictedDensity}%
                                </span>
                                {zone.predictedDensity > zone.density ? (
                                  <TrendingUp className="h-3 w-3 text-warning" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-success" />
                                )}
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Active Incidents</Label>
                            <p className="text-lg font-semibold">{zone.incidents}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Cameras</Label>
                            <p className="text-lg font-semibold">{zone.cameras}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Status</Label>
                            <p className={`text-sm font-medium ${getZoneStatusColor(zone.status)}`}>
                              {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Responders Tab */}
          <TabsContent value="responders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5" />
                  <span>Responder Management</span>
                </CardTitle>
                <CardDescription>Monitor all emergency responders and their assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingResponders ? (
                    <div className="text-center py-4">Loading responders...</div>
                  ) : (
                    responders.map((responder) => (
                      <Card key={responder.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div>
                                <h3 className="font-semibold">{responder.name}</h3>
                                <p className="text-sm text-muted-foreground">{responder.type} Responder</p>
                              </div>
                              <Badge
                                variant={responder.status === "available" ? "outline" : "default"}
                                className={
                                  responder.status === "available"
                                    ? "bg-success/10 text-success border-success/20"
                                    : responder.status === "active"
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : "bg-warning/10 text-warning border-warning/20"
                                }
                              >
                                {responder.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                              <div>
                                <Label className="text-xs text-muted-foreground">Zone</Label>
                                <p className="font-medium">{responder.zone}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Active Incidents</Label>
                                <p className="font-medium">{responder.incidents}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Contact</Label>
                                <p className="font-medium">{responder.phone || "N/A"}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCallResponder(responder.id, responder.name)}
                                disabled={callingResponderId === responder.id}
                              >
                                {callingResponderId === responder.id ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Phone className="h-3 w-3 mr-1" />
                                )}
                                {callingResponderId === responder.id ? "Calling..." : "Call"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Response Time Analytics</span>
                  </CardTitle>
                  <CardDescription>Average response times by incident type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { type: "Medical", time: 3.2 },
                        { type: "Security", time: 4.8 },
                        { type: "Fire", time: 2.9 },
                        { type: "Technical", time: 6.1 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="time" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Historical Trends</span>
                  </CardTitle>
                  <CardDescription>Incident patterns over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={[
                        { day: "Mon", incidents: 12 },
                        { day: "Tue", incidents: 8 },
                        { day: "Wed", incidents: 15 },
                        { day: "Thu", incidents: 10 },
                        { day: "Fri", incidents: 18 },
                        { day: "Sat", incidents: 25 },
                        { day: "Sun", incidents: 22 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="incidents" stroke="hsl(var(--accent))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators for event management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-success mb-2">96.8%</div>
                    <div className="text-sm text-muted-foreground">Incident Resolution Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">4.2 min</div>
                    <div className="text-sm text-muted-foreground">Average Response Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent mb-2">87%</div>
                    <div className="text-sm text-muted-foreground">AI Prediction Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-warning mb-2">99.2%</div>
                    <div className="text-sm text-muted-foreground">System Uptime</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>

      <AIChatbot context="admin" />

      {/* Zone Video Modal */}
      {selectedZoneVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">{selectedZoneVideo.zone} - Live Feed</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time monitoring • {new Date().toLocaleTimeString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeZoneVideoModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  src={selectedZoneVideo.video}
                  controls
                  autoPlay={isZoneVideoPlaying}
                  className="w-full h-auto max-h-[60vh]"
                  onPlay={() => setIsZoneVideoPlaying(true)}
                  onPause={() => setIsZoneVideoPlaying(false)}
                >
                  Your browser does not support the video tag.
                </video>
                <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
                  {selectedZoneVideo.zone} - Live Feed
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">
                    Live Monitoring
                  </Badge>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setIsZoneVideoPlaying(!isZoneVideoPlaying)}>
                    {isZoneVideoPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    {isZoneVideoPlaying ? "Pause" : "Play"}
                  </Button>
                  <Button size="sm">
                    Dispatch Response Team
                  </Button>
                </div>
              </div>

              {/* Gemini Analysis Section */}
              {zoneAnalysis && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border animate-in fade-in slide-in-from-bottom-4">
                  <h4 className="font-semibold mb-3 flex items-center text-purple-700">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gemini AI Real-time Analysis
                  </h4>

                  {zoneAnalysis.status === "no_data" ? (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground font-medium mb-1">No Analysis Data Available</p>
                      <p className="text-xs text-muted-foreground mb-4">Upload a video for this zone to generate AI insights.</p>
                      <div className="text-xs bg-slate-100 p-2 rounded inline-block text-left">
                        <code>POST /api/cameras/upload-video</code><br />
                        <code>zone_id: {selectedZoneVideo.zone.toLowerCase().replace(/ /g, '_')}</code>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-white rounded border">
                        <span className="text-muted-foreground block text-xs uppercase tracking-wider">Crowd Count</span>
                        <span className="font-bold text-lg">{zoneAnalysis.people_count}</span>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <span className="text-muted-foreground block text-xs uppercase tracking-wider">Density Level</span>
                        <span className={`font-bold text-lg ${getZoneStatusColor(zoneAnalysis.density_level?.toLowerCase() || 'low')}`}>
                          {zoneAnalysis.density_level}
                        </span>
                      </div>
                      <div className="col-span-1 md:col-span-2 p-3 bg-white rounded border">
                        <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Scene Description</span>
                        <p className="text-slate-700 leading-relaxed">{zoneAnalysis.description}</p>
                      </div>
                      {zoneAnalysis.anomalies && zoneAnalysis.anomalies.length > 0 && (
                        <div className="col-span-1 md:col-span-2 p-3 bg-red-50 rounded border border-red-100">
                          <span className="text-red-600 font-semibold block text-xs uppercase tracking-wider mb-1">Detected Anomalies</span>
                          <ul className="list-disc list-inside text-red-700 space-y-1">
                            {zoneAnalysis.anomalies.map((a: string, i: number) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="col-span-1 md:col-span-2 flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <span>Sentiment: {zoneAnalysis.sentiment}</span>
                        <span>Last Updated: {new Date(zoneAnalysis.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
