import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'

type ConflictGeometryComparisonProps = {
  conflictId: string
  sourceAName: string
  sourceBName: string
  sourceAGeometry: Polygon | MultiPolygon
  sourceBGeometry: Polygon | MultiPolygon
  correctionGeometry: Polygon | null
  onCorrectionSaved: (geometry: Polygon) => void
}

const comparisonStyle: maplibregl.StyleSpecification = {
  version: 8,
  name: 'Conflict geometry comparison',
  sources: {},
  layers: [{ id: 'comparison-background', type: 'background', paint: { 'background-color': '#eef1e8' } }],
}

const getCombinedBounds = (geometries: Array<Polygon | MultiPolygon>): [[number, number], [number, number]] | null => {
  const coordinates: number[][] = []
  const collect = (value: unknown): void => {
    if (!Array.isArray(value)) return
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      coordinates.push(value as number[])
      return
    }
    value.forEach(collect)
  }
  geometries.forEach((geometry) => collect(geometry.coordinates))
  if (!coordinates.length) return null

  const longitudes = coordinates.map(([longitude]) => longitude)
  const latitudes = coordinates.map(([, latitude]) => latitude)
  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ]
}

export default function ConflictGeometryComparison({
  conflictId,
  sourceAName,
  sourceBName,
  sourceAGeometry,
  sourceBGeometry,
  correctionGeometry,
  onCorrectionSaved,
}: ConflictGeometryComparisonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const drawingRef = useRef(false)
  const verticesRef = useRef<Array<[number, number]>>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [vertices, setVertices] = useState<Array<[number, number]>>([])
  const [completedGeometry, setCompletedGeometry] = useState<Polygon | null>(null)
  const [drawMessage, setDrawMessage] = useState('')

  const updateDrawingSources = (map: maplibregl.Map, nextVertices: Array<[number, number]>, polygon: Polygon | null) => {
    const vertexSource = map.getSource('correction-vertices') as maplibregl.GeoJSONSource | undefined
    const lineSource = map.getSource('correction-line') as maplibregl.GeoJSONSource | undefined
    const fillSource = map.getSource('correction-fill') as maplibregl.GeoJSONSource | undefined
    const vertexFeatures: Feature[] = nextVertices.map((coordinates, index) => ({
      type: 'Feature',
      properties: { order: index + 1 },
      geometry: { type: 'Point', coordinates },
    }))
    const lineFeatures: Feature[] = []
    if (polygon) {
      lineFeatures.push({ type: 'Feature', properties: {}, geometry: polygon })
    } else if (nextVertices.length >= 2) {
      lineFeatures.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: nextVertices } })
    }
    const fillFeatures: Feature[] = polygon ? [{ type: 'Feature', properties: {}, geometry: polygon }] : []
    vertexSource?.setData({ type: 'FeatureCollection', features: vertexFeatures } as FeatureCollection)
    lineSource?.setData({ type: 'FeatureCollection', features: lineFeatures } as FeatureCollection)
    fillSource?.setData({ type: 'FeatureCollection', features: fillFeatures } as FeatureCollection)
  }

  const startDrawing = () => {
    drawingRef.current = true
    verticesRef.current = []
    setVertices([])
    setCompletedGeometry(null)
    setDrawMessage('Click the map to place boundary vertices. Add at least three points, then finish the shape.')
    setIsDrawing(true)
    if (mapRef.current) updateDrawingSources(mapRef.current, [], null)
  }

  const undoVertex = () => {
    const nextVertices = verticesRef.current.slice(0, -1)
    verticesRef.current = nextVertices
    setVertices(nextVertices)
    if (mapRef.current) updateDrawingSources(mapRef.current, nextVertices, null)
  }

  const finishDrawing = () => {
    const points = verticesRef.current
    if (points.length < 3) {
      setDrawMessage('Add at least three boundary vertices before finishing the shape.')
      return
    }
    const ring: Array<[number, number]> = [...points, points[0]]
    const polygon: Polygon = { type: 'Polygon', coordinates: [ring] }
    drawingRef.current = false
    setCompletedGeometry(polygon)
    setIsDrawing(false)
    setDrawMessage('Correction shape ready. Save it as a draft before requesting ground-truth review.')
    if (mapRef.current) updateDrawingSources(mapRef.current, points, polygon)
  }

  const clearDrawing = () => {
    drawingRef.current = false
    verticesRef.current = []
    setVertices([])
    setCompletedGeometry(null)
    setIsDrawing(false)
    setDrawMessage('')
    if (mapRef.current) updateDrawingSources(mapRef.current, [], null)
  }

  useEffect(() => {
    drawingRef.current = false
    verticesRef.current = []
    setVertices([])
    setCompletedGeometry(null)
    setIsDrawing(false)
    setDrawMessage('')
  }, [conflictId])

  useEffect(() => {
    if (!containerRef.current) return

    const workerUrl = new URL('/maplibre-gl-worker.mjs', window.location.origin).toString()
    maplibregl.setWorkerUrl(workerUrl)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: comparisonStyle,
      center: [79.43, 13.68],
      zoom: 15,
      minZoom: 10,
      attributionControl: false,
    })
    mapRef.current = map

    map.on('load', () => {
      const features = [
        { type: 'Feature' as const, properties: { source: 'A', name: sourceAName }, geometry: sourceAGeometry },
        { type: 'Feature' as const, properties: { source: 'B', name: sourceBName }, geometry: sourceBGeometry },
      ]
      map.addSource('conflict-geometries', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      })
      map.addLayer({
        id: 'conflict-geometry-fill',
        type: 'fill',
        source: 'conflict-geometries',
        paint: {
          'fill-color': ['match', ['get', 'source'], 'A', '#348c8b', 'B', '#c85d49', '#52645d'],
          'fill-opacity': 0.36,
        },
      })
      map.addLayer({
        id: 'conflict-geometry-line',
        type: 'line',
        source: 'conflict-geometries',
        paint: {
          'line-color': ['match', ['get', 'source'], 'A', '#176b68', 'B', '#9b3d30', '#18332d'],
          'line-width': 3,
        },
      })
      map.addSource('correction-vertices', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addSource('correction-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addSource('correction-fill', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: correctionGeometry ? [{ type: 'Feature', properties: {}, geometry: correctionGeometry }] : [],
        },
      })
      map.addLayer({
        id: 'correction-fill-layer',
        type: 'fill',
        source: 'correction-fill',
        paint: { 'fill-color': '#efc84a', 'fill-opacity': 0.34 },
      })
      map.addLayer({
        id: 'correction-line-layer',
        type: 'line',
        source: 'correction-line',
        paint: { 'line-color': '#9a6c0b', 'line-width': 3, 'line-dasharray': [2, 1] },
      })
      map.addLayer({
        id: 'correction-vertices-layer',
        type: 'circle',
        source: 'correction-vertices',
        paint: { 'circle-radius': 5, 'circle-color': '#efc84a', 'circle-stroke-color': '#18332d', 'circle-stroke-width': 1.5 },
      })
      const bounds = getCombinedBounds([sourceAGeometry, sourceBGeometry])
      if (bounds) map.fitBounds(bounds, { padding: 42, maxZoom: 18, duration: 0 })
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left')
      map.doubleClickZoom.disable()
      map.on('click', (event) => {
        if (!drawingRef.current) return
        const nextVertices = [...verticesRef.current, [event.lngLat.lng, event.lngLat.lat] as [number, number]]
        verticesRef.current = nextVertices
        setVertices(nextVertices)
        updateDrawingSources(map, nextVertices, null)
      })
      if (correctionGeometry) updateDrawingSources(map, [], correctionGeometry)
      requestAnimationFrame(() => map.resize())
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [conflictId, sourceAName, sourceBName, sourceAGeometry, sourceBGeometry, correctionGeometry])

  return (
    <div className="conflict-geometry-editor">
      <div ref={containerRef} className={`conflict-geometry-map ${isDrawing ? 'drawing-active' : ''}`} role="application" aria-label={`Geometry comparison for ${conflictId}: ${sourceAName} and ${sourceBName}`} />
      <div className="geometry-edit-toolbar">
        {!isDrawing && <button type="button" onClick={startDrawing}>Redraw boundary</button>}
        {isDrawing && <>
          <button type="button" onClick={undoVertex} disabled={!vertices.length}>Undo point</button>
          <button type="button" onClick={finishDrawing} disabled={vertices.length < 3}>Finish shape</button>
          <button type="button" onClick={clearDrawing}>Cancel</button>
        </>}
        {completedGeometry && <>
          <span>{vertices.length} vertices</span>
          <button type="button" className="save-correction-button" onClick={() => onCorrectionSaved(completedGeometry)}>Save correction draft</button>
        </>}
        {correctionGeometry && !completedGeometry && <span className="correction-saved-label">Correction draft saved</span>}
      </div>
      {drawMessage && <p className="geometry-edit-message" role="status">{drawMessage}</p>}
    </div>
  )
}
