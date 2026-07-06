"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, RiskBadge, Badge, ConfidenceBar } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { MOCK_ALERTS } from "@/lib/mock-data";
import {
  Bell, AlertTriangle, AlertOctagon, CheckCircle2,
  ChevronRight, Compass, ShieldAlert, User, Trash2, Check,
  ExternalLink, Search, RefreshCw
} from "lucide-react";

// ============================================================
// ALERT CENTER PAGE
// ============================================================

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<any>(MOCK_ALERTS[0]);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [query, setQuery] = useState("");

  const handleAction = (alertId: string, action: "resolve" | "dismiss") => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: action === "resolve" ? "resolved" : "acknowledged" } : a))
    );
    if (selectedAlert?.id === alertId) {
      setSelectedAlert((prev: any) => ({ ...prev, status: action === "resolve" ? "resolved" : "acknowledged" }));
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesPriority = filterPriority === "all" || a.priority.toLowerCase() === filterPriority.toLowerCase();
    const matchesQuery = query.trim() === "" || a.vehiclePlate.toLowerCase().includes(query.toLowerCase()) || a.type.toLowerCase().includes(query.toLowerCase());
    return matchesPriority && matchesQuery;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={14} className="text-crimson-500 animate-pulse" />
            <span className="text-[11px] text-crimson-400 font-mono font-medium tracking-widest uppercase">Surveillance Incident Hub</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Alert Dispatch Center</h1>
          <p className="text-navy-300 text-xs">Real-time incident priority queues, dispatch protocols, and resolution audit tracking.</p>
        </div>
      </div>

      {/* Filters */}
      <GlassCard className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <Input
          placeholder="Filter by plate number or alert type..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:max-w-xs"
          icon={<Search size={14} />}
        />
        <Select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          options={[
            { value: "all", label: "All Priorities" },
            { value: "critical", label: "Critical" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
        <Button variant="ghost" className="sm:ml-auto text-navy-400" icon={<RefreshCw size={13} />}>
          Reload Queue
        </Button>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - alerts items list */}
        <div className="lg:col-span-2 space-y-3">
          <GlassCard className="p-4">
            <div className="space-y-2">
              {filteredAlerts.length === 0 ? (
                <div className="py-12 text-center text-navy-500 font-mono text-xs">
                  No active surveillance alerts found in queue.
                </div>
              ) : (
                filteredAlerts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAlert(a)}
                    className={cn(
                      "p-3.5 rounded-xl border cursor-pointer transition-all duration-200",
                      selectedAlert?.id === a.id
                        ? "bg-navy-800/80 border-electric-500/40 shadow-glow-blue"
                        : "bg-navy-800/40 border-navy-700/30 hover:border-navy-600/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 animate-pulse",
                          a.priority === "critical" ? "bg-crimson-500" : a.priority === "high" ? "bg-amber-500" : "bg-electric-500"
                        )} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white bg-navy-950/80 px-2 py-0.5 rounded border border-navy-700/20">
                              {a.vehiclePlate}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-navy-400">{a.priority}</span>
                          </div>
                          <div className="text-xs font-semibold text-navy-200 mt-1">{a.type}</div>
                          <div className="text-[10px] text-navy-400 mt-1 font-mono">{a.camera}</div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-navy-500 font-mono">
                        {formatDateTime(a.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right column - active alert details and actions */}
        <div>
          {selectedAlert ? (
            <GlassCard className="p-5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-navy-700/30">
                <div>
                  <span className="text-[10px] text-navy-500 font-mono font-semibold uppercase">{selectedAlert.id}</span>
                  <h3 className="text-sm font-semibold text-navy-100 font-heading">{selectedAlert.type}</h3>
                </div>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                  selectedAlert.status === "resolved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-crimson-500/10 text-crimson-400 border border-crimson-500/25"
                )}>
                  {selectedAlert.status}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-700/30 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-navy-500 block uppercase">Observe location</span>
                  <span className="text-navy-200 font-semibold">{selectedAlert.camera}</span>
                </div>
                <div>
                  <span className="text-[10px] text-navy-500 block uppercase">System Incident Reason</span>
                  <p className="text-navy-300 mt-1 leading-relaxed">{selectedAlert.reason}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-navy-500 block uppercase mb-1">Threat confidence score</span>
                <ConfidenceBar value={selectedAlert.confidence} label="" />
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/15 bg-amber-500/5 text-xs text-navy-300 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <ShieldAlert size={14} />
                  <span>Recommended Dispatch Protocol</span>
                </div>
                <p className="text-[10px] leading-relaxed text-navy-400">{selectedAlert.recommendation}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => handleAction(selectedAlert.id, "dismiss")}>
                  Acknowledge
                </Button>
                <Button variant="primary" size="sm" icon={<Check size={13} />} onClick={() => handleAction(selectedAlert.id, "resolve")}>
                  Mark Resolved
                </Button>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center text-navy-500 font-mono text-xs">
              Select an alert from the incident log queue to verify recommendation details.
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
