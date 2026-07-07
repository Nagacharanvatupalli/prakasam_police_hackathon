/**
 * alert-api.ts
 * ------------
 * Frontend API client for Stolen and Clone Vehicle Alert Center.
 */

export interface AlertItem {
  id: string;
  alert_type: 'stolen_vehicle' | 'stolen_probable' | 'stolen_review' | 'clone_suspicion' | 'clone_confirmed' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  plate_number: string;
  normalized_plate: string;
  camera_id: string;
  camera_name: string;
  camera_location: string;
  detection_id: string;
  frame_image_path?: string;
  plate_crop_path?: string;
  ocr_confidence: number;
  detection_confidence: number;
  match_confidence: number;
  case_id?: string;
  case_fir_number?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  owner_name?: string;
  tracking_status: 'detected' | 'tracking' | 'police_notified' | 'interception_in_progress' | 'caught' | 'recovered' | 'lost_track';
  acknowledge_status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by?: string;
  acknowledged_at?: string;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

const BASE_URL = "/api/alerts";
const API_KEY = "trinethra-dev-key-change-in-production";

export const alertApi = {
  async getActiveAlerts(page = 1, pageSize = 20, type?: string, severity?: string): Promise<{ alerts: AlertItem[]; total: number }> {
    let url = `${BASE_URL}?page=${page}&page_size=${pageSize}`;
    if (type && type !== "all") url += `&alert_type=${type}`;
    if (severity && severity !== "all") url += `&severity=${severity}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch active alerts list.");
    return response.json();
  },

  async getAlertHistory(
    page = 1,
    pageSize = 20,
    type?: string,
    severity?: string,
    ackStatus?: string,
    trackStatus?: string
  ): Promise<{ alerts: AlertItem[]; total: number }> {
    let url = `${BASE_URL}/history?page=${page}&page_size=${pageSize}`;
    if (type && type !== "all") url += `&alert_type=${type}`;
    if (severity && severity !== "all") url += `&severity=${severity}`;
    if (ackStatus && ackStatus !== "all") url += `&acknowledge_status=${ackStatus}`;
    if (trackStatus && trackStatus !== "all") url += `&tracking_status=${trackStatus}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch historical alerts list.");
    return response.json();
  },

  async acknowledgeAlert(id: string, note?: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/${id}/acknowledge`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
      },
      body: JSON.stringify({ acknowledged_by: "operator", note })
    });
    if (!response.ok) throw new Error("Failed to acknowledge alert.");
  },

  async updateTrackingStatus(id: string, status: string, note?: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/${id}/tracking`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
      },
      body: JSON.stringify({ tracking_status: status, note, updated_by: "operator" })
    });
    if (!response.ok) throw new Error("Failed to update alert tracking status.");
  }
};
