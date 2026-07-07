/**
 * stolen-api.ts
 * -------------
 * Frontend API client for Stolen Vehicle Management module.
 */

import { getMediaUrl } from "./live-api";

export interface StolenVehicleCase {
  id: string;
  vehicle_number: string;
  normalized_plate_number: string;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  owner_name?: string;
  contact_number?: string;
  fir_number?: string;
  police_station?: string;
  reported_date?: string;
  description?: string;
  reference_image?: string;
  status: 'stolen' | 'under_investigation' | 'identified' | 'tracking' | 'caught' | 'recovered' | 'closed';
  status_history: Array<{
    status: string;
    changed_at: string;
    changed_by: string;
    note?: string;
  }>;
  sighting_count: number;
  last_sighted_at?: string;
  last_sighted_camera?: string;
  created_at: string;
  updated_at: string;
}

export interface StolenSighting {
  sighting_id: string;
  plate_number: string;
  camera_id: string;
  camera_name: string;
  camera_location: string;
  detected_at: string;
  ocr_confidence: number;
  detection_confidence: number;
  match_type: 'exact' | 'probable' | 'review';
  match_score: number;
  tracking_status: string;
  plate_crop_path?: string;
  frame_image_path?: string;
  case: {
    case_id: string;
    vehicle_number: string;
    fir_number?: string;
    police_station?: string;
    owner_name?: string;
    contact_number?: string;
    status: string;
  };
}

const BASE_URL = "/api/stolen";
const API_KEY = "trinethra-dev-key-change-in-production";

export const stolenApi = {
  async getCases(page = 1, pageSize = 20, status?: string, search?: string): Promise<{ cases: StolenVehicleCase[]; total: number }> {
    let url = `${BASE_URL}/cases?page=${page}&page_size=${pageSize}`;
    if (status && status !== "all") url += `&status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch stolen vehicle list.");
    return response.json();
  },

  async getCase(id: string): Promise<StolenVehicleCase> {
    const response = await fetch(`${BASE_URL}/cases/${id}`);
    if (!response.ok) throw new Error("Failed to fetch stolen vehicle case details.");
    return response.json();
  },

  async createCase(payload: Omit<StolenVehicleCase, "id" | "normalized_plate_number" | "status_history" | "sighting_count" | "created_at" | "updated_at">): Promise<{ case_id: string }> {
    const response = await fetch(`${BASE_URL}/cases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to register stolen vehicle case.");
    }
    return response.json();
  },

  async updateCase(id: string, payload: Partial<StolenVehicleCase>): Promise<void> {
    const response = await fetch(`${BASE_URL}/cases/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Failed to update case details.");
  },

  async updateStatus(id: string, status: string, note?: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/cases/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
      },
      body: JSON.stringify({ status, note, changed_by: "operator" })
    });
    if (!response.ok) throw new Error("Failed to update case status.");
  },

  async uploadReferenceImage(id: string, file: File): Promise<{ reference_image_url: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE_URL}/cases/${id}/upload-image`, {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY
      },
      body: formData
    });
    if (!response.ok) throw new Error("Failed to upload reference image.");
    return response.json();
  },

  async getCaseSightings(id: string, page = 1, pageSize = 20): Promise<{ sightings: StolenSighting[]; total: number }> {
    const response = await fetch(`${BASE_URL}/cases/${id}/sightings?page=${page}&page_size=${pageSize}`);
    if (!response.ok) throw new Error("Failed to fetch sightings history.");
    return response.json();
  },

  async getIdentifiedVehicles(page = 1, pageSize = 20): Promise<{ identified_vehicles: StolenSighting[]; total: number }> {
    const response = await fetch(`${BASE_URL}/identified?page=${page}&page_size=${pageSize}`);
    if (!response.ok) throw new Error("Failed to fetch identified stolen vehicles.");
    return response.json();
  }
};
