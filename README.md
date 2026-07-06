# TRINETHRA — AI Vehicle Intelligence Platform

> See. Verify. Track. Protect.

TRINETHRA ("The Third Eye") is a next-generation AI-powered Vehicle Intelligence Platform designed for law enforcement agencies to identify, verify, monitor, investigate, and predict suspicious vehicle activities using existing CCTV infrastructure — without requiring additional hardware.

This repository hosts the Next.js 15 enterprise-grade frontend command center client, fully customized design tokens, and modular mock telemetry layers.

---

## Key Capabilities

1. **Surveillance Command Center**: Real-time CCTV surveillance feeds rendering dynamically updated bounding boxes, camera diagnostics, FPS counts, and confidence scores.
2. **Global Search Directory**: High-performance multi-factor registry lookup matching plate numbers, color profiles, vehicle types, making database exploration easy.
3. **Vehicle Digital Twin**: Advanced entity detail profiles demonstrating Threat Matrix scores, compliance audit reports, and chronological event timelines.
4. **Cloned Plate shield**: Impossible distance check algorithms highlighting visual, model, and accessory differences between primary and suspect vehicles.
5. **AI Investigator Desk**: Multi-panel workspace helping crime intelligence analysts run deep visual fingerprint matrix similarity scores and note logs.
6. **Spatial Density Heatmaps**: GIS map simulator detailing vehicle density, checkpoints, and flagged crime hotspot locations.

---

## Technical Stack Overview

* **Frontend Framework**: Next.js 15 (App Router, Strict TypeScript)
* **Styling & UI Tokens**: Tailwind CSS v3, Radix UI Primitives, customized CSS properties
* **Animation System**: Framer Motion v12
* **Visualization**: Recharts v2
* **State Management**: Zustand v5
* **Target Environment**: Node.js v18+

---

## Project Folder Structure

```
trinethra/
├── app/                          # Next.js App Router Pages
│   ├── (platform)/               # Private routes (Command Center Layout)
│   │   ├── dashboard/            # Dashboard main page
│   │   ├── live/                 # Surveillance Feed Grid
│   │   ├── search/               # Vehicle Registry Lookup
│   │   ├── clone-detection/      # Impossible Coordinates Shield
│   │   └── ...
│   ├── globals.css               # Design System global tokens
│   └── page.tsx                  # Cinematic Home Page
├── components/
│   ├── ui/                       # core UI components (GlassCard, badges)
│   ├── layout/                   # Sidebar, Header, wrappers
│   └── ...
├── lib/
│   ├── mock-data.ts              # Telemetry generators
│   └── utils.ts                  # Core utility functions
├── docs/                         # System architecture documentation
└── package.json                  # Dependencies manifest
```

---

## Getting Started

1. Clone or copy this repository directory.
2. Install dependency assets:
   ```bash
   npm install
   ```
3. Run the development server locally:
   ```bash
   npm run dev
   ```
4. Build the application for production verification:
   ```bash
   npm run build
   ```
