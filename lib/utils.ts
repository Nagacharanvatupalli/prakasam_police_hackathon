import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, compact = false): string {
  if (compact && n >= 1000) {
    return new Intl.NumberFormat("en-IN", { notation: "compact", compactDisplay: "short" }).format(n);
  }
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function getRiskColor(risk: string): string {
  const map: Record<string, string> = {
    critical: "text-crimson-500",
    high: "text-amber-500",
    medium: "text-electric-500",
    low: "text-navy-300",
    safe: "text-emerald-500",
    verified: "text-emerald-500",
    suspicious: "text-amber-500",
  };
  return map[risk.toLowerCase()] ?? "text-navy-300";
}

export function getRiskBg(risk: string): string {
  const map: Record<string, string> = {
    critical: "bg-crimson-500/10 border-crimson-500/30",
    high: "bg-amber-500/10 border-amber-500/30",
    medium: "bg-electric-500/10 border-electric-500/30",
    low: "bg-navy-500/20 border-navy-400/20",
    safe: "bg-emerald-500/10 border-emerald-500/30",
    verified: "bg-emerald-500/10 border-emerald-500/30",
    suspicious: "bg-amber-500/10 border-amber-500/30",
  };
  return map[risk.toLowerCase()] ?? "bg-navy-700/50 border-navy-500/20";
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11).toUpperCase();
}
