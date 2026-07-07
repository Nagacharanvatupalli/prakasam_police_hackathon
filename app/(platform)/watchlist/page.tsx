"use client";

import { useState, useEffect } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, Badge } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { stolenApi, StolenVehicleCase, StolenSighting } from "@/lib/api/stolen-api";
import {
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  ShieldAlert,
  Edit2,
  Image as ImageIcon,
  History,
  CheckCircle,
  Eye,
  Camera,
  User,
  Phone,
  FileText
} from "lucide-react";

export default function StolenVehiclePage() {
  // Case lists
  const [activeCases, setActiveCases] = useState<StolenVehicleCase[]>([]);
  const [recoveredCases, setRecoveredCases] = useState<StolenVehicleCase[]>([]);
  const [identifiedSightings, setIdentifiedSightings] = useState<StolenSighting[]>([]);
  const [recentlySighted, setRecentlySighted] = useState<StolenSighting[]>([]);
  
  // Loading & status
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "identified" | "recovered" | "recent">("active");

  // Form states (Add Case)
  const [newPlate, setNewPlate] = useState("");
  const [newType, setNewType] = useState("Car");
  const [newModel, setNewModel] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newFIR, setNewFIR] = useState("");
  const [newStation, setNewStation] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Detail View & Edit Status State
  const [selectedCase, setSelectedCase] = useState<StolenVehicleCase | null>(null);
  const [selectedSightings, setSelectedSightings] = useState<StolenSighting[]>([]);
  const [statusToUpdate, setStatusToUpdate] = useState<string>("");
  const [statusUpdateNote, setStatusUpdateNote] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);

  // Load datasets
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Active Stolen Cases
      const activeRes = await stolenApi.getCases(1, 100, "stolen");
      const underInvestigationRes = await stolenApi.getCases(1, 100, "under_investigation");
      const trackingRes = await stolenApi.getCases(1, 100, "tracking");
      const identifiedRes = await stolenApi.getCases(1, 100, "identified");
      
      // Combine all active cases
      const combinedActive = [
        ...activeRes.cases,
        ...underInvestigationRes.cases,
        ...trackingRes.cases,
        ...identifiedRes.cases
      ];
      setActiveCases(combinedActive);

      // 2. Recovered / Caught / Closed Cases
      const recoveredRes = await stolenApi.getCases(1, 100, "recovered");
      const caughtRes = await stolenApi.getCases(1, 100, "caught");
      const closedRes = await stolenApi.getCases(1, 100, "closed");
      setRecoveredCases([...recoveredRes.cases, ...caughtRes.cases, ...closedRes.cases]);

      // 3. Identified Sightings (Sightings joined with Case information)
      const identifiedSightingsRes = await stolenApi.getIdentifiedVehicles(1, 50);
      setIdentifiedSightings(identifiedSightingsRes.identified_vehicles);

    } catch (err: any) {
      setError(err.message || "Failed to load stolen vehicle database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Register New Case
  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate.trim()) return;

    setError("");
    try {
      const result = await stolenApi.createCase({
        vehicle_number: newPlate.toUpperCase(),
        vehicle_type: newType,
        vehicle_model: newModel || undefined,
        vehicle_color: newColor || undefined,
        owner_name: newOwner || undefined,
        contact_number: newContact || undefined,
        fir_number: newFIR || undefined,
        police_station: newStation || undefined,
        reported_date: new Date().toISOString(),
        description: newDesc || undefined,
        status: "stolen"
      });

      // Upload image if selected
      if (selectedFile && result.case_id) {
        await stolenApi.uploadReferenceImage(result.case_id, selectedFile);
      }

      // Reset form
      setNewPlate("");
      setNewModel("");
      setNewColor("");
      setNewOwner("");
      setNewContact("");
      setNewFIR("");
      setNewStation("");
      setNewDesc("");
      setSelectedFile(null);

      // Refresh list
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to register stolen vehicle case.");
    }
  };

  // View sightings detail for a case
  const handleViewCaseDetail = async (item: StolenVehicleCase) => {
    setSelectedCase(item);
    setStatusToUpdate(item.status);
    setStatusUpdateNote("");
    try {
      const res = await stolenApi.getCaseSightings(item.id, 1, 50);
      setSelectedSightings(res.sightings);
    } catch (err) {
      setSelectedSightings([]);
    }
  };

  // Change Case Status
  const handleUpdateStatus = async () => {
    if (!selectedCase) return;
    setEditLoading(true);
    try {
      await stolenApi.updateStatus(selectedCase.id, statusToUpdate, statusUpdateNote);
      
      // Update selected case object locally
      const updatedCase = await stolenApi.getCase(selectedCase.id);
      setSelectedCase(updatedCase);
      
      // Refresh database
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "stolen":
        return "danger";
      case "under_investigation":
      case "tracking":
        return "warning";
      case "identified":
        return "info";
      case "caught":
      case "recovered":
      case "closed":
        return "success";
      default:
        return "info";
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-700/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-500 animate-pulse" />
            <span className="text-[11px] text-amber-500 font-mono font-medium tracking-widest uppercase">Prakasam Police watchlist</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Stolen Vehicle Management</h1>
          <p className="text-navy-300 text-xs">Registry of blacklisted plates, automatic matching alerts, and sighting records.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadData}>Reload Records</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Register stolen vehicle */}
        <GlassCard className="p-5 h-fit border-navy-700/50">
          <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Plus size={14} className="text-electric-400" /> Register Stolen Vehicle
          </h3>
          <form onSubmit={handleAddCase} className="space-y-4">
            <Input
              label="Registration Plate Number *"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="e.g. AP39AB1234"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Vehicle Type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                options={[
                  { value: "Car", label: "Car / Sedan" },
                  { value: "Motorcycle", label: "Motorcycle" },
                  { value: "Bus", label: "Bus" },
                  { value: "Truck", label: "Truck" },
                  { value: "SUV", label: "SUV" }
                ]}
              />
              <Input
                label="Make / Model"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder="Hyundai Creta"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="White"
              />
              <Input
                label="Owner Name"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="Nagacharan"
              />
            </div>
            <Input
              label="Contact Number"
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              placeholder="10-digit number"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="FIR / Case Number"
                value={newFIR}
                onChange={(e) => setNewFIR(e.target.value)}
                placeholder="FIR-2026-xxx"
              />
              <Input
                label="Police Station"
                value={newStation}
                onChange={(e) => setNewStation(e.target.value)}
                placeholder="Ongole Station"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block">Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Additional case/theft details"
                className="w-full text-xs bg-navy-950/40 border border-navy-800 focus:border-electric-500/50 rounded-xl p-3 text-white outline-none min-h-[60px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-navy-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                <ImageIcon size={12} /> Reference Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                className="text-xs text-navy-300 bg-navy-950/40 p-2 border border-navy-800 rounded-xl w-full"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" icon={<Plus size={14} />}>
              Add Stolen Hotlist
            </Button>
          </form>
        </GlassCard>

        {/* Right Column: Listings and Detail Deep Dive */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-navy-700/40 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("active")}
              className={cn(
                "pb-2.5 px-4 text-xs font-semibold tracking-wider transition-all border-b-2 font-heading",
                activeTab === "active" ? "border-electric-400 text-electric-300" : "border-transparent text-navy-400 hover:text-navy-200"
              )}
            >
              Active Hotlist ({activeCases.length})
            </button>
            <button
              onClick={() => setActiveTab("identified")}
              className={cn(
                "pb-2.5 px-4 text-xs font-semibold tracking-wider transition-all border-b-2 font-heading",
                activeTab === "identified" ? "border-electric-400 text-electric-300" : "border-transparent text-navy-400 hover:text-navy-200"
              )}
            >
              Identified Vehicles ({identifiedSightings.length})
            </button>
            <button
              onClick={() => setActiveTab("recovered")}
              className={cn(
                "pb-2.5 px-4 text-xs font-semibold tracking-wider transition-all border-b-2 font-heading",
                activeTab === "recovered" ? "border-electric-400 text-electric-300" : "border-transparent text-navy-400 hover:text-navy-200"
              )}
            >
              Recovered/Caught ({recoveredCases.length})
            </button>
          </div>

          {/* Active / Recovered Listings */}
          {activeTab === "active" || activeTab === "recovered" ? (
            <GlassCard className="p-4">
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-12 text-navy-400 font-mono text-xs">Loading records...</div>
                ) : (activeTab === "active" ? activeCases : recoveredCases).length === 0 ? (
                  <div className="text-center py-12 text-navy-500 font-mono text-xs">No records found.</div>
                ) : (
                  (activeTab === "active" ? activeCases : recoveredCases).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleViewCaseDetail(item)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row justify-between gap-4 items-start md:items-center",
                        selectedCase?.id === item.id
                          ? "bg-electric-500/10 border-electric-500/40"
                          : "bg-navy-850/30 border-navy-800 hover:border-navy-700/60"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-white bg-navy-950 px-2 py-0.5 rounded border border-navy-800">
                            {item.vehicle_number}
                          </span>
                          <span className="text-[11px] text-navy-400 font-semibold">{item.vehicle_model || item.vehicle_type}</span>
                          <Badge variant={getStatusBadgeVariant(item.status)}>{item.status.toUpperCase()}</Badge>
                        </div>
                        <div className="text-[10px] text-navy-400 font-mono">
                          FIR Ref: {item.fir_number || "N/A"} · Station: {item.police_station || "N/A"}
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-navy-500 font-mono flex flex-col items-end gap-1">
                        <div>Sighted {item.sighting_count} times</div>
                        {item.last_sighted_at && (
                          <div className="text-amber-500 font-semibold">Last: {formatDateTime(item.last_sighted_at)}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          ) : null}

          {/* Identified Sightings listing */}
          {activeTab === "identified" ? (
            <GlassCard className="p-4 space-y-4">
              {identifiedSightings.length === 0 ? (
                <div className="text-center py-12 text-navy-500 font-mono text-xs">No identified stolen vehicle events registered.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {identifiedSightings.map((sighting) => (
                    <GlassCard key={sighting.sighting_id} className="p-3 bg-navy-950/40 border-navy-800">
                      <div className="aspect-video bg-navy-900 rounded-xl relative overflow-hidden border border-navy-800 flex items-center justify-center">
                        {sighting.frame_image_path ? (
                          <img
                            src={sighting.frame_image_path}
                            alt="Stolen Sighting Frame"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="text-navy-700" size={32} />
                        )}
                        <div className="absolute top-2 left-2 text-[9px] font-mono bg-navy-950/90 text-white px-2 py-0.5 rounded flex items-center gap-1">
                          <Camera size={8} /> {sighting.camera_name}
                        </div>
                      </div>
                      
                      <div className="flex gap-3 mt-3 items-start">
                        {sighting.plate_crop_path && (
                          <img
                            src={sighting.plate_crop_path}
                            alt="Stolen Sighting Plate"
                            className="h-8 border border-navy-700/50 bg-navy-950 rounded p-0.5 object-contain"
                          />
                        )}
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-mono font-bold text-white bg-navy-950 px-2 py-0.5 rounded border border-navy-800">
                              {sighting.plate_number}
                            </span>
                            <Badge variant="danger">{sighting.match_type.toUpperCase()}</Badge>
                          </div>
                          <div className="text-[10px] text-navy-400">
                            Location: {sighting.camera_location}
                          </div>
                          <div className="text-[10px] text-navy-500 font-mono">
                            {formatDateTime(sighting.detected_at)}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </GlassCard>
          ) : null}

          {/* Deep dive detail section */}
          {selectedCase && (
            <GlassCard className="p-5 border-electric-500/20 bg-navy-900/40 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white font-heading">Investigation Deep-Dive</h4>
                  <p className="text-[10px] text-navy-400 font-mono mt-0.5">Case ID: {selectedCase.id}</p>
                </div>
                <Badge variant={getStatusBadgeVariant(selectedCase.status)}>{selectedCase.status.toUpperCase()}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Details list */}
                <div className="space-y-2 bg-navy-950/20 p-3.5 rounded-2xl border border-navy-800">
                  <h5 className="font-bold text-navy-300 uppercase text-[9px] tracking-widest mb-1.5 flex items-center gap-1">
                    <FileText size={10} /> Theft Details
                  </h5>
                  <div className="flex justify-between border-b border-navy-800/30 pb-1">
                    <span className="text-navy-500">Plate Number</span>
                    <span className="text-white font-mono font-bold">{selectedCase.vehicle_number}</span>
                  </div>
                  <div className="flex justify-between border-b border-navy-800/30 pb-1">
                    <span className="text-navy-500">Make/Model</span>
                    <span className="text-white">{selectedCase.vehicle_model || "Unknown"} ({selectedCase.vehicle_type})</span>
                  </div>
                  <div className="flex justify-between border-b border-navy-800/30 pb-1">
                    <span className="text-navy-500">Color</span>
                    <span className="text-white">{selectedCase.vehicle_color || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between border-b border-navy-800/30 pb-1">
                    <span className="text-navy-500">Owner</span>
                    <span className="text-white flex items-center gap-1"><User size={10} /> {selectedCase.owner_name || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between border-b border-navy-800/30 pb-1">
                    <span className="text-navy-500">Contact</span>
                    <span className="text-white flex items-center gap-1"><Phone size={10} /> {selectedCase.contact_number || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-navy-500">Description</span>
                    <span className="text-white text-right max-w-[200px] truncate" title={selectedCase.description}>{selectedCase.description || "N/A"}</span>
                  </div>
                </div>

                {/* Case Status Editor */}
                <div className="space-y-4 bg-navy-950/20 p-3.5 rounded-2xl border border-navy-800">
                  <h5 className="font-bold text-navy-300 uppercase text-[9px] tracking-widest mb-1 flex items-center gap-1">
                    <Edit2 size={10} /> Change Status
                  </h5>
                  <Select
                    label="Current Status"
                    value={statusToUpdate}
                    onChange={(e) => setStatusToUpdate(e.target.value)}
                    options={[
                      { value: "stolen", label: "Stolen" },
                      { value: "under_investigation", label: "Under Investigation" },
                      { value: "identified", label: "Identified" },
                      { value: "tracking", label: "Tracking" },
                      { value: "caught", label: "Caught/Recovered" },
                      { value: "recovered", label: "Recovered" },
                      { value: "closed", label: "Closed Case" }
                    ]}
                  />
                  <Input
                    label="Update Note / Logs"
                    value={statusUpdateNote}
                    onChange={(e) => setStatusUpdateNote(e.target.value)}
                    placeholder="Enter operation logging note..."
                  />
                  <Button variant="secondary" size="xs" onClick={handleUpdateStatus} loading={editLoading} className="w-full">
                    Save Case Status
                  </Button>
                </div>
              </div>

              {/* Sighting History Timeline */}
              <div className="space-y-3 pt-2">
                <h5 className="font-bold text-navy-300 uppercase text-[9px] tracking-widest flex items-center gap-1">
                  <History size={10} /> Match Sighting History ({selectedSightings.length})
                </h5>
                <div className="max-h-[250px] overflow-y-auto space-y-2 border border-navy-800/40 p-2 rounded-2xl bg-navy-950/40">
                  {selectedSightings.length === 0 ? (
                    <div className="text-center py-6 text-navy-500 font-mono text-[10px]">No historical sightings registered yet.</div>
                  ) : (
                    selectedSightings.map((sighting) => (
                      <div key={sighting.sighting_id} className="flex justify-between items-center p-2.5 rounded-xl bg-navy-900 border border-navy-800 text-[11px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">{sighting.camera_name}</span>
                            <Badge variant={sighting.match_type === "exact" ? "danger" : "warning"}>{sighting.match_type.toUpperCase()}</Badge>
                          </div>
                          <div className="text-navy-400 font-mono text-[10px]">{sighting.camera_location}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-navy-200 font-mono font-medium">{formatDateTime(sighting.detected_at)}</div>
                          <div className="text-[10px] text-navy-400 font-mono">Score: {intPercent(sighting.match_score)}% · OCR: {intPercent(sighting.ocr_confidence)}%</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

function intPercent(val: number) {
  return Math.round(val * 100);
}
