"use client";

import { useState } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { UserCheck, Search, Activity, ShieldAlert, Calendar, RefreshCw } from "lucide-react";

interface Officer {
  id: string;
  name: string;
  rank: string;
  station: string;
  status: "available" | "on_dispatch" | "off_duty";
  assignedCase: string;
}

const OFFICERS_LIST: Officer[] = [
  { id: "OFF-102", name: "SI Ravi Kumar", rank: "Sub-Inspector", station: "Ongole I Town", status: "on_dispatch", assignedCase: "Case #INV-2847 (Cloned Creta)" },
  { id: "OFF-204", name: "ASI Lakshmi", rank: "Asst Sub-Inspector", station: "Ongole II Town", status: "available", assignedCase: "None" },
  { id: "OFF-301", name: "PC Suresh", rank: "Police Constable", station: "Chirala Urban", status: "on_dispatch", assignedCase: "Watchlist Alert #ALT-1002" },
  { id: "OFF-402", name: "SI Ramesh", rank: "Sub-Inspector", station: "Markapur", status: "off_duty", assignedCase: "None" }
];

export default function OfficerActivityPage() {
  const [officers, setOfficers] = useState<Officer[]>(OFFICERS_LIST);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">Force deployment directory</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Officer Activity</h1>
          <p className="text-navy-300 text-xs">Surveillance status parameters, assignments, and dispatch history log directory.</p>
        </div>
      </div>

      <GlassCard className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <Input placeholder="Filter officer name or ID..." className="w-full sm:max-w-xs" icon={<Search size={14} />} />
        <Button variant="ghost" className="sm:ml-auto text-navy-400" icon={<RefreshCw size={13} />}>
          Reload Force Directory
        </Button>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {officers.map((off) => (
          <GlassCard key={off.id} className="p-4 flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-800 border border-navy-700/40 flex items-center justify-center text-navy-400">
                  <span>👮</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white font-heading">{off.name}</h4>
                  <span className="text-[10px] text-navy-500 block mt-0.5">{off.rank} · {off.station}</span>
                </div>
              </div>
              <Badge variant={off.status === "on_dispatch" ? "warning" : off.status === "available" ? "success" : "default"}>
                {off.status.replace("_", " ").toUpperCase()}
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-navy-900/60 border border-navy-700/30 text-xs">
              <span className="text-[9px] text-navy-500 block uppercase font-mono mb-1">Active Assignment</span>
              <span className="text-navy-300 font-medium">{off.assignedCase}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
