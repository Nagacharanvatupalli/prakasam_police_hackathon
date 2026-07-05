"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button } from "@/components/ui/forms";
import { WEEKLY_DATA, OCR_ACCURACY_DATA, DETECTION_CHART_DATA } from "@/lib/mock-data";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  BarChart3, Calendar, Download, RefreshCw, TrendingUp,
  Activity, ShieldAlert, CheckCircle, Info, ChevronRight
} from "lucide-react";

// ============================================================
// ANALYTICS PAGE
// ============================================================

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "12m">("7d");

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">System Metrics Vault</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">System Analytics</h1>
          <p className="text-navy-300 text-xs">Surveillance system analytics, OCR precision trends, and regional threat logs.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-navy-800/60 border border-navy-700/30 p-0.5 rounded-xl">
            <Button
              variant={timeRange === "7d" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setTimeRange("7d")}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === "30d" ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setTimeRange("30d")}
            >
              30 Days
            </Button>
          </div>
          <Button variant="outline" size="sm" icon={<Download size={13} />}>Export Data</Button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-navy-500 uppercase tracking-widest block mb-1">Average OCR accuracy</span>
            <div className="text-2xl font-bold font-mono text-white">99.2%</div>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5 mt-1">
              <TrendingUp size={10} /> +0.2% improvement
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-navy-500 uppercase tracking-widest block mb-1">Alert correlation index</span>
            <div className="text-2xl font-bold font-mono text-white">94.8%</div>
            <span className="text-[10px] text-navy-500 font-mono block mt-1">AI verified alarms</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400">
            <Activity size={18} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-navy-500 uppercase tracking-widest block mb-1">Unresolved High Risks</span>
            <div className="text-2xl font-bold font-mono text-white">7</div>
            <span className="text-[10px] text-crimson-400 font-mono flex items-center gap-0.5 mt-1">
              <ShieldAlert size={10} /> Needs direct action
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-crimson-500/10 border border-crimson-500/20 flex items-center justify-center text-crimson-400">
            <ShieldAlert size={18} />
          </div>
        </GlassCard>
      </div>

      {/* Graphical Telemetry charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Telemetry chart */}
        <GlassCard className="p-5">
          <div className="mb-4">
            <h3 className="font-heading font-semibold text-navy-100 text-sm">Weekly Activity Trends</h3>
            <p className="text-[10px] text-navy-500">Weekly detections compared with case logs</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={WEEKLY_DATA}>
              <defs>
                <linearGradient id="grad-detect-blue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(213,94%,56%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(213,94%,56%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,142,247,0.06)" />
              <XAxis dataKey="day" tick={{ fill: "hsl(222,16%,45%)", fontSize: 10 }} />
              <YAxis tick={{ fill: "hsl(222,16%,45%)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(222,40%,12%)", borderColor: "rgba(43,142,247,0.12)" }} />
              <Area type="monotone" dataKey="detections" stroke="hsl(213,94%,56%)" strokeWidth={2} fill="url(#grad-detect-blue)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* OCR Accuracy Progression Chart */}
        <GlassCard className="p-5">
          <div className="mb-4">
            <h3 className="font-heading font-semibold text-navy-100 text-sm">OCR Engine Progression</h3>
            <p className="text-[10px] text-navy-500">6-Month neural model performance tracking</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={OCR_ACCURACY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,142,247,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(222,16%,45%)", fontSize: 10 }} />
              <YAxis domain={[95, 100]} tick={{ fill: "hsl(222,16%,45%)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(222,40%,12%)", borderColor: "rgba(43,142,247,0.12)" }} />
              <Line type="monotone" dataKey="accuracy" stroke="hsl(190, 90%, 50%)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}
