// ============================================================
// TRINETHRA — Live API client
// REST endpoints connection to Python FastAPI backend
// ============================================================

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SourceInfo {
  type: string; // image, video, webcam, rtsp
  source_id: string;
  name: string;
}

export interface MediaInfo {
  frame_path?: string;
  plate_crop_path?: string;
}

export interface Detection {
  id: string;
  plate_number: string;
  raw_ocr_text: string;
  detection_confidence: number;
  ocr_confidence: number;
  track_id?: number;
  source: SourceInfo;
  bounding_box: BoundingBox;
  media?: MediaInfo;
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
  status: 'verified' | 'safe' | 'suspicious' | 'high_risk' | 'critical' | 'low_confidence';
  created_at: string;
}

export interface Session {
  id: string;
  source_type: string;
  source_name: string;
  source_config?: Record<string, any>;
  status: 'created' | 'processing' | 'paused' | 'completed' | 'error' | 'stopped' | 'live' | 'connecting' | 'reconnecting';
  total_frames?: number;
  processed_frames: number;
  detections_count: number;
  unique_plates: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ImageProcessResult {
  detections: Detection[];
  annotated_image_url: string;
  session_id: string;
  source_id: string;
}

export interface VideoUploadResult {
  session_id: string;
  source_id: string;
  message: string;
}

const BASE_URL = "/api/live";

export const liveApi = {
  async uploadImage(file: File): Promise<ImageProcessResult> {
    const formData = new FormData();
    formData.append("file", file);

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/image`, {
        method: "POST",
        body: formData,
      });
    } catch (networkError: any) {
      // Network-level failure: backend is unreachable
      throw new Error(
        `Backend server is unreachable. Make sure the Python backend is running on port 8000. (${networkError.message || "Network error"})`
      );
    }

    if (!response.ok) {
      let detail = "";
      try {
        const err = await response.json();
        detail = err.detail || "";
      } catch {
        // Response wasn't JSON
      }
      if (response.status === 400) {
        throw new Error(detail || "Invalid image file. Please upload a JPG, PNG, or WEBP image.");
      } else if (response.status === 500) {
        throw new Error(detail || "Server error while processing image. Check backend logs for details.");
      } else {
        throw new Error(detail || `Image processing failed (HTTP ${response.status}).`);
      }
    }

    return response.json();
  },

  async uploadVideo(file: File): Promise<VideoUploadResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE_URL}/video`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to upload video.");
    }

    return response.json();
  },

  async createWebcamSession(): Promise<{ session_id: string; source_id: string }> {
    const response = await fetch(`${BASE_URL}/webcam/session`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to initialize webcam session.");
    }

    return response.json();
  },

  async connectRTSP(cameraName: string, location: string, rtspUrl: string): Promise<{ session_id: string; source_id: string }> {
    const formData = new FormData();
    formData.append("camera_name", cameraName);
    formData.append("location", location);
    formData.append("rtsp_url", rtspUrl);

    const response = await fetch(`${BASE_URL}/rtsp`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to connect RTSP stream.");
    }

    return response.json();
  },

  async stopSession(sessionId: string): Promise<{ status: string }> {
    const response = await fetch(`${BASE_URL}/stop/${sessionId}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to stop processing session.");
    }

    return response.json();
  },

  async getSessions(): Promise<Session[]> {
    const response = await fetch(`${BASE_URL}/sessions`);
    if (!response.ok) {
      throw new Error("Failed to fetch sessions list.");
    }
    return response.json();
  },

  async getDetections(page = 1, pageSize = 20, sourceId?: string): Promise<{ detections: Detection[]; total: number }> {
    let url = `${BASE_URL}/detections?page=${page}&page_size=${pageSize}`;
    if (sourceId) {
      url += `&source_id=${sourceId}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch detections history.");
    }
    return response.json();
  },

  async getDetection(id: string): Promise<Detection> {
    const response = await fetch(`${BASE_URL}/detections/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch detection details.");
    }
    return response.json();
  },

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/session/${sessionId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete session.");
    }
  }
};

export function getMediaUrl(path?: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path;
}

export type SourceType = "image" | "video" | "webcam" | "rtsp";
export type SourceStatus = 'created' | 'processing' | 'paused' | 'completed' | 'error' | 'stopped' | 'live' | 'connecting' | 'reconnecting';

export interface LiveSource {
  id: string;
  sessionId?: string;
  type: SourceType;
  name: string;
  status: SourceStatus;
  location: string;
  fps?: number;
  latency?: number;
  progress?: number;
  processedFrames?: number;
  totalFrames?: number;
  detectionsCount?: number;
  uniquePlates?: number;
  annotatedImageUrl?: string;
  originalImageUrl?: string;
}
