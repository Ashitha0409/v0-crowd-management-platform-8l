"use client"

import React from "react"
import { motion } from "framer-motion"

interface VenueMapProps {
    path?: string[]
    currentLocation?: string
    targetLocation?: string
    avoidZones?: string[]
}

const VENUE_NODES = {
    "Entrance": { x: 100, y: 100 },
    "Main Stage": { x: 500, y: 500 },
    "Food Court": { x: 800, y: 200 },
    "Parking": { x: 200, y: 800 },
    "Backstage": { x: 400, y: 900 },
    "VIP Area": { x: 600, y: 600 },
    "Control Room": { x: 900, y: 900 },
}

const VENUE_EDGES = [
    ["Entrance", "Main Stage"],
    ["Entrance", "Parking"],
    ["Entrance", "Food Court"],
    ["Main Stage", "Food Court"],
    ["Main Stage", "VIP Area"],
    ["Main Stage", "Backstage"],
    ["Food Court", "Control Room"],
    ["Food Court", "Parking"],
    ["Backstage", "Control Room"],
    ["Parking", "Entrance"],
]

export function VenueMap({ path = [], currentLocation, targetLocation, avoidZones = [] }: VenueMapProps) {
    return (
        <div className="relative w-full h-[400px] bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            <svg className="w-full h-full" viewBox="0 0 1000 1000">
                {/* Background Grid */}
                <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="1000" height="1000" fill="url(#grid)" />

                {/* Edges */}
                {VENUE_EDGES.map(([start, end], i) => {
                    const startNode = VENUE_NODES[start as keyof typeof VENUE_NODES]
                    const endNode = VENUE_NODES[end as keyof typeof VENUE_NODES]
                    return (
                        <line
                            key={i}
                            x1={startNode.x}
                            y1={startNode.y}
                            x2={endNode.x}
                            y2={endNode.y}
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="2"
                        />
                    )
                })}

                {/* Heatmaps (Avoid Zones) */}
                {avoidZones.map((zone) => {
                    const node = VENUE_NODES[zone as keyof typeof VENUE_NODES]
                    if (!node) return null
                    return (
                        <motion.circle
                            key={zone}
                            cx={node.x}
                            cy={node.y}
                            r="80"
                            fill="rgba(239, 68, 68, 0.3)"
                            initial={{ scale: 0.8, opacity: 0.5 }}
                            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    )
                })}

                {/* Path */}
                {path.length > 1 && (
                    <motion.path
                        d={`M ${path.map(p => {
                            const n = VENUE_NODES[p as keyof typeof VENUE_NODES]
                            return `${n.x} ${n.y}`
                        }).join(" L ")}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                )}

                {/* Nodes */}
                {Object.entries(VENUE_NODES).map(([name, coords]) => {
                    const isStart = name === currentLocation
                    const isTarget = name === targetLocation
                    const isAvoid = avoidZones.includes(name)

                    let fill = "#64748b" // slate-500
                    if (isStart) fill = "#22c55e" // green-500
                    if (isTarget) fill = "#ef4444" // red-500
                    if (isAvoid) fill = "#f97316" // orange-500

                    return (
                        <g key={name}>
                            <circle cx={coords.x} cy={coords.y} r="15" fill={fill} stroke="white" strokeWidth="2" />
                            <text
                                x={coords.x}
                                y={coords.y + 30}
                                textAnchor="middle"
                                fill="white"
                                fontSize="24"
                                className="font-bold"
                                style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.8)" }}
                            >
                                {name}
                            </text>
                        </g>
                    )
                })}
            </svg>

            <div className="absolute top-4 right-4 bg-black/50 p-2 rounded text-xs text-white">
                <div className="flex items-center mb-1"><div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div> Current Location</div>
                <div className="flex items-center mb-1"><div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div> Incident</div>
                <div className="flex items-center mb-1"><div className="w-3 h-3 rounded-full bg-orange-500/50 mr-2"></div> High Density (Avoid)</div>
                <div className="flex items-center"><div className="w-6 h-1 bg-blue-500 mr-2"></div> Optimal Path</div>
            </div>
        </div>
    )
}
