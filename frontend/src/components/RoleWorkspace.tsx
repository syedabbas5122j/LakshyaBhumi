import type { ReactNode } from 'react'
import './RoleWorkspace.css'

export type WorkspaceView = 'Workspace' | 'Dashboard' | 'Map' | 'Conflicts' | 'Integrations' | 'Version History' | 'Harmonization' | 'Ground Truth' | 'Upload Data' | 'API'

type PortalGroup = 'field' | 'village' | 'mandal' | 'district' | 'municipal' | 'state' | 'support'

type WorkspaceFeature = {
  eyebrow: string
  title: string
  description: string
  view: Exclude<WorkspaceView, 'Workspace'>
}

type PortalProfile = {
  label: string
  summary: string
  navigation: WorkspaceView[]
  features: WorkspaceFeature[]
}

const roleGroups: Record<string, PortalGroup> = {
  'Village Surveyor': 'field',
  'Ground Truth Surveyor': 'field',
  'Drone Pilot': 'field',
  'GCP Marker': 'field',
  'Field Data Collector': 'field',
  'Mandal Surveyor': 'field',
  'City Surveyor': 'field',
  'Village Revenue Officer (VRO)': 'village',
  'Ward Secretary': 'village',
  'Patwari / Lekhpal': 'village',
  'Village Administrative Officer': 'village',
  'Mandal Revenue Officer (MRO)': 'mandal',
  Tahsildar: 'mandal',
  'Survey Inspector': 'mandal',
  'District Collector / District Magistrate': 'district',
  'District Survey Officer': 'district',
  'District Land Records Officer': 'district',
  'Municipal Commissioner': 'municipal',
  'Chief Town Planner': 'municipal',
  'GIS Manager (Municipality)': 'municipal',
  'Property Tax Officer': 'municipal',
  'Commissioner of Land Administration': 'state',
  'Director of Survey & Land Records': 'state',
  'State GIS Coordinator': 'state',
  'Chief Cartographer': 'state',
  'System Administrator': 'support',
  'Data Entry Operator': 'support',
  'IT Support Staff': 'support',
  'Help Desk Operator': 'support',
}

