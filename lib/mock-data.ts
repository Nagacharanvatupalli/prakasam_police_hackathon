// ============================================================
// TRINETHRA — Mock Data Engine
// Realistic Indian police/vehicle context mock data
// ============================================================

export const AP_DISTRICTS = [
  "Ongole", "Nellore", "Kurnool", "Kadapa", "Anantapur",
  "Tirupati", "Guntur", "Vijayawada", "Vizag", "Kakinada",
  "Rajahmundry", "Eluru", "Machilipatnam", "Chirala", "Markapur"
];

export const AP_POLICE_STATIONS = [
  "Ongole I Town", "Ongole II Town", "Kandukur", "Chirala Urban",
  "Markapur", "Addanki", "Giddalur", "Darsi", "Chimakurthi",
  "Santhamagaluru", "Inkollu", "Parchur", "Vetapalem", "Singarayakonda"
];

export const VEHICLE_BRANDS = ["Maruti", "Hyundai", "Toyota", "Honda", "Tata", "Mahindra", "Ford", "Kia", "Renault", "Bajaj", "Hero", "TVS"];
export const VEHICLE_MODELS: Record<string, string[]> = {
  Maruti: ["Swift", "Dzire", "Alto", "Baleno", "Brezza", "Ertiga"],
  Hyundai: ["i20", "Creta", "Venue", "Verna", "Aura", "Tucson"],
  Toyota: ["Innova", "Fortuner", "Glanza", "Urban Cruiser", "Camry"],
  Honda: ["City", "Amaze", "WR-V", "Jazz", "CR-V"],
  Tata: ["Nexon", "Altroz", "Harrier", "Safari", "Tiago", "Punch"],
  Mahindra: ["Scorpio", "XUV700", "Thar", "Bolero", "XUV300"],
  Kia: ["Seltos", "Sonet", "Carens", "EV6"],
  Bajaj: ["Pulsar 150", "Pulsar 220", "Avenger", "Dominar"],
  Hero: ["Splendor", "HF Deluxe", "Passion", "Glamour", "Xtreme"],
  TVS: ["Apache", "Jupiter", "Ntorq", "Star City"],
};

export const VEHICLE_COLORS = ["White", "Silver", "Black", "Grey", "Red", "Blue", "Brown", "Pearl White", "Maroon", "Golden"];
export const VEHICLE_TYPES = ["Sedan", "SUV", "Hatchback", "Motorcycle", "Auto Rickshaw", "Truck", "Van", "Pickup"];

export const CAMERA_LOCATIONS = [
  { id: "CAM-001", name: "NH-16 Ongole Bypass", lat: 15.5057, lng: 80.0499, district: "Ongole" },
  { id: "CAM-002", name: "Old Bus Stand Junction", lat: 15.5080, lng: 80.0450, district: "Ongole" },
  { id: "CAM-003", name: "Santhi Nagar Circle", lat: 15.5102, lng: 80.0512, district: "Ongole" },
  { id: "CAM-004", name: "Kurnool Road Toll", lat: 15.4990, lng: 80.0380, district: "Ongole" },
  { id: "CAM-005", name: "Chirala NH Checkpoint", lat: 15.8167, lng: 80.3500, district: "Chirala" },
  { id: "CAM-006", name: "Kandukur Junction", lat: 15.2100, lng: 79.9020, district: "Kandukur" },
  { id: "CAM-007", name: "Markapur Main Road", lat: 15.7370, lng: 79.2717, district: "Markapur" },
  { id: "CAM-008", name: "Addanki Cross Roads", lat: 15.8150, lng: 80.0220, district: "Addanki" },
  { id: "CAM-009", name: "Nellore NH Entry", lat: 14.4426, lng: 79.9865, district: "Nellore" },
  { id: "CAM-010", name: "Guntur Station Road", lat: 16.3067, lng: 80.4365, district: "Guntur" },
  { id: "CAM-011", name: "Vijayawada Ring Road", lat: 16.5062, lng: 80.6480, district: "Vijayawada" },
  { id: "CAM-012", name: "Darsi Bypass", lat: 15.7640, lng: 79.6830, district: "Darsi" },
];

