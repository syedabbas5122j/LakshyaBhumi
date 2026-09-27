# Role-Specific Entry Points and Features

## Purpose

A different entry point means a role-appropriate workspace after sign-in, not merely a different login button. Each workspace should open on the queue, map, records, or reports relevant to that user's job and show only the actions permitted by their role and jurisdiction.

This is a proposed role-to-feature mapping based on the AI Geospatial Integration Platform proposal. The proposal defines platform modules and workflows, but does not prescribe permissions for every job title below. Department administrators must approve the final permission matrix before production use.

## Entry-Point Overview

| Level | Entry point | Initial workspace |
| --- | --- | --- |
| 1 | Field operations | Assigned survey tasks, offline map, GPS capture, evidence upload and sync state |
| 2 | Village / ward records | Local parcel search, source records, complaints and survey status |
| 3 | Mandal / taluka review | Escalated conflicts, ground-truth review, assignments and mandal rollups |
| 4 | District administration | District map, survey progress, quality/conflict reports and escalations |
| 5 | Urban local body | Municipal layers, urban property records, building/road context and ward rollups |
| 6 | State administration | State aggregation, cross-district performance, source health and audit reports |
| 7 | Citizen and stakeholder services | Searchable parcel information, legal/status context and permitted reports or requests |
| 8 | Technical operations | Ingestion queues, user/access administration, service health and support tools |

## Role-Specific Workspaces

### Level 1: Field Workers

- **Village Surveyor:** Opens assigned ground-truth tasks; navigates to parcels; records GPS tracks, corner points and boundary measurements; captures geotagged photos; saves offline and syncs evidence.
- **Ground Truth Surveyor:** Opens a confidence-prioritized task queue with due dates; records discrepancy type, owner information, photos, GPS observations and voice notes; submits evidence for review and rework.
- **Drone Pilot:** Opens assigned survey areas and upload jobs; submits orthomosaic, DSM/DTM and related survey packages using resumable upload; sees CRS, extent, format validation and processing status.
- **GCP Marker:** Opens control-point tasks; captures GCP coordinates and GNSS observations; sees accuracy class, coordinate reference and georeferencing/RMSE validation before submission.
- **Field Data Collector:** Uses guided mobile forms, parcel/QR lookup, owner and discrepancy fields, geotagged photos and voice notes; works offline and tracks pending sync.

### Level 2: Village / Ward

- **Village Revenue Officer (VRO):** Opens village parcel and revenue-record review; cross-links survey/khata identifiers with cadastral parcels; sees Pahani/RoR data, ownership conflicts and legal-status flags; forwards unresolved cases.
- **Ward Secretary:** Opens ward-level parcel lookup, citizen complaint intake and survey status; checks the relevant municipal context and tracks notices or requests assigned to the ward.
- **Patwari / Lekhpal:** Opens revenue-to-cadastral matching and boundary comparison; reviews survey-number/khata links, attribute mismatches and supporting field evidence; prepares corrections for authorized review.
- **Village Administrative Officer:** Opens village rollups for parcel coverage, field-task progress and unresolved issues; identifies missing records and routes complaints or survey requests to the appropriate reviewer.

### Level 3: Mandal / Taluka

- **Mandal Revenue Officer (MRO):** Opens the mandal conflict queue and village rollups; assigns or escalates boundary, ownership and jurisdictional conflicts; tracks review due dates and resolution audit history.
- **Tahsildar:** Opens revenue/cadastral arbitration cases; compares source lineage, legal metadata and field evidence; records an approve, reject or rework decision with rationale where authorized.
- **Survey Inspector:** Opens submitted field evidence for quality review; checks photos, GPS accuracy and parcel comparison; returns incomplete work for rework or forwards validated submissions.
- **Mandal Surveyor:** Opens mandal-assigned field tasks and map context; records GPS tracks, corner points, measurements and evidence; works offline and monitors synchronization.

### Level 4: District

- **District Collector / District Magistrate:** Opens district survey-progress, unresolved-conflict and SLA summaries; reviews escalations and district reports; sees district-to-mandal rollups and audit history.
- **District Survey Officer:** Opens district data-quality and integration queues; compares versions, confidence, positional uncertainty and lineage; prioritizes low-confidence datasets and high-risk conflicts.
- **City Surveyor:** Opens urban parcel inspection with cadastral boundaries, municipal layers and imagery; records survey evidence and compares parcel geometry or area across versions.
- **District Land Records Officer:** Opens district cadastral/revenue catalog and version history; reviews survey-number links, legal metadata, source lineage and QA status before authorized cadastral integration.

