"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button, Select } from "@/components/ui/forms";
import { AP_DISTRICTS } from "@/lib/mock-data";
import {
  Map, Layers, Sliders, Calendar, Play, Pause,
  ChevronRight, MapPin, Compass, Info, ShieldAlert,
  Locate
} from "lucide-react";

// ============================================================
// GIS HEATMAPS PAGE
// ============================================================

export default function GISHeatmapsPage() {
  const [activeLayer, setActiveLayer] = useState<"crime" | "density" | "checkposts">("crime");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [timelineVal, setTimelineVal] = useState(60); // simulated minutes/hours
  const [isPlaying, setIsPlaying] = useState(false);

  const hotspots = [
    { name: "NH-16 Ongole Bypass", intensity: "Critical Threat Layer", district: "Ongole", coords: "15.5057, 80.0499" },
    { name: "Chirala Main Checkpost", intensity: "High Traffic Density", district: "Chirala", coords: "15.8167, 80.3500" },
    { name: "Markapur Junction", intensity: "Suspicious Activity Hotspot", district: "Markapur", coords: "15.7370, 79.2717" },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Map size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">GIS Intelligence Map</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Spatial Density Heatmaps</h1>
          <p className="text-navy-300 text-xs">GIS visualization of vehicle density, checkpoints, and flagged crime hotspots.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            options={[
              { value: "all", label: "All Districts" },
              ...AP_DISTRICTS.map(d => ({ value: d.toLowerCase(), label: d }))
            ]}
          />
          <Button variant="secondary" size="sm" icon={<Locate size={13} />}>Recenter Camera</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Interactive Map Filters & Details */}
        <div className="space-y-4">
          {/* Layer Selector */}
          <GlassCard className="p-4 space-y-3">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest flex items-center gap-2">
              <Layers size={13} className="text-electric-400" /> Map Intelligence Layers
            </h3>
            <div className="space-y-1">
              {[
                { id: "crime", label: "Crime & Suspicious Hotspots", color: "text-crimson-400 bg-crimson-500/10" },
                { id: "density", label: "Vehicle Flow Density", color: "text-electric-400 bg-electric-500/10" },
                { id: "checkposts", label: "Police Checkpoints", color: "text-cyan-400 bg-cyan-500/10" },
              ].map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id as any)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold text-left transition-all duration-200 border",
                    activeLayer === layer.id
                      ? "border-electric-500 bg-electric-500/12 text-white"
                      : "border-navy-700/30 hover:border-navy-600/50 text-navy-400 hover:text-navy-200"
                  )}
                >
                  <span>{layer.label}</span>
                  {activeLayer === layer.id && (
                    <span className={cn("px-2 py-0.5 rounded text-[8px] font-bold uppercase", layer.color)}>
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Active Hotspots Summary */}
          <GlassCard className="p-4">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldAlert size={13} className="text-crimson-400" /> Hotspot telemetry
            </h3>
            <div className="space-y-2">
              {hotspots.map((h, i) => (
                <div key={i} className="p-3 rounded-xl bg-navy-800/40 border border-navy-700/30 text-xs">
                  <div className="font-semibold text-navy-100">{h.name}</div>
                  <div className="text-[10px] text-navy-400 mt-1">{h.intensity}</div>
                  <div className="text-[9px] font-mono text-navy-500 mt-1">Coordinates: {h.coords}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: GIS Map Simulator */}
        <div className="lg:col-span-3 space-y-6">
          <GlassCard className="p-4 relative">
            {/* Simulation map surface */}
            <div className="bg-navy-900 border border-navy-700/40 rounded-2xl aspect-[16/9] relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 grid-bg opacity-30" />

              {/* Pulsing simulated hotspots depending on active layer */}
              {activeLayer === "crime" && (
                <>
                  <div className="absolute top-1/3 left-1/4 w-12 h-12 bg-crimson-500/30 rounded-full border border-crimson-400/50 animate-pulse flex items-center justify-center">
                    <span className="text-[8px] text-white font-mono font-bold bg-navy-950/80 px-1 py-0.5 rounded">NH-16</span>
                  </div>
                  <div className="absolute bottom-1/3 right-1/3 w-16 h-16 bg-crimson-500/20 rounded-full border border-crimson-400/40 animate-pulse flex items-center justify-center">
                    <span className="text-[8px] text-white font-mono font-bold bg-navy-950/80 px-1 py-0.5 rounded">Checkpost</span>
                  </div>
                </>
              )}

              {activeLayer === "density" && (
                <>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-electric-500/10 rounded-full border border-electric-400/30 animate-pulse flex items-center justify-center">
                    <span className="text-[9px] text-white font-mono font-bold bg-navy-950/80 px-2 py-0.5 rounded">Peak Flow</span>
                  </div>
                </>
              )}

              {activeLayer === "checkposts" && (
                <>
                  <div className="absolute top-1/4 right-1/4 w-8 h-8 bg-cyan-500/20 rounded-full border border-cyan-400/50 flex items-center justify-center">
                    <MapPin size={12} className="text-cyan-400" />
                  </div>
                  <div className="absolute bottom-1/4 left-1/3 w-8 h-8 bg-cyan-500/20 rounded-full border border-cyan-400/50 flex items-center justify-center">
                    <MapPin size={12} className="text-cyan-400" />
                  </div>
                </>
              )}

              <div className="relative text-center space-y-2 z-10 p-4 pointer-events-none">
                <Map size={36} className="mx-auto text-electric-400" />
                <h4 className="text-xs font-semibold text-white">Spatial Telemetry Active</h4>
                <p className="text-[10px] text-navy-400 max-w-xs mx-auto">
                  Interactive GIS map with customized layers displaying active checkpoint triggers.
                </p>
              </div>
            </div>

            {/* Simulated Timeline slider controls */}
            <div className="mt-4 pt-4 border-t border-navy-700/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setIsPlaying(!isPlaying)}
                  icon={isPlaying ? <Pause size={12} /> : <Play size={12} />}
                >
                  {isPlaying ? "Pause Timeline" : "Play Timeline"}
                </Button>
                <span className="text-xs font-mono text-navy-300">SURVEILLANCE WINDOW: 4 Hours</span>
              </div>
              <div className="flex-1 max-w-md flex items-center gap-3">
                <span className="text-[10px] text-navy-500 font-mono">T-4h</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={timelineVal}
                  onChange={(e) => setTimelineVal(Number(e.target.value))}
                  className="w-full h-1 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-electric-500"
                />
                <span className="text-[10px] text-navy-500 font-mono">Now</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
