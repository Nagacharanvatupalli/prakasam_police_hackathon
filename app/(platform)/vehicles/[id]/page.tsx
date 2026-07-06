"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { cn, formatDateTime, getRiskBg } from "@/lib/utils";
import { GlassCard, RiskBadge, Badge, ConfidenceBar, ProgressRing, AIThinking, Skeleton, StatusPill } from "@/components/ui/core";
import { Button, Input, Select, Divider } from "@/components/ui/forms";
import { MOCK_VEHICLES, CAMERA_LOCATIONS, generatePlateNumber, VEHICLE_BRANDS, VEHICLE_COLORS, VEHICLE_TYPES, VEHICLE_MODELS } from "@/lib/mock-data";
import {
  Car, Shield, FileText, History, Map, AlertTriangle, User,
  FileSpreadsheet, ArrowLeft, Send, CheckCircle2, AlertOctagon,
  Fingerprint, Compass, Link2, Calendar, FileBadge, Info
} from "lucide-react";
import Link from "next/link";

// ============================================================
// VEHICLE DIGITAL TWIN PAGE
// ============================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function VehicleDigitalTwinPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "heatmap" | "intelligence">("overview");
  const [notes, setNotes] = useState<string>("");
  const [noteList, setNoteList] = useState<string[]>([
    "Initial suspicious pattern observed near Guntur bypass check-post.",
    "Owner registration matched with blacklisted enterprise group on 04-Jul-2026."
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const match = MOCK_VEHICLES.find((v) => v.id === resolvedParams.id) || MOCK_VEHICLES[0];
      setVehicle(match);
      setLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [resolvedParams.id]);

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setNoteList((prev) => [...prev, notes.trim()]);
    setNotes("");
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto py-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] lg:col-span-1" />
          <Skeleton className="h-[400px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Back button & Page Title */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/search">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>Back to Search</Button>
          </Link>
          <div className="h-6 w-px bg-navy-700/50" />
          <div>
            <h1 className="font-heading font-bold text-xl text-white flex items-center gap-2">
              Vehicle Digital Twin: <span className="font-mono text-electric-400">{vehicle.plateNumber}</span>
            </h1>
            <p className="text-navy-400 text-xs mt-0.5">Unified Intelligence ID: {vehicle.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/investigation?plate=${vehicle.plateNumber}`}>
            <Button variant="secondary" size="sm" icon={<Fingerprint size={13} />} className="text-cyan-400 border-cyan-500/20">
              Workspace Match
            </Button>
          </Link>
          <Button variant="outline" size="sm" icon={<AlertTriangle size={13} />} className="text-crimson-400 border-crimson-500/10">
            Escalate Plate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Vehicle Core Twin Profile */}
        <div className="space-y-6">
          <GlassCard className="p-5 relative overflow-hidden">
            {/* Ambient Background glow based on risk */}
            <div className={cn("absolute inset-0 opacity-5 pointer-events-none rounded-2xl", getRiskBg(vehicle.riskLevel))} />

            <div className="text-center relative">
              {/* Vehicle Avatar Box */}
              <div className="w-24 h-24 rounded-2xl bg-navy-900 border border-navy-700/40 flex flex-col items-center justify-center mx-auto mb-4 relative shadow-inner">
                <Car size={40} className="text-navy-400" />
                <span className="text-[10px] text-navy-500 font-mono mt-1 uppercase font-semibold">{vehicle.type}</span>
              </div>

              <h2 className="font-heading font-bold text-lg text-white mb-1">{vehicle.brand} {vehicle.model}</h2>
              <p className="text-navy-400 text-xs mb-3">{vehicle.color} · Registered AP</p>

              <div className="flex flex-col items-center gap-1.5 justify-center">
                <RiskBadge level={vehicle.riskLevel} score={vehicle.intelligenceScore} className="font-bold py-0.5 px-3" />
                <span className="text-[10px] text-navy-500 font-mono mt-1">Intelligence Threat Classification</span>
              </div>
            </div>

            <Divider className="my-5" />

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3">Compliance Audits</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-navy-800/40 border border-navy-700/30">
                    <span className="text-navy-400 block text-[10px] mb-1">Registration status</span>
                    <StatusPill status={vehicle.registrationStatus} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-navy-800/40 border border-navy-700/30">
                    <span className="text-navy-400 block text-[10px] mb-1">Insurance validity</span>
                    <StatusPill status={vehicle.insuranceStatus} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-navy-800/40 border border-navy-700/30">
                    <span className="text-navy-400 block text-[10px] mb-1">Fitness record</span>
                    <StatusPill status={vehicle.fitnessStatus} />
                  </div>
                  <div className="p-2.5 rounded-xl bg-navy-800/40 border border-navy-700/30">
                    <span className="text-navy-400 block text-[10px] mb-1">Owner identity</span>
                    <span className="font-semibold block truncate text-navy-200">{vehicle.owner}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-2">Fingerprint Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-navy-700/20 text-navy-400">
                    <span>Database ID</span>
                    <span className="font-mono text-navy-200">{vehicle.id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-navy-700/20 text-navy-400">
                    <span>Camera Hits</span>
                    <span className="font-mono text-navy-200">{vehicle.detectionCount} total</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-navy-700/20 text-navy-400">
                    <span>OCR accuracy baseline</span>
                    <span className="font-mono text-emerald-400">{vehicle.ocrConfidence}% average</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Proprietary Intelligence Score Breakdown */}
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3">Intelligence Score Explanation</h3>
            <div className="flex items-center gap-4 mb-4">
              <ProgressRing value={vehicle.intelligenceScore} size={56} strokeWidth={4} color="hsl(213, 94%, 56%)">
                <span className="font-mono font-bold text-xs text-white">{vehicle.intelligenceScore}</span>
              </ProgressRing>
              <div>
                <div className="text-xs font-bold text-navy-200">Threat Matrix Confidence</div>
                <p className="text-[10px] text-navy-400 leading-relaxed mt-0.5">
                  Synthesized using telemetry, clone flag indicators, and cross-district movement anomalies.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <ConfidenceBar value={vehicle.cloneFlag ? 85 : 12} label="Clone Probability score" />
              <ConfidenceBar value={vehicle.stolenFlag ? 95 : 5} label="Registry blacklist match score" />
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Tabs Layout */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-5">
            {/* Tab navigation headers */}
            <div className="flex gap-2 border-b border-navy-700/30 pb-3 mb-4">
              {(["overview", "timeline", "heatmap", "intelligence"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all duration-200",
                    activeTab === tab
                      ? "bg-electric-500/15 text-electric-300 border border-electric-500/25"
                      : "text-navy-400 hover:text-navy-100"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab contents */}
            <div className="min-h-[300px]">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Summary of Last Scan */}
                  <div className="p-4 rounded-xl bg-navy-800/40 border border-navy-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-navy-200">SURVEILLANCE EVENT TELEMETRY</span>
                      <span className="text-[10px] font-mono text-navy-500">{formatDateTime(vehicle.lastSeen)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-navy-400 block text-[10px]">Surveillance location</span>
                        <span className="text-navy-200 font-medium">{vehicle.lastCamera}</span>
                      </div>
                      <div>
                        <span className="text-navy-400 block text-[10px]">District command</span>
                        <span className="text-navy-200 font-medium">{vehicle.district}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation Decision Tree Card */}
                  <div className="p-4 rounded-xl border border-electric-500/15 bg-electric-500/5 space-y-3">
                    <div className="flex items-start gap-3">
                      <Info size={16} className="text-electric-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-semibold text-white">Explainable AI (XAI) Assessment</h4>
                        <p className="text-[11px] text-navy-300 leading-relaxed mt-1">
                          Vehicle AP39AB1234 flagged due to temporal mismatch anomaly. Bounding boxes matching original frame show minor aftermarket accessory alterations. Vehicle fingerprint matching similarity matrix stands at {vehicle.fingerprintScore}%.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Officer Notes Form */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest">Digital Audit Trails & Officer Notes</h3>
                    <div className="space-y-2">
                      {noteList.map((n, i) => (
                        <div key={i} className="p-3 rounded-xl bg-navy-800/30 border border-navy-700/20 text-xs text-navy-300">
                          {n}
                        </div>
                      ))}
                    </div>
                    <form onSubmit={addNote} className="flex gap-2">
                      <Input
                        placeholder="Add investigation details, vehicle visual markers..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit" variant="secondary" icon={<Send size={12} />}>
                        Add Note
                      </Button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-6 pl-4 relative">
                  <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-navy-700/40" />
                  {/* Timeline steps */}
                  {[
                    { label: "Surveillance Crop Alert", desc: "First scanned at NH-16 Ongole bypass", time: "10 mins ago", icon: <Car size={12} />, active: true },
                    { label: "AI Pipeline Inference Completed", desc: "Confidence matrix parsed successfully. Conf: 99.2%", time: "9 mins ago", icon: <Fingerprint size={12} />, active: true },
                    { label: "Fake/Clone Plate Assessment Flagged", desc: "Risk matrix triggers suspicious event marker", time: "8 mins ago", icon: <AlertTriangle size={12} />, active: true },
                    { label: "Incident Escalation Status", desc: "Command center assigned to local jurisdiction", time: "5 mins ago", icon: <User size={12} />, active: false },
                  ].map((step, idx) => (
                    <div key={idx} className="relative flex gap-4 items-start pl-8 group">
                      <div className={cn(
                        "absolute left-4 w-4 h-4 rounded-full border-2 flex items-center justify-center -translate-x-1.5 bg-navy-900 z-10",
                        step.active ? "border-electric-500 text-electric-400" : "border-navy-600 text-navy-500"
                      )}>
                        {step.icon}
                      </div>
                      <div>
                        <h4 className={cn("text-xs font-semibold", step.active ? "text-navy-100" : "text-navy-400")}>{step.label}</h4>
                        <p className="text-[10px] text-navy-400 mt-0.5">{step.desc}</p>
                        <span className="text-[9px] font-mono text-navy-600 mt-1 block">{step.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "heatmap" && (
                <div className="space-y-4">
                  <div className="bg-navy-900 border border-navy-700/40 rounded-xl aspect-video relative overflow-hidden flex items-center justify-center">
                    {/* Simulated spatial visual */}
                    <div className="absolute inset-0 grid-bg opacity-30" />
                    <div className="relative text-center space-y-2 z-10 p-4">
                      <Map size={32} className="mx-auto text-electric-400 animate-bounce" />
                      <h4 className="text-xs font-semibold text-white">GIS Travel Density Map</h4>
                      <p className="text-[10px] text-navy-400 max-w-xs mx-auto">
                        Visualizing historical camera hits and predicted route corridors based on PostGIS database tracking telemetry.
                      </p>
                    </div>
                    {/* Pulsing indicator dots */}
                    <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-electric-500/50 rounded-full border border-electric-400 animate-ping" />
                    <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-crimson-500/50 rounded-full border border-crimson-400 animate-ping" />
                  </div>
                </div>
              )}

              {activeTab === "intelligence" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest">Case & Crime Registry Associations</h3>
                  <div className="p-3 rounded-xl border border-navy-700/30 bg-navy-800/40 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-navy-200">CASE MATCH: NCRB-2026-0924</span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">PENDING INVESTIGATION</span>
                    </div>
                    <p className="text-[10px] text-navy-400 leading-relaxed">
                      Vehicle matches physical attributes of white hatchback suspect referenced in pending case report registered at Chirala Police Station.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