export function generatePlateNumber(): string {
  const districts = ["AP39", "AP37", "AP38", "AP16", "AP15", "AP03", "AP04"];
  const d = districts[Math.floor(Math.random() * districts.length)];
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const letter2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${d}${letter}${letter2}${num}`;
}

export function generateOwnerName(): string {
  const firstNames = ["Ravi", "Kumar", "Suresh", "Ramesh", "Venkat", "Srinivas", "Prasad", "Naidu", "Reddy", "Rao",
    "Lakshmi", "Padma", "Sunita", "Anitha", "Kavitha", "Sridevi", "Rajani", "Usha", "Divya", "Priya"];
  const lastNames = ["Naidu", "Reddy", "Rao", "Sharma", "Chowdary", "Goud", "Babu", "Raju", "Varma", "Krishna"];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

export type RiskLevel = "verified" | "safe" | "suspicious" | "high_risk" | "critical";

export interface MockVehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  color: string;
  type: string;
  owner: string;
  district: string;
  policeStation: string;
  registrationStatus: "valid" | "expired" | "suspended" | "unregistered";
  insuranceStatus: "valid" | "expired" | "none";
  fitnessStatus: "valid" | "expired" | "none";
  riskLevel: RiskLevel;
  intelligenceScore: number;
  cloneFlag: boolean;
  stolenFlag: boolean;
  lastSeen: Date;
  lastCamera: string;
  detectionCount: number;
  alertCount: number;
  investigationCount: number;
  ocr: string;
  ocrConfidence: number;
  fingerprintScore: number;
}

export function generateVehicle(overrides: Partial<MockVehicle> = {}): MockVehicle {
  const brand = VEHICLE_BRANDS[Math.floor(Math.random() * VEHICLE_BRANDS.length)];
  const models = VEHICLE_MODELS[brand] ?? ["Unknown"];
  const risk = (['verified', 'safe', 'suspicious', 'high_risk', 'critical'] as RiskLevel[])[Math.floor(Math.random() * 5)];
  const scoreMap: Record<RiskLevel, [number, number]> = {
    verified: [85, 100], safe: [65, 84], suspicious: [40, 64], high_risk: [20, 39], critical: [0, 19]
  };
  const [lo, hi] = scoreMap[risk];
  const plate = generatePlateNumber();

  return {
    id: `VEH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    plateNumber: plate,
    brand,
    model: models[Math.floor(Math.random() * models.length)],
    color: VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)],
    type: VEHICLE_TYPES[Math.floor(Math.random() * 3)],
    owner: generateOwnerName(),
    district: AP_DISTRICTS[Math.floor(Math.random() * AP_DISTRICTS.length)],
    policeStation: AP_POLICE_STATIONS[Math.floor(Math.random() * AP_POLICE_STATIONS.length)],
    registrationStatus: Math.random() > 0.15 ? "valid" : Math.random() > 0.5 ? "expired" : "suspended",
    insuranceStatus: Math.random() > 0.2 ? "valid" : "expired",
    fitnessStatus: Math.random() > 0.25 ? "valid" : "expired",
    riskLevel: risk,
    intelligenceScore: Math.floor(lo + Math.random() * (hi - lo)),
    cloneFlag: Math.random() < 0.08,
    stolenFlag: Math.random() < 0.05,
    lastSeen: new Date(Date.now() - Math.random() * 3600000),
    lastCamera: CAMERA_LOCATIONS[Math.floor(Math.random() * CAMERA_LOCATIONS.length)].name,
    detectionCount: Math.floor(1 + Math.random() * 200),
    alertCount: Math.floor(Math.random() * 10),
    investigationCount: Math.floor(Math.random() * 5),
    ocr: plate,
    ocrConfidence: Math.floor(85 + Math.random() * 15),
    fingerprintScore: Math.floor(70 + Math.random() * 30),
    ...overrides,
  };
}

export const MOCK_VEHICLES: MockVehicle[] = Array.from({ length: 50 }, () => generateVehicle());

// Seed some specific vehicles for demo
MOCK_VEHICLES[0] = generateVehicle({ riskLevel: "critical", cloneFlag: true, plateNumber: "AP39AB1234", intelligenceScore: 12, stolenFlag: true });
MOCK_VEHICLES[1] = generateVehicle({ riskLevel: "high_risk", plateNumber: "AP16CD5678", intelligenceScore: 28, alertCount: 8 });
MOCK_VEHICLES[2] = generateVehicle({ riskLevel: "suspicious", plateNumber: "AP37EF9012", intelligenceScore: 52, cloneFlag: true });

export interface MockAlert {
  id: string;
  vehiclePlate: string;
  type: string;
  priority: "critical" | "high" | "medium" | "low";
  confidence: number;
  location: string;
  camera: string;
  timestamp: Date;
  status: "active" | "acknowledged" | "resolved";
  officer?: string;
  reason: string;
  recommendation: string;
}

