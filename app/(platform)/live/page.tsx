"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatTime } from "@/lib/utils";
import { GlassCard, RiskBadge, Badge, AIThinking, Skeleton } from "@/components/ui/core";
import { Button } from "@/components/ui/forms";
import { CAMERA_LOCATIONS, generatePlateNumber, VEHICLE_BRANDS, VEHICLE_COLORS, VEHICLE_TYPES, VEHICLE_MODELS } from "@/lib/mock-data";
import {
  Radio, Play, Square, Settings, Grid, Monitor, LayoutGrid, MapPin, 
  Compass, Clock, Plus, StopCircle
} from "lucide-react";

import { useLiveWebSocket } from "./hooks/useLiveWebSocket";
import { useLiveSources, LiveSource } from "./hooks/useLiveSources";
import AddSourceModal from "./components/AddSourceModal";
import DetectionDetailDrawer from "./components/DetectionDetailDrawer";
import SourceCameraCard from "./components/SourceCameraCard";
import type { Detection } from "@/lib/api/live-api";

// ============================================================
// LIVE SURVEILLANCE FEED & ANPR CENTER
// ============================================================

interface ActiveDetection {
  id: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  type: string;
  confidence: number;
  camera: string;
  location: string;
  timestamp: Date;
  risk: "verified" | "safe" | "suspicious" | "high_risk" | "critical" | "low_confidence";
  fingerprintScore: number;
  rawDetection?: Detection;
}

