import type { Polygon } from 'geojson'

type GroundTruthRequestResult = {
  request: {
    id: string
    conflict_id: string
    status: string
    created_at: string
    review_stage: string
  }
}

export type FieldSubmissionKind = 'Survey' | 'Claim' | 'Objection'

export type FieldSubmission = {
  id: string
  type: FieldSubmissionKind | 'Boundary correction'
  type_label: string
  title: string
  description: string
  area_name: string
  status: string
  review_stage?: 'village' | 'mandal' | 'district' | 'completed' | 'unassigned'
  scope?: { district: string; mandal: string; village: string }
  submitted_by?: { id: string; role: string; audience: 'officer' | 'citizen' }
  assigned_to?: { id: string; role: string; audience: 'officer' | 'citizen' } | null
  review_history?: Array<{
    action: string
    note: string
    actor: { id: string; role: string; audience: 'officer' | 'citizen' }
    created_at: string
  }>
  created_at: string
  updated_at?: string
}

export type ReviewAction = 'claim' | 'release' | 'comment' | 'forward' | 'request_rework' | 'resubmit' | 'approve' | 'reject'

const authenticatedFetch = async (path: string, init?: RequestInit) => {
  const token = window.sessionStorage.getItem('bhusha_access_token')
  if (!token) throw new Error('Sign in again to submit field information.')
  const response = await fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Field submission failed.')
  return result
}

export const groundTruthApi = {
  submitRequest: async (payload: { conflict_id: string; geometry: Polygon; note: string; district: string; mandal: string; village: string }) => {
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
  submitFieldSubmission: async (payload: { type: FieldSubmissionKind; title: string; description: string; area_name: string; attachment_name?: string; district: string; mandal: string; village: string }) => authenticatedFetch('/api/v1/ground-truth/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }) as Promise<{ submission: FieldSubmission }>,
  reviewSubmission: async (submissionId: string, action: ReviewAction, note = '') => authenticatedFetch(`/api/v1/ground-truth/submissions/${encodeURIComponent(submissionId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, note }),
  }) as Promise<{ submission: FieldSubmission }>,
}
