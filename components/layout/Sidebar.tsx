"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Radio, Car, Search, Copy, AlertTriangle,
  Brain, Map, FolderLock, GitBranch, BarChart3, FileText,
  Bell, Camera, UserCheck, Users, Settings, ClipboardList,
  Zap, ChevronLeft, ChevronRight, Shield, Eye,
  Activity, TrendingUp
} from "lucide-react";

// ============================================================
// SIDEBAR NAVIGATION DEFINITION
// ============================================================

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: "danger" | "warning" | "info";
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  // ── Command
  { id: "dashboard",       label: "Command Center",    href: "/dashboard",         icon: <LayoutDashboard size={16} />, section: "Command" },
  { id: "live",            label: "Live Monitoring",    href: "/live",              icon: <Radio size={16} />,           badge: "LIVE", badgeVariant: "danger", section: "Command" },

  // ── Intelligence
  { id: "vehicles",        label: "Vehicle Intelligence", href: "/vehicles",        icon: <Car size={16} />, section: "Intelligence" },
  { id: "search",          label: "Vehicle Search",     href: "/search",            icon: <Search size={16} />, section: "Intelligence" },
  { id: "clone-detection", label: "Clone Detection",    href: "/clone-detection",   icon: <Copy size={16} />, badge: 3, badgeVariant: "danger", section: "Intelligence" },
  { id: "watchlist",       label: "Stolen Watchlist",   href: "/watchlist",         icon: <AlertTriangle size={16} />, section: "Intelligence" },

  // ── Investigation
  { id: "investigation",   label: "AI Investigation",   href: "/investigation",     icon: <Brain size={16} />, section: "Investigation" },
  { id: "heatmaps",        label: "Heatmaps & GIS",     href: "/heatmaps",          icon: <Map size={16} />, section: "Investigation" },
  { id: "evidence",        label: "Evidence Locker",    href: "/evidence",          icon: <FolderLock size={16} />, section: "Investigation" },
  { id: "timeline",        label: "Vehicle Timeline",   href: "/timeline",          icon: <GitBranch size={16} />, section: "Investigation" },

  // ── Analytics
  { id: "analytics",       label: "Analytics",          href: "/analytics",         icon: <BarChart3 size={16} />, section: "Analytics" },
  { id: "reports",         label: "Reports",             href: "/reports",           icon: <FileText size={16} />, section: "Analytics" },
  { id: "alerts",          label: "Alert Center",        href: "/alerts",            icon: <Bell size={16} />, badge: 24, badgeVariant: "warning", section: "Analytics" },

  // ── Operations
  { id: "cameras",         label: "Camera Management",  href: "/cameras",           icon: <Camera size={16} />, section: "Operations" },
  { id: "officers",        label: "Officer Activity",   href: "/officers",          icon: <UserCheck size={16} />, section: "Operations" },

  // ── Admin
  { id: "users",           label: "User Management",    href: "/users",             icon: <Users size={16} />, section: "Admin" },
  { id: "settings",        label: "Settings",            href: "/settings",          icon: <Settings size={16} />, section: "Admin" },
  { id: "audit",           label: "Audit Logs",          href: "/audit",             icon: <ClipboardList size={16} />, section: "Admin" },
];

// Group nav items by section
const SECTIONS = Array.from(new Set(NAV_ITEMS.map(i => i.section).filter(Boolean)));

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "relative flex flex-col h-full flex-shrink-0",
        "bg-navy-900/95 backdrop-blur-xl",
        "border-r border-navy-700/40",
        "overflow-hidden"
      )}
      aria-label="Main Navigation"
    >
      {/* Background Glow */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-radial from-electric-500/5 to-transparent pointer-events-none" />

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-navy-700/40 flex-shrink-0">
        <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-electric-500/15 border border-electric-500/30 flex items-center justify-center">
          <Eye size={16} className="text-electric-400" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="font-heading font-bold text-base text-white leading-none tracking-wide">
                TRINETHRA
              </div>
              <div className="text-[10px] text-navy-400 tracking-[0.15em] uppercase mt-0.5">
                The Third Eye
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2" role="navigation">
        {SECTIONS.map((section) => {
          const items = NAV_ITEMS.filter(i => i.section === section);
          return (
            <div key={section} className="mb-2">
              {/* Section Label */}
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 py-2 text-[10px] font-semibold tracking-[0.12em] uppercase text-navy-500"
                  >
                    {section}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Section Items */}
              {items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── System Status ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-2 mb-2 p-3 rounded-xl bg-navy-800/60 border border-navy-700/30"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-navy-500 font-semibold">System</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
                <span className="text-[10px] text-emerald-500 font-mono">Online</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <StatusRow icon={<Camera size={10} />} label="Cameras" value="10/12" status="good" />
              <StatusRow icon={<Zap size={10} />} label="AI Engine" value="99.2%" status="good" />
              <StatusRow icon={<Activity size={10} />} label="Uptime" value="99.97%" status="good" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "flex items-center justify-center mx-2 mb-3 h-8 rounded-xl",
          "bg-navy-800/40 border border-navy-700/30",
          "text-navy-400 hover:text-navy-100 hover:bg-navy-700/60",
          "transition-all duration-200",
          collapsed ? "w-full" : "w-full"
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : (
          <div className="flex items-center gap-2 text-xs">
            <ChevronLeft size={14} />
            <span>Collapse</span>
          </div>
        )}
      </button>
    </motion.aside>
  );
}

// ── Sidebar Item ──────────────────────────────────────────

interface SidebarItemProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

function SidebarItem({ item, active, collapsed }: SidebarItemProps) {
  const badgeColors = {
    danger: "bg-crimson-500/80 text-white",
    warning: "bg-amber-500/80 text-white",
    info: "bg-electric-500/80 text-white",
  };

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl",
        "transition-all duration-200 ease-smooth",
        "group relative",
        "hover:bg-navy-700/50 hover:text-navy-50",
        active
          ? "bg-electric-500/12 text-electric-300 border border-electric-500/20"
          : "text-navy-400 border border-transparent"
      )}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
    >
      {/* Active Indicator */}
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-electric-400 rounded-full"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      {/* Icon */}
      <span className={cn(
        "flex-shrink-0 transition-colors duration-200",
        active ? "text-electric-400" : "text-navy-500 group-hover:text-navy-300"
      )}>
        {item.icon}
      </span>

      {/* Label */}
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "flex-1 text-xs font-medium truncate",
              active ? "text-electric-300" : "text-navy-400 group-hover:text-navy-200"
            )}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge */}
      <AnimatePresence>
        {!collapsed && item.badge !== undefined && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full",
              badgeColors[item.badgeVariant ?? "info"]
            )}
          >
            {item.badge}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

// ── Status Row ─────────────────────────────────────────────

function StatusRow({
  icon, label, value, status
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: "good" | "warn" | "error";
}) {
  const statusColor = { good: "text-emerald-400", warn: "text-amber-400", error: "text-crimson-400" }[status];
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-navy-500">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <span className={cn("text-[10px] font-mono", statusColor)}>{value}</span>
    </div>
  );
}
