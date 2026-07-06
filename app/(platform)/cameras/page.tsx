"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard, Badge, StatusPill } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { CAMERA_LOCATIONS } from "@/lib/mock-data";
import { Camera, Search, RefreshCw, Power, Settings, ShieldCheck } from "lucide-react";

export default function CameraManagementPage() {
  const [cameras, setCameras] = useState(
    CAMERA_LOCATIONS.map((cam, i) => ({
      ...cam,
      status: i % 5 === 0 ? "offline" as const : "active" as const,
      fps: 25,
      resolution: "4K UHD",
      lastActive: new Date(),
    }))
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Camera size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">Hardware surveillance assets</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Camera Registry</h1>
          <p className="text-navy-300 text-xs">Registry diagnostic interface for surveillance assets, feeds, encoder states, and health indexes.</p>
        </div>
      </div>

      <GlassCard className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <Input placeholder="Filter camera ID or location..." className="w-full sm:max-w-xs" icon={<Search size={14} />} />
        <Button variant="ghost" className="sm:ml-auto text-navy-400" icon={<RefreshCw size={13} />}>
          Rescan Network
        </Button>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((cam) => (
          <GlassCard key={cam.id} className="p-4 flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-navy-800 border border-navy-700/40 flex items-center justify-center text-navy-400 flex-shrink-0">
                  <Camera size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white font-heading">{cam.name}</h4>
                  <span className="text-[9px] font-mono text-navy-500 block mt-0.5">{cam.id} · {cam.district}</span>
                </div>
              </div>
              <StatusPill status={cam.status} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono py-2 bg-navy-900/60 rounded-xl border border-navy-700/30">
              <div>
                <span className="text-navy-500 block">Resolution</span>
                <span className="text-navy-300 font-medium">{cam.resolution}</span>
              </div>
              <div>
                <span className="text-navy-500 block">Framerate</span>
                <span className="text-navy-300 font-medium">{cam.fps} FPS</span>
              </div>
              <div>
                <span className="text-navy-500 block">Latent IP</span>
                <span className="text-navy-300 font-medium">10.42.0.{cam.id.split("-")[1]}</span>
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-1 border-t border-navy-700/20">
              <Button variant="ghost" size="xs" icon={<Power size={11} />} className="text-crimson-400">
                Disable
              </Button>
              <Button variant="secondary" size="xs" icon={<Settings size={11} />}>
                Config
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
