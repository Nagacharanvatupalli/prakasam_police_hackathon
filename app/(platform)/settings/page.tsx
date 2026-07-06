"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { Settings, Save, ShieldAlert, Cpu, HardDrive, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const [ocrThreshold, setOcrThreshold] = useState(85);
  const [cloneThreshold, setCloneThreshold] = useState(90);
  const [enableGpsSanity, setEnableGpsSanity] = useState(true);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">System Configurations</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">System Settings</h1>
          <p className="text-navy-300 text-xs">Configure AI thresholds, spatial coordinates heuristics, and database connection pools.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* AI Settings Form */}
          <GlassCard className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest flex items-center gap-2">
              <Cpu size={14} className="text-cyan-400" /> AI Threshold Thresholds
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy-300 mb-1">
                  OCR Engine Confidence Cutoff: {ocrThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={ocrThreshold}
                  onChange={(e) => setOcrThreshold(Number(e.target.value))}
                  className="w-full h-1 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-electric-500"
                />
                <p className="text-[10px] text-navy-500 mt-1">
                  Confidence scores below this index automatically flag low-confidence warning indicators.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-300 mb-1">
                  Clone Plate Analysis Cutoff: {cloneThreshold}%
                </label>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={cloneThreshold}
                  onChange={(e) => setCloneThreshold(Number(e.target.value))}
                  className="w-full h-1 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-electric-500"
                />
                <p className="text-[10px] text-navy-500 mt-1">
                  Alert trigger index for vehicle visual matrix and travel distance sanity comparisons.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Database diagnostic configurations */}
          <GlassCard className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest flex items-center gap-2">
              <HardDrive size={14} className="text-electric-400" /> Database Diagnostic Settings
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Select
                label="Surveillance Archive Retention"
                options={[
                  { value: "30", label: "30 Days archive" },
                  { value: "45", label: "45 Days archive" },
                  { value: "90", label: "90 Days archive" },
                ]}
              />
              <Select
                label="System Sync Pool interval"
                options={[
                  { value: "live", label: "Live WebSocket Sync" },
                  { value: "30s", label: "30-second poll" },
                ]}
              />
            </div>
          </GlassCard>

          <div className="flex justify-end gap-2">
            <Button variant="secondary">Restore Defaults</Button>
            <Button variant="primary" icon={<Save size={13} />}>
              Save Config
            </Button>
          </div>
        </div>

        {/* Diagnostic overview box */}
        <div className="space-y-6">
          <GlassCard className="p-5 space-y-4">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert size={14} className="text-amber-500 animate-pulse" /> Security Compliance Audit
            </h3>
            <p className="text-xs text-navy-300 leading-relaxed">
              System is operating within certified security guidelines. Periodic audit scans are scheduled every 24 hours.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-navy-700/20 text-navy-400">
                <span>Encryption</span>
                <span className="text-emerald-400 font-mono">AES-256-GCM</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-700/20 text-navy-400">
                <span>Access Protocols</span>
                <span className="text-emerald-400 font-mono">TLS 1.3 / HTTPS</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
