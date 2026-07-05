"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

// ============================================================
// GLASS CARD — Core surface component
// ============================================================

interface GlassCardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
  glow?: "blue" | "cyan" | "green" | "red" | "amber" | "none";
  intensity?: "light" | "normal" | "strong";
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hover = false, glow = "none", intensity = "normal", children, ...props }, ref) => {
    const intensityClasses = {
      light: "bg-navy-800/30 backdrop-blur-sm",
      normal: "bg-navy-800/60 backdrop-blur-md",
      strong: "bg-navy-900/85 backdrop-blur-xl",
    };

    const glowClasses = {
      blue: "hover:shadow-glow-blue",
      cyan: "hover:shadow-glow-cyan",
      green: "hover:glow-green",
      red: "hover:glow-red",
      amber: "hover:glow-amber",
      none: "",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-2xl border border-navy-600/20",
          "shadow-card",
          intensityClasses[intensity],
          hover && [
            "cursor-pointer transition-all duration-300 ease-smooth",
            "hover:border-electric-500/25 hover:-translate-y-0.5",
            "hover:shadow-card-hover",
            glowClasses[glow],
          ],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";

// ============================================================
// SECTION HEADER
// ============================================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, icon, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-heading font-semibold text-navy-50 text-base leading-tight">{title}</h3>
          {subtitle && <p className="text-navy-300 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ============================================================
// BADGE SYSTEM
// ============================================================

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "ghost";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({ variant = "default", children, className, dot = false, pulse = false }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-navy-600/40 text-navy-200 border-navy-500/20",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    danger: "bg-crimson-500/15 text-crimson-400 border-crimson-500/30",
    info: "bg-electric-500/15 text-electric-400 border-electric-500/30",
    ghost: "bg-transparent text-navy-300 border-navy-600/30",
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: "bg-navy-400",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-crimson-500",
    info: "bg-electric-500",
    ghost: "bg-navy-400",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
      variants[variant],
      className
    )}>
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          dotColors[variant],
          pulse && "animate-pulse-fast"
        )} />
      )}
      {children}
    </span>
  );
}

// ============================================================
// RISK BADGE
// ============================================================

type RiskLevel = "verified" | "safe" | "suspicious" | "high_risk" | "critical";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
  score?: number;
}

export function RiskBadge({ level, className, score }: RiskBadgeProps) {
  const config: Record<RiskLevel, { label: string; classes: string; pulse: boolean }> = {
    verified: { label: "Verified", classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", pulse: false },
    safe:     { label: "Safe",     classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", pulse: false },
    suspicious: { label: "Suspicious", classes: "bg-amber-500/15 text-amber-400 border-amber-500/30", pulse: false },
    high_risk: { label: "High Risk", classes: "bg-crimson-500/20 text-crimson-400 border-crimson-500/30", pulse: true },
    critical:  { label: "Critical",  classes: "bg-crimson-500/25 text-crimson-300 border-crimson-500/40", pulse: true },
  };

  const { label, classes, pulse } = config[level];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border tracking-wide uppercase",
      classes,
      className
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full bg-current", pulse && "animate-pulse-fast")} />
      {label}
      {score !== undefined && <span className="font-mono ml-0.5 opacity-70">{score}</span>}
    </span>
  );
}

// ============================================================
// CONFIDENCE BAR
// ============================================================

interface ConfidenceBarProps {
  value: number; // 0–100
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConfidenceBar({ value, label, showValue = true, size = "md", className }: ConfidenceBarProps) {
  const color =
    value >= 90 ? "bg-emerald-500" :
    value >= 70 ? "bg-electric-500" :
    value >= 50 ? "bg-amber-500" :
    "bg-crimson-500";

  const height = { sm: "h-1", md: "h-1.5", lg: "h-2" }[size];

  return (
    <div className={cn("space-y-1", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs text-navy-300">{label}</span>}
          {showValue && <span className="text-xs font-mono text-navy-200">{value}%</span>}
        </div>
      )}
      <div className={cn("w-full bg-navy-700/50 rounded-full overflow-hidden", height)}>
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

// ============================================================
// PROGRESS RING (Circular)
// ============================================================

interface ProgressRingProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 4,
  color = "hsl(213, 94%, 56%)",
  className,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(43,142,247,0.08)" strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SKELETON LOADER
// ============================================================

interface SkeletonProps {
  className?: string;
  variant?: "text" | "card" | "circle" | "rect";
}

export function Skeleton({ className, variant = "rect" }: SkeletonProps) {
  const variantClasses = {
    text: "h-4 rounded",
    card: "h-32 rounded-2xl",
    circle: "rounded-full aspect-square",
    rect: "rounded-xl",
  };

  return (
    <div className={cn(
      "skeleton",
      variantClasses[variant],
      className
    )} />
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-navy-700/50 border border-navy-600/30 flex items-center justify-center text-navy-400 text-2xl">
          {icon}
        </div>
      )}
      <div className="space-y-2">
        <h4 className="font-heading font-semibold text-navy-200">{title}</h4>
        {description && <p className="text-navy-400 text-sm max-w-xs">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}

// ============================================================
// STATUS PILL
// ============================================================

type StatusType = "valid" | "expired" | "suspended" | "unregistered" | "none" | "active" | "offline" | "maintenance";

export function StatusPill({ status }: { status: StatusType }) {
  const config: Record<StatusType, { label: string; classes: string }> = {
    valid:        { label: "Valid",        classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
    active:       { label: "Active",       classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
    expired:      { label: "Expired",      classes: "bg-crimson-500/15 text-crimson-400 border-crimson-500/25" },
    suspended:    { label: "Suspended",    classes: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
    unregistered: { label: "Unregistered", classes: "bg-crimson-500/15 text-crimson-400 border-crimson-500/25" },
    none:         { label: "None",         classes: "bg-navy-700/40 text-navy-400 border-navy-600/20" },
    offline:      { label: "Offline",      classes: "bg-crimson-500/15 text-crimson-400 border-crimson-500/25" },
    maintenance:  { label: "Maintenance",  classes: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  };
  const { label, classes } = config[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", classes)}>
      {label}
    </span>
  );
}

// ============================================================
// AI THINKING INDICATOR
// ============================================================

export function AIThinking({ label = "AI Processing" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-electric-400">
      <div className="ai-thinking">
        <span />
        <span />
        <span />
      </div>
      <span className="text-xs text-navy-300">{label}</span>
    </div>
  );
}

// ============================================================
// STAT VALUE (animated number)
// ============================================================

interface StatValueProps {
  value: number | string;
  unit?: string;
  className?: string;
  mono?: boolean;
}

export function StatValue({ value, unit, className, mono = true }: StatValueProps) {
  return (
    <div className={cn("flex items-baseline gap-1", className)}>
      <span className={cn(
        "text-2xl font-bold text-navy-50",
        mono && "font-mono"
      )}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </span>
      {unit && <span className="text-xs text-navy-400">{unit}</span>}
    </div>
  );
}
