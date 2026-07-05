"use client";

import { useState } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, RiskBadge, Badge } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { AlertTriangle, Plus, Search, Trash2, Calendar, ShieldAlert } from "lucide-react";

interface WatchlistItem {
  plate: string;
  brand: string;
  model: string;
  color: string;
  caseRef: string;
  addedOn: Date;
  status: "active" | "flagged" | "intercepted";
}

const INITIAL_WATCHLIST: WatchlistItem[] = [
  { plate: "AP39AB1234", brand: "Hyundai", model: "Creta", color: "White", caseRef: "FIR-2026-0814", addedOn: new Date(Date.now() - 3 * 86400000), status: "flagged" },
  { plate: "AP16CD5678", brand: "Maruti", model: "Swift", color: "Silver", caseRef: "FIR-2026-0902", addedOn: new Date(Date.now() - 5 * 86400000), status: "active" },
  { plate: "AP37EF9012", brand: "Mahindra", model: "Scorpio", color: "Black", caseRef: "FIR-2026-1042", addedOn: new Date(Date.now() - 1 * 86400000), status: "intercepted" }
];

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(INITIAL_WATCHLIST);
  const [newPlate, setNewPlate] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newCase, setNewCase] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) return;
    const item: WatchlistItem = {
      plate: newPlate.toUpperCase(),
      brand: newBrand || "Unknown",
      model: newModel || "Unknown",
      color: "White",
      caseRef: newCase || "FIR-N/A",
      addedOn: new Date(),
      status: "active",
    };
    setWatchlist((prev) => [item, ...prev]);
    setNewPlate("");
    setNewBrand("");
    setNewModel("");
    setNewCase("");
  };

  const handleRemove = (plate: string) => {
    setWatchlist((prev) => prev.filter((item) => item.plate !== plate));
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
            <span className="text-[11px] text-amber-500 font-mono font-medium tracking-widest uppercase">Target Threat List</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Stolen Vehicle Watchlist</h1>
          <p className="text-navy-300 text-xs">Registry of blacklisted plates synchronized with regional FIR databases.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-5">
          <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-4">Register Target Plate</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input label="Vehicle Registration Plate" value={newPlate} onChange={(e) => setNewPlate(e.target.value)} placeholder="e.g. AP39AB1234" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Brand / Make" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Hyundai" />
              <Input label="Model" value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Creta" />
            </div>
            <Input label="FIR Case Reference" value={newCase} onChange={(e) => setNewCase(e.target.value)} placeholder="FIR-2026-XXXX" />
            <Button type="submit" variant="primary" className="w-full" icon={<Plus size={14} />}>
              Add to Hot List
            </Button>
          </form>
        </GlassCard>

        <div className="lg:col-span-2">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-4">Active Watch List</h3>
            <div className="space-y-3">
              {watchlist.map((item) => (
                <div key={item.plate} className="flex items-center justify-between p-3.5 rounded-xl border border-navy-700/30 bg-navy-800/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white bg-navy-950/80 px-2 py-0.5 rounded">
                        {item.plate}
                      </span>
                      <span className="text-[10px] text-navy-400 font-semibold">{item.brand} {item.model}</span>
                    </div>
                    <div className="text-[10px] text-navy-500 mt-1 font-mono">
                      Case: {item.caseRef} · Registered {formatDateTime(item.addedOn)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={item.status === "intercepted" ? "success" : "danger"}>
                      {item.status.toUpperCase()}
                    </Badge>
                    <Button variant="ghost" size="xs" icon={<Trash2 size={12} className="text-crimson-400" />} onClick={() => handleRemove(item.plate)} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
