"use client";

import { ProgressRing } from "@/components/ui/core";
import { Button } from "@/components/ui/forms";
import { Play, Square } from "lucide-react";

interface VideoProgressOverlayProps {
  progress: number;
  processedFrames: number;
  totalFrames: number;
  detectionsCount: number;
  uniquePlates: number;
  onStop: () => void;
}

export default function VideoProgressOverlay({
  progress,
  processedFrames,
  totalFrames,
  detectionsCount,
  uniquePlates,
  onStop
}: VideoProgressOverlayProps) {
  return (
    <div className="absolute inset-0 bg-navy-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-10 text-center">
      
      {/* Progress ring with percentage text */}
      <ProgressRing 
        value={progress} 
        size={80} 
        strokeWidth={5} 
        color="var(--color-accent-blue)"
      >
        <span className="text-sm font-bold font-mono text-white">
          {progress}%
        </span>
      </ProgressRing>

      <h4 className="text-xs font-semibold text-white mt-3 font-heading tracking-wide uppercase">
        Analyzing Video Stream
      </h4>
      <p className="text-[9px] text-navy-400 mt-0.5">
        AI Pipeline Decoding & Processing Frames
      </p>

      {/* Stats Counter Rows */}
      <div className="grid grid-cols-3 gap-2 mt-4 bg-navy-900/60 border border-navy-800/40 p-2.5 rounded-xl w-full max-w-[280px] text-center font-mono">
        <div>
          <span className="text-[8px] text-navy-500 uppercase block">Frames</span>
          <span className="text-[10px] font-bold text-white mt-0.5 block">
            {processedFrames} / {totalFrames || "?"}
          </span>
        </div>
        <div>
          <span className="text-[8px] text-navy-500 uppercase block">Detections</span>
          <span className="text-[10px] font-bold text-electric-400 mt-0.5 block">
            {detectionsCount}
          </span>
        </div>
        <div>
          <span className="text-[8px] text-navy-500 uppercase block">Unique</span>
          <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">
            {uniquePlates}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mt-4 flex gap-2">
        <Button 
          variant="danger" 
          size="xs" 
          onClick={(e) => {
            e.stopPropagation();
            onStop();
          }}
          icon={<Square size={10} />}
        >
          Cancel Processing
        </Button>
      </div>

    </div>
  );
}
