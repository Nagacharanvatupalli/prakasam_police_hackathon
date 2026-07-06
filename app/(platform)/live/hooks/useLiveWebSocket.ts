"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Detection } from "@/lib/api/live-api";

export interface WSMessage {
  type:
    | "detection_created"
    | "detection_updated"
    | "frame_processed"
    | "processing_progress"
    | "session_started"
    | "session_completed"
    | "session_error"
    | "source_status";
  data: any;
  timestamp: string;
}

export type WSStatus = "idle" | "connecting" | "connected" | "disconnected" | "offline";

export function useLiveWebSocket(sessionId?: string | "all") {
  const [isConnected, setIsConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState<WSStatus>("idle");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [streamStats, setStreamStats] = useState<{ fps: number; latency: number }>({ fps: 0, latency: 0 });
  const [sourceStatus, setSourceStatus] = useState<string>("idle");

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false);

  // Exponential backoff caps at 30 seconds between retries.
  // Max 5 retries, then give up silently.
  const MAX_RETRIES = 5;

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      // Prevent onclose from triggering reconnect loop
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      if (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      ) {
        socketRef.current.close(1000, "Component cleanup");
      }
      socketRef.current = null;
    }
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (!sessionId) return;
    if (!isMountedRef.current) return;
    if (isConnectingRef.current) return;

    // Don't attempt if we've exceeded retries
    if (retryCountRef.current >= MAX_RETRIES) {
      setWsStatus("offline");
      return;
    }

    cleanup();
    isConnectingRef.current = true;
    setWsStatus("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const url = `${protocol}//${host}:8000/ws/live/${sessionId}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      // URL parse error — don't retry
      isConnectingRef.current = false;
      setWsStatus("offline");
      return;
    }
    socketRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) { ws.close(); return; }
      setIsConnected(true);
      setWsStatus("connected");
      retryCountRef.current = 0;
      isConnectingRef.current = false;
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const msg: WSMessage = jsonParse(event.data);
        if (!msg) return;

        switch (msg.type) {
          case "detection_created": {
            const newDet: Detection = msg.data;
            setDetections((prev) => {
              const filtered = prev.filter((d) => d.id !== newDet.id);
              return [newDet, ...filtered].slice(0, 50);
            });
            break;
          }
          case "detection_updated": {
            const updatedDet: Detection = msg.data;
            setDetections((prev) =>
              prev.map((d) => (d.id === updatedDet.id ? updatedDet : d))
            );
            break;
          }
          case "processing_progress":
            setProgress(msg.data);
            break;

          case "frame_processed":
            setStreamStats({
              fps: msg.data.fps || 0,
              latency: msg.data.latency || 0,
            });
            break;

          case "source_status":
            setSourceStatus(msg.data.status);
            break;

          case "session_started":
            setSourceStatus("processing");
            setProgress({
              progress: 0,
              processed_frames: 0,
              total_frames: msg.data.total_frames || 0,
              detections_count: 0,
              unique_plates: 0,
              fps: msg.data.fps || 10,
              inference_latency: 0,
            });
            break;

          case "session_completed":
            setSourceStatus("completed");
            setProgress((prev: any) => (prev ? { ...prev, progress: 100 } : null));
            break;

          case "session_error":
            setSourceStatus("error");
            break;

          default:
            break;
        }
      } catch {
        // Swallow parse errors silently
      }
    };

    ws.onerror = () => {
      // Browser fires this when connection is refused / backend offline.
      // We just let onclose handle the retry — no log spam needed.
      isConnectingRef.current = false;
    };

    ws.onclose = (event) => {
      if (!isMountedRef.current) return;
      isConnectingRef.current = false;
      setIsConnected(false);

      // Code 1000 = normal intentional close — do not retry
      if (event.code === 1000) {
        setWsStatus("disconnected");
        return;
      }

      if (retryCountRef.current < MAX_RETRIES) {
        // Exponential backoff: 2s, 4s, 8s, 16s, 30s (capped)
        const delay = Math.min(Math.pow(2, retryCountRef.current + 1) * 1000, 30_000);
        setWsStatus("disconnected");
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          retryCountRef.current += 1;
          connect();
        }, delay);
      } else {
        // Silently stop — backend simply isn't running
        setWsStatus("offline");
      }
    };
  }, [sessionId, cleanup]);

  useEffect(() => {
    isMountedRef.current = true;
    retryCountRef.current = 0;
    // Small initial delay so the page renders before the connection attempt
    const initTimeout = setTimeout(() => connect(), 800);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimeout);
      cleanup();
    };
  }, [connect, cleanup]);

  const sendMessage = useCallback((msgType: string, msgData: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: msgType, data: msgData }));
      return true;
    }
    return false;
  }, []);

  const resetDetections = useCallback(() => {
    setDetections([]);
  }, []);

  return {
    isConnected,
    wsStatus,
    detections,
    progress,
    streamStats,
    sourceStatus,
    sendMessage,
    resetDetections,
  };
}

// Safe JSON parser — returns null on failure
function jsonParse(str: string): WSMessage | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
