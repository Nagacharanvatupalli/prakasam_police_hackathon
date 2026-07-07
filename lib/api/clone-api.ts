/**
 * clone-api.ts
 * ------------
 * Frontend API client for Cloned Vehicle Analysis module.
 */

export interface CloneCase {
  id: string;
  plate_number: string;
  normalized_plate: string;
  status: 'pending' | 'confirmed' | 'false_positive' | 'resolved';
  max_clone_score: number;
  occurrence_count: number;
  patterns_seen: string[];
  first_detected_at: string;
  last_detected_at: string;
  latest_reason: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CloneEvidence {
  id: string;
  case_id: string;
  plate_number: string;
  detection_a_id: string;
  camera_a_id: string;
  camera_a_name: string;
  camera_a_location: string;
  timestamp_a: string;
  frame_image_a?: string;
  plate_crop_a?: string;
  vehicle_class_a?: string;
  vehicle_color_a?: string;
  detection_b_id: string;
  camera_b_id: string;
  camera_b_name: string;
  camera_b_location: string;
  timestamp_b: string;
  frame_image_b?: string;
  plate_crop_b?: string;
  vehicle_class_b?: string;
  vehicle_color_b?: string;
  recorded_at: string;
  score_breakdown: {
    plate_match_score: number;
    appearance_diff_score: number;
    color_diff_score: number;
    vehicle_class_diff_score: number;
    spatial_temporal_score: number;
    ocr_confidence_a: number;
    ocr_confidence_b: number;
    detection_confidence_a: number;
    detection_confidence_b: number;
    final_clone_score: number;
    patterns_triggered: string[];
    reason_text: string;
    travel_time_minutes?: number;
    estimated_distance_km?: number;
  };
}

export interface CloneScoreConfig {
  weight_plate_match: number;
  weight_appearance_diff: number;
  weight_color_diff: number;
  weight_class_diff: number;
  weight_spatial_temporal: number;
  suspicion_threshold: number;
  impossible_travel_speed_kmh: number;
  analysis_window_seconds: number;
}

const BASE_URL = "/api/clone";
const API_KEY = "trinethra-dev-key-change-in-production";

export const cloneApi = {
  async getCases(page = 1, pageSize = 20, status?: string): Promise<{ cases: CloneCase[]; total: number }> {
    let url = `${BASE_URL}/cases?page=${page}&page_size=${pageSize}`;
    if (status && status !== "all") url += `&status=${status}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch clone analysis cases.");
    return response.json();
  },

  async getCase(id: string): Promise<CloneCase> {
    const response = await fetch(`${BASE_URL}/cases/${id}`);
    if (!response.ok) throw new Error("Failed to fetch clone case details.");
    return response.json();
  },

  async updateStatus(id: string, status: string, note?: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/cases/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
      },
      body: JSON.stringify({ status, note, updated_by: "operator" })
    });
    if (!response.ok) throw new Error("Failed to update investigative status of clone case.");
  },

  async getCaseEvidence(id: string, page = 1, pageSize = 20): Promise<{ evidence: CloneEvidence[]; total: number }> {
    const response = await fetch(`${BASE_URL}/cases/${id}/evidence?page=${page}&page_size=${pageSize}`);
    if (!response.ok) throw new Error("Failed to fetch clone case evidence list.");
    return response.json();
  },

  async getScoreConfig(): Promise<CloneScoreConfig> {
    const response = await fetch(`${BASE_URL}/score-config`);
    if (!response.ok) throw new Error("Failed to retrieve clone scoring configuration.");
    return response.json();
  }
};
