"use client";

import { useState, useEffect } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { GlassCard, Badge, ConfidenceBar } from "@/components/ui/core";
import { Button, Input, Select } from "@/components/ui/forms";
import { alertApi, AlertItem } from "@/lib/api/alert-api";
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  User,
  Check,
  Search,
  RefreshCw,
  Camera,
  MapPin,
  FileText
} from "lucide-react";

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filter States
  const [query, setQuery] = useState("");
  const [filterSeverity, setFilterPriority] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // Status Action Note
  const [actionNote, setActionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Load active alerts queue
  const loadAlerts = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "active") {
        const res = await alertApi.getActiveAlerts(1, 100, filterType, filterSeverity);
        setAlerts(res.alerts);
        if (res.alerts.length > 0) {
          setSelectedAlert(res.alerts[0]);
        } else {
          setSelectedAlert(null);
        }
      } else {
        const res = await alertApi.getAlertHistory(1, 100, filterType, filterSeverity);
        setAlerts(res.alerts);
        if (res.alerts.length > 0) {
          setSelectedAlert(res.alerts[0]);
        } else {
          setSelectedAlert(null);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load alert center registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [activeTab, filterSeverity, filterType]);

  // WebSocket Live Updates Connection
  useEffect(() => {
    // Protocol mapping: ws:// or wss:// based on window location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host.split(":")[0]}:8000/ws/live/all`;
    
    let socket: WebSocket;
    
    try {
      socket = new WebSocket(wsUrl);
      
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === "alert_created") {
            const newAlert: AlertItem = payload.data;
            logger("WebSocket Alert Received:", newAlert);
            
            // Prepend new alert to list if it matches active tab state
            if (activeTab === "active") {
              setAlerts((prev) => {
                // Deduplicate check
                if (prev.some((a) => a.id === newAlert.id)) return prev;
                return [newAlert, ...prev];
              });
              // Auto-select if nothing selected
              setSelectedAlert((curr) => curr || newAlert);
            }
          }
        } catch (jsonErr) {
          console.error("Failed to parse WebSocket frame:", jsonErr);
        }
      };
      
      socket.onclose = () => {
        logger("WebSocket alert feed closed. Reconnecting in 5s...");
        setTimeout(() => {}, 5000);
      };
    } catch (e) {
      console.error("WS Alert connection failed:", e);
    }
    
    return () => {
      if (socket) socket.close();
    };
  }, [activeTab]);

  // Action dispatches
  const handleAcknowledge = async () => {
    if (!selectedAlert) return;
    setActionLoading(true);
    try {
      await alertApi.acknowledgeAlert(selectedAlert.id, actionNote || "Acknowledged by surveillance room");
      alert("Incident acknowledged.");
      setActionNote("");
      loadAlerts();
    } catch (err: any) {
      alert(err.message || "Failed to acknowledge incident.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTracking = async (status: string) => {
    if (!selectedAlert) return;
    setActionLoading(true);
    try {
      await alertApi.updateTrackingStatus(selectedAlert.id, status, actionNote || `Tracking updated to ${status}`);
      alert(`Tracking status updated to ${status}.`);
      setActionNote("");
      // Update locally
      setSelectedAlert((prev) => prev ? { ...prev, tracking_status: status as any } : null);
      loadAlerts();
    } catch (err: any) {
      alert(err.message || "Failed to update tracking.");
    } finally {
      setActionLoading(false);
    }
  };

  const logger = (...args: any[]) => {
    console.log("[AlertCenter]", ...args);
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "critical":
        return "bg-crimson-500";
      case "high":
        return "bg-amber-500";
      case "medium":
        return "bg-electric-500";
      default:
        return "bg-navy-500";
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case "stolen_vehicle":
        return "Stolen Vehicle Sighting";
      case "stolen_probable":
        return "Probable Stolen Plate Sighting";
      case "stolen_review":
        return "Surveillance Match Review Candidate";
      case "clone_suspicion":
        return "Cloned Number Plate Suspicion";
      default:
        return "System Alert";
    }
  };

  // Filter list locally by search query
  const filteredAlerts = alerts.filter((a) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      a.plate_number.toLowerCase().includes(q) ||
      a.camera_name.toLowerCase().includes(q) ||
      a.alert_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-700/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-crimson-500 animate-pulse" />
            <span className="text-[11px] text-crimson-400 font-mono font-medium tracking-widest uppercase">Surveillance Incident Hub</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Alert Dispatch Center</h1>
          <p className="text-navy-300 text-xs">Real-time incident priority queues, live WebSocket hotlist matches, and resolution dispatches.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === "active" ? "primary" : "ghost"} size="sm" onClick={() => setActiveTab("active")}>Active Queue</Button>
          <Button variant={activeTab === "history" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("history")}>Alert History</Button>
        </div>
      </div>

      {/* Filters */}
      <GlassCard className="p-4 flex flex-col sm:flex-row items-center gap-3 border-navy-700/40">
        <Input
          placeholder="Filter by plate number or location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:max-w-xs"
          icon={<Search size={14} />}
        />
        <Select
          value={filterSeverity}
          onChange={(e) => setFilterPriority(e.target.value)}
          options={[
            { value: "all", label: "All Severities" },
            { value: "critical", label: "Critical" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" }
          ]}
        />
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          options={[
            { value: "all", label: "All Incident Types" },
            { value: "stolen_vehicle", label: "Stolen Sighting" },
            { value: "stolen_probable", label: "Probable Sighting" },
            { value: "clone_suspicion", label: "Clone Suspicion" }
          ]}
        />
        <Button variant="ghost" className="sm:ml-auto text-navy-400" icon={<RefreshCw size={13} />} onClick={loadAlerts}>
          Reload Queue
        </Button>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - alerts items list */}
        <div className="lg:col-span-2 space-y-3">
          <GlassCard className="p-4 border-navy-700/50">
            <h3 className="text-xs font-semibold text-navy-100 uppercase tracking-widest mb-3">Live Dispatch Queue</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center text-navy-400 font-mono text-xs">Loading incident feed...</div>
              ) : filteredAlerts.length === 0 ? (
                <div className="py-12 text-center text-navy-500 font-mono text-xs">No incident alerts registered in this category.</div>
              ) : (
                filteredAlerts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAlert(a)}
                    className={cn(
                      "p-3.5 rounded-2xl border cursor-pointer transition-all duration-200",
                      selectedAlert?.id === a.id
                        ? "bg-navy-850/80 border-electric-500/40 shadow-glow-blue"
                        : "bg-navy-850/30 border-navy-800 hover:border-navy-700/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 animate-pulse",
                          getSeverityColor(a.severity)
                        )} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white bg-navy-950 px-2 py-0.5 rounded border border-navy-800">
                              {a.plate_number}
                            </span>
                            <Badge variant={a.severity === "critical" ? "danger" : "warning"}>{a.severity.toUpperCase()}</Badge>
                          </div>
                          <div className="text-xs font-semibold text-navy-200 mt-1">{getAlertTypeText(a.alert_type)}</div>
                          <div className="text-[10px] text-navy-400 mt-1 font-mono flex items-center gap-1">
                            <Camera size={10} /> {a.camera_name} ({a.camera_location})
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-navy-500 font-mono">
                        {formatDateTime(a.detected_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right column - active alert details and dispatches */}
        <div>
          {selectedAlert ? (
            <GlassCard className="p-5 space-y-4 border-navy-700/50">
              <div className="flex justify-between items-center pb-2 border-b border-navy-800">
                <div>
                  <span className="text-[9px] text-navy-500 font-mono font-semibold uppercase">{selectedAlert.id}</span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-heading">{getAlertTypeText(selectedAlert.alert_type)}</h3>
                </div>
                <Badge variant={selectedAlert.acknowledge_status === "resolved" ? "success" : "danger"}>
                  {selectedAlert.acknowledge_status.toUpperCase()}
                </Badge>
              </div>

              {/* Bounding Box Image Visuals */}
              {selectedAlert.plate_crop_path && (
                <div className="aspect-video bg-navy-900 rounded-xl relative overflow-hidden border border-navy-800 flex items-center justify-center">
                  {selectedAlert.frame_image_path ? (
                    <img src={selectedAlert.frame_image_path} alt="Sighting Frame" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="text-navy-700" size={32} />
                  )}
                  <div className="absolute top-2 left-2 text-[9px] font-mono bg-navy-950/90 text-navy-300 px-2 py-0.5 rounded">
                    {selectedAlert.camera_name}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-navy-950/80 p-1 rounded border border-navy-800/40">
                    <img src={selectedAlert.plate_crop_path} alt="Plate crop" className="h-5 object-contain" />
                  </div>
                </div>
              )}

              {/* Data Table details */}
              <div className="p-3.5 rounded-xl bg-navy-950/40 border border-navy-800 space-y-3.5 text-xs">
                {selectedAlert.alert_type.startsWith("stolen") && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-b border-navy-800/40 pb-2">
                    <div>
                      <span className="text-[9px] text-navy-500 block uppercase">FIR Case Ref</span>
                      <span className="text-white font-semibold">{selectedAlert.case_fir_number || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-navy-500 block uppercase">Vehicle Model</span>
                      <span className="text-white font-semibold">{selectedAlert.vehicle_model || "Unknown"} ({selectedAlert.vehicle_color || "Unknown"})</span>
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-[9px] text-navy-500 block uppercase">Observation Location</span>
                  <span className="text-navy-200 font-semibold flex items-center gap-1"><MapPin size={10} /> {selectedAlert.camera_location}</span>
                </div>
                <div>
                  <span className="text-[9px] text-navy-500 block uppercase">Incident Reason / Match Description</span>
                  <p className="text-navy-300 mt-1 leading-relaxed">{selectedAlert.normalized_plate || "Matching hotlist alert detected."}</p>
                </div>
              </div>

              {/* Confidence bars */}
              <div>
                <span className="text-[9px] text-navy-500 block uppercase mb-1">OCR match confidence</span>
                <ConfidenceBar value={Math.round((selectedAlert.match_confidence || selectedAlert.ocr_confidence) * 100)} label="" showValue />
              </div>

              {/* Recommend Protocol Alert Box */}
              <div className="p-3 rounded-xl border border-amber-500/15 bg-amber-500/5 text-xs text-navy-300 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <ShieldAlert size={14} />
                  <span>Surveillance Intercept Protocol</span>
                </div>
                <p className="text-[9px] leading-relaxed text-navy-400">
                  {selectedAlert.alert_type.startsWith("clone")
                    ? "Verify visual feature embeds. Flag case to dispatch warnings at downstream NH highway checkposts."
                    : "Deploy interception teams. Dispatch notifications to local police beats. Current Tracking: " + selectedAlert.tracking_status.toUpperCase()}
                </p>
              </div>

              {/* Action Log note and buttons */}
              {selectedAlert.acknowledge_status === "active" && (
                <div className="space-y-3 pt-2 border-t border-navy-800">
                  <Input
                    label="Action Note"
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Enter operation note (e.g., Police notified, intercepting)..."
                  />
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" size="xs" onClick={() => handleUpdateTracking("police_notified")} loading={actionLoading}>
                        Notify Patrol Unit
                      </Button>
                      <Button variant="secondary" size="xs" onClick={() => handleUpdateTracking("interception_in_progress")} loading={actionLoading}>
                        Intercept Target
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" size="xs" onClick={handleAcknowledge} loading={actionLoading}>
                        Acknowledge Alert
                      </Button>
                      <Button variant="primary" size="xs" icon={<Check size={12} />} onClick={() => handleUpdateTracking("caught")} loading={actionLoading}>
                        Target Caught
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center text-navy-500 font-mono text-xs">
              Select an incident from the queue to review match confidence overlays and execute dispatch protocols.
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
