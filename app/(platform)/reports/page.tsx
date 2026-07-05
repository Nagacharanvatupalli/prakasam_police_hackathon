"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import {
  FileText, Calendar, Download, RefreshCw, Layers,
  CheckCircle, ArrowRight, BookOpen, HardDrive, Printer
} from "lucide-react";

// ============================================================
// REPORTS GENERATOR PAGE
// ============================================================

interface ReportHistoryItem {
  id: string;
  name: string;
  type: string;
  created: Date;
  officer: string;
  format: string;
}

const REPORT_HISTORY: ReportHistoryItem[] = [
  {
    id: "REP-902",
    name: "Daily Vehicle Intelligence Summary",
    type: "Surveillance Audit",
    created: new Date(Date.now() - 4 * 3600000),
    officer: "SI Ravi Kumar",
    format: "PDF",
  },
  {
    id: "REP-841",
    name: "Cloned Vehicles Incident Log - Chirala",
    type: "Clone Sheet",
    created: new Date(Date.now() - 24 * 3600000),
    officer: "ASI Lakshmi",
    format: "XLSX",
  }
];

export default function ReportsGeneratorPage() {
  const [reportType, setReportType] = useState("daily_intel");
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ReportHistoryItem[]>(REPORT_HISTORY);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const newReport: ReportHistoryItem = {
        id: `REP-${Math.floor(100 + Math.random() * 900)}`,
        name: reportType === "daily_intel" ? "Daily Vehicle Intelligence Summary" : "Cloned Vehicles Incident Log",
        type: reportType === "daily_intel" ? "Surveillance Audit" : "Clone Sheet",
        created: new Date(),
        officer: "SI Ravi Kumar",
        format: selectedFormat.toUpperCase(),
      };
      setHistory((prev) => [newReport, ...prev]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">Document Processing Hub</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Intelligence Reports</h1>
          <p className="text-navy-300 text-xs">Generate custom vehicle surveillance audits, clone target summaries, and digital case PDF sheets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report configuration controls */}
        <div className="space-y-4">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-4">Configure New Report</h3>
            <form onSubmit={handleGenerate} className="space-y-4">
              <Select
                label="Select Report Paradigm"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                options={[
                  { value: "daily_intel", label: "Daily Intelligence Summary" },
                  { value: "clones_log", label: "Cloned Plate Detection Sheet" },
                  { value: "audit_trail", label: "Chassis Verification Audit" },
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Format Type"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  options={[
                    { value: "pdf", label: "PDF Format" },
                    { value: "xlsx", label: "Excel (XLSX)" },
                    { value: "csv", label: "CSV File" },
                  ]}
                />
                <Select
                  label="Time Span"
                  options={[
                    { value: "24h", label: "Last 24 Hours" },
                    { value: "7d", label: "Last 7 Days" },
                    { value: "30d", label: "Last 30 Days" },
                  ]}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" className="w-full text-xs font-bold" loading={loading} icon={<Layers size={14} />}>
                  Compile & Export Report
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>

        {/* Right Column: Historical generated archive logs */}
        <div className="lg:col-span-2">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3 flex items-center gap-2">
              <BookOpen size={13} className="text-electric-400" /> Compiled Document Archive
            </h3>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs text-navy-200">
                <thead>
                  <tr className="border-b border-navy-700/30 text-[10px] uppercase tracking-widest text-navy-400 font-bold">
                    <th className="py-2.5 px-3">Report ID</th>
                    <th className="py-2.5 px-3">Document Title</th>
                    <th className="py-2.5 px-3">Category Type</th>
                    <th className="py-2.5 px-3">Date Compiled</th>
                    <th className="py-2.5 px-3 text-right">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-navy-700/20 hover:bg-navy-800/20 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-white">{item.id}</td>
                      <td className="py-3 px-3 font-semibold text-navy-200">{item.name}</td>
                      <td className="py-3 px-3 text-navy-300">{item.type}</td>
                      <td className="py-3 px-3 text-navy-400 font-mono">{formatDateTime(item.created)}</td>
                      <td className="py-3 px-3 text-right">
                        <Button variant="ghost" size="xs" icon={<Download size={12} />} className="text-electric-400">
                          {item.format}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
