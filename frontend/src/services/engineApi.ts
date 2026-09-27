export type HarmonizationStep = {
  key: string
  label: string
  status: 'completed'
  detail: string
  metrics?: Record<string, string | number>
}

export type LiveHarmonizationResult = {
  run_id: string
  started_by: string
  source: { id: string; name: string; features: number }
  target: { id: string; name: string; features: number }
  steps: HarmonizationStep[]
  output: {
    features: number
    confidence: number
    uncertainty_meters: number
    lineage_entries: number
    geojson: { type: 'FeatureCollection'; features: unknown[] }
    report: Record<string, unknown>
  }
  stored_files?: {
    run_id: string
    source_dataset: string
    target_dataset: string
    geojson_filename: string
    report_filename: string
  }
}

const getToken = () => window.sessionStorage.getItem('bhusha_access_token')

export const engineApi = {
  health: async () => {
    const response = await fetch('/api/v1/engine/health')
    return response.json()
  },
  runHarmonization: async (sourceUploadId?: string, targetUploadId?: string): Promise<LiveHarmonizationResult> => {
    const token = getToken()
    if (!token) throw new Error('Sign in again to run harmonization.')
    const response = await fetch('/api/v1/engine/harmonize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_upload_id: sourceUploadId, target_upload_id: targetUploadId }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Harmonization failed.')
    return result as LiveHarmonizationResult
  },
}
