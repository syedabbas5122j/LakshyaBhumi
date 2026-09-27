import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export type DataSourceType = 'REAL' | 'DERIVED DEMO' | 'DEMO'

export type ConflictSeverity = 'High' | 'Medium' | 'Low'

export interface DatasetMeta {
  id: string
  name: string
  source: string
  sourceType: DataSourceType
  status: 'Available' | 'Processing' | 'Derived'
  value: string
}

export interface ConflictRecord {
  id: string
  title: string
  type: 'Boundary mismatch' | 'Attribute conflict' | 'Jurisdictional overlap'
  severity: ConflictSeverity
  status: 'Pending Ground Truth' | 'Auto-resolved' | 'Requires review'
  confidence: number
  uncertainty: number
  displacement: number
  areaDifference: number
  district: 'Tirupati District'
  mandal: 'Tirupati Urban' | 'Chandragiri' | 'Puttur'
  sourceA: string
  sourceB: string
  description: string
  bbox: [number, number, number, number]
  geometry: Polygon | MultiPolygon
  sourceGeometry: Polygon | MultiPolygon
  comparisonGeometry: Polygon | MultiPolygon
  layerIds: string[]
}

const conflictGeometryA = {
  type: 'Polygon' as const,
  coordinates: [[
    [79.4275, 13.6740],
    [79.4312, 13.6740],
    [79.4312, 13.6778],
    [79.4275, 13.6778],
    [79.4275, 13.6740],
  ]],
}

const conflictGeometryB = {
  type: 'Polygon' as const,
  coordinates: [[
    [79.4290, 13.6758],
    [79.4329, 13.6758],
    [79.4329, 13.6792],
    [79.4290, 13.6792],
    [79.4290, 13.6758],
  ]],
}

const conflictGeometryC = {
  type: 'Polygon' as const,
  coordinates: [[
    [79.4538, 13.6884],
    [79.4578, 13.6884],
    [79.4578, 13.6920],
    [79.4538, 13.6920],
    [79.4538, 13.6884],
  ]],
}

const conflictGeometryD = {
  type: 'Polygon' as const,
  coordinates: [[
    [79.4680, 13.6950],
    [79.4725, 13.6950],
    [79.4725, 13.6989],
    [79.4680, 13.6989],
    [79.4680, 13.6950],
  ]],
}

export const sourceCatalog: DatasetMeta[] = [
  {
    id: 'district-boundary',
    name: 'Tirupati District Boundary',
    source: 'District administration / local GIS',
    sourceType: 'REAL',
    status: 'Available',
    value: 'District boundary',
  },
  {
    id: 'cadastral-layer',
    name: 'Cadastral Parcel Layer',
    source: 'Demo cadastral fabric',
    sourceType: 'DERIVED DEMO',
    status: 'Available',
    value: 'Parcels / survey geometry',
  },
  {
    id: 'drone-layer',
    name: 'Drone Survey Overlay',
    source: 'Derived from real parcel geometry',
    sourceType: 'DERIVED DEMO',
    status: 'Derived',
    value: 'Boundary offset demonstration',
  },
  {
    id: 'gnss-layer',
    name: 'GNSS / CORS Observation',
    source: 'Derived survey control geometry',
    sourceType: 'DERIVED DEMO',
    status: 'Derived',
    value: 'Ground truth comparison',
  },
  {
    id: 'integrated-layer',
    name: 'Integrated Land Result',
    source: 'Spatial conflation engine',
    sourceType: 'REAL',
    status: 'Available',
    value: 'AI-assisted harmonized feature',
  },
]

export interface DepartmentIntegration {
  id: string
  department: string
  dataScope: string
  status: 'Not connected'
}

