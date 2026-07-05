"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn, formatNumber, formatTime } from "@/lib/utils";
import { GlassCard, RiskBadge, Badge, ConfidenceBar, ProgressRing, AIThinking, Skeleton } from "@/components/ui/core";
import { Button } from "@/components/ui/forms";
import {
  DASHBOARD_STATS, DETECTION_CHART_DATA, WEEKLY_DATA, OCR_ACCURACY_DATA,
  MOCK_ALERTS, MOCK_VEHICLES, CAMERA_LOCATIONS
} from "@/lib/mock-data";
import {
  Activity, AlertTriangle, Camera, Car, Copy, Eye,
  FileText, Shield, TrendingUp, TrendingDown, Zap,
  Brain, Map, ArrowRight, MoreHorizontal, RefreshCw,
  ChevronRight, Clock, UserCheck
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// ============================================================
// AI COMMAND CENTER — Dashboard
// ============================================================

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    const tick = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearTimeout(timer); clearInterval(tick); };
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-mono font-medium">LIVE SYSTEM</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">AI Command Center</h1>
          <p className="text-navy-400 text-sm mt-0.5">
            Prakasam District Intelligence Platform &nbsp;·&nbsp;
            <span className="font-mono text-navy-300">{formatTime(currentTime)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />}>Refresh</Button>
          <Button variant="secondary" size="sm" icon={<Brain size={13} />} className="text-cyan-400 border-cyan-500/20">
            AI Copilot
          </Button>
        </div>
      </div>

      {/* ── System Intelligence Bar ── */}
      <SystemIntelligenceBar loading={loading} />

      {/* ── KPI Grid ── */}
      <KPIGrid loading={loading} />

      {/* ── Main Content: 3-column grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Live Detection Feed */}
        <div className="xl:col-span-2">
          <LiveDetectionFeed loading={loading} />
        </div>

        {/* Alert Stream */}
        <div>
          <AlertStream loading={loading} />
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DetectionChart loading={loading} />
        <RecentVehicleTimeline loading={loading} />
        <OfficerActivityFeed loading={loading} />
      </div>
    </div>
  );
}

// ── System Intelligence Bar ────────────────────────────────

function SystemIntelligenceBar({ loading }: { loading: boolean }) {
  const items = [
    { label: "AI Engine", value: "99.2% Accuracy", status: "good", icon: <Brain size={14} /> },
    { label: "Cameras Online", value: "10 / 12", status: "warn", icon: <Camera size={14} /> },
    { label: "Processing Rate", value: "847 vehicles/hr", status: "good", icon: <Zap size={14} /> },
    { label: "System Uptime", value: "99.97%", status: "good", icon: <Activity size={14} /> },
    { label: "DB Latency", value: "< 8ms", status: "good", icon: <Clock size={14} /> },
    { label: "Active Sessions", value: "34 officers", status: "good", icon: <UserCheck size={14} /> },
  ];

  return (
    <GlassCard className="p-3">
      <div className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <div key={i} className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-[140px]",
            "border border-navy-700/30"
          )}>
            <div className={cn(
              "flex-shrink-0",
              item.status === "good" ? "text-emerald-500" : item.status === "warn" ? "text-amber-500" : "text-crimson-500"
            )}>
              {item.icon}
            </div>
            <div>
              <div className="text-[10px] text-navy-500 leading-none">{item.label}</div>
              <div className="text-xs font-mono font-medium text-navy-200 mt-0.5">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ── KPI Grid ──────────────────────────────────────────────

