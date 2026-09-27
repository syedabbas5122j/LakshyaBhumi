export type IntegrationAccessRequest = {
  id: string
  department: string
  method: string
  contact: string
  notes: string
  status: 'Requested' | 'Approved'
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = window.sessionStorage.getItem('bhusha_access_token')
  if (!token) throw new Error('Sign in again to request integration access.')
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Integration access request failed.')
  return result as T
}

export const integrationApi = {
  create: (payload: { department: string; method: string; contact: string; notes: string }) => request<{ request: IntegrationAccessRequest }>('/api/v1/integrations/access-requests', { method: 'POST', body: JSON.stringify(payload) }),
  list: () => request<{ requests: IntegrationAccessRequest[] }>('/api/v1/integrations/access-requests'),
}