### Level 5: Urban Local Body

- **Municipal Commissioner:** Opens municipality/ward rollups for urban property records, survey coverage, unresolved cases and service progress; reviews administrative reports and escalations.
- **Chief Town Planner:** Opens land-use, zoning, building-footprint and road-network context; compares municipal layers against cadastral parcels and runs permitted custom-area/planning reports.
- **GIS Manager (Municipality):** Opens municipal data catalog and ingestion queue; registers roads, utilities, zones and other GIS packages; checks CRS/schema validation, conflation quality, versions and sync status.
- **Property Tax Officer:** Opens parcel/property search and urban property-card summaries; checks mapped building footprint, parcel area and permitted municipal attributes; raises a correction request rather than changing authoritative cadastral geometry.

### Level 6: State

- **Commissioner of Land Administration:** Opens state-wide cadastral and revenue integration summaries; reviews district trends, escalated legal conflicts, survey progress and audit reports.
- **Director of Survey & Land Records:** Opens state survey-campaign, dataset-version and quality dashboards; monitors district completion, CRS/accuracy standards and correction history.
- **State GIS Coordinator:** Opens cross-department data catalog, API/synchronization health and integration status; monitors source freshness, data exchange and district coverage.
- **Chief Cartographer:** Opens state map composition and cartographic QA; compares administrative, cadastral, municipal and imagery layers; reviews source priority, alignment and map exports.

### Level 7: Citizens and Stakeholders

- **Land Owner:** Opens parcel search and parcel inspector; views permitted ownership/area, map, version and ground-truth history; reports an issue or requests verification and tracks notifications.
- **Property Buyer / Seller:** Opens a read-only parcel verification view; checks boundaries, area, confidence, positional uncertainty and legal-status indicators; creates a permitted report or share link.
- **Property Lawyer:** Opens read-only dispute and evidence context; reviews legal status, source lineage, version changes and audit-relevant documents; exports or shares permitted case material.
- **Bank / Mortgage Officer:** Opens a read-only verification summary limited to authorized data; checks parcel identity, boundary, ownership/legal-status indicators and data confidence; exports an auditable report.
- **Real Estate Developer:** Opens permitted area search and aggregate map layers; compares parcels with municipal zoning, roads, utilities and building footprints; uses approved exports and, in a later phase, suitability analysis.

### Level 8: Technical and Support

- **System Administrator:** Opens system health, user and role management, configuration, API/storage usage, audit logs and backup/restore controls; administrative actions are separately audited.
- **Data Entry Operator:** Opens upload and registration queues; enters dataset metadata, corrects validation issues and applies approved mapping templates; cannot approve legal decisions or override source authority.
- **IT Support Staff:** Opens service health, upload/sync diagnostics and access troubleshooting; receives the minimum data needed to resolve technical incidents.
- **Help Desk Operator:** Opens user-reported access and data issues, complaint status and escalation routing; sees case status without unrestricted parcel-owner or legal-record access.

## Shared Product Rules

- Landing-page role selection must route to the selected role's own workspace and preserve that role in the authenticated session.
- Role, jurisdiction and action permissions must be checked by the API. Hiding a button in the frontend is not authorization.
- Parcel access must be resource-scoped; citizen, financial and legal views must not expose fields beyond their approved purpose.
- Every correction, review decision, upload and administrative change must retain actor, timestamp, source and audit history.
- Low-confidence or disputed/legal-status records must be routed for human review rather than silently auto-resolved.
- Mobile field workflows must preserve offline task data and clearly show upload/sync status.

## RFP Traceability

| Workspace feature | Proposal sections |
| --- | --- |
| Field tasks, GPS, photos, voice notes, offline collection, review and rework | 4; 5.4; 9 |
| Conflict queues, escalation, confidence and uncertainty | 6.6; 6.7; 6.11 |
| Parcel inspector, map search, layers, share and issue reporting | 5.7 |
| Revenue/cadastral cross-linking and legal metadata | 6.8; 6.9 |
| Municipal layers, building/road context and aggregation | 5.5; 5.6; 10 |
| District/state rollups, reports, catalog and version history | 5.3; 5.6; 5.7 |
| User management, RBAC, audit and system health | 5.7; 8; 11; 12 |
| Citizen and third-party entry points, SSO/API integration | 3; 8; 11 |

The source proposal is [AI_Geospatial_Integration_Platform_RFP_Proposal (2).docx](../AI_Geospatial_Integration_Platform_RFP_Proposal%20(2).docx). Advanced suitability analysis and mature cross-department SSO/API integrations are later-phase capabilities in the proposal, not assumptions about the current application.
