"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { Users, Search, ShieldCheck, UserPlus, Key, Eye } from "lucide-react";

interface AdminUser {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  status: "active" | "inactive";
}

const USERS: AdminUser[] = [
  { id: "USR-01", username: "sp_ongole", role: "Superintendent of Police", permissions: ["ALL_PRIVILEGES", "DISPATCH_COMMAND"], status: "active" },
  { id: "USR-02", username: "si_ravi_kumar", role: "Sub-Inspector", permissions: ["SURVEILLANCE_READ", "CASE_WRITE"], status: "active" },
  { id: "USR-03", username: "operator_01", role: "Control Room Operator", permissions: ["SURVEILLANCE_READ"], status: "active" }
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>(USERS);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">Identity Access Control</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">User Registry</h1>
          <p className="text-navy-300 text-xs">Manage system operators, dispatch permissions, and role-based access controls.</p>
        </div>

        <Button variant="primary" size="sm" icon={<UserPlus size={13} />}>
          Register User
        </Button>
      </div>

      <GlassCard className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-navy-200">
            <thead>
              <tr className="border-b border-navy-700/30 text-[10px] uppercase tracking-widest text-navy-400 font-bold">
                <th className="py-2.5 px-3">Operator ID</th>
                <th className="py-2.5 px-3">Username / Handle</th>
                <th className="py-2.5 px-3">System Role</th>
                <th className="py-2.5 px-3">Assigned Permissions</th>
                <th className="py-2.5 px-3 text-right">Settings</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-navy-700/20 hover:bg-navy-800/20 transition-colors">
                  <td className="py-3.5 px-3 font-mono font-semibold text-white">{u.id}</td>
                  <td className="py-3.5 px-3 font-semibold text-navy-200">{u.username}</td>
                  <td className="py-3.5 px-3 text-navy-300">{u.role}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {u.permissions.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-navy-900 border border-navy-700/40 text-[9px] font-mono text-electric-400">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="xs" icon={<Key size={11} />} />
                      <Button variant="secondary" size="xs" icon={<Eye size={11} />} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
