"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlassCard, RiskBadge, Badge, ConfidenceBar, ProgressRing } from "@/components/ui/core";
import { Button, Input, Divider } from "@/components/ui/forms";
import {
  Brain, FileText, Send, CheckCircle2, ChevronRight,
  ShieldAlert, RefreshCw, Layers, Copy, Search, UserCheck,
  AlertTriangle, Clock, HardDrive, Printer
} from "lucide-react";

// ============================================================
// AI INVESTIGATION WORKSPACE
// ============================================================

export default function InvestigationWorkspacePage() {
  const [targetPlate1, setTargetPlate1] = useState("AP39AB1234");
  const [targetPlate2, setTargetPlate2] = useState("AP37EF9012");
  const [notes, setNotes] = useState("");
  const [noteList, setNoteList] = useState<string[]>([
    "Comparison shows 88% visual structural match in deep convolutional embeddings.",
    "Bumper design matches aftermarket replacement trends typically found in cloned vehicles."
  ]);
  const [loading, setLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<any>(null);

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setCompareResult({
        similarityScore: 88.4,
        explanation: "Neural net comparison indicates high structural correlation. FastReID re-id fingerprint similarity stands at 88.4%. Plate matching suggests alternate vehicle is operating on cloned coordinates.",
        recommAction: "Initiate physical audit of chassis numbers. Deploy dispatch to regional checkpoints.",
      });
      setLoading(false);
    }, 600);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setNoteList((prev) => [...prev, notes.trim()]);
    setNotes("");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain size={14} className="text-cyan-400" />
            <span className="text-[11px] text-cyan-400 font-mono font-medium tracking-widest uppercase">AI Investigator Desk</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Investigation Workspace</h1>
          <p className="text-navy-300 text-xs">Cross-reference vehicle embeds, analyze similarity indices, and draft digital custody cases.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Printer size={13} />}>Print File</Button>
          <Button variant="secondary" size="sm" icon={<FileText size={13} />}>Export PDF Case</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Query Parameters & Fingerprint Comparators */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-4">Target Fingerprint Comparator</h3>
            <form onSubmit={handleCompare} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Target Vehicle Plate A"
                  value={targetPlate1}
                  onChange={(e) => setTargetPlate1(e.target.value)}
                  placeholder="e.g. AP39AB1234"
                  icon={<Search size={14} />}
                />
                <Input
                  label="Target Vehicle Plate B"
                  value={targetPlate2}
                  onChange={(e) => setTargetPlate2(e.target.value)}
                  placeholder="e.g. AP37EF9012"
                  icon={<Search size={14} />}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="submit" variant="primary" loading={loading} icon={<Layers size={14} />}>
                  Analyze Fingerprints
                </Button>
              </div>
            </form>
          </GlassCard>

          {compareResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Matrix Similarity Results */}
              <GlassCard className="p-5">
                <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3">AI Deep Embedding Match Results</h3>
                <div className="flex items-center gap-4 mb-4">
                  <ProgressRing value={compareResult.similarityScore} size={60} strokeWidth={4} color="hsl(190, 90%, 50%)">
                    <span className="font-mono font-bold text-xs text-white">{compareResult.similarityScore}%</span>
                  </ProgressRing>
                  <div>
                    <div className="text-xs font-bold text-navy-200">Fingerprint Matrix Correlation</div>
                    <p className="text-[10px] text-navy-400 mt-1 leading-relaxed">
                      Similarity computed using structural matching networks, wheel designs, headlight crops, and window shape contours.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mt-4 pt-3 border-t border-navy-700/20">
                  <div>
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Make/Model Match Probability</span>
                    <ConfidenceBar value={94} label="" />
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-500 uppercase tracking-wider block mb-1">Accessories Alteration Anomaly</span>
                    <ConfidenceBar value={72} label="" />
                  </div>
                </div>
              </GlassCard>

              {/* Explainable AI Decision Tree Summary */}
              <GlassCard className="p-5 border-cyan-500/15 bg-cyan-500/5">
                <div className="flex items-start gap-3">
                  <Brain className="text-cyan-400 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Explainable AI (XAI) Assessment Summary</h4>
                    <p className="text-[11px] text-navy-300 leading-relaxed mt-1">{compareResult.explanation}</p>
                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mt-3">Recommended Protocol Action:</div>
                    <p className="text-[11px] text-navy-200 mt-0.5">{compareResult.recommAction}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* Right Column - Investigation Case Logs & Notes */}
        <div className="space-y-6">
          <GlassCard className="p-5 flex flex-col h-full">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3">Investigation Case Log</h3>
            <p className="text-[10px] text-navy-500 leading-relaxed mb-4">
              Add verification details, field status reports, or chassis match anomalies directly to the digital chain of custody log.
            </p>

            <div className="flex-1 space-y-3 overflow-y-auto mb-4 min-h-[180px]">
              {noteList.map((n, i) => (
                <div key={i} className="p-3 rounded-xl bg-navy-800/40 border border-navy-700/30 text-xs text-navy-300">
                  <div className="flex justify-between items-center mb-1 text-[9px] text-navy-500">
                    <span>SI RAVI KUMAR</span>
                    <span className="font-mono">5m ago</span>
                  </div>
                  {n}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddNote} className="space-y-2 flex-shrink-0">
              <Input
                placeholder="Log observation notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button type="submit" variant="secondary" className="w-full" icon={<Send size={12} />}>
                Record Case Entry
              </Button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
