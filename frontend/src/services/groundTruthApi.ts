import type { Polygon } from 'geojson'

type GroundTruthRequestResult = {
  request: {
    id: string
    conflict_id: string
    status: string
    created_at: string
  }
}

export type FieldSubmission = {
  id: string
  type: 'Survey' | 'Claim' | 'Objection'
  title: string
  description: string
  area_name: string
  status: string
  created_at: string
}

const authenticatedFetch = async (path: string, init?: RequestInit) => {
  const token = window.sessionStorage.getItem('bhusha_access_token')
  if (!token) throw new Error('Sign in again to submit field information.')
  const response = await fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Field submission failed.')
  return result
}

export const groundTruthApi = {
  submitRequest: async (payload: { conflict_id: string; geometry: Polygon; note: string }) => {
    const token = window.sessionStorage.getItem('bhusha_access_token')
    if (!token) {
      throw new Error('Sign in again to submit a ground-truth request.')
    }

    const response = await fetch('/api/v1/ground-truth/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(typeof result.detail === 'string' ? result.detail : 'Could not submit the ground-truth request.')
    }
    return result as GroundTruthRequestResult
  },
  listSubmissions: async () => authenticatedFetch('/api/v1/ground-truth/submissions') as Promise<{ submissions: FieldSubmission[] }>,
  submitFieldSubmission: async (payload: { type: FieldSubmission['type']; title: string; description: string; area_name: string; attachment_name?: string }) => authenticatedFetch('/api/v1/ground-truth/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }) as Promise<{ submission: FieldSubmission }>,
}