const profiles: Record<PortalGroup, PortalProfile> = {
  field: {
    label: 'Field operations',
    summary: 'Your workspace starts with assigned survey work, parcel navigation and evidence capture.',
    navigation: ['Workspace', 'Upload Data', 'Ground Truth', 'Map'],
    features: [
      { eyebrow: '01 / ASSIGNED WORK', title: 'Field task queue', description: 'Open ground-truth tasks, check due dates and submit evidence for review.', view: 'Ground Truth' },
      { eyebrow: '02 / PARCEL CONTEXT', title: 'Survey map', description: 'Navigate parcel boundaries, administrative limits and conflict locations.', view: 'Map' },
      { eyebrow: '03 / REVIEW LOOP', title: 'Submission status', description: 'Track validation, reviewer comments and rework requests.', view: 'Ground Truth' },
      { eyebrow: '04 / FIELD DATA', title: 'Upload survey data', description: 'Submit a GeoJSON survey package for validation at your permitted area level.', view: 'Upload Data' },
    ],
  },
  village: {
    label: 'Village and ward records',
    summary: 'Your workspace focuses on local parcel records, revenue links and ward-level issues.',
    navigation: ['Workspace', 'Dashboard', 'Map', 'Conflicts', 'Upload Data', 'Version History'],
    features: [
      { eyebrow: '01 / LOCAL REGISTER', title: 'Parcel map', description: 'Locate records in your village or ward and inspect their mapped context.', view: 'Map' },
      { eyebrow: '02 / RECORD REVIEW', title: 'Revenue conflicts', description: 'Review parcel, ownership and source-record differences for local cases.', view: 'Conflicts' },
      { eyebrow: '03 / LOCAL STATUS', title: 'Village and ward summary', description: 'See local case counts, confidence and source health.', view: 'Dashboard' },
      { eyebrow: '04 / LOCAL DATA', title: 'Submit village or ward data', description: 'Upload local GeoJSON within your assigned administrative scope.', view: 'Upload Data' },
    ],
  },
  mandal: {
    label: 'Mandal review',
    summary: 'Your workspace prioritizes escalated conflicts, ground-truth review and mandal progress.',
    navigation: ['Workspace', 'Conflicts', 'Ground Truth', 'Upload Data', 'Dashboard', 'Map', 'Version History'],
    features: [
      { eyebrow: '01 / PRIORITY QUEUE', title: 'Escalated conflicts', description: 'Compare sources, confidence, uncertainty and case history.', view: 'Conflicts' },
      { eyebrow: '02 / FIELD VALIDATION', title: 'Ground-truth submissions', description: 'Review evidence, request rework or record an authorized decision.', view: 'Ground Truth' },
      { eyebrow: '03 / MANDAL STATUS', title: 'Progress and quality', description: 'Review local rollups and identify unresolved data-quality issues.', view: 'Dashboard' },
      { eyebrow: '04 / MANDAL DATA', title: 'Upload mandal data', description: 'Submit mandal GeoJSON and view validation status.', view: 'Upload Data' },
    ],
  },
  district: {
    label: 'District administration',
    summary: 'Your workspace brings district survey progress, priority cases and dataset quality together.',
    navigation: ['Workspace', 'Dashboard', 'Conflicts', 'Integrations', 'Upload Data', 'Version History', 'Map'],
    features: [
      { eyebrow: '01 / DISTRICT PICTURE', title: 'Survey and quality dashboard', description: 'Review progress, parcel metrics and confidence across the district.', view: 'Dashboard' },
      { eyebrow: '02 / ESCALATIONS', title: 'District conflict queue', description: 'Inspect unresolved cases and their review history.', view: 'Conflicts' },
      { eyebrow: '03 / AI OUTPUTS', title: 'Harmonization runs', description: 'Review output versions, source provenance and model confidence.', view: 'Version History' },
      { eyebrow: '04 / DISTRICT DATA', title: 'Upload district data', description: 'Submit district-scope GeoJSON packages for validation.', view: 'Upload Data' },
    ],
  },
  municipal: {
    label: 'Urban local body',
    summary: 'Your workspace is centered on municipal GIS layers, urban parcels and city data quality.',
    navigation: ['Workspace', 'Integrations', 'Upload Data', 'Version History', 'Map', 'Dashboard'],
    features: [
      { eyebrow: '01 / DEPARTMENT ACCESS', title: 'Municipal integration', description: 'Request an approved connection to municipal GIS systems.', view: 'Integrations' },
      { eyebrow: '02 / URBAN CONTEXT', title: 'Cadastral map', description: 'Compare parcels with municipal boundaries and available overlays.', view: 'Map' },
      { eyebrow: '03 / PROPERTY OVERVIEW', title: 'Urban summary', description: 'Review property, building and survey coverage metrics.', view: 'Dashboard' },
      { eyebrow: '04 / MUNICIPAL DATA', title: 'Upload city or ward data', description: 'Submit authorized municipal layers for validation.', view: 'Upload Data' },
    ],
  },
  state: {
    label: 'State administration',
    summary: 'Your workspace opens on state rollups, cross-district data health and integration status.',
    navigation: ['Workspace', 'Dashboard', 'Integrations', 'Upload Data', 'Version History', 'API', 'Map'],
    features: [
      { eyebrow: '01 / STATE ROLLUP', title: 'State performance', description: 'Compare district progress, data quality and unresolved trends.', view: 'Dashboard' },
      { eyebrow: '02 / INTEROPERABILITY', title: 'Integration status', description: 'Review API health and the status of data exchange endpoints.', view: 'API' },
      { eyebrow: '03 / DEPARTMENT LINKS', title: 'Integration oversight', description: 'Review authorized connections and access requests.', view: 'Integrations' },
      { eyebrow: '04 / STATE DATA', title: 'Upload district package', description: 'Submit an authorized district or state-level GeoJSON package.', view: 'Upload Data' },
    ],
  },
  support: {
    label: 'Technical operations',
    summary: 'Your workspace prioritizes service health, data processing and operational support.',
    navigation: ['Workspace', 'API', 'Integrations', 'Version History', 'Dashboard'],
    features: [
      { eyebrow: '01 / SERVICE HEALTH', title: 'API and system status', description: 'Check service availability and endpoint health.', view: 'API' },
      { eyebrow: '02 / CONNECTIONS', title: 'Integration setup', description: 'Track department access methods and connection readiness.', view: 'Integrations' },
      { eyebrow: '03 / OPERATIONS', title: 'Activity overview', description: 'Review current platform metrics and operational status.', view: 'Dashboard' },
    ],
  },
}

