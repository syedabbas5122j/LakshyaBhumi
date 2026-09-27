import type { ReactNode } from 'react'
import './RoleWorkspace.css'

export type WorkspaceView = 'Workspace' | 'Dashboard' | 'Map' | 'Conflicts' | 'Integrations' | 'Version History' | 'Ground Truth' | 'Upload Data' | 'API'

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

export function getPortalProfile(role: string): PortalProfile {
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