const ALERT_TYPES = [
  { type: "Clone Detection", priority: "critical" as const, reason: "Duplicate plate detected at impossible distance/time" },
  { type: "Stolen Vehicle", priority: "critical" as const, reason: "Matches national stolen vehicle database" },
  { type: "Blacklisted Vehicle", priority: "high" as const, reason: "Vehicle flagged in crime intelligence database" },
  { type: "Expired Registration", priority: "medium" as const, reason: "Vehicle registration expired over 60 days" },
  { type: "No Insurance", priority: "medium" as const, reason: "No valid insurance record found" },
  { type: "Suspicious Route", priority: "high" as const, reason: "Unusual travel pattern detected near sensitive area" },
  { type: "OCR Mismatch", priority: "high" as const, reason: "Plate characters inconsistent with vehicle fingerprint" },
  { type: "Low Confidence OCR", priority: "low" as const, reason: "OCR confidence below acceptable threshold" },
];

export const MOCK_ALERTS: MockAlert[] = Array.from({ length: 24 }, (_, i) => {
  const alertType = ALERT_TYPES[i % ALERT_TYPES.length];
  const cam = CAMERA_LOCATIONS[Math.floor(Math.random() * CAMERA_LOCATIONS.length)];
  return {
    id: `ALT-${(10000 + i).toString()}`,
    vehiclePlate: generatePlateNumber(),
    type: alertType.type,
    priority: alertType.priority,
    confidence: Math.floor(72 + Math.random() * 28),
    location: cam.district,
    camera: cam.name,
    timestamp: new Date(Date.now() - Math.random() * 86400000),
    status: (["active", "acknowledged", "resolved"] as const)[Math.floor(Math.random() * 3)],
    officer: Math.random() > 0.4 ? generateOwnerName() : undefined,
    reason: alertType.reason,
    recommendation: `Intercept vehicle at next checkpoint and verify documents. Report to ${AP_POLICE_STATIONS[Math.floor(Math.random() * AP_POLICE_STATIONS.length)]}.`,
  };
});

export interface DashboardStats {
  vehiclesDetectedToday: number;
  activeAlerts: number;
  highRiskVehicles: number;
  cloneDetections: number;
  ocrAccuracy: number;
  systemUptime: number;
  activeInvestigations: number;
  evidenceItems: number;
  camerasOnline: number;
  officersOnline: number;
  detectionRate: number;
  todayInvestigations: number;
}

export const DASHBOARD_STATS: DashboardStats = {
  vehiclesDetectedToday: 3847,
  activeAlerts: 24,
  highRiskVehicles: 7,
  cloneDetections: 3,
  ocrAccuracy: 99.2,
  systemUptime: 99.97,
  activeInvestigations: 12,
  evidenceItems: 1284,
  camerasOnline: 10,
  officersOnline: 34,
  detectionRate: 847,
  todayInvestigations: 5,
};

export const DETECTION_CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, "0")}:00`,
  detections: Math.floor(50 + Math.random() * 300 + (i >= 7 && i <= 9 ? 200 : 0) + (i >= 17 && i <= 19 ? 180 : 0)),
  alerts: Math.floor(Math.random() * 8),
  clones: Math.floor(Math.random() * 2),
}));

export const WEEKLY_DATA = [
  { day: "Mon", detections: 3210, alerts: 18, investigations: 4 },
  { day: "Tue", detections: 2980, alerts: 22, investigations: 6 },
  { day: "Wed", detections: 3450, alerts: 15, investigations: 3 },
  { day: "Thu", detections: 3120, alerts: 28, investigations: 8 },
  { day: "Fri", detections: 3890, alerts: 31, investigations: 9 },
  { day: "Sat", detections: 4210, alerts: 24, investigations: 5 },
  { day: "Sun", detections: 3847, alerts: 24, investigations: 5 },
];

export const OCR_ACCURACY_DATA = [
  { month: "Jan", accuracy: 97.2, processed: 89420 },
  { month: "Feb", accuracy: 97.8, processed: 94100 },
  { month: "Mar", accuracy: 98.4, processed: 102300 },
  { month: "Apr", accuracy: 98.9, processed: 98700 },
  { month: "May", accuracy: 99.1, processed: 115200 },
  { month: "Jun", accuracy: 99.2, processed: 121400 },
];

export const HEATMAP_POINTS = [
  { lat: 15.5057, lng: 80.0499, intensity: 0.9, label: "Ongole NH-16" },
  { lat: 15.5080, lng: 80.0450, intensity: 0.7, label: "Ongole Bus Stand" },
  { lat: 15.8167, lng: 80.3500, intensity: 0.6, label: "Chirala Junction" },
  { lat: 15.2100, lng: 79.9020, intensity: 0.8, label: "Kandukur Cross" },
  { lat: 15.7370, lng: 79.2717, intensity: 0.5, label: "Markapur Center" },
  { lat: 15.8150, lng: 80.0220, intensity: 0.4, label: "Addanki NH" },
  { lat: 14.4426, lng: 79.9865, intensity: 0.7, label: "Nellore Entry" },
  { lat: 16.3067, lng: 80.4365, intensity: 0.6, label: "Guntur Station" },
];
