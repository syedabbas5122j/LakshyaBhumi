# Citizen App Style Implementation (BhoomiSync Editorial Design)

The **BhoomiSync Citizen App** directly implements the design language, color palette, and layout rhythms defined in [STYLE-OBSERVATIONS.md](file:///d:/sih/sih%202026/bhusha/STYLE-OBSERVATIONS.md) and `CitizenPortal.css`.

---

## 1. Editorial Color Palette

| Token | Hex / Value | Semantic Role in Citizen App |
| :--- | :--- | :--- |
| **Ink** | `#18332D` | Primary brand background, brand mark `B`, dark buttons, headings |
| **Paper** | `#F4F2E9` | Warm cream background across all screens |
| **Card / Subtle** | `rgba(255, 255, 255, 0.22 - 0.38)` | Editorial panel backgrounds with fine 1px borders |
| **Line** | `rgba(24, 51, 45, 0.16)` | Minimal, quiet section dividers and card borders |
| **Land Green** | `#2F7F56` (`rgb(51, 134, 55)`) | Land validation, confidence scores, primary calls to action |
| **Spatial Teal** | `#348C8B` (`rgb(49, 152, 146)`) | Panel labels (`01 / PARCEL SEARCH`), active role highlights |
| **Signal Yellow** | `#EFC84A` (`rgb(248, 186, 0)`) | Call to action arrows (`→`), button highlights, pending status |
| **Terracotta** | `#C85D49` | Survey map pin marker and geographic focus points |

---

## 2. Typography Pairings

- **Geometric Display:** `Space Grotesk` (Google Fonts) for headlines, brand titles, and numerical survey badges (`Survey 241/6`).
- **Editorial Sub-headings & Accents:** `Newsreader / Georgia` serif italics (`verified with confidence.`).
- **Body & Controls:** `DM Sans` (Google Fonts) for attributes, descriptions, buttons, and micro-labels.
- **Eyebrows:** `DM Sans` 8px/9px with `letterSpacing: 1.1` in uppercase (e.g. `PUBLIC LAND WORKSPACE`).

---

## 3. Screen Layouts & Component Design

### 3.1 Login & Welcome Screen
- Brand header with the signature square `B` mark in `#18332D`.
- Eyebrow with spatial teal circular indicator (`CITIZEN SERVICES / ANDHRA PRADESH`).
- Editorial headline with green italic accent.
- Custom vector-drawn cadastral lot illustration with green, yellow, and teal parcels and the terracotta pin.
- Role selector chips with `#348C8B` borders.

### 3.2 Workspace & Search (Home)
- Direct 3-panel editorial grid:
  - `01 / PARCEL SEARCH` with live filtering and official Bhu-Naksha link.
  - `02 / PARCEL INSPECTOR` with Mapped area, Confidence score, and Record History timeline.
  - `03 / CITIZEN ACTIONS` for submitting claims, objections, and survey requests.

### 3.3 Cadastral GIS Map
- High-contrast cadastral polygon overlay with `#2F7F56` and `#348C8B` fills and terracotta survey pins.
- Minimal paper floating controls and bottom inspector card.
