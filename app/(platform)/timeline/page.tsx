"use client";

import { useState } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button, Input } from "@/components/ui/forms";
import { GitBranch, Search, MapPin, Camera, AlertCircle } from "lucide-react";

interface TimelineEvent {
  title: string;
  desc: string;
  time: Date;
  camera: string;
  gps: string;
  conf: number;
}

const EVENTS: TimelineEvent[] = [
  { title: "Surveillance Hit", desc: "Vehicle detected crossing checkpoint", time: new Date(Date.now() - 5 * 60000), camera: "CAM-001 (NH-16 Bypass)", gps: "15.5057, 80.0499", conf: 99 },
  { title: "OCR Matching", desc: "License plate parsed successfully", time: new Date(Date.now() - 4 * 60000), camera: "CAM-001 (NH-16 Bypass)", gps: "15.5057, 80.0499", conf: 98 },
  { title: "Watchlist Alert Triggered", desc: "Matches active stolen vehicle FIR report", time: new Date(Date.now() - 2 * 60000), camera: "AI Intel Gateway", gps: "System Cloud", conf: 95 },
];

export default function VehicleTimelinePage() {
  const [query, setQuery] = useState("AP39AB1234");
  const [timeline, setTimeline] = useState<TimelineEvent[]>(EVENTS);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">Target Chronology</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Surveillance Timeline</h1>
          <p className="text-navy-300 text-xs">Chronological tracking metrics displaying checkpoint hits and AI rule triggers.</p>
        </div>
      </div>

      <GlassCard className="p-4 flex gap-2 max-w-md">
        <Input placeholder="Enter plate number..." value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1" />
        <Button variant="primary">Map Timeline</Button>
      </GlassCard>

      <GlassCard className="p-5 relative">
        <div className="absolute top-8 bottom-8 left-9 w-0.5 bg-navy-700/40" />

        <div className="space-y-6">
          {timeline.map((event, i) => (
            <div key={i} className="relative flex gap-4 items-start pl-12 group">
              <div className="absolute left-6 w-6 h-6 rounded-full border border-electric-500 bg-navy-950 flex items-center justify-center -translate-x-1/2 text-electric-400 z-10">
                <Camera size={12} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-white">{event.title}</h4>
                  <Badge variant="info">{event.conf}% conf</Badge>
                </div>
                <p className="text-xs text-navy-400">{event.desc}</p>
                <div className="flex flex-wrap gap-4 text-[10px] text-navy-500 font-mono">
                  <span className="flex items-center gap-1"><MapPin size={10} /> GPS: {event.gps}</span>
                  <span className="flex items-center gap-1">Location: {event.camera}</span>
                  <span className="text-navy-600">{formatDateTime(event.time)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
