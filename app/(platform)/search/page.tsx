"use client";

import { useState, useEffect } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { searchApi, SearchFilters, SearchResultItem } from "@/lib/api/search-api";
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  Camera,
  History,
  ShieldAlert,
  ArrowUpDown,
  Download,
  AlertOctagon
} from "lucide-react";

export default function VehicleSearchPage() {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters state
  const [selectedType, setSelectedType] = useState("all");
  const [selectedColor, setSelectedColor] = useState("all");
  const [selectedCamera, setSelectedCamera] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedStolen, setSelectedStolen] = useState("all");
  const [selectedClone, setSelectedClone] = useState("all");
  const [minConf, setMinConf] = useState("");

  // Last Hour Feed State
  const [lastHourDetections, setLastHourDetections] = useState<SearchResultItem[]>([]);
  const [lastHourCount, setLastHourCount] = useState(0);

  const [recentSearches, setRecentSearches] = useState<string[]>([
    "AP39AB1234",
    "AP16CD5678"
  ]);

  // Load last hour feed
  const loadLastHour = async () => {
    try {
      const res = await searchApi.getLastHourDetections(10);
      setLastHourDetections(res.detections);
      setLastHourCount(res.total);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadLastHour();
    // Auto-update rolling list every 60 seconds
    const interval = setInterval(loadLastHour, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (e?: React.FormEvent, targetPage = 1) => {
    if (e) e.preventDefault();
    setLoading(true);
    setPage(targetPage);

    const filters: SearchFilters = {
      plate_number: query.trim() || undefined,
      partial_plate: true,
      vehicle_type: selectedType !== "all" ? selectedType : undefined,
      vehicle_color: selectedColor !== "all" ? selectedColor : undefined,
      camera_id: selectedCamera !== "all" ? selectedCamera : undefined,
      location: selectedLocation !== "all" ? selectedLocation : undefined,
      min_confidence: minConf ? parseFloat(minConf) / 100 : undefined,
      stolen_status: selectedStolen !== "all" ? (selectedStolen as any) : undefined,
      clone_status: selectedClone !== "all" ? (selectedClone as any) : undefined
    };

    try {
      const res = await searchApi.searchVehicles(filters, targetPage, pageSize);
      setResults(res.detections);
      setSuggestions(res.related_suggestions);
      setTotalResults(res.total);

      if (query.trim() && !recentSearches.includes(query.trim())) {
        setRecentSearches((prev) => [query.trim(), ...prev.slice(0, 4)]);
      }
    } catch (err) {
      alert("Failed to execute query.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQuery("");
    setSelectedType("all");
    setSelectedColor("all");
    setSelectedCamera("all");
    setSelectedLocation("all");
    setSelectedStolen("all");
    setSelectedClone("all");
    setMinConf("");
    setResults([]);
    setSuggestions([]);
    setTotalResults(0);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-700/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search size={16} className="text-electric-400" />
            <span className="text-[11px] text-electric-400 font-mono font-medium tracking-widest uppercase">Intelligence Queries</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Global Vehicle Directory</h1>
          <p className="text-navy-300 text-xs">Query intelligence database records using registration plates, visual filters, or hotlist alerts.</p>
        </div>
      </div>

      {/* Main Search Controls */}
      <GlassCard className="p-5 border-navy-700/50">
        <form onSubmit={(e) => handleSearch(e, 1)} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter license plate number (e.g. AP39AB1234)..."
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

          {/* Filters */}
          {showFilters && (
            <div className="overflow-hidden pt-2 border-t border-navy-800 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pb-2">
              <Select
                label="Vehicle Make/Type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "Car", label: "Car / Sedan" },
                  { value: "SUV", label: "SUV" },
                  { value: "Motorcycle", label: "Motorcycle" },
                  { value: "Bus", label: "Bus" },
                  { value: "Truck", label: "Truck" }
                ]}
              />
              <Select
                label="Dominant Color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                options={[
                  { value: "all", label: "All Colors" },
                  { value: "White", label: "White" },
                  { value: "Black", label: "Black" },
                  { value: "Silver", label: "Silver / Gray" },
                  { value: "Red", label: "Red" },
                  { value: "Blue", label: "Blue" },
                  { value: "Green", label: "Green" },
                  { value: "Yellow", label: "Yellow" }
                ]}
              />
              <Input
                label="Min Confidence %"
                value={minConf}
                onChange={(e) => setMinConf(e.target.value)}
                placeholder="e.g. 80"
              />
              <Select
                label="Stolen status"
                value={selectedStolen}
                onChange={(e) => setSelectedStolen(e.target.value)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "stolen", label: "Stolen Hotlist" },
                  { value: "clean", label: "Clean" }
                ]}
              />
              <Select
                label="Clone suspicion"
                value={selectedClone}
                onChange={(e) => setSelectedClone(e.target.value)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "clone", label: "Suspected Clone" }
                ]}
              />
              <Select
                label="Camera Node"
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                options={[
                  { value: "all", label: "All Cameras" },
                  { value: "CAM-001", label: "Ongole Bypass (CAM-001)" },
                  { value: "CAM-004", label: "Kurnool Toll Plaza (CAM-004)" },
                  { value: "CAM-005", label: "Chirala Checkpost (CAM-005)" },
                  { value: "CAM-007", label: "Markapur Junction (CAM-007)" }
                ]}
              />
            </div>
          )}

          {/* Recents */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs border-t border-navy-800/20">
            <span className="text-navy-500 flex items-center gap-1 font-mono"><History size={11} /> Recents:</span>
            {recentSearches.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => { setQuery(tag); }}
                className="px-2.5 py-1 rounded-lg bg-navy-950/40 border border-navy-800 text-navy-300 hover:text-white hover:border-electric-500/25 transition-all text-xs"
              >
                {tag}
              </button>
            ))}
          </div>
        </form>
      </GlassCard>

      {/* Detected In Last 1 Hour Roll */}
      <GlassCard className="p-4 border-navy-700/30 bg-navy-950/20">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <RefreshCw size={13} className="text-electric-400 animate-spin-slow" /> Vehicles Identified in Last 1 Hour
          </h3>
          <span className="text-[10px] text-navy-400 font-mono">{lastHourCount} detections registered</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {lastHourDetections.length === 0 ? (
            <div className="text-xs text-navy-500 font-mono py-2">No vehicles spotted in the last 60 minutes.</div>
          ) : (
            lastHourDetections.map((det) => (
              <div key={det.id} className="flex-shrink-0 bg-navy-950/60 border border-navy-800 rounded-xl p-2 w-[160px] text-center space-y-1">
                <span className="text-[11px] font-mono font-bold text-white bg-navy-900 px-1.5 py-0.5 rounded border border-navy-800">
                  {det.plate_number}
                </span>
                <div className="text-[9px] text-navy-400 font-semibold truncate">
                  {det.vehicle_color} {det.vehicle_type || "Car"}
                </div>
                <div className="text-[8px] text-navy-500 font-mono">
                  {formatDateTime(det.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Results Section */}
      <GlassCard className="p-5 border-navy-700/50">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-heading font-semibold text-navy-100 text-sm">Directory Results</h3>
            <p className="text-[10px] text-navy-500 font-mono">Found {totalResults} indexed records</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-navy-800 rounded-2xl bg-navy-950/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-800 text-[10px] uppercase tracking-widest text-navy-400 font-bold bg-navy-900/40">
                <th className="py-3 px-4">License Plate</th>
                <th className="py-3 px-4">Sighting Images</th>
                <th className="py-3 px-4">Camera / Location</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Observed Timestamp</th>
                <th className="py-3 px-4 text-center">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-12 text-center text-navy-400 font-mono text-xs" colSpan={6}>Executing directory query...</td>
                </tr>
              ) : results.length === 0 && suggestions.length === 0 ? (
                <tr>
                  <td className="py-12 text-center text-navy-500 font-mono text-xs" colSpan={6}>
                    <ShieldAlert size={28} className="mx-auto mb-2 text-navy-600" />
                    No matching vehicle directories found in Prakasam Police database.
                  </td>
                </tr>
              ) : results.length === 0 && suggestions.length > 0 ? (
                <>
                  <tr className="bg-amber-500/5">
                    <td colSpan={6} className="py-3 px-4 text-xs font-semibold text-amber-500 font-mono">
                      ⚠️ No exact matches found. Displaying related fuzzy matches/suggestions:
                    </td>
                  </tr>
                  {suggestions.map((v) => (
                    <SearchResultRow key={v.id} item={v} isSuggestion />
                  ))}
                </>
              ) : (
                results.map((v) => (
                  <SearchResultRow key={v.id} item={v} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalResults > pageSize && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-navy-800 text-xs text-navy-500 font-mono">
            <div>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalResults)} of {totalResults} entries</div>
            <div className="flex gap-1">
              <Button variant="ghost" size="xs" disabled={page === 1} onClick={() => handleSearch(undefined, page - 1)}>Prev</Button>
              <Button variant="secondary" size="xs">{page}</Button>
              <Button variant="ghost" size="xs" disabled={page * pageSize >= totalResults} onClick={() => handleSearch(undefined, page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function SearchResultRow({ item, isSuggestion }: { item: SearchResultItem; isSuggestion?: boolean }) {
  return (
    <tr className={cn(
      "border-b border-navy-800/40 hover:bg-navy-900/10 transition-colors text-xs text-navy-200",
      isSuggestion && "border-l-4 border-l-amber-500/50 bg-navy-950/20"
    )}>
      <td className="py-3 px-4 font-mono font-bold text-white">
        <div>{item.plate_number}</div>
        {isSuggestion && item.suggestion_reason && (
          <div className="text-[8px] text-amber-500 uppercase tracking-wider font-semibold font-mono mt-0.5">{item.suggestion_reason}</div>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          {item.media?.plate_crop_path ? (
            <img src={item.media.plate_crop_path} alt="Plate Crop" className="h-7 border border-navy-800 bg-navy-950 rounded p-0.5 object-contain" />
          ) : (
            <div className="h-7 w-12 border border-navy-800 bg-navy-950/40 rounded flex items-center justify-center text-[8px] text-navy-600">N/A</div>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="font-semibold text-white">{item.source.name}</div>
        <div className="text-[10px] text-navy-400 font-mono">{item.source.source_id}</div>
      </td>
      <td className="py-3 px-4 text-navy-300">
        {item.vehicle_color || "Unknown"} · {item.vehicle_type || "Car"}
      </td>
      <td className="py-3 px-4 font-mono">
        {formatDateTime(item.created_at)}
      </td>
      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
        {Math.round((item.ocr_confidence || 0) * 100)}%
      </td>
    </tr>
  );
}