const roleProfile = (
  group: PortalGroup,
  summary: string,
  navigation: WorkspaceView[],
  features: WorkspaceFeature[],
): PortalProfile => ({
  ...profiles[group],
  summary,
  navigation,
  features,
})

const roleProfiles: Record<string, PortalProfile> = {
  'Village Surveyor': roleProfile('field', 'Start with assigned parcel visits, boundary measurements and evidence submissions.', ['Workspace', 'Ground Truth', 'Map', 'Version History'], [
    { eyebrow: '01 / ASSIGNED WORK', title: 'Parcel survey tasks', description: 'Open assigned parcels, review due dates and record boundary measurements.', view: 'Ground Truth' },
    { eyebrow: '02 / FIELD CONTEXT', title: 'Parcel map', description: 'Navigate the assigned parcel and nearby administrative boundaries.', view: 'Map' },
  ]),
  'Ground Truth Surveyor': roleProfile('field', 'Start with confidence-prioritized discrepancy work and evidence review.', ['Workspace', 'Ground Truth', 'Map', 'Upload Data', 'Version History'], [
    { eyebrow: '01 / PRIORITY TASKS', title: 'Ground-truth queue', description: 'Work boundary discrepancies and record field observations.', view: 'Ground Truth' },
    { eyebrow: '02 / EVIDENCE', title: 'Submit field evidence', description: 'Send photos, observations and survey data for review.', view: 'Upload Data' },
  ]),
  'Drone Pilot': roleProfile('field', 'Start with assigned flight areas, survey packages and processing status.', ['Workspace', 'Map', 'Upload Data'], [
    { eyebrow: '01 / FLIGHT AREAS', title: 'Assigned survey areas', description: 'Review the parcels scheduled for drone capture.', view: 'Map' },
    { eyebrow: '02 / SURVEY PACKAGES', title: 'Upload imagery data', description: 'Submit orthomosaic or elevation packages for validation.', view: 'Upload Data' },
  ]),
  'GCP Marker': roleProfile('field', 'Start with control-point assignments, GNSS context and georeferencing submissions.', ['Workspace', 'Ground Truth', 'Map', 'Upload Data'], [
    { eyebrow: '01 / CONTROL POINTS', title: 'GCP assignments', description: 'Record coordinates and accuracy class for assigned points.', view: 'Ground Truth' },
    { eyebrow: '02 / VALIDATION', title: 'Submit observations', description: 'Upload GNSS observations for georeferencing checks.', view: 'Upload Data' },
  ]),
  'Field Data Collector': roleProfile('field', 'Start with guided parcel forms, issue capture and pending field syncs.', ['Workspace', 'Ground Truth', 'Map'], [
    { eyebrow: '01 / GUIDED FORMS', title: 'Collection tasks', description: 'Capture owner, discrepancy and location details.', view: 'Ground Truth' },
    { eyebrow: '02 / PARCEL LOOKUP', title: 'Field map', description: 'Find the parcel before collecting evidence.', view: 'Map' },
  ]),
  'Mandal Surveyor': roleProfile('field', 'Start with mandal-assigned field tasks, parcel context and evidence capture.', ['Workspace', 'Ground Truth', 'Map', 'Upload Data'], [
    { eyebrow: '01 / MANDAL TASKS', title: 'Assigned surveys', description: 'Record measurements across your assigned mandal.', view: 'Ground Truth' },
    { eyebrow: '02 / DATA HANDOFF', title: 'Submit survey data', description: 'Send field packages to the mandal review queue.', view: 'Upload Data' },
  ]),
  'City Surveyor': roleProfile('field', 'Start with urban parcel inspection, municipal context and survey evidence.', ['Workspace', 'Map', 'Ground Truth', 'Upload Data'], [
    { eyebrow: '01 / URBAN INSPECTION', title: 'City parcel map', description: 'Inspect parcels alongside municipal layers and imagery.', view: 'Map' },
    { eyebrow: '02 / DATA HANDOFF', title: 'Submit city survey data', description: 'Upload authorized urban survey packages.', view: 'Upload Data' },
  ]),
  'Village Revenue Officer (VRO)': roleProfile('village', 'Start with village parcel records, revenue links and cases needing local action.', ['Workspace', 'Map', 'Conflicts', 'Ground Truth', 'Dashboard'], [
    { eyebrow: '01 / REVENUE REGISTER', title: 'Village parcel records', description: 'Inspect revenue and cadastral context for local parcels.', view: 'Map' },
    { eyebrow: '02 / LOCAL CASES', title: 'Ownership conflicts', description: 'Review record differences and forward unresolved cases.', view: 'Conflicts' },
  ]),
  'Ward Secretary': roleProfile('village', 'Start with ward parcel lookup, complaints and municipal survey status.', ['Workspace', 'Map', 'Conflicts', 'Ground Truth', 'Dashboard'], [
    { eyebrow: '01 / WARD LOOKUP', title: 'Ward parcel map', description: 'Find parcels and inspect the municipal context.', view: 'Map' },
    { eyebrow: '02 / SERVICE CASES', title: 'Ward issues', description: 'Track boundary questions and requests needing routing.', view: 'Conflicts' },
  ]),
  'Patwari / Lekhpal': roleProfile('village', 'Start with revenue-to-cadastral matching and boundary comparison.', ['Workspace', 'Map', 'Conflicts', 'Ground Truth', 'Version History'], [
    { eyebrow: '01 / RECORD MATCHING', title: 'Revenue parcel map', description: 'Compare survey-number and khata links with parcels.', view: 'Map' },
    { eyebrow: '02 / ATTRIBUTE REVIEW', title: 'Boundary conflicts', description: 'Inspect mismatches and prepare corrections for review.', view: 'Conflicts' },
  ]),
  'Village Administrative Officer': roleProfile('village', 'Start with village rollups, missing records and unresolved field issues.', ['Workspace', 'Dashboard', 'Map', 'Conflicts', 'Ground Truth'], [
    { eyebrow: '01 / VILLAGE ROLLUP', title: 'Village overview', description: 'Review parcel coverage and field progress.', view: 'Dashboard' },
    { eyebrow: '02 / RECORD GAPS', title: 'Open issues', description: 'Route missing or incomplete records for action.', view: 'Conflicts' },
  ]),
  'Mandal Revenue Officer (MRO)': roleProfile('mandal', 'Start with mandal conflicts, assignments and resolution history.', ['Workspace', 'Conflicts', 'Ground Truth', 'Dashboard', 'Version History'], [
    { eyebrow: '01 / DECISION QUEUE', title: 'Mandal conflict queue', description: 'Assign, escalate and track boundary and ownership cases.', view: 'Conflicts' },
    { eyebrow: '02 / MANDAL ROLLUP', title: 'Mandal progress', description: 'Review village status and unresolved trends.', view: 'Dashboard' },
  ]),
  Tahsildar: roleProfile('mandal', 'Start with revenue and cadastral arbitration cases requiring an authorized decision.', ['Workspace', 'Conflicts', 'Ground Truth', 'Version History'], [
    { eyebrow: '01 / ARBITRATION', title: 'Decision cases', description: 'Compare legal metadata, lineage and field evidence.', view: 'Conflicts' },
    { eyebrow: '02 / EVIDENCE', title: 'Ground-truth review', description: 'Inspect submitted evidence before a decision.', view: 'Ground Truth' },
  ]),
  'Survey Inspector': roleProfile('mandal', 'Start with submitted field evidence, quality checks and rework routing.', ['Workspace', 'Ground Truth', 'Map', 'Conflicts'], [
    { eyebrow: '01 / QUALITY QUEUE', title: 'Evidence review', description: 'Check photos, GPS accuracy and parcel comparisons.', view: 'Ground Truth' },
    { eyebrow: '02 / REWORK', title: 'Incomplete submissions', description: 'Return field work or forward validated cases.', view: 'Conflicts' },
  ]),
  'District Collector / District Magistrate': roleProfile('district', 'Start with district progress, escalations and administrative reports.', ['Workspace', 'Dashboard', 'Conflicts', 'Ground Truth', 'Version History'], [
    { eyebrow: '01 / DISTRICT PICTURE', title: 'District progress', description: 'Review survey completion, SLA health and mandal rollups.', view: 'Dashboard' },
    { eyebrow: '02 / ESCALATIONS', title: 'Priority cases', description: 'Review unresolved conflicts requiring district attention.', view: 'Conflicts' },
  ]),
  'District Survey Officer': roleProfile('district', 'Start with district data quality, integrations and low-confidence outputs.', ['Workspace', 'Dashboard', 'Conflicts', 'Ground Truth', 'Integrations', 'Harmonization', 'Version History'], [
    { eyebrow: '01 / QUALITY', title: 'Data quality dashboard', description: 'Compare confidence, uncertainty and coverage.', view: 'Dashboard' },
    { eyebrow: '02 / REVIEW QUEUE', title: 'Low-confidence conflicts', description: 'Prioritize high-risk cases for review.', view: 'Conflicts' },
  ]),
  'District Land Records Officer': roleProfile('district', 'Start with the district cadastral catalog, lineage and authorized QA review.', ['Workspace', 'Map', 'Harmonization', 'Version History', 'Conflicts', 'Ground Truth'], [
    { eyebrow: '01 / CATALOG', title: 'Cadastral map', description: 'Inspect district parcels and revenue references.', view: 'Map' },
    { eyebrow: '02 / VERSION CONTROL', title: 'Dataset history', description: 'Review lineage, versions and QA status.', view: 'Version History' },
  ]),
  'Municipal Commissioner': roleProfile('municipal', 'Start with municipality rollups, urban service progress and escalations.', ['Workspace', 'Dashboard', 'Conflicts', 'Integrations', 'Version History'], [
    { eyebrow: '01 / MUNICIPAL ROLLUP', title: 'Urban property overview', description: 'Review ward coverage and unresolved cases.', view: 'Dashboard' },
    { eyebrow: '02 / ESCALATIONS', title: 'Urban case queue', description: 'Review cases requiring municipal action.', view: 'Conflicts' },
  ]),
  'Chief Town Planner': roleProfile('municipal', 'Start with planning context, zoning layers and permitted urban reports.', ['Workspace', 'Map', 'Dashboard', 'Integrations', 'Version History'], [
    { eyebrow: '01 / PLANNING MAP', title: 'Land-use context', description: 'Compare parcels with zoning, buildings and roads.', view: 'Map' },
    { eyebrow: '02 / PLANNING STATUS', title: 'Urban coverage', description: 'Review building and survey coverage metrics.', view: 'Dashboard' },
  ]),
  'GIS Manager (Municipality)': roleProfile('municipal', 'Start with municipal data registration, validation and sync status.', ['Workspace', 'Integrations', 'Upload Data', 'Harmonization', 'Version History'], [
    { eyebrow: '01 / DATA CATALOG', title: 'Municipal integrations', description: 'Monitor roads, utilities, zones and GIS packages.', view: 'Integrations' },
    { eyebrow: '02 / INGESTION', title: 'Upload GIS package', description: 'Submit municipal layers and inspect validation.', view: 'Upload Data' },
    { eyebrow: '03 / CONFLATION', title: 'Run harmonization', description: 'Align authorized municipal layers with cadastral data.', view: 'Harmonization' },
  ]),
  'Property Tax Officer': roleProfile('municipal', 'Start with read-only parcel and property-card verification.', ['Workspace', 'Map', 'Dashboard', 'Conflicts'], [
    { eyebrow: '01 / PROPERTY SEARCH', title: 'Parcel and building map', description: 'Inspect building footprints, parcel area and context.', view: 'Map' },
    { eyebrow: '02 / CORRECTIONS', title: 'Raise a correction', description: 'Identify issues for authorized review.', view: 'Conflicts' },
  ]),
  'Commissioner of Land Administration': roleProfile('state', 'Start with state-wide cadastral and revenue integration summaries.', ['Workspace', 'Dashboard', 'Conflicts', 'Harmonization', 'Version History'], [
    { eyebrow: '01 / STATE ROLLUP', title: 'Land administration overview', description: 'Review district trends, survey progress and legal conflicts.', view: 'Dashboard' },
    { eyebrow: '02 / ESCALATIONS', title: 'State conflict queue', description: 'Review escalated cases and their history.', view: 'Conflicts' },
  ]),
  'Director of Survey & Land Records': roleProfile('state', 'Start with survey campaigns, dataset quality and correction history.', ['Workspace', 'Dashboard', 'Harmonization', 'Version History', 'Conflicts'], [
    { eyebrow: '01 / CAMPAIGNS', title: 'Survey performance', description: 'Monitor district completion and accuracy standards.', view: 'Dashboard' },
    { eyebrow: '02 / CORRECTION HISTORY', title: 'Dataset versions', description: 'Review correction history and published outputs.', view: 'Version History' },
  ]),
  'State GIS Coordinator': roleProfile('state', 'Start with cross-department data health, APIs and synchronization status.', ['Workspace', 'Integrations', 'API', 'Harmonization', 'Dashboard', 'Version History'], [
    { eyebrow: '01 / DATA CATALOG', title: 'Integration status', description: 'Monitor source freshness, exchange and district coverage.', view: 'Integrations' },
    { eyebrow: '02 / INTEROPERABILITY', title: 'API health', description: 'Review synchronization endpoints and availability.', view: 'API' },
  ]),
  'Chief Cartographer': roleProfile('state', 'Start with state map composition, layer alignment and cartographic QA.', ['Workspace', 'Map', 'Harmonization', 'Version History', 'Integrations'], [
    { eyebrow: '01 / MAP QA', title: 'State map workspace', description: 'Compare administrative, cadastral, municipal and imagery layers.', view: 'Map' },
    { eyebrow: '02 / SOURCE PRIORITY', title: 'Map versions', description: 'Review alignment, source priority and published versions.', view: 'Version History' },
  ]),
  'System Administrator': roleProfile('support', 'Start with service health, access operations and platform configuration.', ['Workspace', 'API', 'Integrations', 'Dashboard'], [
    { eyebrow: '01 / SERVICE HEALTH', title: 'System status', description: 'Check endpoint availability and platform metrics.', view: 'API' },
    { eyebrow: '02 / ACCESS', title: 'Connected departments', description: 'Review integration access and operational readiness.', view: 'Integrations' },
  ]),
  'Data Entry Operator': roleProfile('support', 'Start with upload registration, validation issues and approved data templates.', ['Workspace', 'Upload Data', 'Version History'], [
    { eyebrow: '01 / INGESTION', title: 'Registration queue', description: 'Enter dataset metadata and submit authorized packages.', view: 'Upload Data' },
    { eyebrow: '02 / VALIDATION', title: 'Correction history', description: 'Review validation outcomes and approved mappings.', view: 'Version History' },
  ]),
  'IT Support Staff': roleProfile('support', 'Start with service health, upload diagnostics and access troubleshooting.', ['Workspace', 'API', 'Upload Data'], [
    { eyebrow: '01 / SERVICE HEALTH', title: 'Endpoint status', description: 'Check availability and diagnose platform incidents.', view: 'API' },
    { eyebrow: '02 / UPLOAD DIAGNOSTICS', title: 'Processing status', description: 'Inspect upload validation and processing results.', view: 'Upload Data' },
  ]),
  'Help Desk Operator': roleProfile('support', 'Start with access issues, complaint status and escalation routing.', ['Workspace', 'Dashboard', 'Conflicts'], [
    { eyebrow: '01 / USER SUPPORT', title: 'Issue overview', description: 'Review reported access and data issues by status.', view: 'Dashboard' },
    { eyebrow: '02 / ESCALATION', title: 'Case routing', description: 'Track case status without unrestricted record access.', view: 'Conflicts' },
  ]),
}

