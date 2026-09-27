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
  district: 'Kurnool District'
  mandal: 'Orvakal' | 'Kurnool Rural' | 'Patha Kurnool'
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
    [78.0285, 15.8244],
    [78.0312, 15.8244],
    [78.0312, 15.8275],
    [78.0285, 15.8275],
    [78.0285, 15.8244],
  ]],
}

const conflictGeometryB = {
  type: 'Polygon' as const,
  coordinates: [[
    [78.0291, 15.8247],
    [78.0319, 15.8247],
    [78.0319, 15.8279],
    [78.0291, 15.8279],
    [78.0291, 15.8247],
  ]],
}

const conflictGeometryC = {
  type: 'Polygon' as const,
  coordinates: [[
    [78.0382, 15.8172],
    [78.0408, 15.8172],
    [78.0408, 15.8206],
    [78.0382, 15.8206],
    [78.0382, 15.8172],
  ]],
}

const conflictGeometryD = {
  type: 'Polygon' as const,
  coordinates: [[
    [78.0468, 15.8302],
    [78.0496, 15.8302],
    [78.0496, 15.8333],
    [78.0468, 15.8333],
    [78.0468, 15.8302],
  ]],
}

export const sourceCatalog: DatasetMeta[] = [
  {
    id: 'district-boundary',
    name: 'Kurnool District Boundary',
    source: 'OpenStreetMap / Administration',
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
      properties: { id: 'district', area: 'Kurnool District' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [77.988, 15.736],
          [78.184, 15.736],
          [78.184, 15.940],
          [77.988, 15.940],
          [77.988, 15.736],
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
      properties: { id: 'orvakal', name: 'Orvakal', clusterScore: 82 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.017, 15.812],
          [78.063, 15.812],
          [78.063, 15.844],
          [78.017, 15.844],
          [78.017, 15.812],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'kurnool-rural', name: 'Kurnool Rural', clusterScore: 71 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.037, 15.819],
          [78.085, 15.819],
          [78.085, 15.861],
          [78.037, 15.861],
          [78.037, 15.819],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'patha-kurnool', name: 'Patha Kurnool', clusterScore: 63 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.084, 15.820],
          [78.129, 15.820],
          [78.129, 15.874],
          [78.084, 15.874],
          [78.084, 15.820],
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
      geometry: { type: 'Point', coordinates: [78.04, 15.828] },
    },
    {
      type: 'Feature',
      properties: { id: 'cluster-02', score: 68, label: 'Moderate Risk' },
      geometry: { type: 'Point', coordinates: [78.06, 15.841] },
    },
    {
      type: 'Feature',
      properties: { id: 'cluster-03', score: 58, label: 'Emerging Risk' },
      geometry: { type: 'Point', coordinates: [78.12, 15.915] },
    },
  ],
}

export const parcelGeojson: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { feature_id: 'KUR-P-101', owner: 'M. Narasamma', source: 'cadastral' },
      geometry: conflictGeometryA,
    },
    {
      type: 'Feature',
      properties: { feature_id: 'KUR-P-117', owner: 'K. Raghava', source: 'cadastral' },
      geometry: conflictGeometryB,
    },
    {
      type: 'Feature',
      properties: { feature_id: 'KUR-P-244', owner: 'S. Babu Rao', source: 'cadastral' },
      geometry: conflictGeometryC,
    },
    {
      type: 'Feature',
      properties: { feature_id: 'KUR-P-372', owner: 'D. Venkatesh', source: 'cadastral' },
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
          [78.0288, 15.8240],
          [78.0315, 15.8240],
          [78.0315, 15.8278],
          [78.0288, 15.8278],
          [78.0288, 15.8240],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { feature_id: 'DRONE-117', source: 'drone' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.0296, 15.8249],
          [78.0323, 15.8249],
          [78.0323, 15.8283],
          [78.0296, 15.8283],
          [78.0296, 15.8249],
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
          [78.0290, 15.8242],
          [78.0311, 15.8242],
          [78.0311, 15.8271],
          [78.0290, 15.8271],
          [78.0290, 15.8242],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: { feature_id: 'GNSS-117', source: 'gnss' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.0296, 15.8245],
          [78.0317, 15.8245],
          [78.0317, 15.8279],
          [78.0296, 15.8279],
          [78.0296, 15.8245],
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
        id: 'KUR-00128',
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
          [78.0288, 15.8240],
          [78.0319, 15.8240],
          [78.0319, 15.8283],
          [78.0288, 15.8283],
          [78.0288, 15.8240],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'KUR-00191',
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
          [78.0382, 15.8172],
          [78.0408, 15.8172],
          [78.0408, 15.8206],
          [78.0382, 15.8206],
          [78.0382, 15.8172],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'KUR-00231',
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
          [78.0468, 15.8302],
          [78.0496, 15.8302],
          [78.0496, 15.8333],
          [78.0468, 15.8333],
          [78.0468, 15.8302],
        ]],
      },
    },
  ],
}

export const conflictRecords: ConflictRecord[] = [
  {
    id: 'KUR-00128',
    title: 'Boundary mismatch',
    type: 'Boundary mismatch',
    severity: 'High',
    status: 'Pending Ground Truth',
    confidence: 92,
    uncertainty: 0.84,
    displacement: 1.84,
    areaDifference: 12.7,
    district: 'Kurnool District',
    mandal: 'Orvakal',
    sourceA: 'Drone Survey',
    sourceB: 'GNSS / CORS Survey',
    description: 'Boundary mismatch detected between drone-derived parcel edge and GNSS reference geometry.',
    bbox: [78.0288, 15.8240, 78.0319, 15.8283],
    geometry: conflictGeometryA,
    sourceGeometry: conflictGeometryB,
    comparisonGeometry: conflictGeometryC,
    layerIds: ['cadastral-layer', 'drone-layer', 'gnss-layer'],
  },
  {
    id: 'KUR-00191',
    title: 'Parcel edge offset',
    type: 'Boundary mismatch',
    severity: 'Medium',
    status: 'Auto-resolved',
    confidence: 87,
    uncertainty: 0.63,
    displacement: 1.12,
    areaDifference: 9.1,
    district: 'Kurnool District',
    mandal: 'Kurnool Rural',
    sourceA: 'Parcel Fabric',
    sourceB: 'Drone Survey',
    description: 'Cadastral geometry differs from drone boundary by a consistent offset.',
    bbox: [78.0382, 15.8172, 78.0408, 15.8206],
    geometry: conflictGeometryC,
    sourceGeometry: conflictGeometryB,
    comparisonGeometry: conflictGeometryA,
    layerIds: ['cadastral-layer', 'drone-layer'],
  },
  {
    id: 'KUR-00231',
    title: 'Attribute mismatch',
    type: 'Attribute conflict',
    severity: 'Low',
    status: 'Requires review',
    confidence: 81,
    uncertainty: 0.51,
    displacement: 0.65,
    areaDifference: 3.8,
    district: 'Kurnool District',
    mandal: 'Patha Kurnool',
    sourceA: 'Municipal GIS',
    sourceB: 'Revenue records',
    description: 'Owner name and parcel classification differ across source systems.',
    bbox: [78.0468, 15.8302, 78.0496, 15.8333],
    geometry: conflictGeometryD,
    sourceGeometry: conflictGeometryA,
    comparisonGeometry: conflictGeometryB,
    layerIds: ['cadastral-layer', 'integrated-layer'],
  },
]