export const departmentIntegrations: DepartmentIntegration[] = [
  { id: 'survey-land-records', department: 'Survey & Land Records', dataScope: 'Cadastral parcels and administrative boundaries', status: 'Not connected' },
  { id: 'revenue', department: 'Revenue Department', dataScope: 'RoR, Pahani and survey-number references', status: 'Not connected' },
  { id: 'municipal-gis', department: 'Municipal GIS / Urban Local Bodies', dataScope: 'Ward, zoning, road and building layers', status: 'Not connected' },
  { id: 'ground-truth', department: 'Ground Truth & Survey Teams', dataScope: 'Field tasks, measurements and evidence', status: 'Not connected' },
  { id: 'gnss-cors', department: 'GNSS / CORS Services', dataScope: 'RINEX, NMEA and survey control observations', status: 'Not connected' },
  { id: 'drone-imagery', department: 'Drone & Remote Sensing', dataScope: 'Orthomosaics, DSM/DTM and imagery products', status: 'Not connected' },
  { id: 'utilities', department: 'Utilities & Infrastructure', dataScope: 'Water, power, sewer and network features', status: 'Not connected' },
]

export type HarmonizationRunStatus = 'Published' | 'In review' | 'Superseded'

export interface HarmonizationRun {
  id: string
  outputId: string
  outputName: string
  comparisonConflictId: string
  outputVersion: string
  createdAt: string
  status: HarmonizationRunStatus
  runBy: string
  modelVersion: string
  inputVersions: string[]
  changedFeatures: number
  confidence: number
  uncertaintyMeters: number
  summary: string
}

export const sampleHarmonizationRuns: HarmonizationRun[] = [
  { id: 'harm-014', outputId: 'tirupati-cadastre', outputName: 'Tirupati Harmonized Cadastral Output', comparisonConflictId: 'TPT-00128', outputVersion: '1.0', createdAt: '2026-09-18 10:30', status: 'Superseded', runBy: 'GeoAI Pipeline', modelVersion: 'spatial-match 0.8.2', inputVersions: ['Cadastral baseline 2026-09-02', 'Revenue Pahani batch 2026-09-14', 'Drone survey 2026-09-16'], changedFeatures: 126, confidence: 84, uncertaintyMeters: 0.42, summary: 'Initial conflation output. Low-confidence boundaries routed to review.' },
  { id: 'harm-018', outputId: 'tirupati-cadastre', outputName: 'Tirupati Harmonized Cadastral Output', comparisonConflictId: 'TPT-00128', outputVersion: '1.1', createdAt: '2026-09-22 15:45', status: 'Published', runBy: 'GeoAI Pipeline', modelVersion: 'spatial-match 0.9.0', inputVersions: ['Cadastral baseline 2026-09-18', 'Revenue Pahani batch 2026-09-20', 'GNSS control 2026-09-21'], changedFeatures: 42, confidence: 91, uncertaintyMeters: 0.28, summary: 'Reprocessed changed parcels with GNSS control and reviewed field evidence.' },
  { id: 'harm-021', outputId: 'tirupati-cadastre', outputName: 'Tirupati Harmonized Cadastral Output', comparisonConflictId: 'TPT-00191', outputVersion: '1.2', createdAt: '2026-09-27 09:20', status: 'In review', runBy: 'GeoAI Pipeline', modelVersion: 'spatial-match 0.9.1', inputVersions: ['Cadastral baseline 2026-09-21', 'Revenue Pahani batch 2026-09-25', 'Drone survey 2026-09-26', 'GNSS control 2026-09-26'], changedFeatures: 18, confidence: 94, uncertaintyMeters: 0.19, summary: 'Incremental update detected 18 changed features; awaiting reviewer approval.' },
  { id: 'harm-009', outputId: 'tirupati-buildings', outputName: 'Tirupati Building Footprint Output', comparisonConflictId: 'TPT-00231', outputVersion: '0.4', createdAt: '2026-09-24 12:05', status: 'Published', runBy: 'GeoAI Pipeline', modelVersion: 'footprint-extract 0.4.3', inputVersions: ['Orthomosaic 2026-09-16', 'Municipal building layer 2026-09-10'], changedFeatures: 312, confidence: 88, uncertaintyMeters: 0.35, summary: 'Published reviewed footprint extraction for the current urban survey area.' },
]