export function getPortalProfile(role: string): PortalProfile {
  if (roleProfiles[role]) {
    return roleProfiles[role]
  }
  const profile = profiles[roleGroups[role] ?? 'district']
  if (roleGroups[role] === 'support' && (role === 'Data Entry Operator' || role === 'System Administrator')) {
    return { ...profile, navigation: [...profile.navigation, 'Upload Data'] }
  }
  return profile
}

type RoleWorkspaceProps = {
  role: string
  onNavigate: (view: WorkspaceView) => void
  onSignOut: () => void
}

export default function RoleWorkspace({ role, onNavigate, onSignOut }: RoleWorkspaceProps): ReactNode {
  const profile = getPortalProfile(role)

  return (
    <section className="role-workspace">
      <header className="role-workspace-header">
        <div>
          <p className="eyebrow">{profile.label.toUpperCase()} / PERSONAL WORKSPACE</p>
          <h2>{role}</h2>
          <p>{profile.summary}</p>
        </div>
        <button className="secondary" type="button" onClick={onSignOut}>Sign out</button>
      </header>
      <div className="role-workspace-label"><span>YOUR STARTING POINT</span><small>FEATURES FOR THIS ROLE</small></div>
      <div className="role-feature-grid">
        {profile.features.map((feature) => (
          <button className="role-feature" type="button" key={feature.title} onClick={() => onNavigate(feature.view)}>
            <span>{feature.eyebrow}</span>
            <strong>{feature.title}</strong>
            <small>{feature.description}</small>
            <b aria-hidden="true">Open workspace <i>→</i></b>
          </button>
        ))}
      </div>
    </section>
  )
}
