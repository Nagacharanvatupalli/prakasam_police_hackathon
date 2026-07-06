"use client";

import { useState } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { ClipboardList, Search, RefreshCw, Key, ShieldCheck } from "lucide-react";

interface AuditEntry {
  id: string;
  user: string;
  action: string;
  detail: string;
  timestamp: Date;
  ipAddress: string;
}

const AUDIT_LOGS_LIST: AuditEntry[] = [
  { id: "AUD-8012", user: "sp_ongole", action: "Authorized Intercept Protocol", detail: "Case Creta AP39AB1234", timestamp: new Date(Date.now() - 15 * 60000), ipAddress: "192.168.1.102" },
  { id: "AUD-7942", user: "si_ravi_kumar", action: "Drafted PDF Case Report", detail: "Case #INV-2847", timestamp: new Date(Date.now() - 45 * 60000), ipAddress: "192.168.1.105" },
  { id: "AUD-7921", user: "operator_01", action: "Triggered Checkpoint Audit", detail: "CAM-005 Chirala Checkpost", timestamp: new Date(Date.now() - 120 * 60000), ipAddress: "192.168.1.120" }
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>(AUDIT_LOGS_LIST);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">System Audit Trails</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">System Audit Logs</h1>
          <p className="text-navy-300 text-xs">Immutable chronological logging of operator actions, status updates, and dispatch authorizations.</p>
        </div>
      </div>

      <GlassCard className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <Input placeholder="Filter by username or action type..." className="w-full sm:max-w-xs" icon={<Search size={14} />} />
        <Button variant="ghost" className="sm:ml-auto text-navy-400" icon={<RefreshCw size={13} />}>
          Refresh Audit Registry
        </Button>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-navy-200">
            <thead>
              <tr className="border-b border-navy-700/30 text-[10px] uppercase tracking-widest text-navy-400 font-bold">
                <th className="py-2.5 px-3">Audit ID</th>
                <th className="py-2.5 px-3">Operator User</th>
                <th className="py-2.5 px-3">Action Paradigm</th>
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-navy-700/20 hover:bg-navy-800/20 transition-colors">
                  <td className="py-3.5 px-3 font-mono font-semibold text-white">{log.id}</td>
                  <td className="py-3.5 px-3 font-semibold text-navy-200">{log.user}</td>
                  <td className="py-3.5 px-3 text-navy-300">{log.action}</td>
                  <td className="py-3.5 px-3 text-navy-400 font-mono">{log.detail}</td>
                  <td className="py-3.5 px-3 text-navy-400 font-mono">{formatDateTime(log.timestamp)}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-navy-500">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
