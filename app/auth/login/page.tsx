"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function LoginPage() {
  const [step, setStep] = useState<"event" | "role">("event")
  const [selectedEvent, setSelectedEvent] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [credentials, setCredentials] = useState({ email: "", password: "" })
  const [events, setEvents] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/events')
        if (res.ok) {
          const data = await res.json()
          setEvents(data)
        }
      } catch (error) {
        console.error("Failed to fetch events", error)
        toast.error("Failed to load events")
      }
    }
    fetchEvents()
  }, [])

  const roles = [
    { id: "user", name: "User", description: "General event monitoring and lost person search" },
    { id: "admin", name: "Admin", description: "Full event management and analytics" },
    { id: "medical", name: "Medical Responder", description: "Medical emergency response" },
    { id: "security", name: "Security Responder", description: "Security incident management" },
    { id: "fire", name: "Fire Responder", description: "Fire safety and evacuation" },
    { id: "technical", name: "Technical Responder", description: "Technical system support" },
  ]

  const handleEventLogin = async () => {
    if (selectedEvent) {
      try {
        const res = await fetch('http://localhost:5000/api/events/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: selectedEvent })
        })

        if (res.ok) {
          setStep("role")
        } else {
          toast.error("Failed to select event")
        }
      } catch (error) {
        console.error("Error selecting event:", error)
        toast.error("Network error selecting event")
      }
    }
  }

  const handleRoleLogin = () => {
    if (selectedRole && credentials.email && credentials.password) {
      // Mock authentication - in real app, validate credentials
      const dashboardRoutes = {
        user: "/dashboard/user",
        admin: "/dashboard/admin",
        medical: "/dashboard/responder?type=medical",
        security: "/dashboard/responder?type=security",
        fire: "/dashboard/responder?type=fire",
        technical: "/dashboard/responder?type=technical",
      }

      router.push(dashboardRoutes[selectedRole as keyof typeof dashboardRoutes])
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">CrowdGuard</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Access Event</h1>
          <p className="text-muted-foreground">Login to your existing event dashboard</p>
        </div>

        {step === "event" && (
          <Card>
            <CardHeader>
              <CardTitle>Select Event</CardTitle>
              <CardDescription>Choose the event you want to access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event">Event</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div>
                          <div className="font-medium">{event.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {event.location ? `${event.location.lat.toFixed(4)}, ${event.location.lng.toFixed(4)}` : 'Location set'}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleEventLogin} disabled={!selectedEvent} className="w-full">
                Continue to Role Selection
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "role" && (
          <Card>
            <CardHeader>
              <CardTitle>Login Credentials</CardTitle>
              <CardDescription>Enter your credentials and select your role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div>
                          <div className="font-medium">{role.name}</div>
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStep("event")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleRoleLogin}
                  disabled={!selectedRole || !credentials.email || !credentials.password}
                  className="flex-1"
                >
                  Access Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Need to register a new event?{" "}
            <Link href="/" className="text-primary hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
