import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'
import LandingAuth from './components/LandingAuth'
import RoleWorkspace, { getPortalProfile, type WorkspaceView } from './components/RoleWorkspace'
import ConflictGeometryComparison from './components/ConflictGeometryComparison'
import CitizenPortal from './pages/citizen/CitizenPortal'
import UploadData from './pages/officer/UploadData'
import { authApi } from './services/authApi'
import { groundTruthApi } from './services/groundTruthApi'
import type { Polygon } from 'geojson'

const configureMapWorker = () => {
  if (typeof window !== 'undefined') {
    const workerUrl = new URL('/maplibre-gl-worker.mjs', window.location.origin).toString()
    maplibregl.setWorkerUrl(workerUrl)
  }
}

import {
  clusterGeojson,
  conflictRecords,
  districtGeojson,
  droneGeojson,
  gnssGeojson,
  mandalGeojson,
  parcelGeojson,
  departmentIntegrations,
  sampleHarmonizationRuns,
} from './data'

const districtBounds: [[number, number], [number, number]] = [
  [78.9805, 13.2935],
  [80.2685, 14.2662],
]

const mandalBounds: Record<'All' | 'Tirupati Urban' | 'Chandragiri' | 'Puttur', [number, number, number, number]> = {
  All: [79.18, 13.45, 79.88, 13.96],
  'Tirupati Urban': [79.398, 13.640, 79.455, 13.700],
  Chandragiri: [79.470, 13.675, 79.545, 13.750],
  Puttur: [79.560, 13.700, 79.640, 13.785],
}

const caseTimeline = [
  { phase: 'Intake', status: 'Completed', time: '09:15', note: 'Survey packet verified by assistant' },
  { phase: 'Geo-validation', status: 'In progress', time: '11:20', note: 'GNSS and parcel offset matched' },
  { phase: 'Officer review', status: 'Pending', time: 'Awaiting', note: 'Stakeholder hearing scheduled' },
  { phase: 'Decision', status: 'Queued', time: 'Pending', note: 'Adjudication memo to be signed' },
]

const auditEntries = [
  { title: 'Boundary evidence pack', meta: 'Drone / GNSS / Revenue record', status: 'Attached' },
  { title: 'Decision rationale', meta: 'Based on displacement and confidence', status: 'Drafted' },
  { title: 'Public notice log', meta: '4 parties notified / 2 responses', status: 'Current' },
]

const decisionOptions = [
  'Approve boundary correction',
  'Request field verification',
  'Escalate to higher authority',
  'Accept with conditions',
]

const attachmentList = [
  { name: 'Drone-orthophoto.pdf', type: 'Survey', status: 'Verified' },
  { name: 'GNSS-validation.xml', type: 'Control', status: 'Verified' },
  { name: 'Revenue-map.pdf', type: 'Administrative', status: 'Attached' },
  { name: 'Hearing-summary.docx', type: 'Review', status: 'Drafted' },
]

const riskTrend = [
  { label: 'Jan', value: 22 },
  { label: 'Feb', value: 31 },
  { label: 'Mar', value: 26 },
  { label: 'Apr', value: 41 },
  { label: 'May', value: 38 },
  { label: 'Jun', value: 55 },
]

const sourceMix = [
  { label: 'Drone', value: 42, color: 'blue' },
  { label: 'GNSS', value: 31, color: 'teal' },
  { label: 'Revenue', value: 19, color: 'amber' },
  { label: 'Field', value: 8, color: 'red' },
]

const formatGeoLabel = (value?: string | null) => {
  if (!value) {
    return ''
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part)
    .join(' ')
}

const normalizeName = (value?: string | null) =>
  (value ?? '')
    .toLowerCase()
    .replace(/\b(?:district|districte)\b/g, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const districtAliasMap: Record<string, string[]> = {
  tirupati: ['chittoor'],
  chittoor: ['tirupati'],
  'ysr kadapa': ['kadapa'],
  kadapa: ['ysr kadapa'],
  'sri potti sriramulu nellore': ['nellore'],
  nellore: ['sri potti sriramulu nellore'],
  ntr: ['krishna'],
  krishna: ['ntr'],
  'dr b r ambedkar konaseema': ['east godavari'],
  'east godavari': ['dr b r ambedkar konaseema'],
  ananthapuramu: ['anantapur', 'ananthapur'],
  anantapur: ['ananthapuramu', 'ananthapur'],
  ananthapur: ['ananthapuramu', 'anantapur'],
  visakhapatnam: ['vishakhapatnam'],
  vishakhapatnam: ['visakhapatnam'],
  'parvathipuram manyam': ['parvathipuram'],
  parvathipuram: ['parvathipuram manyam'],
  'alluri sitharama raju': ['alluri sitharama'],
  'alluri sitharama': ['alluri sitharama raju'],
}

const getDistrictKey = (value?: string | null) => {
  const normalized = normalizeName(value)

  if (!normalized) {
    return ''
  }

  const matchedKey = Object.keys(districtAliasMap).find((key) => key === normalized || (districtAliasMap[key] ?? []).includes(normalized))
  return matchedKey ?? normalized
}

const districtNameMatches = (left?: string | null, right?: string | null) => {
  const leftKey = getDistrictKey(left)
  const rightKey = getDistrictKey(right)

  if (!leftKey || !rightKey) {
    return false
  }

  return leftKey === rightKey
}

const getGeometryBounds = (geometry: { type: string; coordinates?: any[] } | null | undefined): [number, number, number, number] | null => {
  if (!geometry) {
    return null
  }

  const coordinateList: number[][] = []

  const flatten = (value: any[]): void => {
    value.forEach((entry) => {
      if (Array.isArray(entry) && entry.length > 0 && typeof entry[0] === 'number') {
        coordinateList.push(entry as number[])
      } else if (Array.isArray(entry)) {
        flatten(entry)
      }
    })
  }

  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    flatten(geometry.coordinates)
  } else if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    geometry.coordinates.forEach((polygon) => {
      if (Array.isArray(polygon)) {
        flatten(polygon)
      }
    })
  } else if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    coordinateList.push([...geometry.coordinates] as number[])
  }

  if (coordinateList.length === 0) {
    return null
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  coordinateList.forEach(([lng, lat]) => {
    minX = Math.min(minX, lng)
    minY = Math.min(minY, lat)
    maxX = Math.max(maxX, lng)
    maxY = Math.max(maxY, lat)
  })

  return [minX, minY, maxX, maxY]
}

const fallbackMapStyle = {
  version: 8,
  name: 'Plain fallback style',
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#edf4f7',
      },
    },
  ],
} as const

type ActivePortalUser = { audience: 'Officer' | 'Citizen'; role: string }

const readStoredUser = (): ActivePortalUser | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const user = JSON.parse(window.sessionStorage.getItem('bhusha_user') ?? 'null')
    if (user?.role && (user.audience === 'officer' || user.audience === 'citizen')) {
      return { audience: user.audience === 'citizen' ? 'Citizen' : 'Officer', role: user.role }
    }
  } catch {
    return null
  }
  return null
}

