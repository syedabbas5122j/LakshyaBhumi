import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'
import LandingAuth from './components/LandingAuth'
import RoleWorkspace, { getPortalProfile, type WorkspaceView } from './components/RoleWorkspace'
import ConflictGeometryComparison from './components/ConflictGeometryComparison'
import HarmonizationVisualization from './components/HarmonizationVisualization'
import AdministrationConsole from './components/AdministrationConsole'
import SupportDesk from './components/SupportDesk'
import CitizenPortal from './pages/citizen/CitizenPortal'
import UploadData from './pages/officer/UploadData'
import { authApi } from './services/authApi'
import { groundTruthApi, type FieldSubmission, type FieldSubmissionKind } from './services/groundTruthApi'
import { integrationApi, type IntegrationAccessRequest } from './services/integrationApi'
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
  type HarmonizationRun,
} from './data'
import {
  downloadVersionGeoJson,
  downloadVersionReport,
} from './services/versionOutputService'

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
  { label: 'Jan', total: 22, unresolved: 14, highSeverity: 5 },
  { label: 'Feb', total: 31, unresolved: 19, highSeverity: 7 },
  { label: 'Mar', total: 26, unresolved: 15, highSeverity: 6 },
  { label: 'Apr', total: 41, unresolved: 25, highSeverity: 11 },
  { label: 'May', total: 38, unresolved: 20, highSeverity: 9 },
  { label: 'Jun', total: 55, unresolved: 29, highSeverity: 14 },
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

type ActivePortalUser = { audience: 'Officer' | 'Citizen'; role: string; id?: string; district?: string; mandal?: string; village?: string }

const reviewerStageForRole: Record<string, FieldSubmission['review_stage']> = {
  'Village Revenue Officer (VRO)': 'village',
  'Patwari / Lekhpal': 'village',
  'Village Administrative Officer': 'village',
  'Mandal Revenue Officer (MRO)': 'mandal',
  Tahsildar: 'mandal',
  'Survey Inspector': 'mandal',
  'District Collector / District Magistrate': 'district',
  'District Survey Officer': 'district',
  'District Land Records Officer': 'district',
}

const readStoredUser = (): ActivePortalUser | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const user = JSON.parse(window.sessionStorage.getItem('bhusha_user') ?? 'null')
    if (user?.role && (user.audience === 'officer' || user.audience === 'citizen')) {
      return {
        audience: user.audience === 'citizen' ? 'Citizen' : 'Officer',
        role: user.role,
        id: user.id,
        district: user.district,
        mandal: user.mandal,
        village: user.village,
      }
    }
  } catch {
    return null
  }
  return null
}

