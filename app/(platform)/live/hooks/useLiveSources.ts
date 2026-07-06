import { useState, useCallback } from "react";
import { liveApi, LiveSource, SourceType, SourceStatus } from "@/lib/api/live-api";

export type { LiveSource, SourceType, SourceStatus };

export function useLiveSources() {
  const [sources, setSources] = useState<LiveSource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addImageSource = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      // 1. Instantly add a placeholder source in the grid
      const tempId = `SRC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const newSource: LiveSource = {
        id: tempId,
        type: "image",
        name: file.name,
        status: "connecting",
        location: "Uploaded Image File",
        fps: 0,
        latency: 0
      };
      
      setSources((prev) => [...prev, newSource]);

      // 2. Perform upload and inference api call
      const result = await liveApi.uploadImage(file);
      
      // 3. Update the source with results
      setSources((prev) =>
        prev.map((src) =>
          src.id === tempId
            ? {
                ...src,
                id: result.source_id,
                sessionId: result.session_id,
                status: "completed",
                annotatedImageUrl: result.annotated_image_url,
                originalImageUrl: result.annotated_image_url, // For fallback
                detectionsCount: result.detections.length,
                uniquePlates: new Set(result.detections.map((d) => d.plate_number)).size
              }
            : src
        )
      );
      return { sessionId: result.session_id, sourceId: result.source_id };
    } catch (err: any) {
      console.error("Error adding image source:", err);
      setError(err.message || "Failed to process image.");
      // Remove connecting image on error
      setSources((prev) => prev.filter((s) => s.status !== "connecting" || s.type !== "image"));
      // Re-throw so callers can handle/display the error
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const addVideoSource = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const tempId = `SRC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const newSource: LiveSource = {
        id: tempId,
        type: "video",
        name: file.name,
        status: "connecting",
        location: "Uploaded Video Analysis",
        fps: 0,
        latency: 0,
        progress: 0,
        processedFrames: 0,
        totalFrames: 0,
        detectionsCount: 0,
        uniquePlates: 0
      };
      
      setSources((prev) => [...prev, newSource]);

      const result = await liveApi.uploadVideo(file);

      setSources((prev) =>
        prev.map((src) =>
          src.id === tempId
            ? {
                ...src,
                id: result.source_id,
                sessionId: result.session_id,
                status: "processing"
              }
            : src
        )
      );
      return { sessionId: result.session_id, sourceId: result.source_id };
    } catch (err: any) {
      console.error("Error adding video source:", err);
      setError(err.message || "Failed to upload video.");
      setSources((prev) => prev.filter((s) => s.status !== "connecting" || s.type !== "video"));
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const addWebcamSource = useCallback(async () => {
    setError(null);
    try {
      const result = await liveApi.createWebcamSession();
      const newSource: LiveSource = {
        id: result.source_id,
        sessionId: result.session_id,
        type: "webcam",
        name: "Local Webcam",
        status: "live",
        location: "Operator Terminal",
        fps: 15,
        latency: 0,
        detectionsCount: 0,
        uniquePlates: 0
      };
      
      setSources((prev) => [...prev, newSource]);
      return { sessionId: result.session_id, sourceId: result.source_id };
    } catch (err: any) {
      console.error("Error adding webcam source:", err);
      setError("Failed to create webcam session.");
    }
  }, []);

  const addRTSPSource = useCallback(async (cameraName: string, location: string, rtspUrl: string) => {
    setError(null);
    try {
      const result = await liveApi.connectRTSP(cameraName, location, rtspUrl);
      const newSource: LiveSource = {
        id: result.source_id,
        sessionId: result.session_id,
        type: "rtsp",
        name: cameraName,
        status: "connecting",
        location: location,
        fps: 0,
        latency: 0,
        detectionsCount: 0,
        uniquePlates: 0
      };
      
      setSources((prev) => [...prev, newSource]);
      return { sessionId: result.session_id, sourceId: result.source_id };
    } catch (err: any) {
      console.error("Error adding RTSP source:", err);
      setError(err.message || "Failed to connect RTSP camera.");
    }
  }, []);

  const removeSource = useCallback(async (id: string) => {
    const src = sources.find((s) => s.id === id);
    if (!src) return;

    if (src.sessionId) {
      try {
        await liveApi.stopSession(src.sessionId);
        await liveApi.deleteSession(src.sessionId);
      } catch (err) {
        console.warn(`Failed to cleanly stop session ${src.sessionId}:`, err);
      }
    }

    setSources((prev) => prev.filter((s) => s.id !== id));
  }, [sources]);

  const updateSource = useCallback((id: string, updates: Partial<LiveSource>) => {
    setSources((prev) =>
      prev.map((src) => (src.id === id ? { ...src, ...updates } : src))
    );
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sources,
    isUploading,
    error,
    addImageSource,
    addVideoSource,
    addWebcamSource,
    addRTSPSource,
    removeSource,
    updateSource,
    clearError
  };
}