export const districtGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'district', area: 'Tirupati District' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.9805, 13.2935],
          [80.2685, 13.2935],
          [80.2685, 14.2662],
          [78.9805, 14.2662],
          [78.9805, 13.2935],
        ]],
      },
    },
  ],
}

export const mandalGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'tirupati-urban', name: 'Tirupati Urban', clusterScore: 82 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.398, 13.640],
          [79.455, 13.640],
          [79.455, 13.700],
          [79.398, 13.700],
          [79.398, 13.640],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'chandragiri', name: 'Chandragiri', clusterScore: 71 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.470, 13.675],
          [79.545, 13.675],
          [79.545, 13.750],
          [79.470, 13.750],
          [79.470, 13.675],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'puttur', name: 'Puttur', clusterScore: 63 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.560, 13.700],
          [79.640, 13.700],
          [79.640, 13.785],
          [79.560, 13.785],
          [79.560, 13.700],
        ]],
      },
    },
  ],
}

export const clusterGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'cluster-01', score: 82, label: 'High Risk' },
      geometry: { type: 'Point', coordinates: [79.43, 13.676] },
    },
    {
      type: 'Feature',
      properties: { id: 'cluster-02', score: 68, label: 'Moderate Risk' },
      geometry: { type: 'Point', coordinates: [79.49, 13.710] },
    },
    {
      type: 'Feature',
      properties: { id: 'cluster-03', score: 58, label: 'Emerging Risk' },
      geometry: { type: 'Point', coordinates: [79.60, 13.720] },
    },
  ],
}

export const parcelGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { feature_id: 'TPT-P-101', owner: 'M. Narasamma', source: 'cadastral' },
      geometry: conflictGeometryA,
    },
    {
      type: 'Feature',
      properties: { feature_id: 'TPT-P-117', owner: 'K. Raghava', source: 'cadastral' },
      geometry: conflictGeometryB,
    },
    {
      type: 'Feature',
      properties: { feature_id: 'TPT-P-244', owner: 'S. Babu Rao', source: 'cadastral' },
      geometry: conflictGeometryC,
    },
    {
      type: 'Feature',
      properties: { feature_id: 'TPT-P-372', owner: 'D. Venkatesh', source: 'cadastral' },
      geometry: conflictGeometryD,
    },
  ],
}

export const droneGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { feature_id: 'DRONE-101', source: 'drone' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.4278, 13.6745],
          [79.4314, 13.6745],
          [79.4314, 13.6782],
          [79.4278, 13.6782],
          [79.4278, 13.6745],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { feature_id: 'DRONE-117', source: 'drone' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.4542, 13.6892],
          [79.4571, 13.6892],
          [79.4571, 13.6926],
          [79.4542, 13.6926],
          [79.4542, 13.6892],
        ]],
      },
    },
  ],
}

export const gnssGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { feature_id: 'GNSS-101', source: 'gnss' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.4282, 13.6748],
          [79.4308, 13.6748],
          [79.4308, 13.6774],
          [79.4282, 13.6774],
          [79.4282, 13.6748],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { feature_id: 'GNSS-117', source: 'gnss' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.4548, 13.6898],
          [79.4575, 13.6898],
          [79.4575, 13.6930],
          [79.4548, 13.6930],
          [79.4548, 13.6898],
        ]],
      },
    },
  ],
}

