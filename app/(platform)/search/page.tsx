"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, RiskBadge, Badge, Skeleton, StatusPill } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import {
  MOCK_VEHICLES, VEHICLE_BRANDS, VEHICLE_COLORS, VEHICLE_TYPES,
  AP_DISTRICTS, MockVehicle
} from "@/lib/mock-data";
import {
  Search, SlidersHorizontal, ArrowUpDown, ChevronDown, Download,
  Bookmark, History, AlertTriangle, FileSpreadsheet, FileDown,
  Info, RefreshCw, Filter, ShieldAlert, Eye, FileText
} from "lucide-react";
import Link from "next/link";

// ============================================================
// VEHICLE SEARCH PAGE
// ============================================================

export default function VehicleSearchPage() {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MockVehicle[]>(MOCK_VEHICLES);

  // Search filter states
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedColor, setSelectedColor] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedRisk, setSelectedRisk] = useState("all");

  const [recentSearches, setRecentSearches] = useState([
    "AP39AB1234",
    "AP16CD5678",
    "White Fortuner Guntur",
    "Mahindra Scorpio Suspicious"
  ]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      let filtered = MOCK_VEHICLES;

      if (query.trim()) {
        const q = query.toLowerCase();
        filtered = filtered.filter(
          (v) =>
            v.plateNumber.toLowerCase().includes(q) ||
            v.owner.toLowerCase().includes(q) ||
            v.brand.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q)
        );
      }

      if (selectedBrand !== "all") {
        filtered = filtered.filter((v) => v.brand.toLowerCase() === selectedBrand.toLowerCase());
      }
      if (selectedColor !== "all") {
        filtered = filtered.filter((v) => v.color.toLowerCase() === selectedColor.toLowerCase());
      }
      if (selectedType !== "all") {
        filtered = filtered.filter((v) => v.type.toLowerCase() === selectedType.toLowerCase());
      }
      if (selectedDistrict !== "all") {
        filtered = filtered.filter((v) => v.district.toLowerCase() === selectedDistrict.toLowerCase());
      }
      if (selectedRisk !== "all") {
        filtered = filtered.filter((v) => v.riskLevel.toLowerCase() === selectedRisk.toLowerCase());
      }

      setResults(filtered);
      setLoading(false);

      if (query.trim() && !recentSearches.includes(query)) {
        setRecentSearches((prev) => [query, ...prev.slice(0, 4)]);
      }
    }, 600);
  };

  const handleReset = () => {
    setQuery("");
    setSelectedBrand("all");
    setSelectedColor("all");
    setSelectedType("all");
    setSelectedDistrict("all");
    setSelectedRisk("all");
    setResults(MOCK_VEHICLES);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search size={14} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">Intelligence Queries</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Global Vehicle Directory</h1>
          <p className="text-navy-300 text-xs">Search database registry using plates, features, fingerprints, or owner credentials.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Bookmark size={13} />}>Saved Queries</Button>
          <Button variant="secondary" size="sm" icon={<Download size={13} />}>Export Search</Button>
        </div>
      </div>

      {/* Main Search Controls */}
      <GlassCard className="p-5">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter license plate (e.g. AP39AB1234), owner name, model..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                icon={<Search size={16} />}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={showFilters ? "secondary" : "ghost"}
                className={cn("h-11 rounded-2xl px-4", showFilters && "text-electric-400 border-electric-500/25")}
                onClick={() => setShowFilters(!showFilters)}
                icon={<SlidersHorizontal size={15} />}
              >
                Filters
              </Button>
              <Button type="submit" variant="primary" className="h-11 rounded-2xl px-6" loading={loading}>
                Search Registry
              </Button>
              <Button type="button" variant="ghost" className="h-11 rounded-2xl px-4 text-navy-400" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>

          {/* Collapsible Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-2 border-t border-navy-700/30"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pb-2">
                  <Select
                    label="Brand / Make"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    options={[{ value: "all", label: "All Brands" }, ...VEHICLE_BRANDS.map(b => ({ value: b.toLowerCase(), label: b }))]}
                  />
                  <Select
                    label="Vehicle Type"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    options={[{ value: "all", label: "All Types" }, ...VEHICLE_TYPES.map(t => ({ value: t.toLowerCase(), label: t }))]}
                  />
                  <Select
                    label="Color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    options={[{ value: "all", label: "All Colors" }, ...VEHICLE_COLORS.map(c => ({ value: c.toLowerCase(), label: c }))]}
                  />
                  <Select
                    label="District Region"
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    options={[{ value: "all", label: "All Districts" }, ...AP_DISTRICTS.map(d => ({ value: d.toLowerCase(), label: d }))]}
                  />
                  <Select
                    label="AI Threat Risk"
                    value={selectedRisk}
                    onChange={(e) => setSelectedRisk(e.target.value)}
                    options={[
                      { value: "all", label: "All Risk Levels" },
                      { value: "verified", label: "Verified" },
                      { value: "safe", label: "Safe" },
                      { value: "suspicious", label: "Suspicious" },
                      { value: "high_risk", label: "High Risk" },
                      { value: "critical", label: "Critical" },
                    ]}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Searches / Tags */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <span className="text-navy-500 flex items-center gap-1 font-mono"><History size={11} /> Recents:</span>
            {recentSearches.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => { setQuery(tag); handleSearch(); }}
                className="px-2.5 py-1 rounded-lg bg-navy-800/40 border border-navy-700/30 text-navy-300 hover:text-white hover:border-electric-500/25 transition-all text-xs"
              >
                {tag}
              </button>
            ))}
          </div>
        </form>
      </GlassCard>

      {/* Results Section */}
      <GlassCard className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-heading font-semibold text-navy-100 text-sm">Directory Results</h3>
            <p className="text-[10px] text-navy-500 font-mono">Found {results.length} indexed records in search corpus</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs" icon={<ArrowUpDown size={12} />}>Sort by Score</Button>
            <Button variant="ghost" size="xs" icon={<FileDown size={12} />}>PDF Report</Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-700/30 text-[10px] uppercase tracking-widest text-navy-400 font-bold">
                <th className="py-3 px-4">License Plate</th>
                <th className="py-3 px-4">Brand / Model</th>
                <th className="py-3 px-4">Type / Color</th>
                <th className="py-3 px-4">Jurisdiction</th>
                <th className="py-3 px-4">Owner Profile</th>
                <th className="py-3 px-4">AI Score</th>
                <th className="py-3 px-4">Risk Threat</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-navy-700/20">
                    <td className="py-3 px-4" colSpan={8}><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))
              ) : results.length === 0 ? (
                <tr>
                  <td className="py-12 px-4 text-center text-navy-500 font-mono" colSpan={8}>
                    <ShieldAlert size={32} className="mx-auto mb-3 text-navy-600" />
                    No matching vehicle directories found in database cache.
                  </td>
                </tr>
              ) : (
                results.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-navy-700/20 hover:bg-navy-800/20 transition-colors group text-xs text-navy-200"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-white group-hover:text-electric-400 transition-colors">
                      {v.plateNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      {v.brand} <span className="text-navy-400 font-mono text-[11px]">{v.model}</span>
                    </td>
                    <td className="py-3.5 px-4 text-navy-300">
                      {v.color} · {v.type}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{v.district}</div>
                      <div className="text-[10px] text-navy-500">{v.policeStation}</div>
                    </td>
                    <td className="py-3.5 px-4 text-navy-300">
                      {v.owner}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-navy-200">
                      {v.intelligenceScore}/100
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={v.riskLevel} className="text-[9px] py-0 px-2 font-bold" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/vehicles/${v.id}`}>
                          <Button variant="ghost" size="xs" icon={<Eye size={12} />} className="text-electric-400">
                            Profile
                          </Button>
                        </Link>
                        <Link href={`/investigation?plate=${v.plateNumber}`}>
                          <Button variant="ghost" size="xs" icon={<FileText size={12} />} className="text-cyan-400">
                            Investigate
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-navy-700/30 text-xs text-navy-500 font-mono">
          <div>Showing 1-{results.length} of {results.length} entries</div>
          <div className="flex gap-1">
            <Button variant="ghost" size="xs" disabled>Prev</Button>
            <Button variant="secondary" size="xs">1</Button>
            <Button variant="ghost" size="xs" disabled>Next</Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
