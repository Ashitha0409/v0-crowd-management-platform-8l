"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MapPin, Phone, Clock, Upload, User, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface LostPerson {
    id: string
    name: string
    age: number
    description: string
    last_seen: string
    contact: string
    image_url: string | null
    status: "active" | "found"
    reported_at: string
    found_location?: string
}

interface Match {
    person_id: string
    zone_id: string
    confidence: number
    description: string
    timestamp: string
    found_at: string
}

export function LostAndFound({ userType = "user" }: { userType?: "user" | "admin" }) {
    const [reports, setReports] = useState<LostPerson[]>([])
    const [matches, setMatches] = useState<Match[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("report")

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        age: "",
        description: "",
        last_seen: "",
        contact: "",
        image: null as File | null
    })

    const fetchReports = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/lost-found/reports")
            if (res.ok) {
                const data = await res.json()
                setReports(data.reports)
            }
        } catch (error) {
            console.error("Error fetching reports:", error)
        }
    }

    const fetchMatches = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/lost-found/matches")
            if (res.ok) {
                const data = await res.json()
                setMatches(data.matches)
            }
        } catch (error) {
            console.error("Error fetching matches:", error)
        }
    }

    useEffect(() => {
        fetchReports()
        fetchMatches()

        // Poll for updates
        const interval = setInterval(() => {
            fetchReports()
            fetchMatches()
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, image: e.target.files![0] }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const data = new FormData()
            data.append("name", formData.name)
            data.append("age", formData.age)
            data.append("description", formData.description)
            data.append("last_seen", formData.last_seen)
            data.append("contact", formData.contact)
            if (formData.image) {
                data.append("image", formData.image)
            }

            const res = await fetch("http://localhost:5000/api/lost-found/report", {
                method: "POST",
                body: data
            })

            if (res.ok) {
                toast.success("Report submitted successfully")
                setFormData({
                    name: "",
                    age: "",
                    description: "",
                    last_seen: "",
                    contact: "",
                    image: null
                })
                fetchReports()
                setActiveTab("active")
            } else {
                toast.error("Failed to submit report")
            }
        } catch (error) {
            console.error("Error submitting report:", error)
            toast.error("Error submitting report")
        } finally {
            setIsLoading(false)
        }
    }

    const getZoneName = (zoneId: string) => {
        const zones: Record<string, string> = {
            food_court: "Food Court",
            parking: "Parking Area",
            main_stage: "Main Stage",
            testing: "Testing Zone"
        }
        return zones[zoneId] || zoneId
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Lost & Found</h2>
                    <p className="text-muted-foreground">
                        AI-powered lost person tracking and identification
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {userType === "user" && (
                        <Button
                            onClick={() => window.open('https://lost-and-found-396665235482.us-west1.run.app/', '_blank')}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Open Lost & Found App
                        </Button>
                    )}
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Search className="h-3 w-3" />
                        {reports.length} Active Reports
                    </Badge>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    {userType === "user" && <TabsTrigger value="report">Report Lost Person</TabsTrigger>}
                    <TabsTrigger value="active">Active Reports</TabsTrigger>
                    <TabsTrigger value="matches">Found Matches</TabsTrigger>
                </TabsList>

                {userType === "user" && (
                    <TabsContent value="report">
                        <Card>
                            <CardHeader>
                                <CardTitle>Report a Lost Person</CardTitle>
                                <CardDescription>
                                    Provide details and a photo to help our AI system locate the person.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="e.g. John Doe"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="age">Age</Label>
                                            <Input
                                                id="age"
                                                name="age"
                                                type="number"
                                                value={formData.age}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="e.g. 10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description (Clothing, Height, etc.)</Label>
                                        <Textarea
                                            id="description"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="e.g. Wearing a red t-shirt, blue jeans, white sneakers. Height approx 4ft."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="last_seen">Last Seen Location</Label>
                                            <Input
                                                id="last_seen"
                                                name="last_seen"
                                                value={formData.last_seen}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Near Food Court entrance"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contact">Contact Number</Label>
                                            <Input
                                                id="contact"
                                                name="contact"
                                                value={formData.contact}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="e.g. +1 234 567 8900"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="image">Photo (Optional but Recommended)</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="image"
                                                name="image"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? "Submitting..." : "Submit Report"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                <TabsContent value="active">
                    <div className="grid md:grid-cols-2 gap-4">
                        {reports.length === 0 ? (
                            <div className="col-span-2 text-center py-8 text-muted-foreground">
                                No active lost person reports.
                            </div>
                        ) : (
                            reports.map((report) => (
                                <Card key={report.id}>
                                    <CardContent className="p-4">
                                        <div className="flex gap-4">
                                            <div className="h-24 w-24 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                {report.image_url ? (
                                                    <img
                                                        src={`http://localhost:5000${report.image_url}`}
                                                        alt={report.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="h-10 w-10 text-slate-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-semibold text-lg">{report.name}</h3>
                                                    <Badge variant={report.status === "found" ? "default" : "destructive"}>
                                                        {report.status === "found" ? "Found" : "Lost"}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">Age: {report.age}</p>
                                                <p className="text-sm line-clamp-2">{report.description}</p>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(report.reported_at).toLocaleTimeString()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {report.contact}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="matches">
                    <div className="space-y-4">
                        {matches.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    No matches found yet. The AI is scanning camera feeds...
                                </CardContent>
                            </Card>
                        ) : (
                            matches.map((match, index) => {
                                const report = reports.find(r => r.id === match.person_id)
                                return (
                                    <Card key={index} className="border-green-200 bg-green-50">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center justify-between text-green-800">
                                                <span>Match Found!</span>
                                                <Badge className="bg-green-600 hover:bg-green-700">
                                                    {match.confidence}% Confidence
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription className="text-green-700">
                                                Potential match for <strong>{report?.name || "Unknown Person"}</strong>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-white rounded-full shadow-sm">
                                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                        <MapPin className="h-4 w-4 text-green-600" />
                                                        Located in: {getZoneName(match.zone_id)}
                                                    </div>
                                                    <p className="text-sm text-green-800">{match.description}</p>
                                                    <p className="text-xs text-green-600">
                                                        Detected at: {new Date(match.found_at).toLocaleTimeString()}
                                                    </p>

                                                    <div className="pt-2">
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                                            Navigate to Location
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