function App() {
  const [activeUser, setActiveUser] = useState<ActivePortalUser | null>(() => readStoredUser())
  const [portalMode, setPortalMode] = useState<'landing' | 'officer-login' | 'citizen-login' | 'workspace'>(() => readStoredUser() ? 'workspace' : 'landing')
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [selectedConflictId, setSelectedConflictId] = useState('TPT-00128')
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<string, Polygon>>({})
  const [groundTruthNote, setGroundTruthNote] = useState('Please verify the redrawn boundary against field measurements and source records.')
  const [groundTruthMessage, setGroundTruthMessage] = useState('')
  const [groundTruthBusy, setGroundTruthBusy] = useState(false)
  const [activeScale, setActiveScale] = useState<'District' | 'Mandal' | 'Conflict' | 'Feature'>('Conflict')
  const [selectedDistrict, setSelectedDistrict] = useState('Tirupati')
  const [selectedMandal, setSelectedMandal] = useState('All')
  const [districtOptions, setDistrictOptions] = useState<string[]>(['Tirupati'])
  const [districtFeatureCollection, setDistrictFeatureCollection] = useState(districtGeojson)
  const [mandalFeatureCollection, setMandalFeatureCollection] = useState(mandalGeojson)
  const [hoveredConflict, setHoveredConflict] = useState<string | null>(null)
  const [hoveredMapInfo, setHoveredMapInfo] = useState<{ x: number; y: number; title: string; subtitle: string } | null>(null)
  const [layersVisible, setLayersVisible] = useState({
    districts: true,
    mandals: true,
    clusters: true,
    parcels: true,
    drone: true,
    gnss: true,
    conflicts: true,
  })
  const [apiSummary, setApiSummary] = useState({
    district: 'Tirupati District',
    parcels: 14280,
    conflicts: 5,
    avgConfidence: 89,
    activeMandalCount: 6,
    openCases: 3,
  })
  const [integrationDepartment, setIntegrationDepartment] = useState(departmentIntegrations[0].id)
  const [integrationMethod, setIntegrationMethod] = useState('Secure API')
  const [integrationContact, setIntegrationContact] = useState('')
  const [integrationNotes, setIntegrationNotes] = useState('')
  const [integrationRequestMessage, setIntegrationRequestMessage] = useState('')
  const [integrationRequests, setIntegrationRequests] = useState<Array<{ department: string; method: string; contact: string; notes: string }>>([])
  const [outputFilter, setOutputFilter] = useState('All')
  const [runStatusFilter, setRunStatusFilter] = useState<'All' | 'Published' | 'In review' | 'Superseded'>('All')
  const [selectedRunId, setSelectedRunId] = useState('harm-014')
  const [conflictList, setConflictList] = useState(conflictRecords)
  const [decisionOutcome, setDecisionOutcome] = useState('Approve boundary correction')
  const [approvalState, setApprovalState] = useState<'Approved' | 'Pending review' | 'Escalated'>('Approved')
  const [decisionNote, setDecisionNote] = useState('Boundary displacement is under threshold and the parcel under review has a coherent GNSS and drone fit. The parcel should be corrected at the cadastral layer and approved for record update.')
  const [activeNav, setActiveNav] = useState<WorkspaceView>('Workspace')

  useEffect(() => {
    configureMapWorker()

    const loadGeoOptions = async () => {
      try {
        const [districtResponse, mandalResponse] = await Promise.all([
          fetch('/ap-districts.geojson'),
          fetch('/ap-mandals.geojson'),
        ])

        if (districtResponse.ok) {
          const districtData = await districtResponse.json()
          const districtNames: string[] = Array.from(new Set<string>(
            (districtData.features ?? [])
              .map((feature: any) => String(
                formatGeoLabel(feature.properties?.district_name ?? feature.properties?.NEW_DIST ?? feature.properties?.name ?? feature.properties?.districtName ?? ''),
              ))
              .filter((value: string): value is string => Boolean(value)),
          )).sort((a, b) => a.localeCompare(b))

          if (districtNames.length) {
            setDistrictFeatureCollection(districtData)
            setDistrictOptions(districtNames)
            if (!districtNames.some((name) => normalizeName(name) === normalizeName(selectedDistrict))) {
              setSelectedDistrict(districtNames[0])
            }
          }
        }

        if (mandalResponse.ok) {
          const mandalData = await mandalResponse.json()
          setMandalFeatureCollection(mandalData)
        }
      } catch {
        // Keep bundled fallback values when the public GeoJSON is unavailable.
      }
    }

    const loadDashboard = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/overview')
        if (!response.ok) { return }
        const data = await response.json()
        if (data.summary) {
          setApiSummary(data.summary)
        }
        if (data.conflictRecords?.length) {
          setConflictList(data.conflictRecords)
          setSelectedConflictId(data.conflictRecords[0].id)
        }
      } catch {
        // Fallback to bundled demo dataset when the local backend is unavailable.
      }
    }

    loadGeoOptions()
    loadDashboard()
  }, [])

  const desaMandalOptions = useMemo(() => {
    const selectedDistrictKey = getDistrictKey(selectedDistrict)
    const names = Array.from(new Set(
      mandalFeatureCollection.features
        .map((feature) => {
          const districtName = feature.properties?.DNAME ?? feature.properties?.district_name ?? feature.properties?.district ?? ''
          const mandalName = feature.properties?.DMNAME ?? feature.properties?.name ?? feature.properties?.dmname ?? ''

          if (!districtName || !mandalName) {
            return null
          }

          return getDistrictKey(districtName) === selectedDistrictKey ? formatGeoLabel(mandalName) : null
        })
        .filter((name): name is string => Boolean(name) && normalizeName(name) !== ''),
    )).sort((a, b) => a.localeCompare(b))

    return ['All', ...names]
  }, [mandalFeatureCollection, selectedDistrict])

  useEffect(() => {
    if (selectedMandal !== 'All' && !desaMandalOptions.includes(selectedMandal)) {
      setSelectedMandal('All')
    }
  }, [selectedMandal, desaMandalOptions])

  const filteredConflictList = useMemo(() => {
    return conflictList.filter((conflict) => {
      const districtMatch = selectedDistrict ? districtNameMatches(conflict.district, selectedDistrict) : true
      const mandalMatch = selectedMandal === 'All' ? true : districtNameMatches(conflict.mandal, selectedMandal)
      return districtMatch && mandalMatch
    })
  }, [conflictList, selectedDistrict, selectedMandal])

  const filteredConflictFeatureCollection = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredConflictList.map((conflict) => ({
      type: 'Feature' as const,
      properties: {
        id: conflict.id,
        title: conflict.title,
        type: conflict.type,
        severity: conflict.severity,
        status: conflict.status,
        confidence: conflict.confidence,
        uncertainty: conflict.uncertainty,
        displacement: conflict.displacement,
        areaDifference: conflict.areaDifference,
        district: conflict.district,
        mandal: conflict.mandal,
        sourceA: conflict.sourceA,
        sourceB: conflict.sourceB,
        description: conflict.description,
      },
      geometry: conflict.geometry,
    })),
  }), [filteredConflictList])

  useEffect(() => {
    if (filteredConflictList.length === 0) {
      setSelectedConflictId('')
      return
    }

    if (!filteredConflictList.some((conflict) => conflict.id === selectedConflictId)) {
      setSelectedConflictId(filteredConflictList[0].id)
    }
  }, [filteredConflictList, selectedConflictId])

  const selectedConflict = useMemo(
    () => filteredConflictList.find((item) => item.id === selectedConflictId) ?? filteredConflictList[0] ?? conflictList[0],
    [selectedConflictId, filteredConflictList, conflictList],
  )

  const selectedMandalFeature = useMemo(
    () => mandalFeatureCollection.features.find((feature) => {
      const rawName = feature.properties?.DMNAME ?? feature.properties?.name ?? feature.properties?.dmname ?? ''
      return normalizeName(formatGeoLabel(rawName)) === normalizeName(selectedMandal)
    }) ?? null,
    [selectedMandal, mandalFeatureCollection],
  )

  const activeWorkflowSummary = useMemo(() => {
    if (activeScale === 'District') {
      return 'District overview is active; boundary and cluster context are visible.'
    }
    if (activeScale === 'Mandal') {
      return 'Mandal focus is active; high-risk zones are prioritized for review.'
    }
    if (activeScale === 'Feature') {
      return 'Feature comparison view is active; parcel and source geometry are aligned.'
    }
    return 'Conflict auto-zoom is active; selected dispute is centered for investigation.'
  }, [activeScale])

  const donutSlices = useMemo(() => {
    const total = Math.max(filteredConflictList.length, 1)
    const high = filteredConflictList.filter((item) => item.severity === 'High').length
    const medium = filteredConflictList.filter((item) => item.severity === 'Medium').length
    const low = filteredConflictList.filter((item) => item.severity === 'Low').length

    return [
      { label: 'High', value: high, color: '#d94d4d', percent: (high / total) * 100 },
      { label: 'Medium', value: medium, color: '#f5b942', percent: (medium / total) * 100 },
      { label: 'Low', value: low, color: '#3e8d6b', percent: (low / total) * 100 },
    ]
  }, [filteredConflictList])

  const kpiCards = useMemo(() => {
    const active = filteredConflictList.filter((item) => item.status !== 'Auto-resolved').length
    const resolved = filteredConflictList.filter((item) => item.status === 'Auto-resolved').length
    const avgConfidence = filteredConflictList.length
      ? Math.round(filteredConflictList.reduce((sum, item) => sum + item.confidence, 0) / filteredConflictList.length)
      : 0
    const avgDisplacement = filteredConflictList.length
      ? (filteredConflictList.reduce((sum, item) => sum + item.displacement, 0) / filteredConflictList.length).toFixed(2)
      : '0.00'

    return [
      { label: 'Active cases', value: String(active), tone: 'alert' },
      { label: 'Auto-resolved', value: String(resolved), tone: 'good' },
      { label: 'Avg confidence', value: `${avgConfidence}%`, tone: 'good' },
      { label: 'Mean displacement', value: `${avgDisplacement} m`, tone: 'warning' },
    ]
  }, [filteredConflictList])

  const flyToBounds = (bbox: [number, number, number, number], padding = 60, maxZoom = 18) => {
    const map = mapRef.current
    if (!map) {
      return
    }

    map.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      {
        padding,
        duration: 1400,
        maxZoom,
      },
    )
  }

  const focusOnConflict = (bbox: [number, number, number, number]) => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const centerLng = (bbox[0] + bbox[2]) / 2
    const centerLat = (bbox[1] + bbox[3]) / 2

    map.flyTo({
      center: [centerLng, centerLat],
      zoom: 17,
      duration: 1400,
      essential: true,
    })
  }

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    if (selectedMandal !== 'All') {
      const mandalFeature = mandalFeatureCollection.features.find((feature) => {
        const rawName = feature.properties?.DMNAME ?? feature.properties?.name ?? feature.properties?.dmname ?? ''
        return normalizeName(formatGeoLabel(rawName)) === normalizeName(selectedMandal)
      })

      const bounds = mandalFeature ? getGeometryBounds(mandalFeature.geometry) : null
      if (bounds) {
        setActiveScale('Mandal')
        map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
          padding: 60,
          duration: 1200,
          maxZoom: 14,
        })
        return
      }
    }

    const districtFeature = districtFeatureCollection.features.find((feature) => {
      const districtName = feature.properties?.district_name ?? feature.properties?.NEW_DIST ?? feature.properties?.name ?? ''
      return normalizeName(formatGeoLabel(districtName)) === normalizeName(selectedDistrict.replace(/ District$/i, ''))
    })

    const districtBounds = districtFeature ? getGeometryBounds(districtFeature.geometry) : null
    if (districtBounds) {
      setActiveScale('District')
      map.fitBounds([[districtBounds[0], districtBounds[1]], [districtBounds[2], districtBounds[3]]], {
        padding: 35,
        duration: 1200,
        maxZoom: 11,
      })
    }
  }, [districtFeatureCollection, mandalFeatureCollection, selectedDistrict, selectedMandal])

  useEffect(() => {
    if (activeNav !== 'Dashboard' && activeNav !== 'Map') {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      return
    }

    if (!mapContainer.current) {
      return
    }

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: fallbackMapStyle as any,
      center: [79.62, 13.78],
      zoom: 9.5,
      minZoom: 8,
    })

    mapRef.current = map

    map.on('load', () => {
      requestAnimationFrame(() => map.resize())

      map.addSource('state', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: { name: 'Andhra Pradesh' },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [76.9, 12.6],
                [84.8, 12.6],
                [84.8, 19.8],
                [76.9, 19.8],
                [76.9, 12.6],
              ]],
            },
          }],
        },
      })

      map.addSource('district', { type: 'geojson', data: '/ap-districts.geojson' })
      map.addSource('mandals', { type: 'geojson', data: '/ap-mandals.geojson' })
      map.addSource('clusters', { type: 'geojson', data: clusterGeojson })
      map.addSource('parcels', { type: 'geojson', data: parcelGeojson })
      map.addSource('drone', { type: 'geojson', data: droneGeojson })
      map.addSource('gnss', { type: 'geojson', data: gnssGeojson })
      map.addSource('conflicts', { type: 'geojson', data: filteredConflictFeatureCollection })

      map.addLayer({
        id: 'state-layer',
        type: 'fill',
        source: 'state',
        paint: {
          'fill-color': '#dfe7f2',
          'fill-opacity': 0.04,
        },
      })

      map.addLayer({
        id: 'state-line-layer',
        type: 'line',
        source: 'state',
        paint: {
          'line-color': '#0f172a',
          'line-width': 3,
          'line-opacity': 1,
        },
      })

      map.addLayer({
        id: 'district-layer',
        type: 'fill',
        source: 'district',
        paint: {
          'fill-color': '#7dd3a8',
          'fill-opacity': 0.12,
        },
      })

      map.addLayer({
        id: 'district-line-layer',
        type: 'line',
        source: 'district',
        paint: {
          'line-color': '#116b4a',
          'line-width': 2,
          'line-opacity': 0.95,
        },
      })

      map.addLayer({
        id: 'mandal-layer',
        type: 'fill',
        source: 'mandals',
        paint: {
          'fill-color': '#fbbf24',
          'fill-opacity': 0.08,
        },
      })

      map.addLayer({
        id: 'mandal-boundary-layer',
        type: 'line',
        source: 'mandals',
        paint: {
          'line-color': '#b45309',
          'line-width': 1.3,
          'line-opacity': 0.95,
        },
      })

      map.addSource('selected-mandal', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: selectedMandalFeature ? [selectedMandalFeature] : [],
        },
      })

      map.addLayer({
        id: 'selected-mandal-layer',
        type: 'fill',
        source: 'selected-mandal',
        paint: {
          'fill-color': '#2563eb',
          'fill-opacity': 0.55,
        },
      })

      map.addLayer({
        id: 'selected-mandal-line-layer',
        type: 'line',
        source: 'selected-mandal',
        paint: {
          'line-color': '#1e3a8a',
          'line-width': 5,
          'line-opacity': 1,
        },
      })

      map.addLayer({
        id: 'cluster-layer',
        type: 'circle',
        source: 'clusters',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0, 8, 100, 20],
          'circle-color': '#e5625d',
          'circle-opacity': 0.8,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        },
      })

      map.addLayer({
        id: 'parcels-layer',
        type: 'fill',
        source: 'parcels',
        paint: {
          'fill-color': '#d29f59',
          'fill-opacity': 0.72,
          'fill-outline-color': '#8c5f1f',
        },
      })

      map.addLayer({
        id: 'drone-layer',
        type: 'fill',
        source: 'drone',
        paint: {
          'fill-color': '#3f79c7',
          'fill-opacity': 0.44,
          'fill-outline-color': '#1e4e92',
        },
      })

      map.addLayer({
        id: 'gnss-layer',
        type: 'fill',
        source: 'gnss',
        paint: {
          'fill-color': '#31a39a',
          'fill-opacity': 0.38,
          'fill-outline-color': '#1d6d66',
        },
      })

      map.addLayer({
        id: 'conflict-layer',
        type: 'fill',
        source: 'conflicts',
        paint: {
          'fill-color': '#d94d4d',
          'fill-opacity': 0.42,
          'fill-outline-color': '#8d211d',
        },
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')
      map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

      map.addSource('selected-conflict', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: { id: selectedConflict.id },
            geometry: selectedConflict.geometry,
          }],
        },
      })

      map.addLayer({
        id: 'selected-conflict-layer',
        type: 'fill',
        source: 'selected-conflict',
        paint: {
          'fill-color': '#f8ba00',
          'fill-opacity': 0.9,
          'fill-outline-color': '#8b5e00',
        },
      })

      map.addSource('selected-conflict-line', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: { label: selectedConflict.id },
            geometry: selectedConflict.geometry,
          }],
        },
      })

      map.addLayer({
        id: 'selected-conflict-line-layer',
        type: 'line',
        source: 'selected-conflict-line',
        paint: {
          'line-color': '#f8ba00',
          'line-width': 4,
        },
      })

      const showConflictHover = (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature?.properties) {
          return
        }

        const properties = feature.properties as Record<string, string | number | undefined>
        const id = String(properties.id ?? 'Conflict')
        const severity = String(properties.severity ?? 'High')
        const mandate = String(properties.mandal ?? 'Tirupati')
        const confidence = Number(properties.confidence ?? 0)

        map.getCanvas().style.cursor = 'pointer'
        setHoveredMapInfo({
          x: event.point.x,
          y: event.point.y,
          title: id,
          subtitle: `${severity} • ${mandate} • ${confidence}% confidence`,
        })
      }

      map.on('mousemove', 'conflict-layer', showConflictHover)
      map.on('mouseleave', 'conflict-layer', () => {
        map.getCanvas().style.cursor = ''
        setHoveredMapInfo(null)
      })

      map.on('mousemove', 'cluster-layer', (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature?.properties) {
          return
        }

        const properties = feature.properties as Record<string, string | number | undefined>
        const score = Number(properties.score ?? 0)
        const label = String(properties.label ?? 'Cluster')

        map.getCanvas().style.cursor = 'pointer'
        setHoveredMapInfo({
          x: event.point.x,
          y: event.point.y,
          title: label,
          subtitle: `Risk score ${score}/100`,
        })
      })

      map.on('mouseleave', 'cluster-layer', () => {
        map.getCanvas().style.cursor = ''
        setHoveredMapInfo(null)
      })

      map.on('click', 'mandal-layer', (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        const rawName = String(feature?.properties?.DMNAME ?? feature?.properties?.name ?? 'All')
        const name = formatGeoLabel(rawName)
        if (name && name !== 'All') {
          setSelectedMandal(name)
          setActiveScale('Mandal')

          const bounds = getGeometryBounds(feature?.geometry ?? null)
          if (bounds) {
            flyToBounds(bounds, 70, 14)
          }
        }
      })

      map.on('click', 'conflict-layer', (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature?.properties) {
          return
        }
        const id = String(feature.properties.id ?? selectedConflict.id)
        setSelectedConflictId(id)
        const match = conflictList.find((item) => item.id === id)
        if (match) {
          focusOnConflict(match.bbox)
        }
      })

      map.fitBounds(districtBounds, { padding: 35, duration: 1200 })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [activeNav, selectedConflict.id, conflictList])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const mapLayers = {
      districts: 'district-layer',
      mandals: 'mandal-layer',
      clusters: 'cluster-layer',
      parcels: 'parcels-layer',
      drone: 'drone-layer',
      gnss: 'gnss-layer',
      conflicts: 'conflict-layer',
    }

    Object.entries(mapLayers).forEach(([key, layerId]) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          'visibility',
          layersVisible[key as keyof typeof layersVisible] ? 'visible' : 'none',
        )
      }
    })
  }, [layersVisible])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const map = mapRef.current
    const selectedSource = map.getSource('selected-conflict') as maplibregl.GeoJSONSource | undefined
    const selectedLineSource = map.getSource('selected-conflict-line') as maplibregl.GeoJSONSource | undefined
    const selectedMandalSource = map.getSource('selected-mandal') as maplibregl.GeoJSONSource | undefined
    const conflictSource = map.getSource('conflicts') as maplibregl.GeoJSONSource | undefined

    if (selectedSource) {
      selectedSource.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { id: selectedConflict.id },
          geometry: selectedConflict.geometry,
        }],
      })
    }

    if (selectedLineSource) {
      selectedLineSource.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { label: selectedConflict.id },
          geometry: selectedConflict.geometry,
        }],
      })
    }

    if (selectedMandalSource) {
      selectedMandalSource.setData({
        type: 'FeatureCollection',
        features: selectedMandalFeature ? [selectedMandalFeature] : [],
      })
    }

    if (conflictSource) {
      conflictSource.setData(filteredConflictFeatureCollection)
    }

    if (activeScale === 'District') {
      flyToBounds([78.9805, 13.2935, 80.2685, 14.2662], 35, 11)
    } else if (activeScale === 'Mandal' && selectedMandal !== 'All') {
      const mandalTarget = mandalBounds[selectedMandal as keyof typeof mandalBounds] ?? null
      if (mandalTarget) {
        flyToBounds(mandalTarget, 80, 14)
      }
    } else if (filteredConflictList.length) {
      focusOnConflict(selectedConflict.bbox)
    }
  }, [selectedConflict, activeScale, selectedMandal, filteredConflictList, filteredConflictFeatureCollection])

  const handleConflictSelect = (conflictId: string) => {
    setSelectedConflictId(conflictId)
    const match = conflictList.find((item) => item.id === conflictId)
    if (match) {
      focusOnConflict(match.bbox)
    }
  }

  const donutRadius = 52
  const circumference = 2 * Math.PI * donutRadius
  const donutSegments = donutSlices.map((slice) => ({
    ...slice,
    dasharray: `${(slice.percent / 100) * circumference} ${circumference}`,
    dashoffset: -donutSlices.slice(0, donutSlices.findIndex((item) => item.label === slice.label)).reduce((sum, item) => sum + (item.percent / 100) * circumference, 0),
  }))

  const renderDashboardView = () => (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">{apiSummary.district.toUpperCase()}</div>
          <h2>Integrated land intelligence</h2>
        </div>
        <div className="topbar-actions">
          <button className="secondary" onClick={() => setActiveScale('District')}>District overview</button>
          <button className="primary">District Officer</button>
        </div>
      </header>

      <section className="officer-summary-panel">
        <div className="panel-header summary-header">
          <span>Department officer summary</span>
          <button type="button">Last sync 08:42</button>
        </div>
        <div className="summary-grid summary-grid-compact">
          {kpiCards.map((item) => (
            <div key={item.label} className={`summary-card ${item.tone}`}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-toolbar filter-row">
        <div className="filter-group">
          <label>District</label>
          <select value={selectedDistrict} onChange={(event) => {
            setSelectedDistrict(event.target.value)
            setSelectedMandal('All')
            setActiveScale('District')
          }}>
            {districtOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Mandal</label>
          <select value={selectedMandal} onChange={(event) => {
            const nextValue = event.target.value
            setSelectedMandal(nextValue)
            setActiveScale(nextValue === 'All' ? 'District' : 'Mandal')
          }}>
            {desaMandalOptions.map((mandal) => (
              <option key={mandal} value={mandal}>{mandal}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="dashboard-visualization">
        <div className="panel trend-panel">
          <div className="panel-header small-header">
            <span>Conflict trend</span>
            <button type="button">6M view</button>
          </div>
          <div className="trend-chart" aria-label="Conflict trend chart">
            {riskTrend.map((point) => (
              <div key={point.label} className="trend-column">
                <span className="trend-bar" style={{ height: `${point.value}%` }} />
                <small>{point.label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel distribution-panel">
          <div className="panel-header small-header">
            <span>Source mix</span>
            <button type="button">Updated</button>
          </div>

          <div className="donut-wrap">
            <svg className="donut-chart" viewBox="0 0 180 180" aria-label="Conflict severity donut chart">
              <circle cx="90" cy="90" r={donutRadius} fill="none" stroke="rgba(31, 42, 36, 0.08)" strokeWidth="26" />
              {donutSegments.map((slice) => (
                <circle
                  key={slice.label}
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="26"
                  strokeDasharray={slice.dasharray}
                  strokeDashoffset={slice.dashoffset}
                  transform="rotate(-90 90 90)"
                />
              ))}
              <text x="90" y="86" textAnchor="middle" className="donut-total">{filteredConflictList.length}</text>
              <text x="90" y="104" textAnchor="middle" className="donut-label">Cases</text>
            </svg>

            <div className="donut-legend">
              {donutSlices.map((slice) => (
                <div key={slice.label} className="legend-item">
                  <span className="legend-swatch" style={{ background: slice.color }} />
                  <span>{slice.label}</span>
                  <strong>{slice.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="distribution-list">
            {sourceMix.map((item) => (
              <div key={item.label} className="distribution-row">
                <div className="distribution-label">
                  <span>{item.label}</span>
                  <strong>{item.value}%</strong>
                </div>
                <div className="distribution-track">
                  <span className={`distribution-fill ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="decision-workflow dashboard-decision-panel">
        <div className="panel decision-panel">
          <div className="panel-header small-header">
            <span>CASE DECISION FORM</span>
            <button type="button">Draft memo</button>
          </div>

          <div className="decision-options">
            {decisionOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`decision-option ${decisionOutcome === option ? 'selected' : ''}`}
                onClick={() => setDecisionOutcome(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <label className="field-label">
            Officer notes
            <textarea
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              rows={4}
            />
          </label>

          <div className="approval-row">
            <button type="button" className="approval-button approve" onClick={() => setApprovalState('Approved')}>Approve</button>
            <button type="button" className="approval-button review" onClick={() => setApprovalState('Pending review')}>Request review</button>
            <button type="button" className="approval-button escalate" onClick={() => setApprovalState('Escalated')}>Escalate</button>
          </div>
        </div>

        <div className="panel attachment-panel">
          <div className="panel-header small-header">
            <span>DOCUMENT ATTACHMENTS</span>
            <button type="button">Upload</button>
          </div>
          <div className="attachment-list">
            {attachmentList.map((item) => (
              <div key={item.name} className="attachment-item">
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.type}</small>
                </div>
                <span className="attachment-status">{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel summary-panel">
          <div className="panel-header small-header">
            <span>FINAL SIGNED SUMMARY</span>
            <button type="button">Sign</button>
          </div>

          <div className="signed-summary">
            <div className="summary-badge">{approvalState}</div>
            <h4>{selectedConflict.id}: {decisionOutcome}</h4>
            <p>{decisionNote}</p>
            <div className="signature-row">
              <div>
                <label>Signed by</label>
                <strong>District Officer</strong>
              </div>
              <div>
                <label>Date</label>
                <strong>26 Sep 2026</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="operational-grid">
        <div className="panel timeline-panel">
          <div className="panel-header small-header">
            <span>Priority review queue</span>
            <button type="button">View all</button>
          </div>
          <div className="timeline-list">
            {conflictList.slice(0, 3).map((conflict) => (
              <button
                key={conflict.id}
                type="button"
                className="timeline-item conflict-mini-item"
                onClick={() => handleConflictSelect(conflict.id)}
              >
                <div className="timeline-bullet" />
                <div className="timeline-content">
                  <div className="timeline-topline">
                    <strong>{conflict.id}</strong>
                    <span className={`timeline-status ${conflict.severity.toLowerCase()}`}>{conflict.severity}</span>
                  </div>
                  <small>{conflict.title}</small>
                  <em>{conflict.sourceA} vs {conflict.sourceB}</em>
                  {hoveredConflict === conflict.id && (
                    <div className="hover-card">
                      <strong>{conflict.mandal}</strong>
                      <span>{conflict.confidence}% confidence</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel audit-panel">
          <div className="panel-header small-header">
            <span>Department integrations</span>
            <button type="button" onClick={() => setActiveNav('Integrations')}>View all</button>
          </div>
          <div className="audit-list">
            {departmentIntegrations.slice(0, 3).map((entry) => (
              <div key={entry.id} className="audit-item">
                <div>
                  <strong>{entry.department}</strong>
                  <small>{entry.dataScope}</small>
                </div>
                <span className="audit-pill">{entry.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )

  const renderMapView = () => (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">{apiSummary.district.toUpperCase()}</div>
          <h2>Map workspace</h2>
        </div>
        <div className="topbar-actions">
          <button className="secondary" onClick={() => setActiveScale('District')}>District overview</button>
          <button className="primary">Spatial review</button>
        </div>
      </header>
      <section className="map-panel">
        <div className="map-toolbar">
          <div className="filter-chips">
            {(['District', 'Mandal', 'Conflict', 'Feature'] as const).map((scale) => (
              <button
                key={scale}
                className={`chip ${activeScale === scale ? 'active' : ''}`}
                onClick={() => setActiveScale(scale)}
              >
                {scale}
              </button>
            ))}
          </div>
          <div className="map-admin-selectors">
            <label className="map-select-wrap">
              <span>District</span>
              <select value={selectedDistrict} onChange={(event) => {
                setSelectedDistrict(event.target.value)
                setSelectedMandal('All')
                setActiveScale('District')
              }}>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </label>
            <label className="map-select-wrap">
              <span>Mandal</span>
              <select value={selectedMandal} onChange={(event) => {
                const nextValue = event.target.value
                setSelectedMandal(nextValue)
                setActiveScale(nextValue === 'All' ? 'District' : 'Mandal')
              }}>
                {desaMandalOptions.map((mandal) => (
                  <option key={mandal} value={mandal}>{mandal}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="layer-toggles">
            <label><input type="checkbox" checked={layersVisible.districts} onChange={() => setLayersVisible((prev) => ({ ...prev, districts: !prev.districts }))} /> District</label>
            <label><input type="checkbox" checked={layersVisible.mandals} onChange={() => setLayersVisible((prev) => ({ ...prev, mandals: !prev.mandals }))} /> Mandals</label>
            <label><input type="checkbox" checked={layersVisible.clusters} onChange={() => setLayersVisible((prev) => ({ ...prev, clusters: !prev.clusters }))} /> Clusters</label>
            <label><input type="checkbox" checked={layersVisible.parcels} onChange={() => setLayersVisible((prev) => ({ ...prev, parcels: !prev.parcels }))} /> Parcels</label>
            <label><input type="checkbox" checked={layersVisible.drone} onChange={() => setLayersVisible((prev) => ({ ...prev, drone: !prev.drone }))} /> Drone</label>
            <label><input type="checkbox" checked={layersVisible.gnss} onChange={() => setLayersVisible((prev) => ({ ...prev, gnss: !prev.gnss }))} /> GNSS</label>
            <label><input type="checkbox" checked={layersVisible.conflicts} onChange={() => setLayersVisible((prev) => ({ ...prev, conflicts: !prev.conflicts }))} /> Conflicts</label>
          </div>
        </div>
        <div className="map-status-bar">
          <div className="status-pill">Live operations</div>
          <div className="status-copy">{activeWorkflowSummary}</div>
          <div className="status-actions">
            <button type="button">Export report</button>
            <button type="button" className="status-primary">Resolve case</button>
          </div>
        </div>
        <div className="map-wrapper">
          <div ref={mapContainer} className="map-canvas" />
          {hoveredMapInfo && (
            <div className="map-tooltip" style={{ left: hoveredMapInfo.x + 18, top: hoveredMapInfo.y + 18 }}>
              <strong>{hoveredMapInfo.title}</strong>
              <span>{hoveredMapInfo.subtitle}</span>
            </div>
          )}
          <div className="floating-legend">
            <span><i className="dot parcel" /> CADASTRAL</span>
            <span><i className="dot drone" /> DRONE</span>
            <span><i className="dot gnss" /> GNSS</span>
            <span><i className="dot conflict" /> CONFLICT</span>
          </div>
          <div className="measure-pill">{selectedConflict.displacement.toFixed(2)} m displacement</div>
        </div>
      </section>
    </>
  )

  const renderConflictsView = () => (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">CONFLICTS</div>
          <h2>Conflict review queue</h2>
        </div>
        <div className="topbar-actions">
          <button className="secondary" onClick={() => setActiveScale('Conflict')}>Auto-zoom</button>
          <button className="primary">Review board</button>
        </div>
      </header>
      <section className="conflict-review-layout">
        <div className="panel conflict-list-panel">
          <div className="panel-header small-header">
            <span>CONFLICT QUEUE · {filteredConflictList.length}</span>
          </div>
          {filteredConflictList.map((conflict) => (
            <button
              key={conflict.id}
              className={`conflict-item ${selectedConflict.id === conflict.id ? 'selected' : ''}`}
              onClick={() => handleConflictSelect(conflict.id)}
              onMouseEnter={() => setHoveredConflict(conflict.id)}
              onMouseLeave={() => setHoveredConflict(null)}
            >
              <div className="conflict-headline">
                <strong>{conflict.id}</strong>
                <span className={`severity ${conflict.severity.toLowerCase()}`}>{conflict.severity}</span>
              </div>
              <div>{conflict.title}</div>
              <small>{conflict.mandal} • {conflict.sourceA} vs {conflict.sourceB}</small>
              {hoveredConflict === conflict.id && (
                <div className="hover-card compact-hover">
                  <strong>{conflict.confidence}% confidence</strong>
                  <span>{conflict.displacement.toFixed(2)} m displacement</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="panel inspector-panel">
          <div className="panel-header small-header">
            <span>SELECTED CONFLICT</span>
            <button type="button" onClick={() => {
              setActiveScale('Conflict')
              setActiveNav('Map')
            }}>Locate on map</button>
          </div>
          <div className="title-row">
            <h3>{selectedConflict.id}</h3>
            <span className={`severity ${selectedConflict.severity.toLowerCase()}`}>{selectedConflict.severity}</span>
          </div>
          <div className="conflict-inspector-location">{selectedConflict.title} <span>·</span> {selectedConflict.district} <span>·</span> {selectedConflict.mandal}</div>
          <div className="conflict-source-comparison" aria-label="Compared data sources">
            <div><small>SOURCE A</small><strong>{selectedConflict.sourceA}</strong></div>
            <span className="source-versus">VS</span>
            <div><small>SOURCE B</small><strong>{selectedConflict.sourceB}</strong></div>
          </div>
          <div className="conflict-geometry-heading"><span>GEOMETRY OVERLAY</span><small>Both source boundaries shown in the same view</small></div>
          <div className="conflict-geometry-legend">
            <span><i className="source-a-swatch" />{selectedConflict.sourceA}</span>
            <span><i className="source-b-swatch" />{selectedConflict.sourceB}</span>
          </div>
          <ConflictGeometryComparison
            conflictId={selectedConflict.id}
            sourceAName={selectedConflict.sourceA}
            sourceBName={selectedConflict.sourceB}
            sourceAGeometry={selectedConflict.sourceGeometry}
            sourceBGeometry={selectedConflict.comparisonGeometry}
            correctionGeometry={correctionDrafts[selectedConflict.id] ?? null}
            onCorrectionSaved={(geometry) => {
              setCorrectionDrafts((drafts) => ({ ...drafts, [selectedConflict.id]: geometry }))
              setGroundTruthMessage('Correction draft saved for this conflict. You can submit it for field verification when ready.')
            }}
          />
          {correctionDrafts[selectedConflict.id] && (
            <form className="ground-truth-submit-form" onSubmit={async (event) => {
              event.preventDefault()
              setGroundTruthBusy(true)
              setGroundTruthMessage('')
              try {
                const result = await groundTruthApi.submitRequest({
                  conflict_id: selectedConflict.id,
                  geometry: correctionDrafts[selectedConflict.id],
                  note: groundTruthNote,
                })
                setGroundTruthMessage(`Ground-truth request ${result.request.id} queued for review.`)
              } catch (error) {
                setGroundTruthMessage(error instanceof Error ? error.message : 'Could not submit the ground-truth request.')
              } finally {
                setGroundTruthBusy(false)
              }
            }}>
              <label><span>Ground-truth request note</span><textarea value={groundTruthNote} onChange={(event) => setGroundTruthNote(event.target.value)} rows={2} required /></label>
              <button type="submit" className="request-ground-truth-button" disabled={groundTruthBusy}>{groundTruthBusy ? 'Submitting…' : 'Send for ground-truth review'}</button>
              {groundTruthMessage && <p role="status">{groundTruthMessage}</p>}
            </form>
          )}
          <div className="conflict-key-metrics">
            <div><small>GEOMETRY CONFIDENCE</small><strong>{selectedConflict.confidence}%</strong></div>
            <div><small>BOUNDARY OFFSET</small><strong>{selectedConflict.displacement.toFixed(2)} m</strong></div>
            <div><small>POSITION UNCERTAINTY</small><strong>±{selectedConflict.uncertainty.toFixed(2)} m</strong></div>
          </div>
          <p className="inspector-description">{selectedConflict.description}</p>
          <div className="facts-grid">
            <div><label>Type</label><strong>{selectedConflict.type}</strong></div>
            <div><label>Status</label><strong>{selectedConflict.status}</strong></div>
            <div><label>Area diff.</label><strong>{selectedConflict.areaDifference.toFixed(1)} m²</strong></div>
          </div>
        </div>
      </section>
    </>
  )

  const renderIntegrationsView = () => (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">DEPARTMENT ACCESS</div>
          <h2>Department integrations</h2>
          <p className="view-intro">Connect authorized departmental systems through an approved API, managed file exchange, or read-only replica.</p>
        </div>
        <div className="topbar-actions"><span className="integration-status-summary">{departmentIntegrations.length} connections not configured</span></div>
      </header>

      <section className="integration-grid">
        {departmentIntegrations.map((integration) => (
          <article className="integration-card" key={integration.id}>
            <div className="integration-card-heading"><span className="integration-mark" aria-hidden="true">↔</span><span className="integration-state">NOT CONNECTED</span></div>
            <h3>{integration.department}</h3>
            <p>{integration.dataScope}</p>
            <button type="button" onClick={() => {
              setIntegrationDepartment(integration.id)
              document.getElementById('integration-access-request')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}>Request access setup <span aria-hidden="true">→</span></button>
          </article>
        ))}
      </section>

      <section className="integration-request-section" id="integration-access-request">
        <div className="integration-request-heading">
          <div><span className="eyebrow">ACCESS REQUEST</span><h3>Provide the approved connection method</h3></div>
          <p>Do not enter passwords, API keys, tokens, or database credentials here. An authorized administrator must exchange secrets through the department-approved secure channel.</p>
        </div>
        <form className="integration-request-form" onSubmit={(event) => {
          event.preventDefault()
          const department = departmentIntegrations.find((item) => item.id === integrationDepartment)
          setIntegrationRequests((requests) => [...requests, {
            department: department?.department ?? integrationDepartment,
            method: integrationMethod,
            contact: integrationContact,
            notes: integrationNotes,
          }])
          setIntegrationRequestMessage('Request recorded in this browser session. It has not been sent to an administrator or saved to the backend.')
        }}>
          <label className="filter-group"><span>Department system</span><select value={integrationDepartment} onChange={(event) => setIntegrationDepartment(event.target.value)}>{departmentIntegrations.map((entry) => <option key={entry.id} value={entry.id}>{entry.department}</option>)}</select></label>
          <label className="filter-group"><span>Available access method</span><select value={integrationMethod} onChange={(event) => setIntegrationMethod(event.target.value)}><option>Secure API</option><option>Managed SFTP / file exchange</option><option>Read-only database replica</option><option>Other approved method</option></select></label>
          <label className="filter-group"><span>Authorized department contact</span><input value={integrationContact} onChange={(event) => setIntegrationContact(event.target.value)} placeholder="Name or official email" required /></label>
          <label className="filter-group integration-notes"><span>Non-secret connection notes</span><textarea value={integrationNotes} onChange={(event) => setIntegrationNotes(event.target.value)} placeholder="Data scope, update schedule, or approval reference. Do not include credentials." rows={3} /></label>
          <button className="primary integration-submit" type="submit">Record access request</button>
        </form>
        {integrationRequestMessage && <p className="integration-request-message" role="status">{integrationRequestMessage}</p>}
        {integrationRequests.length > 0 && <div className="integration-request-list"><strong>Session requests</strong>{integrationRequests.map((request, index) => <p key={`${request.department}-${index}`}>{request.department} · {request.method} · {request.contact}</p>)}</div>}
      </section>
    </>
  )

  const renderVersionHistoryView = () => {
    const filteredRuns = sampleHarmonizationRuns.filter((run) =>
      (outputFilter === 'All' || run.outputId === outputFilter)
      && (runStatusFilter === 'All' || run.status === runStatusFilter),
    )
    const selectedRun = filteredRuns.find((run) => run.id === selectedRunId) ?? filteredRuns[0]
    const latestPublishedRun = selectedRun
      ? sampleHarmonizationRuns.find((run) => run.outputId === selectedRun.outputId && run.status === 'Published')
      : undefined

    return (
      <>
        <header className="topbar">
          <div>
            <div className="eyebrow">GEOAI OUTPUT LIFECYCLE</div>
            <h2>AI harmonization outputs</h2>
            <p className="view-intro">Each run records a versioned integrated output and the source/model versions that produced it.</p>
          </div>
          <div className="topbar-actions"><span className="demo-history-tag">ILLUSTRATIVE DEMO RUNS</span></div>
        </header>

        <section className="version-history-notice">
          <strong>Demo output runs</strong>
          <span>These examples demonstrate provenance and review tracking. AI processing, output storage, publishing, and rollback are not connected to the backend.</span>
        </section>

        <section className="version-history-toolbar" aria-label="Harmonization output filters">
          <label className="filter-group">
            <span>Harmonized output</span>
            <select value={outputFilter} onChange={(event) => setOutputFilter(event.target.value)}>
              <option value="All">All outputs</option>
              {Array.from(new Map(sampleHarmonizationRuns.map((run) => [run.outputId, run.outputName]))).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="filter-group">
            <span>Run status</span>
            <select value={runStatusFilter} onChange={(event) => setRunStatusFilter(event.target.value as typeof runStatusFilter)}>
              <option value="All">All statuses</option>
              <option value="Published">Published</option>
              <option value="In review">In review</option>
              <option value="Superseded">Superseded</option>
            </select>
          </label>
          <span className="version-result-count">{filteredRuns.length} output runs</span>
        </section>

        <section className="version-table-wrap">
          <table className="version-table">
            <thead>
              <tr><th>Harmonized output</th><th>Output version</th><th>Run date</th><th>Status</th><th>Model / metrics</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => {
                return (
                  <tr key={run.id} className={selectedRun?.id === run.id ? 'selected' : ''}>
                    <td><strong>{run.outputName}</strong><small>{run.id} · {run.changedFeatures.toLocaleString()} features changed</small></td>
                    <td className="version-number">v{run.outputVersion}</td>
                    <td>{run.createdAt}</td>
                    <td><span className={`version-status ${run.status === 'In review' ? 'draft' : run.status.toLowerCase()}`}>{run.status}</span></td>
                    <td className="version-summary"><strong>{run.modelVersion}</strong><small>{run.confidence}% confidence · ±{run.uncertaintyMeters} m</small></td>
                    <td><button type="button" className="version-compare-button" onClick={() => {
                      setSelectedRunId(run.id)
                      setSelectedConflictId(run.comparisonConflictId)
                      setActiveNav('Conflicts')
                    }}>Compare geometry</button></td>
                  </tr>
                )
              })}
              {filteredRuns.length === 0 && <tr><td colSpan={6} className="version-empty">No output runs match these filters.</td></tr>}
            </tbody>
          </table>
        </section>

        {selectedRun && latestPublishedRun && selectedRun.id !== latestPublishedRun.id && (
          <section className="version-comparison">
            <div className="version-comparison-heading">
              <div><span className="eyebrow">OUTPUT RUN COMPARISON</span><h3>{selectedRun.outputName}</h3></div>
              <span>v{selectedRun.outputVersion} <b>→</b> v{latestPublishedRun.outputVersion} (latest published)</span>
            </div>
            <div className="version-comparison-grid">
              <div><small>SELECTED RUN · {selectedRun.createdAt} · {selectedRun.status.toUpperCase()}</small><p>{selectedRun.summary}</p><p><strong>Inputs:</strong> {selectedRun.inputVersions.join(' · ')}</p></div>
              <div><small>LATEST PUBLISHED OUTPUT · {latestPublishedRun.createdAt}</small><p>{latestPublishedRun.summary}</p><p><strong>Inputs:</strong> {latestPublishedRun.inputVersions.join(' · ')}</p></div>
            </div>
          </section>
        )}
      </>
    )
  }

  const renderGroundTruthView = () => (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">GROUND TRUTH</div>
          <h2>Evidence verification</h2>
        </div>
        <div className="topbar-actions">
          <button className="secondary">Audit trail</button>
          <button className="primary">Field validation</button>
        </div>
      </header>
      <section className="operational-grid">
        <div className="panel timeline-panel">
          <div className="panel-header small-header">
            <span>Workflow timeline</span>
            <button type="button">Case status</button>
          </div>
          <div className="timeline-list">
            {caseTimeline.map((entry) => (
              <div key={entry.phase} className="timeline-item">
                <div className="timeline-bullet" />
                <div className="timeline-content">
                  <div className="timeline-topline">
                    <strong>{entry.phase}</strong>
                    <span className={`timeline-status ${entry.status.toLowerCase().replace(/\s+/g, '-')}`}>{entry.status}</span>
                  </div>
                  <small>{entry.note}</small>
                  <em>{entry.time}</em>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel audit-panel">
          <div className="panel-header small-header">
            <span>Adjudication audit</span>
            <button type="button">View file</button>
          </div>
          <div className="audit-list">
            {auditEntries.map((entry) => (
              <div key={entry.title} className="audit-item">
                <div>
                  <strong>{entry.title}</strong>
                  <small>{entry.meta}</small>
                </div>
                <span className="audit-pill">{entry.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )

  const renderApiView = () => (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">API</div>
          <h2>System integration status</h2>
        </div>
        <div className="topbar-actions">
          <button className="secondary">Check health</button>
          <button className="primary">Live</button>
        </div>
      </header>
      <section className="operational-grid">
        <div className="panel">
          <div className="panel-header small-header">
            <span>DATA SUMMARY</span>
            <button type="button">Refresh</button>
          </div>
          <div className="metrics">
            <div className="metric-card">
              <span>Total parcels</span>
              <strong>{apiSummary.parcels.toLocaleString()}</strong>
            </div>
            <div className="metric-card">
              <span>Conflicts</span>
              <strong>{apiSummary.conflicts}</strong>
            </div>
            <div className="metric-card">
              <span>Avg confidence</span>
              <strong>{apiSummary.avgConfidence}%</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header small-header">
            <span>ENDPOINTS</span>
            <button type="button">Status OK</button>
          </div>
          <div className="audit-list">
            <div className="audit-item"><div><strong>/api/overview</strong><small>Summary and source catalog</small></div><span className="audit-pill">OK</span></div>
            <div className="audit-item"><div><strong>/api/conflicts</strong><small>Conflict records</small></div><span className="audit-pill">OK</span></div>
            <div className="audit-item"><div><strong>/api/districts</strong><small>District and mandal GeoJSON</small></div><span className="audit-pill">OK</span></div>
            <div className="audit-item"><div><strong>/api/sources</strong><small>Source metadata</small></div><span className="audit-pill">OK</span></div>
          </div>
        </div>
      </section>
    </>
  )

  const signOut = async () => {
    try {
      await authApi.signOut()
    } catch {
      authApi.clearSession()
    }
    setActiveUser(null)
    setActiveNav('Workspace')
    setPortalMode('landing')
  }

  const renderActiveView = () => {
    switch (activeNav) {
      case 'Workspace':
        return activeUser?.audience === 'Officer'
          ? <RoleWorkspace role={activeUser.role} onNavigate={setActiveNav} onSignOut={signOut} />
          : renderDashboardView()
      case 'Map':
        return renderMapView()
      case 'Conflicts':
        return renderConflictsView()
      case 'Integrations':
        return renderIntegrationsView()
      case 'Upload Data':
        return <UploadData />
      case 'Version History':
        return renderVersionHistoryView()
      case 'Ground Truth':
        return renderGroundTruthView()
      case 'API':
        return renderApiView()
      default:
        return renderDashboardView()
    }
  }

  if (portalMode !== 'workspace') {
    return (
      <LandingAuth
        mode={portalMode}
        onNavigate={setPortalMode}
        onEnterWorkspace={(audience, role) => {
          setActiveUser({ audience, role })
          setActiveNav('Workspace')
          setPortalMode('workspace')
        }}
      />
    )
  }

  if (activeUser?.audience === 'Citizen') {
    return <CitizenPortal role={activeUser.role} onSignOut={signOut} />
  }

  const portalProfile = activeUser ? getPortalProfile(activeUser.role) : null

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">B</div>
          <div>
            <div className="eyebrow">{portalProfile?.label.toUpperCase() ?? 'LAND INTELLIGENCE'}</div>
            <h1>BhoomiSync</h1>
          </div>
        </div>

        <nav className="nav-stack">
          {(portalProfile?.navigation ?? ['Workspace', 'Dashboard', 'Map', 'Conflicts', 'Integrations', 'Version History', 'Ground Truth', 'API']).map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${activeNav === item ? 'active' : ''}`}
              onClick={() => setActiveNav(item)}
            >
              {item === 'Workspace' ? 'My workspace' : item}
            </button>
          ))}
        </nav>

        {portalProfile?.label !== 'Field operations' && <div className="metrics">
          <div className="metric-card">
            <span>Total parcels</span>
            <strong>{apiSummary.parcels.toLocaleString()}</strong>
          </div>
          <div className="metric-card">
            <span>Conflicts</span>
            <strong>{apiSummary.conflicts}</strong>
          </div>
          <div className="metric-card">
            <span>Avg confidence</span>
            <strong>{apiSummary.avgConfidence}%</strong>
          </div>
        </div>}

        <button type="button" className="nav-item sign-out-nav" onClick={signOut}>Sign out · {activeUser?.role}</button>
      </aside>

      <main className="content-area">
        {renderActiveView()}
      </main>
    </div>
  )
}

export default App
