"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Users, AlertCircle, CheckCircle, Clock } from "lucide-react"

interface ZoneData {
    zone_id: string
    people_count: number
    density_level: string
    description: string
    sentiment: string
    timestamp: string
    anomalies?: any[]
}

interface ZoneSummary {
    id: string
    name: string
    status: string
    oneWord: string
    count: number
    description: string
    sentiment: string
    lastUpdate: string
}

export function ZoneSummary() {
    const [zoneSummaries, setZoneSummaries] = useState<ZoneSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const zones = [
        { id: 'food_court', name: 'Food Court Region' },
        { id: 'parking', name: 'Parking Area Region' },
        { id: 'main_stage', name: 'Main Stage Region' },
        { id: 'testing', name: 'Testing Region' }
    ]

    const getOneWordStatus = (data: ZoneData | null): string => {
        if (!data || data.people_count === 0) return "EMPTY"

        const count = data.people_count
        const sentiment = data.sentiment?.toLowerCase() || ""
        const hasAnomalies = data.anomalies && data.anomalies.length > 0

        if (hasAnomalies) return "ALERT"
        if (sentiment === "panic") return "CRITICAL"
        if (sentiment === "agitated") return "TENSE"
        if (count > 100) return "CROWDED"
        if (count > 50) return "BUSY"
        if (count > 20) return "ACTIVE"
        if (count > 0) return "LIGHT"

        return "CALM"
    }

    const getStatusColor = (oneWord: string): "destructive" | "secondary" | "default" | "outline" => {
        switch (oneWord) {
            case "CRITICAL":
            case "ALERT":
                return "destructive"
            case "CROWDED":
            case "TENSE":
                return "secondary"
            case "BUSY":
            case "ACTIVE":
                return "default"
            case "LIGHT":
            case "CALM":
                return "outline"
            case "EMPTY":
                return "outline"
            default:
                return "outline"
        }
    }

    const getStatusIcon = (oneWord: string) => {
        switch (oneWord) {
            case "CRITICAL":
            case "ALERT":
                return <AlertCircle className="h-4 w-4 text-destructive" />
            case "CROWDED":
            case "BUSY":
            case "ACTIVE":
                return <Activity className="h-4 w-4 text-primary" />
            case "LIGHT":
            case "CALM":
                return <CheckCircle className="h-4 w-4 text-success" />
            case "EMPTY":
                return <Users className="h-4 w-4 text-muted-foreground" />
            default:
                return <Activity className="h-4 w-4" />
        }
    }

    const fetchZoneData = async () => {
        try {
            const summaries: ZoneSummary[] = []

            for (const zone of zones) {
                try {
                    const response = await fetch(`http://localhost:5000/api/zones/${zone.id}/density`, {
                        method: 'POST'
                    })

                    if (response.ok) {
                        const data: ZoneData = await response.json()
                        const oneWord = getOneWordStatus(data)

                        summaries.push({
                            id: zone.id,
                            name: zone.name,
                            status: data.density_level || "Unknown",
                            oneWord: oneWord,
                            count: data.people_count || 0,
                            description: data.description || "No data available",
                            sentiment: data.sentiment || "Unknown",
                            lastUpdate: new Date(data.timestamp).toLocaleTimeString()
                        })
                    } else {
                        // Zone has no data
                        summaries.push({
                            id: zone.id,
                            name: zone.name,
                            status: "Inactive",
                            oneWord: "EMPTY",
                            count: 0,
                            description: "Awaiting camera feed",
                            sentiment: "N/A",
                            lastUpdate: new Date().toLocaleTimeString()
                        })
                    }
                } catch (error) {
                    console.error(`Error fetching ${zone.id}:`, error)
                    summaries.push({
                        id: zone.id,
                        name: zone.name,
                        status: "Error",
                        oneWord: "OFFLINE",
                        count: 0,
                        description: "Connection error",
                        sentiment: "N/A",
                        lastUpdate: new Date().toLocaleTimeString()
                    })
                }
            }

            setZoneSummaries(summaries)
            setIsLoading(false)
        } catch (error) {
            console.error("Error fetching zone summaries:", error)
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchZoneData()

        // Refresh every 5 seconds
        const interval = setInterval(fetchZoneData, 5000)

        return () => clearInterval(interval)
    }, [])

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 animate-pulse" />
                        <span>Zone Status Summary</span>
                    </CardTitle>
                    <CardDescription>Loading real-time zone updates...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p>Fetching zone data...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Activity className="h-5 w-5" />
                        <span>Zone Status Summary</span>
                    </div>
                    <Badge variant="outline" className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Live Updates</span>
                    </Badge>
                </CardTitle>
                <CardDescription>Real-time one-word status for all monitored zones</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {zoneSummaries.map((zone) => (
                        <Card key={zone.id} className="border-l-4 border-l-primary">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-sm">{zone.name}</h4>
                                    {getStatusIcon(zone.oneWord)}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Status:</span>
                                        <Badge variant={getStatusColor(zone.oneWord)} className="text-xs font-bold">
                                            {zone.oneWord}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Count:</span>
                                        <span className="text-sm font-semibold">{zone.count} people</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Density:</span>
                                        <span className="text-xs">{zone.status}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Mood:</span>
                                        <span className="text-xs">{zone.sentiment}</span>
                                    </div>

                                    <div className="pt-2 border-t">
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {zone.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-end text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {zone.lastUpdate}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
