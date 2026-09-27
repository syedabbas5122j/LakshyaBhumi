import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'
import {
  clusterGeojson,
  conflictGeojson,
  conflictRecords,
  districtGeojson,
  droneGeojson,
  gnssGeojson,
  mandalGeojson,
  parcelGeojson,
  sourceCatalog,
} from './data'

const districtBounds: [[number, number], [number, number]] = [
  [77.988, 15.736],
  [78.184, 15.94],
]

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

const districtOptions = [
  'Kurnool District',
  'Nandyal District',
  'Anantapur District',
  'Kadapa District',
  'Chittoor District',
]

const mapStyle = {
  version: 8,
  name: 'BhoomiSync Light',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
    district: {
      type: 'geojson',
      data: districtGeojson,
    },
    mandals: {
      type: 'geojson',
      data: mandalGeojson,
    },
    clusters: {
      type: 'geojson',
      data: clusterGeojson,
    },
    parcels: {
      type: 'geojson',
      data: parcelGeojson,
    },
    drone: {
      type: 'geojson',
      data: droneGeojson,
    },
    gnss: {
      type: 'geojson',
      data: gnssGeojson,
    },
    conflicts: {
      type: 'geojson',
      data: conflictGeojson,
    },
  },
  layers: [
    { id: 'osm-layer', type: 'raster', source: 'osm', paint: { 'raster-opacity': 1 } },
    {
      id: 'district-layer',
      type: 'fill',
      source: 'district',
      paint: {
        'fill-color': '#9ab6a1',
        'fill-opacity': 0.2,
        'fill-outline-color': '#3a5b45',
      },
    },
    {
      id: 'mandal-layer',
      type: 'fill',
      source: 'mandals',
      paint: {
        'fill-color': '#f4c95d',
        'fill-opacity': 0.18,
        'fill-outline-color': '#b57c24',
      },
    },
    {
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
    },
    {
      id: 'parcels-layer',
      type: 'fill',
      source: 'parcels',
      paint: {
        'fill-color': '#d29f59',
        'fill-opacity': 0.75,
        'fill-outline-color': '#8c5f1f',
      },
    },
    {
      id: 'drone-layer',
      type: 'fill',
      source: 'drone',
      paint: {
        'fill-color': '#3f79c7',
        'fill-opacity': 0.42,
        'fill-outline-color': '#1e4e92',
      },
    },
    {
      id: 'gnss-layer',
      type: 'fill',
      source: 'gnss',
      paint: {
        'fill-color': '#31a39a',
        'fill-opacity': 0.38,
        'fill-outline-color': '#1d6d66',
      },
    },
    {
      id: 'conflict-layer',
      type: 'fill',
      source: 'conflicts',
      paint: {
        'fill-color': '#d94d4d',
        'fill-opacity': 0.4,
        'fill-outline-color': '#8d211d',
      },
    },
  ],
}