export default function LiveMonitoringPage() {
  const [gridLayout, setGridLayout] = useState<4 | 9>(4);
  const [isRecording, setIsRecording] = useState(false);
  const [activeCam, setActiveCam] = useState<string | null>("CAM-001");
  const [loading, setLoading] = useState(true);
  const [fallbackDetections, setFallbackDetections] = useState<ActiveDetection[]>([]);
  
  // UI Modals / Drawers
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [selectedRealDetection, setSelectedRealDetection] = useState<Detection | null>(null);

  // Webcam stream ref
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const webcamIntervalRef = useRef<any>(null);

  // Live sources hook
  const {
    sources,
    addImageSource,
    addVideoSource,
    addWebcamSource,
    addRTSPSource,
    removeSource,
    updateSource
  } = useLiveSources();

  // Find current active session
  const activeSource = sources.find((s) => s.id === activeCam);
  const activeSessionId = activeSource?.sessionId || "all";

  // Connect to live WebSocket events
  // If we have an active source with a specific session, connect to it, else connect to global 'all'
  const {
    isConnected,
    wsStatus,
    detections: wsDetections,
    progress: wsProgress,
    streamStats,
    sourceStatus,
    sendMessage
  } = useLiveWebSocket(activeSessionId);

  // Sync WebSocket progress and status back to the sources array
  useEffect(() => {
    if (activeSource && activeSessionId !== "all") {
      const updates: Partial<LiveSource> = {};
      if (wsProgress) {
        updates.progress = wsProgress.progress;
        updates.processedFrames = wsProgress.processed_frames;
        updates.totalFrames = wsProgress.total_frames;
        updates.detectionsCount = wsProgress.detections_count;
        updates.uniquePlates = wsProgress.unique_plates;
      }
      if (streamStats.fps > 0) {
        updates.fps = streamStats.fps;
        updates.latency = streamStats.latency;
      }
      if (sourceStatus !== "idle" && sourceStatus !== activeSource.status) {
        updates.status = sourceStatus as any;
      }
      updateSource(activeSource.id, updates);
    }
  }, [wsProgress, streamStats, sourceStatus, activeCam, activeSessionId, updateSource]);

  // Load initial simulated detections (fallback when backend is not emitting)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      const initialList: ActiveDetection[] = Array.from({ length: 6 }, (_, i) => {
        const brand = VEHICLE_BRANDS[Math.floor(Math.random() * VEHICLE_BRANDS.length)];
        const models = VEHICLE_MODELS[brand] || ["Swift"];
        const risks: ActiveDetection["risk"][] = ["verified", "safe", "suspicious", "high_risk", "critical"];
        return {
          id: `DET-${1000 + i}`,
          plate: generatePlateNumber(),
          brand,
          model: models[Math.floor(Math.random() * models.length)],
          color: VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)],
          type: VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)],
          confidence: Math.floor(82 + Math.random() * 18),
          camera: CAMERA_LOCATIONS[i % CAMERA_LOCATIONS.length].name,
          location: CAMERA_LOCATIONS[i % CAMERA_LOCATIONS.length].district,
          timestamp: new Date(Date.now() - i * 60000),
          risk: risks[Math.floor(Math.random() * risks.length)],
          fingerprintScore: Math.floor(75 + Math.random() * 25),
        };
      });
      setFallbackDetections(initialList);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Simulate new real-time mock detections coming in as a fallback
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      // Only append mock detections if there are no live WebSocket detections active
      if (wsDetections.length > 0) return;

      const brand = VEHICLE_BRANDS[Math.floor(Math.random() * VEHICLE_BRANDS.length)];
      const models = VEHICLE_MODELS[brand] || ["Swift"];
      const risks: ActiveDetection["risk"][] = ["verified", "safe", "suspicious", "high_risk", "critical"];
      const r = risks[Math.floor(Math.random() * risks.length)];
      const cam = CAMERA_LOCATIONS[Math.floor(Math.random() * CAMERA_LOCATIONS.length)];

      const newDet: ActiveDetection = {
        id: `DET-${Date.now()}`,
        plate: generatePlateNumber(),
        brand,
        model: models[Math.floor(Math.random() * models.length)],
        color: VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)],
        type: VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)],
        confidence: Math.floor(88 + Math.random() * 12),
        camera: cam.name,
        location: cam.district,
        timestamp: new Date(),
        risk: r,
        fingerprintScore: Math.floor(80 + Math.random() * 20),
      };

      setFallbackDetections((prev) => [newDet, ...prev.slice(0, 15)]);
    }, 5000);

    return () => clearInterval(interval);
  }, [loading, wsDetections.length]);

  // Webcam frame capture loop
  const startWebcamFrameCapture = useCallback((stream: MediaStream, sessionId: string) => {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.play().catch((err) => console.error("Webcam video play failed", err));

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    webcamIntervalRef.current = setInterval(() => {
      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        // Send base64 frame data to backend WebSocket
        sendMessage("webcam_frame", dataUrl);
      }
    }, 250); // Send 4 frames per second (adjustable)
  }, [sendMessage]);

  // Add Source Modal handlers
  const handleAddImage = async (file: File) => {
    try {
      const res = await addImageSource(file);
      if (res?.sourceId) {
        setActiveCam(res.sourceId);
      }
    } catch (err) {
      throw err; // Re-throw so AddSourceModal can display the error
    }
  };

  const handleAddVideo = async (file: File) => {
    try {
      const res = await addVideoSource(file);
      if (res?.sourceId) {
        setActiveCam(res.sourceId);
      }
    } catch (err) {
      throw err;
    }
  };

  const handleStartWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      setWebcamStream(stream);

      const res = await addWebcamSource();
      if (res?.sourceId) {
        setActiveCam(res.sourceId);
        startWebcamFrameCapture(stream, res.sessionId);
      }
    } catch (err) {
      console.error("Camera access denied: ", err);
      alert("Browser camera access was denied. Please allow permission.");
    }
  };

  const handleConnectRTSP = async (name: string, location: string, url: string) => {
    try {
      const res = await addRTSPSource(name, location, url);
      if (res?.sourceId) {
        setActiveCam(res.sourceId);
      }
    } catch (err) {
      throw err;
    }
  };

  const handleRemoveSource = async (id: string) => {
    // If it's the active webcam, stop capturing
    if (id === activeCam && webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
      if (webcamIntervalRef.current) {
        clearInterval(webcamIntervalRef.current);
      }
    }
    await removeSource(id);
    setActiveCam("CAM-001");
  };

  // Grid list consolidation
  const gridCards = [];
  const activeCount = sources.length;
  for (let i = 0; i < gridLayout; i++) {
    if (i < activeCount) {
      gridCards.push({ type: "active", data: sources[i] });
    } else {
      const mockIndex = i - activeCount;
      gridCards.push({ type: "mock", data: CAMERA_LOCATIONS[mockIndex % CAMERA_LOCATIONS.length] });
    }
  }

  // Display detections sidebar data mapper
  const displayDetections: ActiveDetection[] = wsDetections.length > 0 
    ? wsDetections.map((d) => ({
        id: d.id,
        plate: d.plate_number,
        brand: "AI Recognized",
        model: d.source.type.toUpperCase(),
        color: "Plate Crop",
        type: "Indian ANPR",
        confidence: Math.round(d.ocr_confidence * 100),
        camera: d.source.name,
        location: d.source.source_id,
        timestamp: new Date(d.last_seen),
        risk: d.status as any,
        fingerprintScore: Math.round(d.detection_confidence * 100),
        rawDetection: d
      }))
    : fallbackDetections;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio size={14} className="text-crimson-500 animate-pulse" />
            <span className="text-[11px] text-crimson-400 font-mono font-medium tracking-widest uppercase">Live Surveillance Feed</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">Live Monitoring Dashboard</h1>
          <p className="text-navy-300 text-xs">Surveillance and intelligence center</p>
        </div>

        {/* Action Controls & Adding Feeds */}
        <div className="flex items-center gap-2">
          
          {/* Add Source CTA */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddSourceModal(true)}
            icon={<Plus size={13} />}
          >
            Add Source
          </Button>

          {/* Grid Size controls */}
          <div className="flex bg-navy-800/60 border border-navy-700/30 p-0.5 rounded-xl">
            <Button
              variant={gridLayout === 4 ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setGridLayout(4)}
              icon={<Grid size={13} />}
            >
              2x2
            </Button>
            <Button
              variant={gridLayout === 9 ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setGridLayout(9)}
              icon={<LayoutGrid size={13} />}
            >
              3x3
            </Button>
          </div>

          <Button
            variant={isRecording ? "danger" : "secondary"}
            size="sm"
            onClick={() => setIsRecording(!isRecording)}
            icon={isRecording ? <StopCircle size={13} /> : <Play size={13} />}
          >
            {isRecording ? "Stop Recording" : "Record Feed"}
          </Button>

          <Button variant="outline" size="sm" icon={<Settings size={13} />} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-start">
        {/* CCTV Streaming Camera Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className={cn(
            "grid gap-4",
            gridLayout === 4 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3"
          )}>
            {gridCards.map((card, idx) => {
              if (card.type === "active") {
                const src = card.data as LiveSource;
                return (
                  <SourceCameraCard
                    key={src.id}
                    source={src}
                    isActive={activeCam === src.id}
                    onClick={() => setActiveCam(src.id)}
                    onRemove={() => handleRemoveSource(src.id)}
                    webcamStream={src.type === "webcam" ? webcamStream : null}
                  />
                );
              } else {
                const cam = card.data as typeof CAMERA_LOCATIONS[0];
                return (
                  <SurveillanceCamCard
                    key={cam.id}
                    camera={cam}
                    isActive={activeCam === cam.id}
                    onClick={() => setActiveCam(cam.id)}
                  />
                );
              }
            })}
          </div>

          {/* Active Selected Camera Info (Diagnostic Area) */}
          <GlassCard className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {activeSource ? (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy-50 font-heading">{activeSource.name}</h4>
                    <div className="flex items-center gap-4 text-[10px] text-navy-400 font-mono mt-1">
                      <span className="flex items-center gap-1"><MapPin size={10} /> Location: {activeSource.location}</span>
                      <span className="flex items-center gap-1"><Radio size={10} /> Stream: {activeSource.type.toUpperCase()} / {activeSource.status.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400">
                    <Monitor size={18} />
                  </div>
                  {/* Default Camera Locations info */}
                  {(() => {
                    const selectedCamera = CAMERA_LOCATIONS.find((c) => c.id === activeCam) || CAMERA_LOCATIONS[0];
                    return (
                      <div>
                        <h4 className="text-sm font-semibold text-navy-50 font-heading">{selectedCamera.name}</h4>
                        <div className="flex items-center gap-4 text-[10px] text-navy-400 font-mono mt-1">
                          <span className="flex items-center gap-1"><MapPin size={10} /> District: {selectedCamera.district}</span>
                          <span className="flex items-center gap-1"><Compass size={10} /> GPS: {selectedCamera.lat}, {selectedCamera.lng}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-navy-400 font-mono">ENCODER STATE</div>
                  <div className="text-[11px] font-mono text-emerald-400">
                    {activeSource ? `${activeSource.type.toUpperCase()} STREAM ONLINE` : "H.265 SURVEILLANCE ACTIVE"}
                  </div>
                </div>
                <div className="h-8 w-px bg-navy-700/50" />
                <div className="text-right">
                  <div className="text-[10px] text-navy-400 font-mono">SURVEILLANCE STORAGE</div>
                  <div className="text-[11px] font-mono text-electric-300">45d ARCHIVE RETENTION</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Live Detections Right Sidebar */}
        <div className="lg:col-span-1 h-full">
          <GlassCard className="p-5 flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="font-heading font-semibold text-navy-100 text-sm">Real-time Detections</h3>
                <p className="text-[10px] text-navy-500">Live AI Inference Engine</p>
              </div>
              {/* Backend connection status pill */}
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  wsStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                  wsStatus === "connecting" || wsStatus === "disconnected" ? "bg-amber-500 animate-pulse" :
                  "bg-navy-600"
                }`} />
                <span className={`text-[9px] font-mono uppercase tracking-wider ${
                  wsStatus === "connected" ? "text-emerald-400" :
                  wsStatus === "connecting" ? "text-amber-400" :
                  wsStatus === "offline" ? "text-navy-500" :
                  "text-navy-500"
                }`}>
                  {wsStatus === "connected" ? "Live" :
                   wsStatus === "connecting" ? "Connecting" :
                   wsStatus === "offline" ? "Offline" :
                   wsStatus === "disconnected" ? "Retrying" : "Standby"}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <AnimatePresence initial={false}>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))
                ) : (
                  displayDetections.map((det) => (
                    <motion.div
                      key={det.id}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      onClick={() => {
                        if (det.rawDetection) {
                          setSelectedRealDetection(det.rawDetection);
                        }
                      }}
                      className={cn(
                        "p-3 rounded-xl border glass bg-navy-800/40 hover:bg-navy-800/70",
                        "transition-all duration-200 cursor-pointer group relative overflow-hidden"
                      )}
                    >
                      <div className="absolute top-0 bottom-0 left-0 w-1" style={{ backgroundColor: getRiskHex(det.risk) }} />
                      <div className="flex items-start justify-between gap-2 pl-2">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs font-mono font-bold text-navy-50 bg-navy-950/80 px-2 py-0.5 rounded border border-navy-700/30">
                              {det.plate}
                            </span>
                            <RiskBadge level={det.risk as any} className="text-[8px] py-0 px-1.5" />
                          </div>
                          <div className="text-[10px] text-navy-300 font-medium">
                            {det.brand} {det.model}
                          </div>
                          <div className="flex items-center gap-3 text-[9px] text-navy-500 mt-1 font-mono">
                            <span className="flex items-center gap-0.5"><Clock size={9} /> {formatTime(det.timestamp)}</span>
                            <span className="truncate max-w-[100px]">{det.camera.replace("Ongole Bypass", "Bypass")}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-mono font-bold text-electric-400">{det.confidence}%</div>
                          <div className="text-[8px] text-navy-500 mt-0.5 uppercase tracking-wide">Confidence</div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Add Source Input modal */}
      <AddSourceModal
        isOpen={showAddSourceModal}
        onClose={() => setShowAddSourceModal(false)}
        onAddImage={handleAddImage}
        onAddVideo={handleAddVideo}
        onStartWebcam={handleStartWebcam}
        onConnectRTSP={handleConnectRTSP}
      />

      {/* Detection Profile Details Drawer */}
      <DetectionDetailDrawer
        isOpen={selectedRealDetection !== null}
        detection={selectedRealDetection}
        onClose={() => setSelectedRealDetection(null)}
      />

    </div>
  );
}

// ── Surveillance Camera Component (Pre-configured Mock Feed) ────────────────────────

interface CameraProps {
  camera: typeof CAMERA_LOCATIONS[0];
  isActive: boolean;
  onClick: () => void;
}

function SurveillanceCamCard({ camera, isActive, onClick }: CameraProps) {
  const [fps, setFps] = useState(25);
  const [latency, setLatency] = useState(115);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(24 + Math.floor(Math.random() * 3));
      setLatency(100 + Math.floor(Math.random() * 30));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "relative aspect-video rounded-2xl overflow-hidden cursor-pointer",
        "border transition-all duration-300 group",
        isActive
          ? "border-electric-500 shadow-glow-blue"
          : "border-navy-700/40 hover:border-navy-600/60 hover:shadow-lg"
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* CCTV Screen simulator */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-950" />
      <div className="absolute inset-0 grid-bg opacity-15" />

      {/* Bounding box animation simulator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1/3 h-1/3 border-2 border-dashed border-electric-500/20 rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-electric-500/40 animate-pulse-slow rounded-full" />
        </div>
      </div>

      {/* Surveillance scan overlays */}
      <div className="absolute inset-0 scan-overlay opacity-30 pointer-events-none" />

      {/* Status & Diagnostics Top Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
          <span className="text-[10px] font-mono text-white bg-navy-900/80 px-2 py-0.5 rounded backdrop-blur-sm uppercase">
            {camera.id}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-navy-300 bg-navy-900/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
            {fps} FPS
          </span>
          <span className="text-[9px] font-mono text-navy-300 bg-navy-900/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
            {latency}ms
          </span>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-navy-950/95 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-white truncate max-w-[150px]">{camera.name}</h4>
            <span className="text-[9px] text-navy-400 font-mono mt-0.5 block">{camera.district}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[9px] font-mono text-navy-400 bg-navy-900/40 px-1.5 py-0.5 rounded uppercase border border-navy-700/20">
              LIVESTREAM
            </span>
          </div>
        </div>
      </div>

      {/* Camera Selected Highlight */}
      {isActive && (
        <div className="absolute inset-0 border border-electric-500/30 bg-electric-500/5 pointer-events-none" />
      )}
    </motion.div>
  );
}

// Helper to get hex colors for risk types
function getRiskHex(risk: string): string {
  const colors: Record<string, string> = {
    verified: "hsl(158, 64%, 42%)",
    safe: "hsl(158, 64%, 42%)",
    suspicious: "hsl(38, 92%, 50%)",
    high_risk: "hsl(4, 86%, 58%)",
    critical: "hsl(4, 86%, 58%)",
    low_confidence: "hsl(38, 92%, 50%)"
  };
  return colors[risk] || "hsl(213, 94%, 56%)";
}
