"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/forms";
import {
  Search, Bell, Bot, User, Shield, ChevronDown,
  X, Settings, LogOut, UserCheck, HelpCircle,
  Zap, Activity
} from "lucide-react";

// ============================================================
// HEADER COMPONENT
// ============================================================

interface HeaderProps {
  title?: string;
  breadcrumb?: { label: string; href?: string }[];
}

export default function Header({ title, breadcrumb }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <header className={cn(
      "flex items-center justify-between gap-4",
      "h-16 px-6 flex-shrink-0",
      "bg-navy-900/80 backdrop-blur-xl",
      "border-b border-navy-700/40",
      "relative z-30"
    )}>
      {/* Left: Breadcrumb / Title */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb ? (
          <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-navy-600">/</span>}
                <span className={cn(
                  "text-sm",
                  i === breadcrumb.length - 1
                    ? "text-navy-100 font-semibold font-heading"
                    : "text-navy-500 hover:text-navy-300 cursor-pointer transition-colors"
                )}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        ) : (
          <h1 className="font-heading font-semibold text-navy-100 text-base">{title ?? "TRINETHRA"}</h1>
        )}
      </div>

      {/* Center: Quick Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            "w-full flex items-center gap-3 px-3 h-9",
            "bg-navy-800/40 hover:bg-navy-800/70",
            "border border-navy-700/30 hover:border-electric-500/30",
            "rounded-xl text-left",
            "transition-all duration-200",
            "group"
          )}
          aria-label="Search vehicles, plates, cases"
        >
          <Search size={14} className="text-navy-500 group-hover:text-electric-400 transition-colors flex-shrink-0" />
          <span className="text-xs text-navy-500 flex-1">Search vehicles, plates, cases…</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-navy-600/40 bg-navy-800/60 px-1.5 font-mono text-[10px] text-navy-500">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* AI Copilot Button */}
        <Button
          variant="outline"
          size="sm"
          icon={<Bot size={14} />}
          className="hidden sm:inline-flex text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
          onClick={() => setAiOpen(!aiOpen)}
          aria-label="Open AI Copilot"
        >
          <span className="hidden lg:inline">AI Copilot</span>
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="icon"
            size="sm"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Notifications"
            className="relative"
          >
            <Bell size={15} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-crimson-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              7
            </span>
          </Button>

          <AnimatePresence>
            {notifOpen && (
              <NotificationPanel onClose={() => setNotifOpen(false)} />
            )}
          </AnimatePresence>
        </div>

        {/* System Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
          <span className="text-[11px] text-emerald-400 font-medium">All Systems</span>
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={cn(
              "flex items-center gap-2 pl-2 pr-1.5 py-1.5",
              "rounded-xl border border-navy-700/30 hover:border-electric-500/25",
              "bg-navy-800/40 hover:bg-navy-700/60",
              "transition-all duration-200 group"
            )}
            aria-label="User menu"
            aria-expanded={profileOpen}
          >
            <div className="w-6 h-6 rounded-lg bg-electric-500/20 border border-electric-500/30 flex items-center justify-center">
              <Shield size={12} className="text-electric-400" />
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-[11px] font-semibold text-navy-200 leading-none">SP Ongole</div>
              <div className="text-[10px] text-navy-500 leading-none mt-0.5">Superintendent</div>
            </div>
            <ChevronDown size={12} className="text-navy-500 group-hover:text-navy-300 transition-colors" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <ProfileDropdown onClose={() => setProfileOpen(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Global Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <GlobalSearch onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>
    </header>
  );
}

// ── Notification Panel ────────────────────────────────────

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const notifications = [
    { id: 1, type: "critical", title: "Clone Detection", message: "AP39AB1234 detected at 2 locations simultaneously", time: "2m ago" },
    { id: 2, type: "high", title: "Stolen Vehicle Alert", message: "AP16CD5678 flagged in VAHAN database", time: "8m ago" },
    { id: 3, type: "high", title: "Blacklisted Vehicle", message: "AP37EF9012 passed Ongole checkpoint", time: "15m ago" },
    { id: 4, type: "medium", title: "Low OCR Confidence", message: "Camera CAM-007 showing degraded accuracy", time: "42m ago" },
    { id: 5, type: "medium", title: "Investigation Update", message: "Case #INV-2847 assigned to SI Ravi Kumar", time: "1h ago" },
    { id: 6, type: "low", title: "Camera Offline", message: "CAM-011 Vijayawada Ring Road — reconnecting", time: "2h ago" },
    { id: 7, type: "low", title: "Daily Report Ready", message: "Vehicle Intelligence Report for 04-Jul-2026", time: "3h ago" },
  ];

  const typeConfig = {
    critical: { dot: "bg-crimson-500", bg: "bg-crimson-500/5 border-crimson-500/15" },
    high:     { dot: "bg-amber-500",   bg: "bg-amber-500/5 border-amber-500/15" },
    medium:   { dot: "bg-electric-500", bg: "bg-electric-500/5 border-electric-500/10" },
    low:      { dot: "bg-navy-500",    bg: "bg-navy-700/30 border-navy-600/20" },
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "absolute right-0 top-11 z-50 w-80",
          "bg-navy-900/98 backdrop-blur-xl",
          "border border-navy-700/50 rounded-2xl",
          "shadow-xl overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-navy-700/40">
          <div>
            <h3 className="text-sm font-semibold text-navy-100 font-heading">Notifications</h3>
            <p className="text-[11px] text-navy-500">7 unread alerts</p>
          </div>
          <button onClick={onClose} className="text-navy-500 hover:text-navy-200 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((n, i) => {
            const config = typeConfig[n.type as keyof typeof typeConfig];
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "flex gap-3 p-3 mx-2 my-1 rounded-xl border cursor-pointer",
                  "hover:bg-navy-700/30 transition-colors",
                  config.bg
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", config.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-navy-200">{n.title}</div>
                  <div className="text-[11px] text-navy-400 mt-0.5 leading-relaxed">{n.message}</div>
                  <div className="text-[10px] text-navy-600 mt-1">{n.time}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="p-3 border-t border-navy-700/40">
          <button className="w-full text-xs text-electric-400 hover:text-electric-300 transition-colors py-1">
            View all alerts →
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Profile Dropdown ──────────────────────────────────────

function ProfileDropdown({ onClose }: { onClose: () => void }) {
  const menuItems = [
    { icon: <UserCheck size={13} />, label: "My Profile", href: "#" },
    { icon: <Activity size={13} />, label: "Activity Log", href: "#" },
    { icon: <Settings size={13} />, label: "Preferences", href: "/settings" },
    { icon: <HelpCircle size={13} />, label: "Help & Support", href: "#" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "absolute right-0 top-11 z-50 w-56",
          "bg-navy-900/98 backdrop-blur-xl",
          "border border-navy-700/50 rounded-2xl",
          "shadow-xl overflow-hidden"
        )}
      >
        {/* User Info */}
        <div className="p-4 border-b border-navy-700/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric-500/20 border border-electric-500/30 flex items-center justify-center">
              <Shield size={18} className="text-electric-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-navy-100 font-heading">SP Ongole</div>
              <div className="text-[11px] text-navy-400">Superintendent of Police</div>
              <div className="text-[10px] text-electric-500 mt-0.5 font-mono">ROLE: SP_ADMIN</div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-1.5">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-navy-300 hover:text-navy-100 hover:bg-navy-700/40 transition-colors text-left"
            >
              <span className="text-navy-500">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-2 border-t border-navy-700/40">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-crimson-400 hover:bg-crimson-500/10 rounded-lg transition-colors">
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Global Search ─────────────────────────────────────────

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");

  const suggestions = [
    { type: "plate", label: "AP39AB1234", sub: "High Risk · Ongole" },
    { type: "plate", label: "AP16CD5678", sub: "Stolen · Nellore" },
    { type: "case",  label: "Case #INV-2847", sub: "Active Investigation" },
    { type: "plate", label: "AP37EF9012", sub: "Clone Detected · Chirala" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" />
      <motion.div
        initial={{ y: -20, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: -20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative w-full max-w-xl",
          "bg-navy-900/98 backdrop-blur-2xl",
          "border border-navy-600/50 rounded-2xl",
          "shadow-xl overflow-hidden"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-navy-700/40">
          <Search size={16} className="text-electric-400 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by plate, case ID, officer, camera, location…"
            className="flex-1 bg-transparent text-navy-100 text-sm placeholder-navy-500 focus:outline-none"
          />
          <kbd className="text-[10px] text-navy-500 border border-navy-700/40 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Suggestions */}
        <div className="p-2">
          <div className="text-[10px] text-navy-600 uppercase tracking-widest font-semibold px-3 py-2">Recent Searches</div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-navy-700/40 transition-colors text-left group"
            >
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold",
                s.type === "plate" ? "bg-electric-500/15 text-electric-400" : "bg-amber-500/15 text-amber-400"
              )}>
                {s.type === "plate" ? "🚗" : "📋"}
              </div>
              <div>
                <div className="text-xs font-semibold text-navy-200 font-mono">{s.label}</div>
                <div className="text-[11px] text-navy-500">{s.sub}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-navy-700/40 flex items-center gap-4 text-[11px] text-navy-600">
          <span>↵ Select</span>
          <span>↑↓ Navigate</span>
          <span>ESC Close</span>
          <span className="ml-auto">Powered by TRINETHRA AI</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

