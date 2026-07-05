"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, RiskBadge, Badge, ConfidenceBar, Skeleton } from "@/components/ui/core";
import { Button } from "@/components/ui/forms";
import {
  Copy, AlertTriangle, ArrowRight, Eye, ShieldAlert,
  Compass, MapPin, ExternalLink, Calendar, CheckCircle2,
  XCircle, ChevronRight, Info, AlertOctagon, HelpCircle, Car
} from "lucide-react";
import Link from "next/link";

// ============================================================
// CLONE DETECTION PAGE
// ============================================================

interface CloneAlert {
  id: string;
  plate: string;
  confidence: number;
  original: {
    brand: string;
    model: string;
    color: string;
    lastSeen: Date;
    location: string;
    camera: string;
    gps: string;
  };
  clone: {
    brand: string;
    model: string;
    color: string;
    lastSeen: Date;
    location: string;
    camera: string;
    gps: string;
  };
  impossibleMetric: string; // "72 km in 4 minutes"
  explainText: string;
}

const CLONE_ALERTS: CloneAlert[] = [
  {
    id: "CLN-098",
    plate: "AP39AB1234",
    confidence: 96,
    original: {
      brand: "Hyundai",
      model: "Creta",
      color: "White",
      lastSeen: new Date(Date.now() - 10 * 60000), // 10m ago
      location: "Ongole Bypass NH-16",
      camera: "CAM-001 (Surveillance)",
      gps: "15.5057, 80.0499",
    },
    clone: {
      brand: "Hyundai",
      model: "i20",
      color: "White",
      lastSeen: new Date(Date.now() - 6 * 60000), // 6m ago
      location: "Chirala NH Checkpoint",
      camera: "CAM-005 (Checkpost)",
      gps: "15.8167, 80.3500",
    },
    impossibleMetric: "72 km distance covered in 4 minutes",
    explainText: "Physical impossibility alert. Creta SUV detected at CAM-001 and i20 Hatchback detected at CAM-005 displaying the identical registration plate within a 4-minute time horizon. Fingerprint comparison confirms make/model variance.",
  },
  {
    id: "CLN-072",
    plate: "AP37EF9012",
    confidence: 91,
    original: {
      brand: "Maruti",
      model: "Swift",
      color: "Silver",
      lastSeen: new Date(Date.now() - 35 * 60000),
      location: "Kurnool Road Toll",
      camera: "CAM-004 (Toll Plz)",
      gps: "15.4990, 80.0380",
    },
    clone: {
      brand: "Maruti",
      model: "Swift",
      color: "Silver",
      lastSeen: new Date(Date.now() - 30 * 60000),
      location: "Markapur Main Road",
      camera: "CAM-007 (Junction)",
      gps: "15.7370, 79.2717",
    },
    impossibleMetric: "82 km distance covered in 5 minutes",
    explainText: "Both targets display same Make/Model/Color baseline. Fingerprint network detects minor differences: Clone contains front-bumper damage and aftermarket alloys that do not match original record on file.",
  }
];

