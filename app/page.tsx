"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Brain, AlertTriangle, MapPin, Clock, Phone, Mail, Building } from "lucide-react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import dynamic from "next/dynamic"
import { toast } from "sonner"

const EventRegistrationMap = dynamic(
  () => import("@/components/event-registration-map"),
  { ssr: false }
)

export default function LandingPage() {
  const router = useRouter()

  const handleEventCreated = (eventData: any) => {
    console.log("Event created:", eventData)
    toast.success("Event registered successfully!", {
      description: "You can now select this event when logging in."
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">AI-Powered Event Management</Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance">
              Intelligent Crowd
              <span className="text-primary"> Management</span>
              <br />
              for Safe Events
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
              Real-time crowd monitoring with AI-powered anomaly detection, predictive analytics, and role-based
              dashboards for comprehensive event safety management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg" className="text-lg px-8 py-6">
                    Register Your Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Register New Event</DialogTitle>
                    <DialogDescription>
                      Select the event location and radius on the map. The system will automatically configure zones and cameras.
                    </DialogDescription>
                  </DialogHeader>
                  <EventRegistrationMap onEventCreated={handleEventCreated} />
                </DialogContent>
              </Dialog>

              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent">
                  Access Existing Event
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Comprehensive Event Safety Platform</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced AI technology meets intuitive design for complete crowd management solutions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Real-time Monitoring */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Real-time Heat Maps</CardTitle>
                <CardDescription>
                  Live crowd density visualization with color-coded zones and interactive area selection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• CCTV integration and analysis</li>
                  <li>• Zone-based crowd tracking</li>
                  <li>• Bottleneck identification</li>
                </ul>
              </CardContent>
            </Card>

            {/* AI Predictions */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>15-Minute Predictions</CardTitle>
                <CardDescription>WE-GCN powered crowd flow forecasting with confidence intervals</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Historical pattern analysis</li>
                  <li>• Weather factor integration</li>
                  <li>• Predictive crowd modeling</li>
                </ul>
              </CardContent>
            </Card>

            {/* Anomaly Detection */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle>Anomaly Detection</CardTitle>
                <CardDescription>
                  Computer vision analysis for unusual crowd behavior and emergency situations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Behavioral pattern analysis</li>
                  <li>• Incident classification</li>
                  <li>• Real-time alert system</li>
                </ul>
              </CardContent>
            </Card>

            {/* Lost & Found */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <CardTitle>Lost Person Matching</CardTitle>
                <CardDescription>
                  Vector embedding similarity search across CCTV frames for quick person location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Image upload and analysis</li>
                  <li>• Real-time frame matching</li>
                  <li>• Location timestamp data</li>
                </ul>
              </CardContent>
            </Card>

            {/* Role-based Dashboards */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-warning" />
                </div>
                <CardTitle>Role-based Access</CardTitle>
                <CardDescription>Specialized dashboards for Users, Admins, and Emergency Responders</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• User crowd monitoring</li>
                  <li>• Admin control panels</li>
                  <li>• Responder incident management</li>
                </ul>
              </CardContent>
            </Card>

            {/* Real-time Updates */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-chart-2" />
                </div>
                <CardTitle>Real-time Updates</CardTitle>
                <CardDescription>
                  WebSocket integration for live data streaming and instant notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Live incident updates</li>
                  <li>• Responder status tracking</li>
                  <li>• Emergency notifications</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section id="contact" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Emergency Contacts & Support</h2>
            <p className="text-xl text-muted-foreground">24/7 support for event organizers and emergency responders</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="text-center">
                <Phone className="h-8 w-8 text-destructive mx-auto mb-2" />
                <CardTitle className="text-lg">Emergency Hotline</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-destructive">911</p>
                <p className="text-sm text-muted-foreground">Immediate emergencies</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Building className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Event Support</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg font-semibold">+1 (555) 123-4567</p>
                <p className="text-sm text-muted-foreground">Event coordination</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Mail className="h-8 w-8 text-accent mx-auto mb-2" />
                <CardTitle className="text-lg">Technical Support</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm font-semibold">support@crowdguard.com</p>
                <p className="text-sm text-muted-foreground">Platform assistance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-8 w-8 text-success mx-auto mb-2" />
                <CardTitle className="text-lg">System Admin</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg font-semibold">+1 (555) 987-6543</p>
                <p className="text-sm text-muted-foreground">System management</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