function App() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [selectedConflictId, setSelectedConflictId] = useState('KUR-00128')
  const [activeScale, setActiveScale] = useState<'District' | 'Mandal' | 'Conflict' | 'Feature'>('Conflict')
  const [selectedDistrict, setSelectedDistrict] = useState('Kurnool District')
  const [selectedMandal, setSelectedMandal] = useState<'All' | 'Orvakal' | 'Kurnool Rural' | 'Patha Kurnool'>('All')
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
    district: 'Kurnool District',
    parcels: 14280,
    conflicts: 5,
    avgConfidence: 89,
    activeMandalCount: 6,
    openCases: 3,
  })
  const [tableCatalog, setTableCatalog] = useState(sourceCatalog)
  const [conflictList, setConflictList] = useState(conflictRecords)
  const [decisionOutcome, setDecisionOutcome] = useState('Approve boundary correction')
  const [approvalState, setApprovalState] = useState<'Approved' | 'Pending review' | 'Escalated'>('Approved')
  const [decisionNote, setDecisionNote] = useState('Boundary displacement is under threshold and the parcel under review has a coherent GNSS and drone fit. The parcel should be corrected at the cadastral layer and approved for record update.')
  const [activeNav, setActiveNav] = useState<'Dashboard' | 'Map' | 'Conflicts' | 'Datasets' | 'Ground Truth' | 'API'>('Dashboard')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/overview')
        if (!response.ok) { return }
        const data = await response.json()
        if (data.summary) {
          setApiSummary(data.summary)
        }
        if (data.sourceCatalog) {
          setTableCatalog(data.sourceCatalog)
        }
        if (data.conflictRecords?.length) {
          setConflictList(data.conflictRecords)
          setSelectedConflictId(data.conflictRecords[0].id)
        }
      } catch {
        // Fallback to bundled demo dataset when the local backend is unavailable.
      }
    }

    loadDashboard()
  }, [])

  const filteredConflictList = useMemo(() => {
    return conflictList.filter((conflict) => {
      const districtMatch = selectedDistrict ? conflict.district === selectedDistrict : true
      const mandalMatch = selectedMandal === 'All' ? true : conflict.mandal === selectedMandal
      return districtMatch && mandalMatch
    })
  }, [conflictList, selectedDistrict, selectedMandal])

  const selectedConflict = useMemo(
    () => filteredConflictList.find((item) => item.id === selectedConflictId) ?? filteredConflictList[0] ?? conflictList[0],
    [selectedConflictId, filteredConflictList, conflictList],
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

  const flyToBounds = (bbox: [number, number, number, number], padding = 60) => {
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
        maxZoom: 18,
      },
    )
  }

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
      style: mapStyle as maplibregl.StyleSpecification,
      center: [78.03, 15.83],
      zoom: 12,
      minZoom: 9,
    })

    mapRef.current = map

    map.on('load', () => {
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
        const mandate = String(properties.mandal ?? 'Kurnool')
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

      map.on('click', 'conflict-layer', (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature?.properties) {
          return
        }
        const id = String(feature.properties.id ?? selectedConflict.id)
        setSelectedConflictId(id)
        const match = conflictList.find((item) => item.id === id)
        if (match) {
          flyToBounds(match.bbox, 70)
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

    if (activeScale === 'District') {
      flyToBounds([77.988, 15.736, 78.184, 15.94], 35)
    } else if (activeScale === 'Mandal') {
      flyToBounds([78.024, 15.812, 78.065, 15.845], 75)
    } else {
      flyToBounds(selectedConflict.bbox, 70)
    }
  }, [selectedConflict, activeScale])

  const handleConflictSelect = (conflictId: string) => {
    setSelectedConflictId(conflictId)
    const match = conflictList.find((item) => item.id === conflictId)
    if (match) {
      flyToBounds(match.bbox, 70)
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
          <select value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)}>
            {districtOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Mandal</label>
          <select value={selectedMandal} onChange={(event) => setSelectedMandal(event.target.value as 'All' | 'Orvakal' | 'Kurnool Rural' | 'Patha Kurnool')}>
            <option value="All">All</option>
            <option value="Orvakal">Orvakal</option>
            <option value="Kurnool Rural">Kurnool Rural</option>
            <option value="Patha Kurnool">Patha Kurnool</option>
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
            <span>Data source health</span>
            <button type="button">Live</button>
          </div>
          <div className="audit-list">
            {tableCatalog.slice(0, 3).map((entry) => (
              <div key={entry.id} className="audit-item">
                <div>
                  <strong>{entry.name}</strong>
                  <small>{entry.source}</small>
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
      <section className="bottom-grid">
        <div className="panel conflict-list-panel">
          <div className="panel-header small-header">
            <span>CONFLICTS</span>
            <button>Heatmap</button>
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
            <span>CONFLICT INSPECTOR</span>
            <button>Resolve</button>
          </div>
          <div className="title-row">
            <h3>{selectedConflict.id}</h3>
            <span className={`severity ${selectedConflict.severity.toLowerCase()}`}>{selectedConflict.severity}</span>
          </div>
          <p className="inspector-description">{selectedConflict.description}</p>
          <div className="facts-grid">
            <div><label>Type</label><strong>{selectedConflict.type}</strong></div>
            <div><label>Confidence</label><strong>{selectedConflict.confidence}%</strong></div>
            <div><label>Displacement</label><strong>{selectedConflict.displacement.toFixed(2)} m</strong></div>
            <div><label>Uncertainty</label><strong>±{selectedConflict.uncertainty.toFixed(2)} m</strong></div>
            <div><label>Source A</label><strong>{selectedConflict.sourceA}</strong></div>
            <div><label>Source B</label><strong>{selectedConflict.sourceB}</strong></div>
            <div><label>Status</label><strong>{selectedConflict.status}</strong></div>
            <div><label>Area diff.</label><strong>{selectedConflict.areaDifference.toFixed(1)} m²</strong></div>
          </div>
          <div className="source-strip">
            <span>REAL DATA</span>
            <span>DERIVED DEMO</span>
            <span>AI ANALYSIS</span>
          </div>
        </div>
      </section>
    </>
  )

  const renderDatasetsView = () => (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">DATASETS</div>
          <h2>Integrated source catalog</h2>
        </div>
        <div className="topbar-actions">
          <button className="secondary">Refresh feeds</button>
          <button className="primary">+ Add dataset</button>
        </div>
      </header>
      <section className="panel">
        <div className="panel-header small-header">
          <span>DATA SOURCES</span>
          <button>+ Add Dataset</button>
        </div>
        <div className="dataset-panel">
          {tableCatalog.map((item) => (
            <div key={item.id} className="dataset-row">
              <div>
                <strong>{item.name}</strong>
                <small>{item.source}</small>
              </div>
              <span className={`tag ${item.sourceType.toLowerCase().replace(/\s+/g, '-')}`}>{item.sourceType}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )

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

  const renderActiveView = () => {
    switch (activeNav) {
      case 'Map':
        return renderMapView()
      case 'Conflicts':
        return renderConflictsView()
      case 'Datasets':
        return renderDatasetsView()
      case 'Ground Truth':
        return renderGroundTruthView()
      case 'API':
        return renderApiView()
      default:
        return renderDashboardView()
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">B</div>
          <div>
            <div className="eyebrow">LAND INTELLIGENCE</div>
            <h1>BhoomiSync</h1>
          </div>
        </div>

        <nav className="nav-stack">
          {(['Dashboard', 'Map', 'Conflicts', 'Datasets', 'Ground Truth', 'API'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`nav-item ${activeNav === item ? 'active' : ''}`}
              onClick={() => setActiveNav(item)}
            >
              {item}
            </button>
          ))}
        </nav>

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

        <div className="dataset-panel">
          <div className="panel-header">
            <span>DATA SOURCES</span>
            <button>+ Add Dataset</button>
          </div>
          {tableCatalog.map((item) => (
            <div key={item.id} className="dataset-row">
              <div>
                <strong>{item.name}</strong>
                <small>{item.source}</small>
              </div>
              <span className={`tag ${item.sourceType.toLowerCase().replace(/\s+/g, '-')}`}>{item.sourceType}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="content-area">
        {renderActiveView()}
      </main>
    </div>
  )
}

export default App