export default function CloneDetectionPage() {
  const [alerts, setAlerts] = useState<CloneAlert[]>(CLONE_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<CloneAlert>(CLONE_ALERTS[0]);
  const [loading, setLoading] = useState(false);

  const handleAction = (alertId: string, status: "confirm" | "dismiss") => {
    setLoading(true);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      if (selectedAlert.id === alertId) {
        setSelectedAlert(alerts.find((a) => a.id !== alertId) || (null as any));
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Copy size={14} className="text-crimson-500 animate-pulse" />
            <span className="text-[11px] text-crimson-400 font-mono font-medium tracking-widest uppercase">Cloned Plate Shield</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Cloned Vehicle Analysis</h1>
          <p className="text-navy-300 text-xs">AI threat identification for identical registration plates spotted at physically impossible coordinates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alerts List */}
        <div className="space-y-4">
          <GlassCard className="p-4">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3">Pending Clone Flags</h3>
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-navy-500 font-mono text-xs">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                  All clone flags resolved.
                </div>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAlert(a)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all duration-200",
                      selectedAlert?.id === a.id
                        ? "bg-crimson-500/12 border-crimson-500/30 shadow-glow-red"
                        : "bg-navy-800/40 border-navy-700/30 hover:border-navy-600/50"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono font-bold text-white bg-navy-950/80 px-2 py-0.5 rounded border border-navy-700/20">
                          {a.plate}
                        </span>
                        <div className="text-[10px] text-crimson-400 font-mono font-semibold mt-1">
                          {a.impossibleMetric}
                        </div>
                      </div>
                      <Badge variant="danger">{a.confidence}% match</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Active Alert Deep Dive Detail */}
        <div className="lg:col-span-2">
          {selectedAlert ? (
            <div className="space-y-6">
              {/* Split Screen Original vs Clone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Record Card */}
                <GlassCard className="p-5 border-emerald-500/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">A-Target (Primary)</span>
                    <span className="text-[9px] text-navy-400 font-mono">ID: ORG-{selectedAlert.id}</span>
                  </div>

                  <div className="aspect-video bg-navy-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-navy-700/40">
                    <Car size={32} className="text-emerald-500/40" />
                    <div className="absolute top-2 left-2 text-[9px] font-mono bg-navy-950/90 text-navy-300 px-2 py-0.5 rounded">
                      {selectedAlert.original.camera}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white flex justify-between bg-navy-950/80 p-1.5 rounded">
                      <span>Make: {selectedAlert.original.brand} {selectedAlert.original.model}</span>
                      <span>Color: {selectedAlert.original.color}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 text-xs">
                    <div className="flex justify-between border-b border-navy-700/20 py-1">
                      <span className="text-navy-400">surveillance location</span>
                      <span className="text-navy-200">{selectedAlert.original.location}</span>
                    </div>
                    <div className="flex justify-between border-b border-navy-700/20 py-1">
                      <span className="text-navy-400">gps Coordinates</span>
                      <span className="text-navy-200 font-mono">{selectedAlert.original.gps}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-navy-400">observed Timestamp</span>
                      <span className="text-navy-200 font-mono">{formatDateTime(selectedAlert.original.lastSeen)}</span>
                    </div>
                  </div>
                </GlassCard>

                {/* Suspected Clone Card */}
                <GlassCard className="p-5 border-crimson-500/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-mono text-crimson-400 font-bold uppercase tracking-wider">B-Target (Suspected Clone)</span>
                    <span className="text-[9px] text-navy-400 font-mono">ID: CLN-{selectedAlert.id}</span>
                  </div>

                  <div className="aspect-video bg-navy-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-navy-700/40">
                    <Car size={32} className="text-crimson-500/40 animate-pulse" />
                    <div className="absolute top-2 left-2 text-[9px] font-mono bg-navy-950/90 text-navy-300 px-2 py-0.5 rounded">
                      {selectedAlert.clone.camera}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white flex justify-between bg-navy-950/80 p-1.5 rounded">
                      <span>Make: {selectedAlert.clone.brand} {selectedAlert.clone.model}</span>
                      <span>Color: {selectedAlert.clone.color}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 text-xs">
                    <div className="flex justify-between border-b border-navy-700/20 py-1">
                      <span className="text-navy-400">surveillance location</span>
                      <span className="text-navy-200">{selectedAlert.clone.location}</span>
                    </div>
                    <div className="flex justify-between border-b border-navy-700/20 py-1">
                      <span className="text-navy-400">gps Coordinates</span>
                      <span className="text-navy-200 font-mono">{selectedAlert.clone.gps}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-navy-400">observed Timestamp</span>
                      <span className="text-navy-200 font-mono">{formatDateTime(selectedAlert.clone.lastSeen)}</span>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Explainable AI breakdown and decision logic */}
              <GlassCard className="p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-crimson-500 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <h3 className="text-sm font-semibold text-navy-100 font-heading">AI Validation Summary</h3>
                    <p className="text-xs text-navy-300 mt-1 leading-relaxed">{selectedAlert.explainText}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-navy-700/30">
                  <div>
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Fingerprint Matrix Similarity</span>
                    <ConfidenceBar value={selectedAlert.confidence} label="" showValue />
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Clone Confidence score</span>
                    <ConfidenceBar value={96} label="" showValue />
                  </div>
                </div>
              </GlassCard>

              {/* Police Intervention Protocol Actions */}
              <GlassCard className="p-5 border-crimson-500/20">
                <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3">Recommended Interception Protocol</h3>
                <p className="text-xs text-navy-300 leading-relaxed mb-4">
                  Deploy wireless warning dispatch command and intercept B-Target at next checkpost downstream. Notify local police jurisdiction stations.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => handleAction(selectedAlert.id, "dismiss")}>
                    Dismiss False Alarm
                  </Button>
                  <Button variant="danger" onClick={() => handleAction(selectedAlert.id, "confirm")}>
                    Confirm and Dispatch Alert
                  </Button>
                </div>
              </GlassCard>
            </div>
          ) : (
            <GlassCard className="p-12 text-center text-navy-500 font-mono text-xs">
              All alerts resolved. Select an item to audit its decision records.
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
