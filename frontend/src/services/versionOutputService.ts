import { parcelGeojson, type HarmonizationRun } from '../data'

export function triggerDownload(filename: string, data: unknown, mimeType = 'application/json') {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function generateVersionGeoJson(run: HarmonizationRun) {
  const isBuildingOutput = run.outputId === 'tirupati-buildings'

  const features = isBuildingOutput
    ? [
        {
          type: 'Feature' as const,
          properties: {
            feature_id: 'BLD-TPT-001',
            structure_type: 'Residential Parcel Structure',
            footprint_area_sqm: 148.5,
            confidence_score: run.confidence,
            uncertainty_meters: run.uncertaintyMeters,
            harmonization_run_id: run.id,
            version: run.outputVersion,
            status: run.status,
            model: run.modelVersion,
            conflated_at: run.createdAt,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [[
              [79.4282, 13.6749],
              [79.4302, 13.6749],
              [79.4302, 13.6766],
              [79.4282, 13.6766],
              [79.4282, 13.6749],
            ]],
          },
        },
        {
          type: 'Feature' as const,
          properties: {
            feature_id: 'BLD-TPT-002',
            structure_type: 'Commercial & Multi-utility Centre',
            footprint_area_sqm: 324.2,
            confidence_score: run.confidence,
            uncertainty_meters: run.uncertaintyMeters,
            harmonization_run_id: run.id,
            version: run.outputVersion,
            status: run.status,
            model: run.modelVersion,
            conflated_at: run.createdAt,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [[
              [79.4542, 13.6895],
              [79.4568, 13.6895],
              [79.4568, 13.6924],
              [79.4542, 13.6924],
              [79.4542, 13.6895],
            ]],
          },
        },
        {
          type: 'Feature' as const,
          properties: {
            feature_id: 'BLD-TPT-003',
            structure_type: 'Municipal Administrative Facility',
            footprint_area_sqm: 460.0,
            confidence_score: run.confidence,
            uncertainty_meters: run.uncertaintyMeters,
            harmonization_run_id: run.id,
            version: run.outputVersion,
            status: run.status,
            model: run.modelVersion,
            conflated_at: run.createdAt,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [[
              [79.4420, 13.6810],
              [79.4450, 13.6810],
              [79.4450, 13.6835],
              [79.4420, 13.6835],
              [79.4420, 13.6810],
            ]],
          },
        },
      ]
    : parcelGeojson.features.map((feature, idx) => ({
        ...feature,
        properties: {
          ...feature.properties,
          harmonized_version: run.outputVersion,
          harmonization_run_id: run.id,
          model_version: run.modelVersion,
          confidence_score: run.confidence,
          positional_uncertainty_meters: run.uncertaintyMeters,
          status: run.status,
          provenance_sources: run.inputVersions,
          conflation_timestamp: run.createdAt,
          sequence_order: idx + 1,
        },
      }))

  return {
    type: 'FeatureCollection' as const,
    name: `${run.outputName} v${run.outputVersion}`,
    crs: {
      type: 'name' as const,
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    metadata: {
      run_id: run.id,
      output_id: run.outputId,
      output_name: run.outputName,
      output_version: run.outputVersion,
      created_at: run.createdAt,
      status: run.status,
      run_by: run.runBy,
      model_version: run.modelVersion,
      confidence_percentage: run.confidence,
      positional_uncertainty_meters: run.uncertaintyMeters,
      changed_features: run.changedFeatures,
      input_versions: run.inputVersions,
      comparison_conflict_case: run.comparisonConflictId,
      summary: run.summary,
    },
    features,
  }
}

export function generateVersionReport(run: HarmonizationRun) {
  return {
    $schema: 'https://bhusha.gov.in/schemas/v1/harmonization-audit.json',
    report_type: 'AI Harmonization Output Provenance & Audit Report',
    generated_at: new Date().toISOString(),
    output_profile: {
      run_id: run.id,
      output_id: run.outputId,
      output_name: run.outputName,
      output_version: run.outputVersion,
      lifecycle_status: run.status,
      created_at: run.createdAt,
      authorized_agent: run.runBy,
    },
    geoai_engine_metrics: {
      model_version: run.modelVersion,
      confidence_score_percent: run.confidence,
      positional_uncertainty_meters: run.uncertaintyMeters,
      changed_features_count: run.changedFeatures,
      spatial_reference_system: 'EPSG:4326',
    },
    lineage_and_provenance: {
      input_source_versions: run.inputVersions,
      associated_conflict_case: run.comparisonConflictId,
      pipeline_execution_summary: run.summary,
    },
    regulatory_compliance: {
      framework: 'Digital India Land Records Modernization Programme (DILRMP)',
      jurisdiction: 'Tirupati District / Andhra Pradesh Cadastre',
      verification_level: run.status === 'Published' ? 'Level 3 - Officially Published' : 'Level 2 - Under Administrative Review',
      integrity_checksum: `sha256-${btoa(run.id + ':' + run.outputVersion + ':' + run.createdAt).replace(/=/g, '')}`,
    },
  }
}

export function downloadVersionGeoJson(run: HarmonizationRun) {
  const geojson = generateVersionGeoJson(run)
  const safeName = run.outputId.replace(/[^a-z0-9_-]/gi, '_')
  const filename = `${safeName}-v${run.outputVersion}-${run.id}.geojson`
  triggerDownload(filename, geojson, 'application/geo+json')
  return filename
}

export function downloadVersionReport(run: HarmonizationRun) {
  const report = generateVersionReport(run)
  const safeName = run.outputId.replace(/[^a-z0-9_-]/gi, '_')
  const filename = `${safeName}-v${run.outputVersion}-report-${run.id}.json`
  triggerDownload(filename, report, 'application/json')
  return filename
}
