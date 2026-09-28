# LakshyaBhumi Citizen Mobile App (Flutter)

A cross-platform Flutter application for citizens, land owners, legal advisors, buyers, and developers to access AI-harmonized cadastral records, inspect parcel boundaries, and file grievances/claims under the NAKSHA Geospatial Land Governance Programme.

---

## Features

1. **Role-Based Citizen Onboarding & OTP Auth:**
   - 5 Citizen Profiles: *Land Owner, Property Buyer/Seller, Property Lawyer, Bank / Mortgage Officer, Real Estate Developer*.
   - Secure Mobile OTP login flow connected to `/api/v1/auth/citizen/otp/request` and `/verify`.
   - One-click Demo Login for instant offline/standalone demonstrations.

2. **Interactive Cadastral GIS Map:**
   - Interactive GIS map powered by `flutter_map` and OpenStreetMap tile servers.
   - Real-time Cadastral parcel polygons color-coded by AI Conflation Confidence (>95% emerald green, <95% amber).
   - Tap-to-select parcels with instant coordinate and survey number pin overlays.
   - Zoom controls and one-touch re-centering.

3. **In-Depth Parcel Inspector:**
   - Detailed breakdown of Survey numbers, Mandals, Villages, and Districts.
   - Mapped area in Acres and Square Meters.
   - Pattadar / Owner name and linked Record of Rights (RoR) / Khata ID.
   - AI Harmonization flags (e.g., *Drone Survey 5cm GSD Verified, CORS DGPS Snapped, Topology Corrected*).
   - Complete historical audit trail and survey timeline.

4. **Citizen Grievance & Claims Filing:**
   - Submit **Claims**, **Objections**, or **Re-Survey Requests**.
   - Attachment support for title deeds, pattadar passbooks, and field photos.
   - Unique generated Tracking IDs (e.g., `AP-REQ-2026-XXXX`).
   - Official tracking timeline routed to the Mandal Revenue Officer (MRO).

5. **Interoperability & External Portals:**
   - Integrated quick access to **Bhu-Naksha (AP)**, **Meebhoomi (1-B & Adangal)**, and **CCLA Andhra Pradesh**.

---

## Directory Structure

```
citizen_app/
├── lib/
│   ├── main.dart                          # App Entrypoint & Provider Setup
│   ├── theme/
│   │   └── app_theme.dart                 # Dark theme, typography & palettes
│   ├── models/
│   │   └── citizen_model.dart             # Parcel, Request & Role models
│   ├── services/
│   │   └── citizen_api_service.dart       # HTTP API Client & Mock fallback
│   ├── providers/
│   │   └── citizen_provider.dart          # State management (Search, Auth, Requests)
│   └── screens/
│       ├── login_screen.dart              # Citizen OTP & Role Selection
│       ├── main_navigation_screen.dart    # Bottom Navigation container
│       ├── home_screen.dart               # Dashboard, Search & Action Shortcuts
│       ├── map_screen.dart                # GIS Map & Cadastral Overlay
│       ├── parcel_detail_screen.dart      # Deep Parcel Inspector & Timeline
│       ├── request_submission_screen.dart # Claim/Objection Submission form
│       ├── requests_list_screen.dart      # Grievance Tracking list & status
│       └── profile_screen.dart            # Citizen Profile & Connected Portals
├── pubspec.yaml
└── test/
    └── widget_test.dart
```

---

## How to Run

### 1. Prerequisites
- Flutter SDK (3.44+ installed)
- Android Studio / VS Code / Chrome for Web debugging

### 2. Run on Chrome (Web)
```bash
cd citizen_app
flutter run -d chrome
```

### 3. Run on Android Device / Emulator
```bash
cd citizen_app
flutter run
```

### 4. Run on Windows Desktop
```bash
cd citizen_app
flutter run -d windows
```