function KPIGrid({ loading }: { loading: boolean }) {
  const kpis = [
    {
      id: "detections",
      label: "Vehicles Detected",
      value: DASHBOARD_STATS.vehiclesDetectedToday,
      unit: "today",
      trend: "+12%",
      trendUp: true,
      icon: <Car size={16} />,
      color: "electric",
      sub: "since yesterday",
    },
    {
      id: "alerts",
      label: "Active Alerts",
      value: DASHBOARD_STATS.activeAlerts,
      unit: "unresolved",
      trend: "+3",
      trendUp: false,
      icon: <AlertTriangle size={16} />,
      color: "amber",
      sub: "require attention",
    },
    {
      id: "highrisk",
      label: "High Risk Vehicles",
      value: DASHBOARD_STATS.highRiskVehicles,
      unit: "flagged",
      trend: "-2",
      trendUp: true,
      icon: <Shield size={16} />,
      color: "crimson",
      sub: "since last hour",
    },
    {
      id: "clones",
      label: "Clone Detections",
      value: DASHBOARD_STATS.cloneDetections,
      unit: "today",
      trend: "+1",
      trendUp: false,
      icon: <Copy size={16} />,
      color: "crimson",
      sub: "confirmed clones",
    },
    {
      id: "ocr",
      label: "OCR Accuracy",
      value: `${DASHBOARD_STATS.ocrAccuracy}%`,
      unit: "",
      trend: "+0.1%",
      trendUp: true,
      icon: <Eye size={16} />,
      color: "emerald",
      sub: "7-day average",
    },
    {
      id: "investigations",
      label: "Investigations",
      value: DASHBOARD_STATS.activeInvestigations,
      unit: "active",
      trend: "+2",
      trendUp: false,
      icon: <FileText size={16} />,
      color: "cyan",
      sub: "open cases",
    },
    {
      id: "evidence",
      label: "Evidence Items",
      value: formatNumber(DASHBOARD_STATS.evidenceItems),
      unit: "total",
      trend: "+84",
      trendUp: true,
      icon: <Activity size={16} />,
      color: "electric",
      sub: "collected today",
    },
    {
      id: "officers",
      label: "Officers Online",
      value: DASHBOARD_STATS.officersOnline,
      unit: "active",
      trend: "",
      trendUp: true,
      icon: <UserCheck size={16} />,
      color: "emerald",
      sub: "across all stations",
    },
  ];

  const colorConfig: Record<string, { icon: string; bg: string; border: string }> = {
    electric: { icon: "text-electric-400", bg: "bg-electric-500/10", border: "border-electric-500/20" },
    cyan:     { icon: "text-cyan-400",     bg: "bg-cyan-500/10",     border: "border-cyan-500/20" },
    emerald:  { icon: "text-emerald-400",  bg: "bg-emerald-500/10",  border: "border-emerald-500/20" },
    amber:    { icon: "text-amber-400",    bg: "bg-amber-500/10",    border: "border-amber-500/20" },
    crimson:  { icon: "text-crimson-400",  bg: "bg-crimson-500/10",  border: "border-crimson-500/20" },
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
      {kpis.map((kpi, i) => {
        const cc = colorConfig[kpi.color];
        return (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <GlassCard hover glow="blue" className="p-4 col-span-1">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton variant="text" className="w-12 h-7" />
                  <Skeleton variant="text" className="w-20" />
                </div>
              ) : (
                <>
                  <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center mb-3", cc.bg, cc.border)}>
                    <span className={cc.icon}>{kpi.icon}</span>
                  </div>
                  <AnimatedCounter value={kpi.value} className="text-2xl font-bold font-mono text-white leading-none" />
                  {kpi.unit && <span className="text-[10px] text-navy-500 ml-1">{kpi.unit}</span>}
                  <div className="flex items-center gap-1 mt-2">
                    {kpi.trend && (
                      <span className={cn(
                        "flex items-center gap-0.5 text-[10px] font-mono font-medium",
                        kpi.trendUp ? "text-emerald-400" : "text-crimson-400"
                      )}>
                        {kpi.trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {kpi.trend}
                      </span>
                    )}
                    <span className="text-[10px] text-navy-500">{kpi.sub}</span>
                  </div>
                  <div className="text-[10px] text-navy-500 mt-1 font-medium">{kpi.label}</div>
                </>
              )}
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Animated Counter ──────────────────────────────────────

function AnimatedCounter({ value, className }: { value: number | string; className?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const numValue = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  const isNum = !isNaN(numValue);

  useEffect(() => {
    if (!isNum) return;
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.floor(ease * numValue));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [numValue, isNum]);

  return (
    <span className={className}>
      {isNum ? displayed.toLocaleString("en-IN") : value}
    </span>
  );
}

// ── Live Detection Feed ────────────────────────────────────

function LiveDetectionFeed({ loading }: { loading: boolean }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  const cameras = CAMERA_LOCATIONS.slice(0, 6);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center">
            <Camera size={15} className="text-electric-400" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-navy-100 text-sm">Live Detection Feed</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono">REAL-TIME · {cameras.length} CAMERAS</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AIThinking label="AI Processing" />
          <Button variant="ghost" size="xs" icon={<MoreHorizontal size={13} />} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cameras.map((cam, i) => (
            <CameraFeedCard key={cam.id} camera={cam} index={i} tick={tick} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

const DETECTION_SCENARIOS = [
  { plate: "AP39AB1234", risk: "critical" as const, conf: 98, action: "INTERCEPT" },
  { plate: "AP16CD5678", risk: "high_risk" as const, conf: 94, action: "ALERT" },
  { plate: "AP38KL3421", risk: "safe" as const, conf: 99, action: "CLEAR" },
  { plate: "AP37EF9012", risk: "suspicious" as const, conf: 91, action: "MONITOR" },
  { plate: "AP39MN7821", risk: "safe" as const, conf: 97, action: "CLEAR" },
  { plate: "AP15QR4567", risk: "high_risk" as const, conf: 88, action: "ALERT" },
];

function CameraFeedCard({ camera, index, tick }: { camera: typeof CAMERA_LOCATIONS[0]; index: number; tick: number }) {
  const scenario = DETECTION_SCENARIOS[(index + tick) % DETECTION_SCENARIOS.length];
  const hasDetection = tick % 2 === 0 || index % 2 === 0;

  const riskBg: Record<string, string> = {
    critical: "border-crimson-500/70 shadow-glow-red",
    high_risk: "border-amber-500/60 shadow-glow-amber",
    suspicious: "border-amber-500/40",
    safe: "border-emerald-500/30",
    verified: "border-emerald-500/30",
  };

  const actionBg: Record<string, string> = {
    INTERCEPT: "bg-crimson-500",
    ALERT: "bg-amber-500",
    MONITOR: "bg-electric-500",
    CLEAR: "bg-emerald-500",
  };

  return (
    <motion.div
      key={`${index}-${tick}`}
      className={cn(
        "relative aspect-video rounded-xl overflow-hidden cursor-pointer group",
        "bg-navy-800/80 border transition-all duration-500",
        hasDetection ? (riskBg[scenario.risk] || "border-navy-600/30") : "border-navy-700/30"
      )}
      whileHover={{ scale: 1.02 }}
    >
      {/* Simulated camera feed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-800/80 to-navy-900/80" />

      {/* Grid overlay (simulates camera feed) */}
      <div className="absolute inset-0 grid-bg opacity-20" />

      {/* Detection box */}
      {hasDetection && (
        <motion.div
          key={`box-${tick}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-1/4 left-1/4 w-1/2 h-1/2 detection-box"
        />
      )}

      {/* Scan line */}
      <div className="absolute inset-0 scan-overlay" />

      {/* Camera label */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
        <span className="text-[9px] font-mono text-navy-300 bg-navy-900/70 px-1.5 py-0.5 rounded">
          {camera.id}
        </span>
      </div>

      {/* Detection label */}
      {hasDetection && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-navy-950/90 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-white">{scenario.plate}</span>
              <div className="text-[9px] text-navy-400 truncate">{camera.name.split(" ").slice(0, 2).join(" ")}</div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono text-navy-400">{scenario.conf}%</span>
              <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded text-white", actionBg[scenario.action])}>
                {scenario.action}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-electric-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

// ── Alert Stream ───────────────────────────────────────────

function AlertStream({ loading }: { loading: boolean }) {
  const topAlerts = MOCK_ALERTS.slice(0, 8).sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <GlassCard className="p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-crimson-500/10 border border-crimson-500/20 flex items-center justify-center">
            <AlertTriangle size={15} className="text-crimson-400" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-navy-100 text-sm">Active Alerts</h3>
            <p className="text-[10px] text-navy-500">Priority sorted, real-time</p>
          </div>
        </div>
        <Badge variant="danger" dot pulse>{DASHBOARD_STATS.activeAlerts}</Badge>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          : topAlerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <AlertCard alert={alert} />
            </motion.div>
          ))
        }
      </div>

      <div className="pt-3 border-t border-navy-700/40 flex-shrink-0 mt-3">
        <Button variant="ghost" size="sm" className="w-full text-electric-400" iconRight={<ArrowRight size={13} />}>
          View All Alerts
        </Button>
      </div>
    </GlassCard>
  );
}

function AlertCard({ alert }: { alert: typeof MOCK_ALERTS[0] }) {
  const priorityConfig = {
    critical: { bg: "bg-crimson-500/8 border-crimson-500/25 hover:border-crimson-500/40", dot: "bg-crimson-500", text: "text-crimson-400" },
    high:     { bg: "bg-amber-500/8 border-amber-500/20 hover:border-amber-500/35",   dot: "bg-amber-500",   text: "text-amber-400" },
    medium:   { bg: "bg-electric-500/5 border-electric-500/15",                        dot: "bg-electric-500", text: "text-electric-400" },
    low:      { bg: "bg-navy-700/30 border-navy-600/20",                               dot: "bg-navy-500",   text: "text-navy-400" },
  };

  const config = priorityConfig[alert.priority];

  return (
    <div className={cn(
      "p-3 rounded-xl border cursor-pointer transition-all duration-200",
      config.bg
    )}>
      <div className="flex items-start gap-2">
        <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", config.dot,
          alert.priority === "critical" && "animate-pulse-fast"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-wide", config.text)}>
              {alert.priority}
            </span>
            <span className="text-[10px] text-navy-500">·</span>
            <span className="text-[10px] text-navy-400 font-mono">{alert.vehiclePlate}</span>
          </div>
          <div className="text-xs font-semibold text-navy-200 truncate">{alert.type}</div>
          <div className="text-[10px] text-navy-500 truncate mt-0.5">{alert.location} · {alert.confidence}% conf.</div>
        </div>
        <ChevronRight size={12} className="text-navy-600 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}

// ── Detection Chart ────────────────────────────────────────

function DetectionChart({ loading }: { loading: boolean }) {
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-navy-800/95 border border-navy-600/50 rounded-xl p-3 text-xs">
        <div className="text-navy-400 mb-2 font-mono">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="text-navy-200">{p.value.toLocaleString()} detections</div>
        ))}
      </div>
    );
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-navy-100 text-sm">Hourly Detections</h3>
          <p className="text-[10px] text-navy-500">Today · All cameras combined</p>
        </div>
        <Badge variant="info">24h</Badge>
      </div>
      {loading ? (
        <Skeleton className="h-40" />
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={DETECTION_CHART_DATA}>
            <defs>
              <linearGradient id="grad-detect" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(213,94%,56%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(213,94%,56%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,142,247,0.06)" />
            <XAxis dataKey="hour" tick={{ fill: "hsl(222,16%,45%)", fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="detections"
              stroke="hsl(213,94%,56%)" strokeWidth={2}
              fill="url(#grad-detect)"
              dot={false} activeDot={{ r: 4, fill: "hsl(213,94%,56%)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  );
}

// ── Recent Vehicle Timeline ────────────────────────────────

function RecentVehicleTimeline({ loading }: { loading: boolean }) {
  const recent = MOCK_VEHICLES.slice(0, 6);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-navy-100 text-sm">Recent Detections</h3>
          <p className="text-[10px] text-navy-500">Last 30 minutes</p>
        </div>
        <Button variant="ghost" size="xs" iconRight={<ChevronRight size={12} />}>All</Button>
      </div>
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
          : recent.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-navy-700/30 transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-navy-700/60 border border-navy-600/30 flex items-center justify-center flex-shrink-0">
                <Car size={14} className="text-navy-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-navy-200">{v.plateNumber}</span>
                  <RiskBadge level={v.riskLevel} className="text-[9px] py-0" />
                </div>
                <div className="text-[10px] text-navy-500 truncate">{v.lastCamera}</div>
              </div>
              <ChevronRight size={12} className="text-navy-700 group-hover:text-navy-400 transition-colors flex-shrink-0" />
            </motion.div>
          ))
        }
      </div>
    </GlassCard>
  );
}

// ── Officer Activity Feed ─────────────────────────────────

function OfficerActivityFeed({ loading }: { loading: boolean }) {
  const activities = [
    { officer: "SI Ravi Kumar", action: "Assigned Alert", detail: "AP39AB1234 · Clone", time: "2m ago", type: "alert" },
    { officer: "ASI Lakshmi", action: "Opened Investigation", detail: "Case #INV-2847", time: "8m ago", type: "case" },
    { officer: "PC Suresh", action: "Verified Vehicle", detail: "AP16CD5678 · Clear", time: "15m ago", type: "verify" },
    { officer: "SI Ramesh", action: "Evidence Collected", detail: "4 items · CAM-003", time: "28m ago", type: "evidence" },
    { officer: "ASI Priya", action: "Report Generated", detail: "Daily Intelligence", time: "45m ago", type: "report" },
    { officer: "SP Office", action: "Clone Escalated", detail: "AP37EF9012 · Chirala", time: "1h ago", type: "alert" },
  ];

  const typeConfig: Record<string, string> = {
    alert: "text-crimson-400",
    case: "text-amber-400",
    verify: "text-emerald-400",
    evidence: "text-electric-400",
    report: "text-cyan-400",
  };

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-navy-100 text-sm">Officer Activity</h3>
          <p className="text-[10px] text-navy-500">Recent actions · All stations</p>
        </div>
        <Badge variant="success" dot>Live</Badge>
      </div>
      <div className="space-y-2.5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)
          : activities.map((act, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-start gap-2.5"
            >
              <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", typeConfig[act.type].replace("text-", "bg-"))} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-navy-200 truncate">{act.officer}</span>
                  <span className="text-[10px] text-navy-600 flex-shrink-0 font-mono">{act.time}</span>
                </div>
                <div className="text-[10px] text-navy-400">{act.action} · <span className="text-navy-500">{act.detail}</span></div>
              </div>
            </motion.div>
          ))
        }
      </div>
    </GlassCard>
  );
}
