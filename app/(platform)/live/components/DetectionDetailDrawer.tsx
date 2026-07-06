"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GlassCard, RiskBadge, ConfidenceBar } from "@/components/ui/core";
import { X, Clock, MapPin, Clipboard, Info, Database } from "lucide-react";
import type { Detection } from "@/lib/api/live-api";
import { getMediaUrl } from "@/lib/api/live-api";
import { formatDateTime } from "@/lib/utils";

interface DetectionDetailDrawerProps {
  detection: Detection | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DetectionDetailDrawer({
  detection,
  isOpen,
  onClose
}: DetectionDetailDrawerProps) {
  if (!isOpen || !detection) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/40 backdrop-blur-sm">
        {/* Backdrop click closer */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ x: "100%", opacity: 0.95 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-md h-full bg-navy-900/95 backdrop-blur-xl border-l border-navy-700/50 shadow-2xl flex flex-col z-10"
        >
          {/* Drawer Header */}
          <div className="p-4 border-b border-navy-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-electric-400" />
              <span className="text-[11px] font-mono tracking-widest text-navy-400 uppercase font-semibold">Detection Profile</span>
            </div>
            <button 
              onClick={onClose}
              className="text-navy-400 hover:text-navy-100 transition-colors p-1 hover:bg-navy-800/40 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            
            {/* License Plate Display Banner */}
            <div className="bg-navy-950/80 border border-navy-700/30 p-4 rounded-2xl text-center shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-electric-500/50 to-transparent" />
              <div className="text-[10px] font-mono tracking-widest text-navy-500 uppercase">Recognized Plate Number</div>
              <h2 className="text-2xl font-bold font-mono tracking-wider text-white mt-1.5 leading-none">
                {detection.plate_number}
              </h2>
              <div className="mt-3 flex justify-center">
                <RiskBadge level={detection.status as any} className="text-[9px]" />
              </div>
            </div>

            {/* Visual Media Section */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono tracking-wider text-navy-400 uppercase flex items-center gap-1.5">
                <Info size={10} /> Camera Snapshots
              </span>
              
              {/* Full Frame Snapshot */}
              {detection.media?.frame_path ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-navy-700/40 bg-navy-950/80">
                  <img 
                    src={getMediaUrl(detection.media.frame_path)} 
                    alt="Vehicle frame"
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute bottom-2 left-2 bg-navy-950/80 px-2 py-0.5 rounded text-[9px] font-mono text-navy-300">
                    Parent Frame Snapshot
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-xl border border-dashed border-navy-700/40 flex items-center justify-center text-xs text-navy-500">
                  Full snapshot unavailable
                </div>
              )}

              {/* Cropped Plate Image */}
              {detection.media?.plate_crop_path && (
                <div className="flex items-center gap-3 bg-navy-800/20 border border-navy-800/40 p-3 rounded-xl">
                  <div className="h-12 w-28 bg-navy-950 border border-navy-700/40 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img 
                      src={getMediaUrl(detection.media.plate_crop_path)} 
                      alt="Plate Crop"
                      className="w-full h-auto max-h-full object-contain" 
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-navy-500 block uppercase">Extracted Plate Crop</span>
                    <span className="text-[10px] text-navy-300 font-mono mt-0.5 block truncate">
                      {detection.media.plate_crop_path.split("/").pop()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confidence Levels */}
            <div className="space-y-3 bg-navy-800/20 border border-navy-800/40 p-4 rounded-2xl">
              <span className="text-[10px] font-mono tracking-wider text-navy-400 uppercase">AI Inference Metrics</span>
              
              <div className="space-y-3 mt-1">
                <ConfidenceBar 
                  label="YOLO Plate Detection Confidence" 
                  value={Math.round(detection.detection_confidence * 100)} 
                  size="sm" 
                />
                <ConfidenceBar 
                  label="EasyOCR Recognition Confidence" 
                  value={Math.round(detection.ocr_confidence * 100)} 
                  size="sm" 
                />
              </div>
            </div>

            {/* Metadata Fields Grid */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono tracking-wider text-navy-400 uppercase">Audit & Source Metadata</span>
              
              <div className="grid grid-cols-2 gap-3 mt-1">
                <MetaItem label="Source Type" value={detection.source.type.toUpperCase()} />
                <MetaItem label="Source Identifier" value={detection.source.source_id} />
                <MetaItem label="Location / Junction" value={detection.source.name} />
                <MetaItem label="Track ID (BoT-SORT)" value={detection.track_id !== undefined ? `#${detection.track_id}` : "N/A"} />
                <MetaItem label="Occurrence Count" value={`${detection.occurrence_count} occurrences`} />
                <MetaItem label="System Status" value={detection.status.toUpperCase()} />
              </div>
            </div>

            {/* Temporal Logs Timeline */}
            <div className="border border-navy-800/50 bg-navy-800/10 p-4 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono tracking-wider text-navy-400 uppercase flex items-center gap-1.5">
                <Clock size={10} /> Detection Session Timeframes
              </span>
              
              <div className="space-y-2.5 mt-1 text-[11px] font-mono">
                <div className="flex justify-between border-b border-navy-800/30 pb-1.5">
                  <span className="text-navy-500">First Captured:</span>
                  <span className="text-navy-300">{formatDateTime(detection.first_seen)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-500">Last Registered:</span>
                  <span className="text-navy-300">{formatDateTime(detection.last_seen)}</span>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-800/30 border border-navy-800/40 p-2.5 rounded-xl">
      <span className="text-[9px] font-mono text-navy-500 block uppercase">{label}</span>
      <span className="text-xs font-semibold text-navy-100 mt-1 block truncate">{value}</span>
    </div>
  );
}
