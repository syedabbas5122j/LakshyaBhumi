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
        sourceA: 'Drone Survey',
        sourceB: 'GNSS / CORS Survey',
        description: 'Boundary mismatch detected between drone-derived parcel edge and GNSS reference geometry.',
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
        sourceA: 'Parcel Fabric',
        sourceB: 'Drone Survey',
        description: 'Cadastral geometry differs from drone boundary by a consistent offset.',
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
        title: 'Attribute mismatch',
        type: 'Attribute conflict',
        severity: 'Low',
        status: 'Requires review',
        confidence: 81,
        uncertainty: 0.51,
        displacement: 0.65,
        areaDifference: 3.8,
        sourceA: 'Municipal GIS',
        sourceB: 'Revenue records',
        description: 'Owner name and parcel classification differ across source systems.',
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
    sourceA: 'Drone Survey',
    sourceB: 'GNSS / CORS Survey',
    description: 'Boundary mismatch detected between drone-derived parcel edge and GNSS reference geometry.',
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
    sourceA: 'Parcel Fabric',
    sourceB: 'Drone Survey',
    description: 'Cadastral geometry differs from drone boundary by a consistent offset.',
    bbox: [79.4538, 13.6884, 79.4576, 13.6922],
    geometry: conflictGeometryC,
    sourceGeometry: conflictGeometryB,
    comparisonGeometry: conflictGeometryA,
    layerIds: ['cadastral-layer', 'drone-layer'],
  },
  {
    id: 'TPT-00231',
    title: 'Attribute mismatch',
    type: 'Attribute conflict',
    severity: 'Low',
    status: 'Requires review',
    confidence: 81,
    uncertainty: 0.51,
    displacement: 0.65,
    areaDifference: 3.8,
    district: 'Tirupati District',
    mandal: 'Puttur',
    sourceA: 'Municipal GIS',
    sourceB: 'Revenue records',
    description: 'Owner name and parcel classification differ across source systems.',
    bbox: [79.4678, 13.6952, 79.4720, 13.6990],
    geometry: conflictGeometryD,
    sourceGeometry: conflictGeometryA,
    comparisonGeometry: conflictGeometryB,
    layerIds: ['cadastral-layer', 'integrated-layer'],
  },
]
