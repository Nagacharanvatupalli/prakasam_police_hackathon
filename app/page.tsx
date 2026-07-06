"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Eye, Shield, Zap, Brain, Search, Copy, Map,
  Camera, AlertTriangle, BarChart3, Lock, ArrowRight,
  Activity, CheckCircle, ChevronRight, Globe, Cpu
} from "lucide-react";

// ============================================================
// HOMEPAGE — TRINETHRA Landing
// ============================================================

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-x-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Global grid bg */}
      <div className="fixed inset-0 grid-bg opacity-40 pointer-events-none" />

      {/* Ambient glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-electric-500/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/4 blur-3xl pointer-events-none" />

      <HomeNav />
      <HeroSection />
      <StatsBand />
      <CapabilitiesSection />
      <AIArchitectureSection />
      <TargetUsersSection />
      <TechStackSection />
      <CTASection />
      <HomeFooter />
    </main>
  );
}

// ── Navigation ─────────────────────────────────────────────

function HomeNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16",
        "transition-all duration-300",
        scrolled && "bg-navy-900/90 backdrop-blur-xl border-b border-navy-700/40"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-electric-500/15 border border-electric-500/30 flex items-center justify-center">
          <Eye size={16} className="text-electric-400" />
        </div>
        <div>
          <span className="font-heading font-bold text-white text-sm tracking-wide">TRINETHRA</span>
          <span className="hidden sm:inline text-navy-500 text-xs ml-2">Vehicle Intelligence Platform</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a href="#capabilities" className="hidden md:block text-xs text-navy-400 hover:text-navy-100 transition-colors">Capabilities</a>
        <a href="#architecture" className="hidden md:block text-xs text-navy-400 hover:text-navy-100 transition-colors">Architecture</a>
        <a href="#technology" className="hidden md:block text-xs text-navy-400 hover:text-navy-100 transition-colors">Technology</a>
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium",
            "bg-electric-500 hover:bg-electric-600 text-white",
            "border border-electric-400/30",
            "shadow-glow-blue transition-all duration-200",
            "hover:shadow-[0_0_30px_rgba(43,142,247,0.4)]"
          )}
        >
          <span>Enter Command Center</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </motion.nav>
  );
}

// ── Hero Section ───────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-dvh flex flex-col items-center justify-center text-center px-6 pt-20">
      {/* Background: large eye/scan effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="relative">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-electric-500/10"
              style={{ width: i * 200, height: i * 200, margin: -(i * 100 - 50) }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
            />
          ))}
          <div className="w-32 h-32 rounded-full bg-electric-500/5 border border-electric-500/20 flex items-center justify-center">
            <Eye size={40} className="text-electric-500/40" />
          </div>
        </div>
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative mb-6"
      >
        <span className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium",
          "bg-electric-500/10 border border-electric-500/25 text-electric-300",
          "backdrop-blur-sm"
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-electric-400 animate-pulse" />
          Prakasam Police Mission Youth4 Hackathon 2026
          <span className="w-1.5 h-1.5 rounded-full bg-electric-400 animate-pulse" />
        </span>
      </motion.div>

      {/* Main Title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="relative mb-6"
      >
        <div className="text-[10px] sm:text-xs font-mono text-navy-500 tracking-[0.4em] uppercase mb-4">
          त्रिनेत्र &nbsp;·&nbsp; The Third Eye
        </div>
        <h1 className="font-heading font-bold text-white leading-none mb-1">
          <span className="block text-5xl sm:text-7xl md:text-8xl gradient-text">TRINETHRA</span>
        </h1>
        <div className="flex items-center justify-center gap-4 mt-4 text-navy-400 text-sm sm:text-base font-light tracking-widest">
          {["See.", "Verify.", "Track.", "Protect."].map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              className={cn(i === 3 ? "text-electric-400 font-medium" : "")}
            >
              {word}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="relative max-w-2xl text-navy-400 text-sm sm:text-base leading-relaxed mb-10"
      >
        An AI-powered Vehicle Intelligence Platform enabling law enforcement agencies to
        identify, verify, monitor, investigate, and predict suspicious vehicle activities
        using existing CCTV infrastructure — without additional hardware.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="relative flex flex-col sm:flex-row items-center gap-4 mb-16"
      >
        <Link
          href="/dashboard"
          className={cn(
            "group flex items-center gap-3 px-8 py-3.5 rounded-2xl text-sm font-semibold",
            "bg-electric-500 hover:bg-electric-600 text-white",
            "shadow-glow-blue hover:shadow-[0_0_40px_rgba(43,142,247,0.5)]",
            "transition-all duration-300",
            "border border-electric-400/30"
          )}
        >
          <Eye size={16} />
          Enter Command Center
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </Link>
        <a
          href="#architecture"
          className={cn(
            "flex items-center gap-3 px-8 py-3.5 rounded-2xl text-sm font-medium",
            "bg-navy-800/60 hover:bg-navy-700/60 text-navy-200",
            "border border-navy-600/40 hover:border-electric-500/30",
            "transition-all duration-200 backdrop-blur-sm"
          )}
        >
          <Brain size={16} className="text-cyan-400" />
          View AI Architecture
        </a>
      </motion.div>

      {/* Feature Pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="relative flex flex-wrap items-center justify-center gap-2 max-w-lg"
      >
        {[
          "YOLOv11 Detection", "Vehicle Fingerprint", "Clone Detection",
          "FastReID Tracking", "PaddleOCR", "Predictive Analytics"
        ].map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-full bg-navy-800/60 border border-navy-700/40 text-navy-400 text-xs font-mono"
          >
            {tag}
          </span>
        ))}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] text-navy-600 uppercase tracking-widest">Scroll to Explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-5 h-8 rounded-full border border-navy-700/60 flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-electric-500/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── Stats Band ─────────────────────────────────────────────

const STATS = [
  { value: "99.2%", label: "OCR Accuracy", sub: "Across all lighting conditions" },
  { value: "<200ms", label: "Detection Latency", sub: "Real-time processing speed" },
  { value: "18+", label: "AI Models", sub: "End-to-end intelligence pipeline" },
  { value: "12", label: "Live Cameras", sub: "Prakasam district network" },
  { value: "3,847", label: "Detections Today", sub: "Vehicles processed" },
  { value: "99.97%", label: "System Uptime", sub: "Enterprise-grade reliability" },
];

function StatsBand() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-3xl p-8 border-electric-500/10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-2xl md:text-3xl font-bold font-heading gradient-text mb-1">
                  {stat.value}
                </div>
                <div className="text-xs font-semibold text-navy-200 mb-1">{stat.label}</div>
                <div className="text-[11px] text-navy-500 leading-tight">{stat.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Capabilities Section ───────────────────────────────────

const CAPABILITIES = [
  {
    icon: <Camera size={20} />,
    title: "Vehicle Detection",
    description: "YOLOv11-powered real-time detection across all CCTV feeds with 99%+ confidence on vehicles of all types.",
    tags: ["YOLOv11", "Real-time", "Multi-class"],
    color: "electric",
  },
  {
    icon: <Eye size={20} />,
    title: "Number Plate OCR",
    description: "PaddleOCR with Indian plate rule engine achieves 99.2% accuracy across day/night conditions.",
    tags: ["PaddleOCR", "Rule Engine", "99.2% Accuracy"],
    color: "cyan",
  },
  {
    icon: <Copy size={20} />,
    title: "Clone Detection",
    description: "Detects cloned number plates by analyzing vehicle fingerprints, GPS impossibility, and temporal patterns.",
    tags: ["Fingerprint", "GPS Analysis", "Temporal"],
    color: "danger",
  },
  {
    icon: <Activity size={20} />,
    title: "Vehicle Tracking",
    description: "BoT-SORT multi-object tracking with FastReID re-identification across camera handoffs.",
    tags: ["BoT-SORT", "FastReID", "Cross-camera"],
    color: "emerald",
  },
  {
    icon: <Brain size={20} />,
    title: "AI Investigation",
    description: "Explainable AI workspace allowing officers to compare vehicles, timelines, and fingerprints side-by-side.",
    tags: ["XAI", "Investigation", "Evidence"],
    color: "purple",
  },
  {
    icon: <Map size={20} />,
    title: "Predictive Analytics",
    description: "LSTM-powered route prediction and crime hotspot mapping with PostGIS spatial intelligence.",
    tags: ["LSTM", "PostGIS", "Heatmaps"],
    color: "amber",
  },
];

function CapabilitiesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const colorMap: Record<string, string> = {
    electric: "text-electric-400 bg-electric-500/10 border-electric-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    danger: "text-crimson-400 bg-crimson-500/10 border-crimson-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <section id="capabilities" ref={ref} className="relative py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <div className="text-[11px] font-mono text-electric-400 tracking-[0.3em] uppercase mb-3">Core Capabilities</div>
          <h2 className="font-heading font-bold text-white text-3xl md:text-4xl mb-4">
            Intelligence at Every Layer
          </h2>
          <p className="text-navy-400 max-w-xl mx-auto text-sm leading-relaxed">
            TRINETHRA integrates 18+ AI models into a unified decision-support platform
            that helps officers make faster, more accurate decisions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={cn(
                "glass rounded-2xl p-6 border",
                "hover:border-electric-500/20 hover:-translate-y-0.5",
                "transition-all duration-300 group",
                "cursor-default"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl border flex items-center justify-center mb-4",
                colorMap[cap.color]
              )}>
                {cap.icon}
              </div>
              <h3 className="font-heading font-semibold text-navy-100 text-base mb-2">{cap.title}</h3>
              <p className="text-navy-400 text-xs leading-relaxed mb-4">{cap.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {cap.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-navy-700/50 border border-navy-600/30 text-navy-400 text-[10px] font-mono">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── AI Architecture Section ────────────────────────────────

function AIArchitectureSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const pipeline = [
    { step: "01", name: "CCTV Input", model: "OpenCV + RTSP", color: "navy" },
    { step: "02", name: "Vehicle Detection", model: "YOLOv11", color: "electric" },
    { step: "03", name: "Plate Detection", model: "YOLOv11 Fine-tuned", color: "electric" },
    { step: "04", name: "OCR Engine", model: "PaddleOCR + Rule Engine", color: "cyan" },
    { step: "05", name: "Re-Identification", model: "FastReID + BoT-SORT", color: "cyan" },
    { step: "06", name: "Vehicle Fingerprint", model: "ConvNeXt + FAISS", color: "emerald" },
    { step: "07", name: "Risk Intelligence", model: "XGBoost + LSTM", color: "amber" },
    { step: "08", name: "Alert & Action", model: "Rule Engine + AI Copilot", color: "crimson" },
  ];

  const colorMap: Record<string, string> = {
    navy: "border-navy-600/40 text-navy-400",
    electric: "border-electric-500/40 text-electric-400 bg-electric-500/5",
    cyan: "border-cyan-500/40 text-cyan-400 bg-cyan-500/5",
    emerald: "border-emerald-500/40 text-emerald-400 bg-emerald-500/5",
    amber: "border-amber-500/40 text-amber-400 bg-amber-500/5",
    crimson: "border-crimson-500/40 text-crimson-400 bg-crimson-500/5",
  };

  return (
    <section id="architecture" ref={ref} className="relative py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <div className="text-[11px] font-mono text-cyan-400 tracking-[0.3em] uppercase mb-3">AI Pipeline</div>
          <h2 className="font-heading font-bold text-white text-3xl md:text-4xl mb-4">
            End-to-End Intelligence Pipeline
          </h2>
          <p className="text-navy-400 max-w-xl mx-auto text-sm leading-relaxed">
            Every frame from every camera passes through an 8-stage AI pipeline delivering
            explainable, auditable, and actionable intelligence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pipeline.map((stage, i) => (
            <motion.div
              key={stage.step}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className={cn(
                "relative p-4 rounded-2xl border glass-hover",
                "transition-all duration-300",
                colorMap[stage.color]
              )}
            >
              {i < pipeline.length - 1 && (
                <div className="hidden lg:block absolute -right-1.5 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight size={12} className="text-navy-600" />
                </div>
              )}
              <div className="text-[10px] font-mono opacity-60 mb-1">{stage.step}</div>
              <div className="text-xs font-semibold text-navy-200 mb-1">{stage.name}</div>
              <div className="text-[10px] text-navy-500 font-mono">{stage.model}</div>
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-current rounded-full opacity-40"
                initial={{ width: 0 }}
                animate={inView ? { width: "100%" } : {}}
                transition={{ delay: i * 0.08 + 0.3, duration: 0.6 }}
              />
            </motion.div>
          ))}
        </div>

        {/* Architecture note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.9 }}
          className="mt-8 p-4 rounded-xl bg-electric-500/5 border border-electric-500/15 text-center"
        >
          <p className="text-xs text-navy-400">
            <span className="text-electric-400 font-semibold">Explainable AI First:</span>{" "}
            Every prediction includes confidence scores, supporting evidence, decision rationale, and recommended officer action.
            Zero black-box predictions.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ── Target Users Section ──────────────────────────────────

const USERS = [
  { role: "Superintendent of Police", icon: "🏛️", desc: "Command overview, district intelligence, officer management" },
  { role: "Traffic Control Officers", icon: "🚦", desc: "Real-time vehicle monitoring, challan integration, checkpoint alerts" },
  { role: "Crime Investigation", icon: "🔍", desc: "AI investigation workspace, evidence management, case timelines" },
  { role: "Control Room Operators", icon: "📡", desc: "Live CCTV monitoring, alert triage, incident coordination" },
  { role: "Cyber Crime Units", icon: "💻", desc: "Digital forensics, evidence chain, pattern analysis" },
  { role: "District Administrators", icon: "📊", desc: "Analytics dashboards, performance reports, resource planning" },
];

function TargetUsersSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <div className="text-[11px] font-mono text-emerald-400 tracking-[0.3em] uppercase mb-3">User Roles</div>
          <h2 className="font-heading font-bold text-white text-3xl md:text-4xl mb-4">
            Built for Every Officer
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {USERS.map((user, i) => (
            <motion.div
              key={user.role}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-5 hover:border-electric-500/20 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="text-2xl mb-3">{user.icon}</div>
              <h3 className="font-heading font-semibold text-navy-100 text-sm mb-2">{user.role}</h3>
              <p className="text-navy-400 text-xs leading-relaxed">{user.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Tech Stack Section ────────────────────────────────────

const TECH_STACK = [
  { category: "Frontend", items: ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS", "Framer Motion"] },
  { category: "AI/ML", items: ["YOLOv11", "BoT-SORT", "FastReID", "PaddleOCR", "ConvNeXt", "XGBoost"] },
  { category: "Backend", items: ["FastAPI", "Python", "WebSockets", "REST API", "RBAC + JWT"] },
  { category: "Database", items: ["PostgreSQL 17", "PostGIS", "Redis", "MinIO Storage"] },
  { category: "Infrastructure", items: ["Docker", "Nginx", "GitHub Actions", "Prometheus", "Grafana"] },
];

function TechStackSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="technology" ref={ref} className="relative py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <div className="text-[11px] font-mono text-amber-400 tracking-[0.3em] uppercase mb-3">Technology Stack</div>
          <h2 className="font-heading font-bold text-white text-3xl md:text-4xl mb-4">
            Enterprise-Grade Technology
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {TECH_STACK.map((group, i) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-4"
            >
              <div className="text-[10px] font-mono text-electric-400 uppercase tracking-widest mb-3">{group.category}</div>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle size={10} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-navy-300">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ───────────────────────────────────────────

function CTASection() {
  return (
    <section className="relative py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="glass rounded-3xl p-10 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-electric-500/8 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-electric-500/15 border border-electric-500/30 flex items-center justify-center mx-auto mb-6">
              <Eye size={28} className="text-electric-400" />
            </div>
            <h2 className="font-heading font-bold text-white text-3xl md:text-4xl mb-4">
              Ready to Deploy?
            </h2>
            <p className="text-navy-400 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
              Experience TRINETHRA's complete AI Command Center — built for real deployment
              across Andhra Pradesh police districts.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className={cn(
                  "group flex items-center gap-3 px-8 py-3.5 rounded-2xl text-sm font-semibold w-full sm:w-auto justify-center",
                  "bg-electric-500 hover:bg-electric-600 text-white",
                  "shadow-glow-blue hover:shadow-[0_0_40px_rgba(43,142,247,0.5)]",
                  "transition-all duration-300 border border-electric-400/30"
                )}
              >
                <Eye size={16} />
                Open Command Center
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 px-8 py-3.5 rounded-2xl text-sm font-medium w-full sm:w-auto justify-center",
                  "bg-navy-800/60 text-navy-200 border border-navy-600/40",
                  "hover:border-electric-500/30 transition-all duration-200"
                )}
              >
                <BarChart3 size={16} className="text-cyan-400" />
                View Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Home Footer ───────────────────────────────────────────

function HomeFooter() {
  return (
    <footer className="relative border-t border-navy-800/60 py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-electric-500/15 border border-electric-500/25 flex items-center justify-center">
            <Eye size={13} className="text-electric-400" />
          </div>
          <div>
            <div className="font-heading font-bold text-white text-sm">TRINETHRA</div>
            <div className="text-[10px] text-navy-500">Prakasam Police Mission Youth4 Hackathon 2026</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-navy-600">
          <Lock size={10} />
          <span>Government Grade Security</span>
          <span className="mx-2">·</span>
          <Shield size={10} />
          <span>WCAG 2.2 AA Accessible</span>
          <span className="mx-2">·</span>
          <Globe size={10} />
          <span>Andhra Pradesh, India</span>
        </div>
      </div>
    </footer>
  );
}
