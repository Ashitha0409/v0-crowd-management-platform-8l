"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
    Legend,
} from "recharts"
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Users, Activity } from "lucide-react"
import { toast } from "sonner"

interface ZoneData {
    zone_id: string
    zone_name: string
    current_analysis: any
    trend: "increasing" | "decreasing" | "stable"
    history_points: number
    latest_data: any
}

interface HistoryPoint {
    timestamp: string
    crowd_count: number
    density_level: string
    anomaly_count: number
}

export function RealtimeMonitoring() {
    const [zonesData, setZonesData] = useState<ZoneData[]>([])
    const [selectedZone, setSelectedZone] = useState<string>("food_court")
    const [zoneHistory, setZoneHistory] = useState<HistoryPoint[]>([])
    const [dashboardSummary, setDashboardSummary] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
    const [autoRefresh, setAutoRefresh] = useState(true)

    const ZONE_COLORS = {
        food_court: "#3b82f6",
        parking: "#10b981",
        main_stage: "#f59e0b",
        testing: "#8b5cf6",
    }

    const fetchAllZonesData = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/realtime/all-zones")
            if (response.ok) {
                const data = await response.json()
                setZonesData(data.zones)
                setLastUpdate(new Date())
            }
        } catch (error) {
            console.error("Error fetching zones data:", error)
            toast.error("Failed to fetch real-time data")
        }
    }

    const fetchZoneHistory = async (zoneId: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/realtime/zone-history/${zoneId}`)
            if (response.ok) {
                const data = await response.json()
                setZoneHistory(data.history || [])
            }
        } catch (error) {
            console.error("Error fetching zone history:", error)
        }
    }

    const fetchDashboardSummary = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/realtime/dashboard-summary")
            if (response.ok) {
                const data = await response.json()
                setDashboardSummary(data)
            }
        } catch (error) {
            console.error("Error fetching dashboard summary:", error)
        }
    }

    const handleRefresh = async () => {
        setIsLoading(true)
        await Promise.all([
            fetchAllZonesData(),
            fetchZoneHistory(selectedZone),
            fetchDashboardSummary(),
        ])
        setIsLoading(false)
        toast.success("Data refreshed")
    }

    useEffect(() => {
        // Initial load
        handleRefresh()
    }, [])

    useEffect(() => {
        // Fetch history when selected zone changes
        if (selectedZone) {
            fetchZoneHistory(selectedZone)
        }
    }, [selectedZone])

    useEffect(() => {
        // Auto-refresh every 3 seconds for real-time updates
        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchAllZonesData()
                fetchDashboardSummary()
                if (selectedZone) {
                    fetchZoneHistory(selectedZone)
                }
            }, 3000) // 3 seconds - matches video analysis frequency

            return () => clearInterval(interval)
        }
    }, [autoRefresh, selectedZone])

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case "increasing":
                return <TrendingUp className="h-4 w-4 text-warning" />
            case "decreasing":
                return <TrendingDown className="h-4 w-4 text-success" />
            default:
                return <Minus className="h-4 w-4 text-muted-foreground" />
        }
    }

    const getDensityColor = (level: string) => {
        switch (level) {
            case "Critical":
                return "text-destructive"
            case "High":
                return "text-warning"
            case "Medium":
                return "text-primary"
            case "Low":
                return "text-success"
            default:
                return "text-muted-foreground"
        }
    }

    const getDensityBadge = (level: string) => {
        switch (level) {
            case "Critical":
                return "destructive"
            case "High":
                return "secondary"
            default:
                return "outline"
        }
    }

    // Format timestamp for display
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp)
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    // Prepare data for combined chart
    const combinedChartData = zoneHistory.map((point) => ({
        time: formatTime(point.timestamp),
        crowd_count: point.crowd_count,
        anomaly_count: point.anomaly_count,
    }))

    return (
        <div className="space-y-6">
            {/* Header with Controls */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Real-Time Monitoring</h2>
                    <p className="text-sm text-muted-foreground">
                        Last updated: {lastUpdate.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant={autoRefresh ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        <Activity className="h-4 w-4 mr-2" />
                        {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Dashboard Summary Cards */}
            {dashboardSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Users className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Total Crowd</span>
                            </div>
                            <p className="text-2xl font-bold">{dashboardSummary.summary.total_crowd_count}</p>
                            <p className="text-xs text-muted-foreground">Across all zones</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                <span className="text-sm font-medium">Active Anomalies</span>
                            </div>
                            <p className="text-2xl font-bold text-destructive">
                                {dashboardSummary.summary.total_active_anomalies}
                            </p>
                            <p className="text-xs text-muted-foreground">Detected by AI</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-warning" />
                                <span className="text-sm font-medium">Critical Zones</span>
                            </div>
                            <p className="text-2xl font-bold text-warning">
                                {dashboardSummary.summary.critical_zones_count}
                            </p>
                            <p className="text-xs text-muted-foreground">High density areas</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Activity className="h-4 w-4 text-success" />
                                <span className="text-sm font-medium">Monitored Zones</span>
                            </div>
                            <p className="text-2xl font-bold text-success">
                                {dashboardSummary.summary.monitored_zones}
                            </p>
                            <p className="text-xs text-muted-foreground">Camera endpoints</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Zone Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {zonesData.map((zone) => (
                    <Card
                        key={zone.zone_id}
                        className={`cursor-pointer transition-all ${selectedZone === zone.zone_id ? "ring-2 ring-primary" : ""
                            }`}
                        onClick={() => setSelectedZone(zone.zone_id)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold">{zone.zone_name}</h3>
                                {getTrendIcon(zone.trend)}
                            </div>

                            {zone.current_analysis ? (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Crowd Count</span>
                                            <span className="text-lg font-bold">
                                                {zone.current_analysis.crowd_count || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Density</span>
                                            <Badge variant={getDensityBadge(zone.current_analysis.density_level)}>
                                                {zone.current_analysis.density_level || "Unknown"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Anomalies</span>
                                            <span className="text-sm font-medium text-destructive">
                                                {zone.current_analysis.anomalies?.length || 0}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4 text-sm text-muted-foreground">
                                    No data available
                                    <br />
                                    Upload video to analyze
                                </div>
                            )}

                            <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Data Points: {zone.history_points}</span>
                                    <span className="capitalize">{zone.trend}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Detailed Charts for Selected Zone */}
            {selectedZone && zoneHistory.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Crowd Count Trend</CardTitle>
                            <CardDescription>
                                {zonesData.find((z) => z.zone_id === selectedZone)?.zone_name} - Last 20 readings
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={combinedChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="crowd_count"
                                        stroke={ZONE_COLORS[selectedZone as keyof typeof ZONE_COLORS]}
                                        fill={ZONE_COLORS[selectedZone as keyof typeof ZONE_COLORS]}
                                        fillOpacity={0.3}
                                        name="Crowd Count"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Anomaly Detection</CardTitle>
                            <CardDescription>
                                {zonesData.find((z) => z.zone_id === selectedZone)?.zone_name} - Anomaly count over
                                time
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={combinedChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="anomaly_count" fill="#ef4444" name="Anomalies" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* All Zones Combined Chart */}
            {zonesData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>All Zones Comparison</CardTitle>
                        <CardDescription>Current crowd count across all monitored zones</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={zonesData.map((zone) => ({
                                    zone: zone.zone_name,
                                    crowd_count: zone.current_analysis?.crowd_count || 0,
                                    anomalies: zone.current_analysis?.anomalies?.length || 0,
                                }))}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="zone" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="crowd_count" fill="#3b82f6" name="Crowd Count" />
                                <Bar dataKey="anomalies" fill="#ef4444" name="Anomalies" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* No Data State */}
            {zonesData.length === 0 && !isLoading && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Real-Time Data Available</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Upload videos to camera endpoints to start monitoring
                        </p>
                        <Button onClick={handleRefresh}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Data
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
