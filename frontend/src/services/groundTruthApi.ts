import type { Polygon } from 'geojson'

type GroundTruthRequestResult = {
  request: {
    id: string
    conflict_id: string
    status: string
    created_at: string
  }
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
}
