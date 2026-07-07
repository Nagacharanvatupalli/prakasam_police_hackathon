"use client";

import { useState, useEffect } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, Badge, ConfidenceBar } from "@/components/ui/core";
import { Button } from "@/components/ui/forms";
import { cloneApi, CloneCase, CloneEvidence } from "@/lib/api/clone-api";
import {
  Copy,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  XCircle,
  Eye,
  Camera,
  Calendar,
  AlertOctagon,
  TrendingUp,
  Cpu
} from "lucide-react";

export default function CloneDetectionPage() {
  const [cases, setCases] = useState<CloneCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<CloneCase | null>(null);
  const [evidenceList, setEvidenceList] = useState<CloneEvidence[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<CloneEvidence | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed" | "false_positive" | "resolved">("pending");
  const [actionLoading, setActionLoading] = useState(false);

  // Load cases based on status
  const loadCases = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await cloneApi.getCases(1, 100, activeTab);
      setCases(res.cases);
      
      // Auto-select first case if available
      if (res.cases.length > 0) {
        handleSelectCase(res.cases[0]);
      } else {
        setSelectedCase(null);
        setEvidenceList([]);
        setSelectedEvidence(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load clone analysis database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [activeTab]);

  const handleSelectCase = async (item: CloneCase) => {
    setSelectedCase(item);
    try {
      const res = await cloneApi.getCaseEvidence(item.id, 1, 50);
      setEvidenceList(res.evidence);
      if (res.evidence.length > 0) {
        setSelectedEvidence(res.evidence[0]);
      } else {
        setSelectedEvidence(null);
      }
    } catch (err) {
      setEvidenceList([]);
      setSelectedEvidence(null);
    }
  };

  const handleUpdateStatus = async (status: 'confirmed' | 'false_positive' | 'resolved', note?: string) => {
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      await cloneApi.updateStatus(selectedCase.id, status, note);
      alert(`Case status updated to ${status}.`);
      loadCases();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">PENDING INVESTIGATION</Badge>;
      case "confirmed":
        return <Badge variant="danger">CONFIRMED CLONE</Badge>;
      case "false_positive":
        return <Badge variant="info">FALSE POSITIVE</Badge>;
      case "resolved":
        return <Badge variant="success">RESOLVED</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-700/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Copy size={16} className="text-crimson-500 animate-pulse" />
            <span className="text-[11px] text-crimson-400 font-mono font-medium tracking-widest uppercase">Cloned Plate Shield</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Cloned Vehicle Analysis</h1>
          <p className="text-navy-300 text-xs">AI threat identification for identical registration plates spotted with impossible travel patterns or class mismatches.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadCases}>Refresh Analytics</Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-navy-700/40 gap-2 overflow-x-auto">
        {(["pending", "confirmed", "false_positive", "resolved"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-2.5 px-4 text-xs font-semibold tracking-wider transition-all border-b-2 font-heading uppercase",
              activeTab === tab ? "border-electric-400 text-electric-300" : "border-transparent text-navy-400 hover:text-navy-200"
            )}
          >
            {tab.replace("_", " ")} Cases
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Suspected Clone cases list */}
        <GlassCard className="p-4 h-fit border-navy-700/50">
          <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3 flex items-center gap-2">
            <AlertOctagon size={14} className="text-crimson-400" /> Suspicious Flags
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-8 text-navy-500 font-mono text-xs">Loading analytics...</div>
            ) : cases.length === 0 ? (
              <div className="text-center py-12 text-navy-500 font-mono text-xs flex flex-col items-center gap-2">
                <CheckCircle2 size={24} className="text-emerald-500" />
                All clone flags in this category resolved.
              </div>
            ) : (
              cases.map((a) => (
                <div
                  key={a.id}
                  onClick={() => handleSelectCase(a)}
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-pointer transition-all duration-200",
                    selectedCase?.id === a.id
                      ? "bg-crimson-500/10 border-crimson-500/40 shadow-glow-red"
                      : "bg-navy-850/30 border-navy-800 hover:border-navy-700/50"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-xs font-mono font-bold text-white bg-navy-950 px-2 py-0.5 rounded border border-navy-800">
                        {a.plate_number}
                      </span>
                      <div className="text-[10px] text-crimson-400 font-mono font-semibold pt-1">
                        Score: {intPercent(a.max_clone_score)}%
                      </div>
                    </div>
                    <Badge variant={a.max_clone_score >= 0.85 ? "danger" : "warning"}>
                      {a.occurrence_count} sightings
                    </Badge>
                  </div>
                  <div className="text-[10px] text-navy-400 mt-2 truncate font-mono">
                    {a.latest_reason}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Right Column: Deep Dive Detail / Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCase && selectedEvidence ? (
            <div className="space-y-6">
              {/* Split Screen Original vs Clone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sighting A (Baseline) */}
                <GlassCard className="p-4 border-emerald-500/20 bg-navy-950/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">A-Target Sighting (Baseline)</span>
                    <span className="text-[9px] text-navy-500 font-mono">Camera: {selectedEvidence.camera_a_id}</span>
                  </div>

                  <div className="aspect-video bg-navy-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-navy-800">
                    {selectedEvidence.frame_image_a ? (
                      <img src={selectedEvidence.frame_image_a} alt="Sighting A Frame" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Camera size={24} className="text-navy-700 mx-auto mb-1" />
                        <span className="text-[10px] text-navy-500 font-mono">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 text-[9px] font-mono bg-navy-950/90 text-navy-300 px-2 py-0.5 rounded">
                      {selectedEvidence.camera_a_name}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white flex justify-between bg-navy-950/80 p-1.5 rounded border border-navy-800/50">
                      <span>Type: {selectedEvidence.vehicle_class_a || "Car"}</span>
                      <span>Color: {selectedEvidence.vehicle_color_a || "Unknown"}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 text-[11px] font-mono">
                    <div className="flex justify-between border-b border-navy-850 pb-1">
                      <span className="text-navy-500">Location</span>
                      <span className="text-navy-200">{selectedEvidence.camera_location || "Ongole Highway"}</span>
                    </div>
                    <div className="flex justify-between border-b border-navy-850 pb-1">
                      <span className="text-navy-500">Timestamp</span>
                      <span className="text-navy-200">{formatDateTime(selectedEvidence.timestamp_a)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-navy-500">OCR Conf</span>
                      <span className="text-emerald-400 font-bold">{intPercent(selectedEvidence.score_breakdown.ocr_confidence_a)}%</span>
                    </div>
                  </div>
                </GlassCard>

                {/* Sighting B (Suspected Clone) */}
                <GlassCard className="p-4 border-crimson-500/20 bg-navy-950/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-mono text-crimson-400 font-bold uppercase tracking-wider">B-Target Sighting (Suspected Clone)</span>
                    <span className="text-[9px] text-navy-500 font-mono">Camera: {selectedEvidence.camera_b_id}</span>
                  </div>

                  <div className="aspect-video bg-navy-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-navy-800">
                    {selectedEvidence.frame_image_b ? (
                      <img src={selectedEvidence.frame_image_b} alt="Sighting B Frame" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Camera size={24} className="text-navy-700 mx-auto mb-1" />
                        <span className="text-[10px] text-navy-500 font-mono">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 text-[9px] font-mono bg-navy-950/90 text-navy-300 px-2 py-0.5 rounded">
                      {selectedEvidence.camera_b_name}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white flex justify-between bg-navy-950/80 p-1.5 rounded border border-navy-800/50">
                      <span>Type: {selectedEvidence.vehicle_class_b || "Car"}</span>
                      <span>Color: {selectedEvidence.vehicle_color_b || "Unknown"}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 text-[11px] font-mono">
                    <div className="flex justify-between border-b border-navy-850 pb-1">
                      <span className="text-navy-500">Location</span>
                      <span className="text-navy-200">{selectedEvidence.camera_location || "Chirala Checkpost"}</span>
                    </div>
                    <div className="flex justify-between border-b border-navy-850 pb-1">
                      <span className="text-navy-500">Timestamp</span>
                      <span className="text-navy-200">{formatDateTime(selectedEvidence.timestamp_b)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-navy-500">OCR Conf</span>
                      <span className="text-crimson-400 font-bold">{intPercent(selectedEvidence.score_breakdown.ocr_confidence_b)}%</span>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Confidence Score Breakdown */}
              <GlassCard className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-crimson-500 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-heading">AI Validation Summary</h3>
                    <p className="text-xs text-navy-300 mt-1 leading-relaxed">{selectedEvidence.score_breakdown.reason_text}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-navy-800">
                  <div>
                    <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block mb-1">OCR character similarity</span>
                    <ConfidenceBar value={intPercent(selectedEvidence.score_breakdown.plate_match_score)} label="" showValue />
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block mb-1">Visual embedding difference</span>
                    <ConfidenceBar value={intPercent(selectedEvidence.score_breakdown.appearance_diff_score)} label="" showValue />
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block mb-1">Color difference score</span>
                    <ConfidenceBar value={intPercent(selectedEvidence.score_breakdown.color_diff_score)} label="" showValue />
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block mb-1">Vehicle class mismatch</span>
                    <ConfidenceBar value={intPercent(selectedEvidence.score_breakdown.vehicle_class_diff_score)} label="" showValue />
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block mb-1">Spatial-temporal anomaly score</span>
                    <ConfidenceBar value={intPercent(selectedEvidence.score_breakdown.spatial_temporal_score)} label="" showValue />
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block mb-1">Final composite clone suspicion</span>
                    <ConfidenceBar value={intPercent(selectedEvidence.score_breakdown.final_clone_score)} label="" showValue />
                  </div>
                </div>
              </GlassCard>

              {/* Investigative Actions */}
              {activeTab === "pending" && (
                <GlassCard className="p-4 border-crimson-500/25 bg-crimson-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu size={12} className="text-crimson-400 animate-pulse" /> Police dispatch protocol
                    </h4>
                    <p className="text-xs text-navy-300">Evaluate this clone flag. Confirm clone case to initiate interception dispatches.</p>
                  </div>
                  <div className="flex gap-2.5">
                    <Button variant="ghost" onClick={() => handleUpdateStatus("false_positive", "Identified as false alarm by operator")} loading={actionLoading}>
                      Dismiss False Alarm
                    </Button>
                    <Button variant="danger" onClick={() => handleUpdateStatus("confirmed", "Confirmed clone case by operator")} loading={actionLoading}>
                      Confirm Clone Case
                    </Button>
                  </div>
                </GlassCard>
              )}

              {activeTab === "confirmed" && (
                <GlassCard className="p-4 border-emerald-500/25 bg-emerald-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Case Status: ACTIVE WATCHLIST</h4>
                    <p className="text-xs text-navy-300">This clone vehicle is currently blacklisted and under active surveillance.</p>
                  </div>
                  <Button variant="primary" onClick={() => handleUpdateStatus("resolved", "Resolved and closed by operator")} loading={actionLoading}>
                    Mark Resolved / Caught
                  </Button>
                </GlassCard>
              )}
            </div>
          ) : (
            <GlassCard className="p-12 text-center text-navy-500 font-mono text-xs">
              Select a suspected clone plate from the list to view scoring details and match frames.
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

function intPercent(val: number) {
  return Math.round(val * 100);
}
