"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Trash2, Radio, Camera, Film, Image as ImageIcon, Wifi, AlertTriangle } from "lucide-react";
import type { LiveSource } from "../hooks/useLiveSources";
import { getMediaUrl } from "@/lib/api/live-api";
import VideoProgressOverlay from "./VideoProgressOverlay";

interface SourceCameraCardProps {
  source: LiveSource;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  webcamStream?: MediaStream | null;
}

export default function SourceCameraCard({
  source,
  isActive,
  onClick,
  onRemove,
  webcamStream
}: SourceCameraCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fps, setFps] = useState(source.fps || 0);
  const [latency, setLatency] = useState(source.latency || 0);

  // Bind webcam stream to video element when active
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch((err) => {
        console.warn("Autoplay webcam failed: ", err);
      });
    }
  }, [webcamStream]);

  // Handle stream stats updates
  useEffect(() => {
    if (source.status === "live" && source.type !== "image") {
      setFps(source.fps || 15);
      setLatency(source.latency || 45);
    } else {
      setFps(source.fps || 0);
      setLatency(source.latency || 0);
    }
  }, [source.fps, source.latency, source.status, source.type]);

  const getSourceIcon = () => {
    switch (source.type) {
      case "image": return <ImageIcon size={12} />;
      case "video": return <Film size={12} />;
      case "webcam": return <Camera size={12} />;
      case "rtsp": return <Wifi size={12} />;
      default: return <Radio size={12} />;
    }
  };

  const getStatusColor = () => {
    switch (source.status) {
      case "live":
      case "completed":
        return "bg-emerald-500";
      case "processing":
      case "connecting":
      case "reconnecting":
        return "bg-amber-500";
      case "error":
        return "bg-crimson-500";
      default:
        return "bg-navy-500";
    }
  };

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
      {/* CCTV Screen Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-950" />
      <div className="absolute inset-0 grid-bg opacity-15" />

      {/* Render Image Source */}
      {source.type === "image" && source.annotatedImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-950">
          <img
            src={getMediaUrl(source.annotatedImageUrl)}
            alt="Source snapshot"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Render Video File Frame Backdrop */}
      {source.type === "video" && source.status === "completed" && source.annotatedImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-950">
          <img
            src={getMediaUrl(source.annotatedImageUrl)}
            alt="Processed video frame"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Render Webcam Stream */}
      {source.type === "webcam" && source.status === "live" && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Video Progress Overlay during active analysis */}
      {source.type === "video" && source.status === "processing" && (
        <VideoProgressOverlay
          progress={source.progress || 0}
          processedFrames={source.processedFrames || 0}
          totalFrames={source.totalFrames || 0}
          detectionsCount={source.detectionsCount || 0}
          uniquePlates={source.uniquePlates || 0}
          onStop={onRemove}
        />
      )}

      {/* RTSP Placeholder */}
      {source.type === "rtsp" && source.status === "live" && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-950/80">
          <div className="text-center space-y-1">
            <Radio size={24} className="text-emerald-400 animate-pulse mx-auto" />
            <p className="text-[10px] text-emerald-400 font-mono">LIVESTREAM PROCESSING FEED</p>
          </div>
        </div>
      )}

      {/* Error State Overlay */}
      {source.status === "error" && (
        <div className="absolute inset-0 bg-crimson-950/90 flex flex-col items-center justify-center p-4 text-center z-10">
          <AlertTriangle size={24} className="text-crimson-400 animate-bounce mb-1" />
          <h4 className="text-[11px] font-bold uppercase text-white font-heading">Connection/Process Failure</h4>
          <p className="text-[9px] text-crimson-300 mt-1 max-w-[200px] line-clamp-2">
            Failed to process stream feed source.
          </p>
        </div>
      )}

      {/* Connecting/Loading Overlay */}
      {(source.status === "connecting" || source.status === "reconnecting") && source.type !== "video" && (
        <div className="absolute inset-0 bg-navy-950/90 flex flex-col items-center justify-center p-4 text-center z-10">
          <div className="w-6 h-6 border-2 border-electric-500/20 border-t-electric-500 animate-spin rounded-full mb-2" />
          <h4 className="text-[10px] font-bold uppercase text-white font-heading">
            {source.status === "reconnecting" ? "Reconnecting stream" : "Establishing stream"}
          </h4>
          <p className="text-[8px] text-navy-400 font-mono mt-0.5">Please wait...</p>
        </div>
      )}

      {/* Bounding box animation simulator (default background scanner overlay) */}
      {source.status === "live" && source.type !== "webcam" && (
        <div className="absolute inset-0 scan-overlay opacity-30 pointer-events-none" />
      )}

      {/* Status & Diagnostics Top Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2">
          <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse-slow", getStatusColor())} />
          <span className="text-[10px] font-mono text-white bg-navy-900/80 px-2 py-0.5 rounded backdrop-blur-sm uppercase flex items-center gap-1.5">
            {getSourceIcon()}
            {source.id}
          </span>
        </div>
        
        {/* Right Info: Stats (FPS/Latency) or Remove button */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {source.status === "live" && fps > 0 && (
            <>
              <span className="text-[9px] font-mono text-navy-300 bg-navy-900/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                {fps} FPS
              </span>
              <span className="text-[9px] font-mono text-navy-300 bg-navy-900/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                {latency}ms
              </span>
            </>
          )}

          {/* Remove Card Slot Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-5 h-5 rounded bg-crimson-500/10 border border-crimson-500/30 flex items-center justify-center text-crimson-400 hover:bg-crimson-500 hover:text-white transition-colors"
            title="Remove source"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-navy-950/95 to-transparent z-20">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-white truncate max-w-[150px]">
              {source.name}
            </h4>
            <span className="text-[9px] text-navy-400 font-mono mt-0.5 block truncate max-w-[160px]">
              {source.location || "Connected feed"}
            </span>
          </div>
          <div>
            <span className="text-[9px] font-mono text-navy-300 bg-navy-900/60 px-1.5 py-0.5 rounded uppercase border border-navy-700/20">
              {source.type === "rtsp" ? "LIVESTREAM" : source.type.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Highlight Active Selection border */}
      {isActive && (
        <div className="absolute inset-0 border border-electric-500/30 bg-electric-500/5 pointer-events-none" />
      )}
    </motion.div>
  );
}