export const conflictGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'TPT-00128',
        title: 'Boundary mismatch',
        type: 'Boundary mismatch',
        severity: 'High',
        status: 'Pending Ground Truth',
        confidence: 92,
        uncertainty: 0.84,
        displacement: 1.84,
        areaDifference: 12.7,
        sourceA: 'Orthorectified Imagery (ORI)',
        sourceB: 'Cadastral Database',
        description: 'The ORI-derived parcel edge is offset from the current cadastral boundary.',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.4275, 13.6740],
          [79.4320, 13.6740],
          [79.4320, 13.6788],
          [79.4275, 13.6788],
          [79.4275, 13.6740],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'TPT-00191',
        title: 'Parcel edge offset',
        type: 'Boundary mismatch',
        severity: 'Medium',
        status: 'Auto-resolved',
        confidence: 87,
        uncertainty: 0.63,
        displacement: 1.12,
        areaDifference: 9.1,
        sourceA: 'Cadastral Database',
        sourceB: 'Municipal Utility Network',
        description: 'A municipal utility corridor crosses the parcel boundary and requires jurisdictional review.',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.4538, 13.6884],
          [79.4576, 13.6884],
          [79.4576, 13.6922],
          [79.4538, 13.6922],
          [79.4538, 13.6884],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'TPT-00231',
        title: 'Utility corridor overlap',
        type: 'Jurisdictional overlap',
        severity: 'Low',
        status: 'Requires review',
        confidence: 81,
        uncertainty: 0.51,
        displacement: 0.65,
        areaDifference: 3.8,
        sourceA: 'Revenue Land Records',
        sourceB: 'Municipal GIS',
        description: 'Parcel use classification and recorded land attributes disagree between Revenue and Municipal GIS.',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [79.4678, 13.6952],
          [79.4720, 13.6952],
          [79.4720, 13.6990],
          [79.4678, 13.6990],
          [79.4678, 13.6952],
        ]],
      },
    },
  ],
}

export const conflictRecords: ConflictRecord[] = [
  {
    id: 'TPT-00128',
    title: 'Boundary mismatch',
    type: 'Boundary mismatch',
    severity: 'High',
    status: 'Pending Ground Truth',
    confidence: 92,
    uncertainty: 0.84,
    displacement: 1.84,
    areaDifference: 12.7,
    district: 'Tirupati District',
    mandal: 'Tirupati Urban',
    sourceA: 'Orthorectified Imagery (ORI)',
    sourceB: 'Cadastral Database',
    description: 'The ORI-derived parcel edge is offset from the current cadastral boundary.',
    bbox: [79.4275, 13.6740, 79.4320, 13.6788],
    geometry: conflictGeometryA,
    sourceGeometry: conflictGeometryB,
    comparisonGeometry: conflictGeometryC,
    layerIds: ['cadastral-layer', 'drone-layer', 'gnss-layer'],
  },
  {
    id: 'TPT-00191',
    title: 'Parcel edge offset',
    type: 'Boundary mismatch',
    severity: 'Medium',
    status: 'Auto-resolved',
    confidence: 87,
    uncertainty: 0.63,
    displacement: 1.12,
    areaDifference: 9.1,
    district: 'Tirupati District',
    mandal: 'Chandragiri',
    sourceA: 'Cadastral Database',
    sourceB: 'Municipal Utility Network',
    description: 'A municipal utility corridor crosses the parcel boundary and requires jurisdictional review.',
    bbox: [79.4538, 13.6884, 79.4576, 13.6922],
    geometry: conflictGeometryC,
    sourceGeometry: conflictGeometryB,
    comparisonGeometry: conflictGeometryA,
    layerIds: ['cadastral-layer', 'drone-layer'],
  },
  {
    id: 'TPT-00231',
    title: 'Utility corridor overlap',
    type: 'Jurisdictional overlap',
    severity: 'Low',
    status: 'Requires review',
    confidence: 81,
    uncertainty: 0.51,
    displacement: 0.65,
    areaDifference: 3.8,
    district: 'Tirupati District',
    mandal: 'Puttur',
    sourceA: 'Revenue Land Records',
    sourceB: 'Municipal GIS',
    description: 'Parcel use classification and recorded land attributes disagree between Revenue and Municipal GIS.',
    bbox: [79.4678, 13.6952, 79.4720, 13.6990],
    geometry: conflictGeometryD,
    sourceGeometry: conflictGeometryA,
    comparisonGeometry: conflictGeometryB,
    layerIds: ['cadastral-layer', 'integrated-layer'],
  },
]