function App() {
  const [activeUser, setActiveUser] = useState<ActivePortalUser | null>(() => readStoredUser())
  
  const isTechnicalRole = activeUser ? [
    'State GIS Coordinator', 'Chief Cartographer', 'District Survey Officer', 
    'District Land Records Officer', 'GIS Manager (Municipality)', 'Village Surveyor', 
    'Ground Truth Surveyor', 'Drone Pilot', 'GCP Marker', 'Field Data Collector', 
    'Mandal Surveyor', 'City Surveyor', 'Survey Inspector'
  ].includes(activeUser.role) : true
  
  const canChangeDistrict = activeUser ? [
    'Commissioner of Land Administration', 'Director of Survey & Land Records', 
    'State GIS Coordinator', 'Chief Cartographer', 'System Administrator', 'IT Support Staff'
  ].includes(activeUser.role) : true
  
  const canChangeMandal = canChangeDistrict || (activeUser ? [
    'District Collector / District Magistrate', 'District Survey Officer', 
    'District Land Records Officer'
  ].includes(activeUser.role) : true)

  const [portalMode, setPortalMode] = useState<'landing' | 'officer-login' | 'citizen-login' | 'workspace'>(() => readStoredUser() ? 'workspace' : 'landing')
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [selectedConflictId, setSelectedConflictId] = useState('TPT-00128')
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<string, Polygon>>({})
  const [groundTruthNote, setGroundTruthNote] = useState('Please verify the redrawn boundary against field measurements and source records.')
  const [groundTruthMessage, setGroundTruthMessage] = useState('')
  const [groundTruthBusy, setGroundTruthBusy] = useState(false)
  const [fieldSubmissions, setFieldSubmissions] = useState<FieldSubmission[]>([])
  const [fieldWorkers, setFieldWorkers] = useState<Array<{ id: string; role: string; district?: string; mandal?: string; village?: string }>>([])
  const [fieldAssignmentDrafts, setFieldAssignmentDrafts] = useState<Record<string, string>>({})
  const [submissionType, setSubmissionType] = useState<FieldSubmissionKind>('Survey')
  const [submissionTitle, setSubmissionTitle] = useState('')
  const [submissionDescription, setSubmissionDescription] = useState('')
  const [submissionArea, setSubmissionArea] = useState('')
  const [submissionDistrict, setSubmissionDistrict] = useState('')
  const [submissionMandal, setSubmissionMandal] = useState('')
  const [submissionVillage, setSubmissionVillage] = useState('')
  const [groundTruthVillage, setGroundTruthVillage] = useState('')
  const [reviewNoteDrafts, setReviewNoteDrafts] = useState<Record<string, string>>({})
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null)
  const [reviewMessage, setReviewMessage] = useState('')
  const [submissionMessage, setSubmissionMessage] = useState('')
  const [submissionBusy, setSubmissionBusy] = useState(false)
  const [activeScale, setActiveScale] = useState<'District' | 'Mandal' | 'Conflict' | 'Feature'>('Conflict')
  const [selectedDistrict, setSelectedDistrict] = useState(activeUser?.district ?? 'Tirupati')
  const [selectedMandal, setSelectedMandal] = useState(activeUser?.mandal ?? 'All')
  const [districtOptions, setDistrictOptions] = useState<string[]>(['Tirupati'])
  const [districtFeatureCollection, setDistrictFeatureCollection] = useState(districtGeojson)
  const [mandalFeatureCollection, setMandalFeatureCollection] = useState(mandalGeojson)
  const [hoveredConflict, setHoveredConflict] = useState<string | null>(null)
  const [hoveredMapInfo, setHoveredMapInfo] = useState<{ x: number; y: number; title: string; subtitle: string } | null>(null)
  const [layersVisible, setLayersVisible] = useState({
    districts: true,
    mandals: true,
    clusters: isTechnicalRole,
    parcels: true,
    drone: isTechnicalRole,
    gnss: isTechnicalRole,
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
  const [integrationRequests, setIntegrationRequests] = useState<IntegrationAccessRequest[]>([])
  const [outputFilter, setOutputFilter] = useState('All')
  const [runStatusFilter, setRunStatusFilter] = useState<'All' | 'Published' | 'In review' | 'Superseded'>('All')
  const [selectedRunId, setSelectedRunId] = useState('harm-014')
  const [versionDownloadNotice, setVersionDownloadNotice] = useState<string | null>(null)
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

  useEffect(() => {
    if (!activeUser) {
      return
    }
    const loadFieldSubmissions = () => {
      groundTruthApi.listSubmissions()
        .then((result) => setFieldSubmissions(result.submissions))
        .catch(() => undefined)
    }
    loadFieldSubmissions()
    if (reviewerStageForRole[activeUser.role]) {
      groundTruthApi.fieldWorkers().then((result) => setFieldWorkers(result.workers)).catch(() => setFieldWorkers([]))
    } else {
      setFieldWorkers([])
    }
    const interval = window.setInterval(loadFieldSubmissions, 5000)
    return () => window.clearInterval(interval)
  }, [activeUser])

  useEffect(() => {
    if (!activeUser) return
    const loadIntegrationRequests = () => integrationApi.list().then((result) => setIntegrationRequests(result.requests)).catch(() => undefined)
    loadIntegrationRequests()
    const interval = window.setInterval(loadIntegrationRequests, 1000)
    return () => window.clearInterval(interval)
  }, [activeUser])

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
          'fill-color': '#f8fafc',
          'fill-opacity': 0.01,
        },
      })

      map.addLayer({
        id: 'state-line-layer',
        type: 'line',
        source: 'state',
        paint: {
          'line-color': '#0f172a',
          'line-width': 3.5,
          'line-opacity': 0.9,
        },
      })

      map.addLayer({
        id: 'district-layer',
        type: 'fill',
        source: 'district',
        paint: {
          'fill-color': '#0f766e',
          'fill-opacity': 0.02,
        },
      })

      map.addLayer({
        id: 'district-line-layer',
        type: 'line',
        source: 'district',
        paint: {
          'line-color': '#0d9488',
          'line-width': 2.5,
          'line-opacity': 0.95,
        },
      })

      map.addLayer({
        id: 'mandal-layer',
        type: 'fill',
        source: 'mandals',
        paint: {
          'fill-color': '#d97706',
          'fill-opacity': 0.02,
        },
      })

      map.addLayer({
        id: 'mandal-boundary-layer',
        type: 'line',
        source: 'mandals',
        paint: {
          'line-color': '#b45309',
          'line-width': 1.2,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2],
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
          'fill-color': '#3b82f6',
          'fill-opacity': 0.18,
        },
      })

      map.addLayer({
        id: 'selected-mandal-line-layer',
        type: 'line',
        source: 'selected-mandal',
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 3.5,
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
          <select value={selectedDistrict} disabled={!canChangeDistrict} onChange={(event) => {
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
          <select value={selectedMandal} disabled={!canChangeMandal} onChange={(event) => {
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
            <span>Conflict trend / six months</span>
            <button type="button">Rolling view</button>
          </div>
          <div className="trend-summary">
            <div><span>Peak total</span><strong>{Math.max(...riskTrend.map((point) => point.total))}</strong></div>
            <div><span>Open in Jun</span><strong>{riskTrend[riskTrend.length - 1].unresolved}</strong></div>
            <div><span>High severity</span><strong>{riskTrend[riskTrend.length - 1].highSeverity}</strong></div>
          </div>
          <div className="trend-chart trend-chart-line" aria-label="Conflict trend chart showing total, unresolved and high-severity cases">
            <svg viewBox="0 0 620 300" role="img">
              {[0, 1, 2, 3].map((lineIndex) => {
                const y = 35 + lineIndex * 60
                return <g key={lineIndex}><line x1="34" x2="606" y1={y} y2={y} className="trend-grid-line" /><text x="10" y={y + 5} className="trend-axis-label">{Math.round(Math.max(...riskTrend.map((point) => point.total)) - lineIndex * 18)}</text></g>
              })}
              <polyline className="trend-line total" points={riskTrend.map((point, index) => `${44 + index * 110},${265 - (point.total / 60) * 220}`).join(' ')} />
              <polyline className="trend-line unresolved" points={riskTrend.map((point, index) => `${44 + index * 110},${265 - (point.unresolved / 60) * 220}`).join(' ')} />
              <polyline className="trend-line severe" points={riskTrend.map((point, index) => `${44 + index * 110},${265 - (point.highSeverity / 60) * 220}`).join(' ')} />
              {riskTrend.map((point, index) => <g key={point.label}>
                <circle className="trend-point total" cx={44 + index * 110} cy={265 - (point.total / 60) * 220} r="8"><title>{point.label}: {point.total} total cases</title></circle>
                <circle className="trend-point unresolved" cx={44 + index * 110} cy={265 - (point.unresolved / 60) * 220} r="7"><title>{point.label}: {point.unresolved} unresolved cases</title></circle>
                <circle className="trend-point severe" cx={44 + index * 110} cy={265 - (point.highSeverity / 60) * 220} r="7"><title>{point.label}: {point.highSeverity} high-severity cases</title></circle>
                <text x={44 + index * 110} y="292" textAnchor="middle" className="trend-axis-label">{point.label}</text>
              </g>)}
            </svg>
          </div>
          <div className="trend-legend">
            <span><i className="trend-key total" /> Total cases</span>
            <span><i className="trend-key unresolved" /> Unresolved</span>
            <span><i className="trend-key severe" /> High severity</span>
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
              <select value={selectedDistrict} disabled={!canChangeDistrict} onChange={(event) => {
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
              <select value={selectedMandal} disabled={!canChangeMandal} onChange={(event) => {
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
            {isTechnicalRole && (
              <>
                <label><input type="checkbox" checked={layersVisible.clusters} onChange={() => setLayersVisible((prev) => ({ ...prev, clusters: !prev.clusters }))} /> Clusters</label>
                <label><input type="checkbox" checked={layersVisible.drone} onChange={() => setLayersVisible((prev) => ({ ...prev, drone: !prev.drone }))} /> Drone</label>
                <label><input type="checkbox" checked={layersVisible.gnss} onChange={() => setLayersVisible((prev) => ({ ...prev, gnss: !prev.gnss }))} /> GNSS</label>
              </>
            )}
            <label><input type="checkbox" checked={layersVisible.parcels} onChange={() => setLayersVisible((prev) => ({ ...prev, parcels: !prev.parcels }))} /> Parcels</label>
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
                  district: selectedConflict.district,
                  mandal: selectedConflict.mandal,
                  village: groundTruthVillage,
                })
                const submissions = await groundTruthApi.listSubmissions()
                setFieldSubmissions(submissions.submissions)
                setGroundTruthMessage(`Ground-truth request ${result.request.id} queued for review.`)
              } catch (error) {
                setGroundTruthMessage(error instanceof Error ? error.message : 'Could not submit the ground-truth request.')
              } finally {
                setGroundTruthBusy(false)
              }
            }}>
              <label><span>Village for review routing</span><input value={groundTruthVillage} onChange={(event) => setGroundTruthVillage(event.target.value)} placeholder="Village name" required /></label>
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
        <form className="integration-request-form" onSubmit={async (event) => {
          event.preventDefault()
          const department = departmentIntegrations.find((item) => item.id === integrationDepartment)
          try {
            const result = await integrationApi.create({
              department: department?.department ?? integrationDepartment,
              method: integrationMethod,
              contact: integrationContact,
              notes: integrationNotes,
            })
            setIntegrationRequests((requests) => [result.request, ...requests])
            setIntegrationRequestMessage(`${result.request.id} requested. Demo access will be approved automatically in 1 second.`)
          } catch (error) {
            setIntegrationRequestMessage(error instanceof Error ? error.message : 'Could not request integration access.')
          }
        }}>
          <label className="filter-group"><span>Department system</span><select value={integrationDepartment} onChange={(event) => setIntegrationDepartment(event.target.value)}>{departmentIntegrations.map((entry) => <option key={entry.id} value={entry.id}>{entry.department}</option>)}</select></label>
          <label className="filter-group"><span>Available access method</span><select value={integrationMethod} onChange={(event) => setIntegrationMethod(event.target.value)}><option>Secure API</option><option>Managed SFTP / file exchange</option><option>Read-only database replica</option><option>Other approved method</option></select></label>
          <label className="filter-group"><span>Authorized department contact</span><input value={integrationContact} onChange={(event) => setIntegrationContact(event.target.value)} placeholder="Name or official email" required /></label>
          <label className="filter-group integration-notes"><span>Non-secret connection notes</span><textarea value={integrationNotes} onChange={(event) => setIntegrationNotes(event.target.value)} placeholder="Data scope, update schedule, or approval reference. Do not include credentials." rows={3} /></label>
          <button className="primary integration-submit" type="submit">Record access request</button>
        </form>
        {integrationRequestMessage && <p className="integration-request-message" role="status">{integrationRequestMessage}</p>}
        {integrationRequests.length > 0 && <div className="integration-request-list"><strong>Access requests</strong>{integrationRequests.map((request) => <p key={request.id}>{request.department} · {request.method} · {request.contact} · <b>{request.status}</b></p>)}</div>}
      </section>
    </>
  )

  const renderHarmonizationView = () => {
    const selectedRun = sampleHarmonizationRuns.find((run) => run.id === selectedRunId) ?? sampleHarmonizationRuns[0]
    const latestPublishedRun = selectedRun
      ? sampleHarmonizationRuns.find((run) => run.outputId === selectedRun.outputId && run.status === 'Published')
      : undefined

    return (
      <>
        <header className="topbar">
          <div>
            <div className="eyebrow">GEOAI PROCESSING WORKSPACE</div>
            <h2>Run AI harmonization</h2>
            <p className="view-intro">Select approved source data, run the seven-stage pipeline and inspect the output before it enters version history.</p>
          </div>
          <div className="topbar-actions"><span className="demo-history-tag">CONTROLLED PROCESSING</span></div>
        </header>
        <section className="version-history-notice">
          <strong>Pipeline workspace</strong>
          <span>Runs are limited to approved oversight roles. Uploaded datasets are used when available; otherwise the demo database data is used for visualization.</span>
        </section>
        {selectedRun && <HarmonizationVisualization
          run={selectedRun}
          latestPublishedRun={latestPublishedRun}
          canRun
        />}
      </>
    )
  }

  const renderVersionHistoryView = () => {
    const filteredRuns = sampleHarmonizationRuns.filter((run) =>
      (outputFilter === 'All' || run.outputId === outputFilter)
      && (runStatusFilter === 'All' || run.status === runStatusFilter),
    )
    const selectedRun = filteredRuns.find((run) => run.id === selectedRunId) ?? filteredRuns[0]
    const comparisonRun = selectedRun
      ? sampleHarmonizationRuns
        .filter((run) => run.outputId === selectedRun.outputId && run.id !== selectedRun.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
      : undefined

    const handleDownload = (run: HarmonizationRun, format: 'geojson' | 'report') => {
      if (format === 'geojson') {
        const file = downloadVersionGeoJson(run)
        setVersionDownloadNotice(`${run.outputName} (v${run.outputVersion}) · ${file}`)
      } else {
        const file = downloadVersionReport(run)
        setVersionDownloadNotice(`${run.outputName} (v${run.outputVersion}) Audit Report · ${file}`)
      }
      setTimeout(() => setVersionDownloadNotice(null), 4500)
    }

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
          <span>These examples demonstrate provenance and review tracking. Download harmonized GeoJSON feature datasets or complete governance & audit reports for any version.</span>
        </section>

        {versionDownloadNotice && (
          <div className="version-download-toast" role="status" aria-live="polite">
            <div>
              <span className="download-toast-icon">✓</span>
              <strong>Download initiated:</strong>
              <span>{versionDownloadNotice}</span>
            </div>
            <button
              type="button"
              className="version-download-toast-close"
              onClick={() => setVersionDownloadNotice(null)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        )}

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
          {selectedRun && (
            <div className="version-toolbar-quick-download">
              <button
                type="button"
                className="version-download-toolbar-btn"
                onClick={() => handleDownload(selectedRun, 'geojson')}
                title={`Download ${selectedRun.outputName} v${selectedRun.outputVersion} GeoJSON`}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download v{selectedRun.outputVersion} GeoJSON</span>
              </button>
            </div>
          )}
          <span className="version-result-count">{filteredRuns.length} output runs</span>
        </section>

        <section className="version-table-wrap">
          <table className="version-table">
            <thead>
              <tr><th>Harmonized output</th><th>Output version</th><th>Run date</th><th>Status</th><th>Model / metrics</th><th>Actions & Downloads</th></tr>
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
                    <td>
                      <div className="version-actions-cell">
                        <button
                          type="button"
                          className="version-compare-button"
                          onClick={() => setSelectedRunId(run.id)}
                        >
                          Compare
                        </button>
                        <div className="version-download-button-group">
                          <button
                            type="button"
                            className="version-download-button"
                            title={`Download ${run.outputName} v${run.outputVersion} GeoJSON`}
                            onClick={() => handleDownload(run, 'geojson')}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>GeoJSON</span>
                          </button>
                          <button
                            type="button"
                            className="version-download-button secondary"
                            title={`Download ${run.outputName} v${run.outputVersion} Audit & Provenance Report`}
                            onClick={() => handleDownload(run, 'report')}
                          >
                            <span>Report</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredRuns.length === 0 && <tr><td colSpan={6} className="version-empty">No output runs match these filters.</td></tr>}
            </tbody>
          </table>
        </section>

        {selectedRun && comparisonRun && (
          <section className="version-comparison">
            <div className="version-comparison-heading">
              <div><span className="eyebrow">OUTPUT RUN COMPARISON</span><h3>{selectedRun.outputName}</h3></div>
              <span>v{selectedRun.outputVersion} <b>↔</b> v{comparisonRun.outputVersion} (same output)</span>
            </div>
            <div className="version-comparison-grid">
              <div>
                <div className="version-comparison-card-top">
                  <small>SELECTED VERSION · v{selectedRun.outputVersion} · {selectedRun.createdAt} · {selectedRun.status.toUpperCase()}</small>
                  <div className="version-comparison-downloads">
                    <button
                      type="button"
                      className="version-download-button"
                      onClick={() => handleDownload(selectedRun, 'geojson')}
                      title={`Download v${selectedRun.outputVersion} GeoJSON`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>GeoJSON (v{selectedRun.outputVersion})</span>
                    </button>
                    <button
                      type="button"
                      className="version-download-button secondary"
                      onClick={() => handleDownload(selectedRun, 'report')}
                      title={`Download v${selectedRun.outputVersion} Audit Report`}
                    >
                      <span>Report</span>
                    </button>
                  </div>
                </div>
                <p>{selectedRun.summary}</p>
                <p><strong>Inputs:</strong> {selectedRun.inputVersions.join(' · ')}</p>
              </div>
              <div>
                <div className="version-comparison-card-top">
                  <small>COMPARISON VERSION · v{comparisonRun.outputVersion} · {comparisonRun.createdAt} · {comparisonRun.status.toUpperCase()}</small>
                  <div className="version-comparison-downloads">
                    <button
                      type="button"
                      className="version-download-button"
                      onClick={() => handleDownload(comparisonRun, 'geojson')}
                      title={`Download v${comparisonRun.outputVersion} GeoJSON`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>GeoJSON (v{comparisonRun.outputVersion})</span>
                    </button>
                    <button
                      type="button"
                      className="version-download-button secondary"
                      onClick={() => handleDownload(comparisonRun, 'report')}
                      title={`Download v${comparisonRun.outputVersion} Audit Report`}
                    >
                      <span>Report</span>
                    </button>
                  </div>
                </div>
                <p>{comparisonRun.summary}</p>
                <p><strong>Inputs:</strong> {comparisonRun.inputVersions.join(' · ')}</p>
              </div>
            </div>
          </section>
        )}
      </>
    )
  }

  const renderGroundTruthView = () => {
    const currentReviewStage = activeUser ? reviewerStageForRole[activeUser.role] : undefined

    const updateReview = async (submission: FieldSubmission, action: Parameters<typeof groundTruthApi.reviewSubmission>[1], assigneeId = '') => {
      setReviewBusyId(submission.id)
      setReviewMessage('')
      try {
        const result = await groundTruthApi.reviewSubmission(submission.id, action, reviewNoteDrafts[submission.id] ?? '', assigneeId)
        setFieldSubmissions((current) => current.map((item) => item.id === submission.id ? result.submission : item))
        if (action !== 'comment') {
          setReviewNoteDrafts((current) => ({ ...current, [submission.id]: '' }))
        }
        setReviewMessage(`${submission.id}: ${result.submission.status}`)
      } catch (error) {
        setReviewMessage(error instanceof Error ? error.message : 'Could not update this review.')
      } finally {
        setReviewBusyId(null)
      }
    }

    const statusCounts = fieldSubmissions.reduce<Record<string, number>>((counts, submission) => {
      const status = submission.status || 'Unknown'
      counts[status] = (counts[status] ?? 0) + 1
      return counts
    }, {})
    const completedCount = (statusCounts.Approved ?? 0) + (statusCounts.Rejected ?? 0)
    const assignedCount = fieldSubmissions.filter((submission) => submission.field_assignee).length
    const fieldInProgressCount = fieldSubmissions.filter((submission) => submission.field_status === 'In progress').length
    const fieldSubmittedCount = fieldSubmissions.filter((submission) => submission.field_status === 'Submitted').length
    const progressPercent = fieldSubmissions.length ? Math.round((completedCount / fieldSubmissions.length) * 100) : 0

    const submitFieldEntry = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setSubmissionBusy(true)
      setSubmissionMessage('')
      try {
        const result = await groundTruthApi.submitFieldSubmission({
          type: submissionType,
          title: submissionTitle,
          description: submissionDescription,
          area_name: submissionArea,
          district: submissionDistrict || activeUser?.district || '',
          mandal: submissionMandal || activeUser?.mandal || '',
          village: submissionVillage || activeUser?.village || '',
        })
        setFieldSubmissions((current) => [result.submission, ...current])
        setSubmissionTitle('')
        setSubmissionDescription('')
        setSubmissionArea('')
        setFieldSubmissions((current) => [result.submission, ...current.filter((item) => item.id !== result.submission.id)])
        setSubmissionMessage(`${result.submission.type} ${result.submission.id} queued for verification.`)
      } catch (error) {
        setSubmissionMessage(error instanceof Error ? error.message : 'Could not submit field information.')
      } finally {
        setSubmissionBusy(false)
      }
    }

    return (
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
      <section className="ground-truth-status-panel" aria-label="Ground truth assignment and status summary">
        <div className="ground-truth-status-heading"><div><span>FIELD WORKFLOW STATUS</span><strong>{progressPercent}% complete</strong></div><small>{fieldSubmissions.length} total submissions · {assignedCount} assigned to field workers</small></div>
        <div className="ground-truth-progress"><span style={{ width: `${progressPercent}%` }} /></div>
        <div className="ground-truth-status-grid">
          <div><strong>{statusCounts['Pending village review'] ?? 0}</strong><small>Village queue</small></div>
          <div><strong>{statusCounts['Pending mandal review'] ?? 0}</strong><small>Mandal queue</small></div>
          <div><strong>{statusCounts['Pending district review'] ?? 0}</strong><small>District queue</small></div>
          <div><strong>{statusCounts['Rework requested'] ?? 0}</strong><small>Rework requested</small></div>
          <div><strong>{statusCounts.Approved ?? 0}</strong><small>Approved</small></div>
          <div><strong>{fieldInProgressCount}</strong><small>Field in progress</small></div>
          <div><strong>{fieldSubmittedCount}</strong><small>Field evidence submitted</small></div>
        </div>
      </section>
      <section className="field-submission-layout">
        <div className="panel field-submission-panel">
          <div className="panel-header small-header"><span>New field submission</span><span>Village → Mandal → District</span></div>
          <form className="field-submission-form" onSubmit={submitFieldEntry}>
            <label><span>Submission type</span><select value={submissionType} onChange={(event) => setSubmissionType(event.target.value as FieldSubmissionKind)}><option>Survey</option><option>Claim</option><option>Objection</option></select></label>
            <div className="submission-scope-fields">
              <label><span>District</span><input value={submissionDistrict || activeUser?.district || ''} onChange={(event) => setSubmissionDistrict(event.target.value)} placeholder="e.g. Tirupati District" required /></label>
              <label><span>Mandal</span><input value={submissionMandal || activeUser?.mandal || ''} onChange={(event) => setSubmissionMandal(event.target.value)} placeholder="e.g. Tirupati Urban" required /></label>
              <label><span>Village</span><input value={submissionVillage || activeUser?.village || ''} onChange={(event) => setSubmissionVillage(event.target.value)} placeholder="Village name" required /></label>
            </div>
            <label><span>Area / parcel</span><input value={submissionArea} onChange={(event) => setSubmissionArea(event.target.value)} placeholder="e.g. Chandragiri / Survey 101" required /></label>
            <label><span>Title</span><input value={submissionTitle} onChange={(event) => setSubmissionTitle(event.target.value)} placeholder="Short description" required /></label>
            <label><span>Details</span><textarea value={submissionDescription} onChange={(event) => setSubmissionDescription(event.target.value)} placeholder="Describe the survey, claim, or objection" rows={4} required /></label>
            <button className="primary" type="submit" disabled={submissionBusy}>{submissionBusy ? 'Submitting...' : `Submit ${submissionType}`}</button>
            {submissionMessage && <p className="field-submission-message" role="status">{submissionMessage}</p>}
          </form>
        </div>
        <div className="panel field-submission-panel">
          <div className="panel-header small-header"><span>{currentReviewStage ? `${currentReviewStage} review queue` : activeUser?.role && ['Village Surveyor', 'Ground Truth Surveyor', 'Drone Pilot', 'GCP Marker', 'Field Data Collector', 'Mandal Surveyor', 'City Surveyor'].includes(activeUser.role) ? 'My field assignments' : 'My submissions'}</span><strong>{fieldSubmissions.length} cases</strong></div>
          {reviewMessage && <p className="field-submission-message" role="status">{reviewMessage}</p>}
          <div className="field-submission-list">
            {fieldSubmissions.length ? fieldSubmissions.map((submission) => {
              const assignedToCurrentUser = submission.assigned_to?.id === activeUser?.id
              const fieldAssignedToCurrentUser = submission.field_assignee?.id === activeUser?.id
              const canReview = Boolean(currentReviewStage && submission.review_stage === currentReviewStage)
              const isSubmitter = submission.submitted_by?.id === activeUser?.id
              const note = reviewNoteDrafts[submission.id] ?? ''
              return (
                <article className="field-submission-item review-case" key={submission.id}>
                  <div className="review-case-heading"><strong>{submission.title}</strong><span className={`submission-type ${(submission.type ?? '').toLowerCase().replace(/\s+/g, '-')}`}>{submission.type_label ?? submission.type}</span></div>
                  <small>{submission.id} · {submission.area_name} · {submission.scope?.village || 'Village unassigned'}, {submission.scope?.mandal || 'Mandal unassigned'}, {submission.scope?.district || 'District unassigned'}</small>
                  <p>{submission.description}</p>
                  <em>{submission.status} · {submission.review_stage === 'completed' ? 'Workflow complete' : `At ${submission.review_stage ?? 'unassigned'} stage`}</em>
                  <small>Submitted by {submission.submitted_by?.role ?? 'Unknown'} · {new Date(submission.created_at).toLocaleString()}</small>
                  {submission.assigned_to && <small>Claimed by {submission.assigned_to.role}</small>}
                  <div className="field-assignment-status"><span>FIELD STATUS</span><strong>{submission.field_status ?? (submission.field_assignee ? 'Assigned' : 'Unassigned')}</strong>{submission.field_assignee && <small>Assigned to {submission.field_assignee.role}</small>}</div>
                  {fieldAssignedToCurrentUser && <div className="review-case-actions field-worker-actions"><button type="button" className="secondary" disabled={reviewBusyId === submission.id || submission.field_status === 'In progress' || submission.field_status === 'Submitted'} onClick={() => updateReview(submission, 'field_start')}>Start field work</button><button type="button" className="primary" disabled={reviewBusyId === submission.id || submission.field_status !== 'In progress'} onClick={() => updateReview(submission, 'field_submit')}>Submit field evidence</button></div>}
                  {canReview && (assignedToCurrentUser || !submission.assigned_to) && submission.status !== 'Approved' && submission.status !== 'Rejected' && submission.status !== 'Rework requested' && (
                    <div className="review-case-actions">
                      {!submission.assigned_to && <button type="button" className="secondary" disabled={reviewBusyId === submission.id} onClick={() => updateReview(submission, 'claim')}>Claim case</button>}
                      {!submission.field_assignee && <label><span>Assign field worker</span><select value={fieldAssignmentDrafts[submission.id] ?? ''} onChange={(event) => setFieldAssignmentDrafts((current) => ({ ...current, [submission.id]: event.target.value }))}><option value="">Choose worker</option>{fieldWorkers.map((worker) => <option key={worker.id} value={worker.id}>{worker.role}{worker.village ? ` · ${worker.village}` : ''}</option>)}</select><button type="button" className="secondary" disabled={reviewBusyId === submission.id || !fieldAssignmentDrafts[submission.id]} onClick={() => updateReview(submission, 'assign_field', fieldAssignmentDrafts[submission.id])}>Assign</button></label>}
                      {submission.field_assignee && <button type="button" className="secondary" disabled={reviewBusyId === submission.id} onClick={() => updateReview(submission, 'release_field')}>Release field assignment</button>}
                      {assignedToCurrentUser && <>
                        <button type="button" className="secondary" disabled={reviewBusyId === submission.id} onClick={() => updateReview(submission, 'release')}>Release case</button>
                        <label><span>Review note</span><textarea rows={2} value={note} onChange={(event) => setReviewNoteDrafts((current) => ({ ...current, [submission.id]: event.target.value }))} placeholder="Record review findings or decision rationale" /></label>
                        <button type="button" className="secondary" disabled={reviewBusyId === submission.id || note.trim().length < 2} onClick={() => updateReview(submission, 'comment')}>Add note</button>
                        {currentReviewStage !== 'district' && <button type="button" className="secondary" disabled={reviewBusyId === submission.id || note.trim().length < 2} onClick={() => updateReview(submission, 'forward')}>Forward to {currentReviewStage === 'village' ? 'mandal' : 'district'}</button>}
                        <button type="button" className="secondary" disabled={reviewBusyId === submission.id || note.trim().length < 2} onClick={() => updateReview(submission, 'request_rework')}>Request field rework</button>
                        {currentReviewStage === 'district' && <>
                          <button type="button" className="primary" disabled={reviewBusyId === submission.id} onClick={() => updateReview(submission, 'approve')}>Approve</button>
                          <button type="button" className="secondary" disabled={reviewBusyId === submission.id || note.trim().length < 2} onClick={() => updateReview(submission, 'reject')}>Reject</button>
                        </>}
                      </>}
                    </div>
                  )}
                  {isSubmitter && submission.status === 'Rework requested' && <div className="review-case-actions"><label><span>Response / updated field details</span><textarea rows={2} value={note} onChange={(event) => setReviewNoteDrafts((current) => ({ ...current, [submission.id]: event.target.value }))} required /></label><button type="button" className="primary" disabled={reviewBusyId === submission.id || note.trim().length < 2} onClick={() => updateReview(submission, 'resubmit')}>Resubmit for review</button></div>}
                  {isSubmitter && submission.status !== 'Approved' && submission.status !== 'Rejected' && submission.status !== 'Rework requested' && <div className="review-case-actions"><label><span>Reply to the review thread</span><textarea rows={2} value={note} onChange={(event) => setReviewNoteDrafts((current) => ({ ...current, [submission.id]: event.target.value }))} placeholder="Add a clarification or supporting detail" /></label><button type="button" className="secondary" disabled={reviewBusyId === submission.id || note.trim().length < 2} onClick={() => updateReview(submission, 'comment')}>Send reply</button></div>}
                  <details className="review-history"><summary>Correspondence · {submission.review_history?.length ?? 0} events</summary>{submission.review_history?.map((event, index) => <div className="review-history-event" key={`${submission.id}-${index}`}><strong>{event.action.replaceAll('_', ' ')}</strong><span>{event.actor.role} · {new Date(event.created_at).toLocaleString()}</span><p>{event.note}</p></div>)}</details>
                </article>
              )
            }) : <p className="field-submission-empty">No submissions are currently visible in this queue.</p>}
          </div>
        </div>
      </section>
    </>
    )
  }

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
      case 'Harmonization':
        return renderHarmonizationView()
      case 'Ground Truth':
        return renderGroundTruthView()
      case 'API':
        return renderApiView()
      case 'Administration':
        return activeUser?.role === 'System Administrator'
          ? <AdministrationConsole onSignOut={signOut} />
          : <RoleWorkspace role={activeUser?.role ?? ''} onNavigate={setActiveNav} onSignOut={signOut} />
      case 'Diagnostics':
        return activeUser && ['IT Support Staff', 'System Administrator'].includes(activeUser.role)
          ? <SupportDesk role={activeUser.role} />
          : <RoleWorkspace role={activeUser?.role ?? ''} onNavigate={setActiveNav} onSignOut={signOut} />
      case 'Support':
        return activeUser ? <SupportDesk role={activeUser.role} /> : renderDashboardView()
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
          setActiveUser(readStoredUser() ?? { audience, role })
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
