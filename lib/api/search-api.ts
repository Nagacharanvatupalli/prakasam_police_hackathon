/**
 * search-api.ts
 * -------------
 * Frontend API client for Advanced Vehicle Search module.
 */

import { Detection } from "./live-api";

export interface SearchFilters {
  plate_number?: string;
  partial_plate?: boolean;
  vehicle_type?: string;
  vehicle_color?: string;
  camera_id?: string;
  location?: string;
  date_str?: string;
  start_time?: string;
  end_time?: string;
  min_confidence?: number;
  stolen_status?: 'all' | 'stolen' | 'clean';
  clone_status?: 'all' | 'clone' | 'clean';
}

export interface SearchResultItem extends Detection {
  suggestion_reason?: string; // Present only on suggestion suggestions
}

export interface SearchResponse {
  detections: SearchResultItem[];
  related_suggestions: SearchResultItem[];
  total: number;
  page: number;
  page_size: number;
}

const BASE_URL = "/api/search";

export const searchApi = {
  async searchVehicles(filters: SearchFilters, page = 1, pageSize = 20): Promise<SearchResponse> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "" && value !== "all") {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`${BASE_URL}/vehicles?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to execute vehicle search query.");
    return response.json();
  },

  async getLastHourDetections(limit = 50): Promise<{ detections: Detection[]; total: number }> {
    const response = await fetch(`${BASE_URL}/last-hour?limit=${limit}`);
    if (!response.ok) throw new Error("Failed to retrieve last hour detections.");
    return response.json();
  }
};
