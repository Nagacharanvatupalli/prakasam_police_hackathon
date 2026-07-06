"use client";

import { useState, useRef } from "react";
import { GlassCard } from "@/components/ui/core";
import { Button, Input } from "@/components/ui/forms";
import { X, Upload, Video, Camera, Wifi, Image as ImageIcon } from "lucide-react";

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImage: (file: File) => Promise<any>;
  onAddVideo: (file: File) => Promise<any>;
  onStartWebcam: () => Promise<any>;
  onConnectRTSP: (name: string, location: string, url: string) => Promise<any>;
}

type TabType = "image" | "video" | "webcam" | "rtsp";

export default function AddSourceModal({
  isOpen,
  onClose,
  onAddImage,
  onAddVideo,
  onStartWebcam,
  onConnectRTSP
}: AddSourceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("image");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // RTSP fields
  const [rtspName, setRtspName] = useState("");
  const [rtspLoc, setRtspLoc] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setSubmitError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setSubmitError(null);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      if (activeTab === "image" && selectedFile) {
        await onAddImage(selectedFile);
        onClose();
      } else if (activeTab === "video" && selectedFile) {
        await onAddVideo(selectedFile);
        onClose();
      } else if (activeTab === "webcam") {
        await onStartWebcam();
        onClose();
      } else if (activeTab === "rtsp") {
        if (!rtspName || !rtspLoc || !rtspUrl) {
          setSubmitError("Please fill all RTSP connection fields.");
          setLoading(false);
          return;
        }
        await onConnectRTSP(rtspName, rtspLoc, rtspUrl);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to add source:", err);
      setSubmitError(err.message || "An unexpected error occurred while processing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "image", label: "Upload Image", icon: <ImageIcon size={14} /> },
    { id: "video", label: "Upload Video", icon: <Video size={14} /> },
    { id: "webcam", label: "Live Webcam", icon: <Camera size={14} /> },
    { id: "rtsp", label: "IP Camera / RTSP", icon: <Wifi size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 backdrop-blur-md p-4">
      <GlassCard className="w-full max-w-lg overflow-hidden border border-navy-700/60 shadow-2xl relative" intensity="strong">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-navy-400 hover:text-navy-100 transition-colors p-1 rounded-lg hover:bg-navy-800/60"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-navy-800/40">
          <h3 className="text-base font-bold text-white font-heading tracking-wide">
            Add Intelligence Source
          </h3>
          <p className="text-[11px] text-navy-400 mt-0.5">
            Select an intake method to feed the AI detection pipeline
          </p>
        </div>

        {/* Tabs Bar */}
        <div className="flex bg-navy-900/60 border-b border-navy-800/40 px-4 py-1.5 gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setSelectedFile(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-electric-500/12 text-electric-300 border border-electric-500/25"
                  : "text-navy-400 hover:text-navy-200 border border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {activeTab === "image" && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "border-electric-500 bg-electric-500/5 shadow-glow-blue"
                    : "border-navy-700/60 bg-navy-800/20 hover:border-navy-600/80 hover:bg-navy-800/30"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400">
                  <Upload size={18} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white">
                    {selectedFile ? selectedFile.name : "Drag & drop plate image here"}
                  </p>
                  <p className="text-[10px] text-navy-400 mt-1">
                    Supports JPEG, JPG, PNG, WEBP (Max 50MB)
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "video" && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "border-electric-500 bg-electric-500/5 shadow-glow-blue"
                    : "border-navy-700/60 bg-navy-800/20 hover:border-navy-600/80 hover:bg-navy-800/30"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm"
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400">
                  <Video size={18} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white">
                    {selectedFile ? selectedFile.name : "Drag & drop vehicle video here"}
                  </p>
                  <p className="text-[10px] text-navy-400 mt-1">
                    Supports MP4, AVI, MOV, MKV, WEBM (Max 500MB)
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "webcam" && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400 mx-auto">
                <Camera size={24} className="animate-pulse" />
              </div>
              <div className="max-w-xs mx-auto">
                <h4 className="text-xs font-semibold text-white">Local Terminal Capture</h4>
                <p className="text-[10px] text-navy-400 mt-1">
                  Access local webcam stream for scanning objects. Browser camera permissions required.
                </p>
              </div>
            </div>
          )}

          {activeTab === "rtsp" && (
            <div className="space-y-3">
              <Input
                label="Camera Identification (e.g. Gate Cam)"
                placeholder="Main Entry Gate 1"
                value={rtspName}
                onChange={(e) => setRtspName(e.target.value)}
              />
              <Input
                label="Location / Junction Description"
                placeholder="Ongole Toll Plaza"
                value={rtspLoc}
                onChange={(e) => setRtspLoc(e.target.value)}
              />
              <Input
                label="RTSP Stream Connection URL"
                placeholder="rtsp://admin:password@192.168.1.100:554/h264"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Error Banner */}
        {submitError && (
          <div className="mx-6 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-400">Processing Failed</p>
              <p className="text-[11px] text-red-300/80 mt-0.5 leading-relaxed">{submitError}</p>
            </div>
            <button 
              onClick={() => setSubmitError(null)}
              className="text-red-400 hover:text-red-300 mt-0.5 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-navy-900/40 border-t border-navy-800/40 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            onClick={handleSubmit}
            disabled={
              loading ||
              ((activeTab === "image" || activeTab === "video") && !selectedFile) ||
              (activeTab === "rtsp" && (!rtspName || !rtspLoc || !rtspUrl))
            }
          >
            {activeTab === "rtsp" ? "Connect Camera" : activeTab === "webcam" ? "Initialize Feed" : "Start Processing"}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
