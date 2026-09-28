export type SupportTicket = {
  id: string
  category: 'Account access' | 'Upload or sync' | 'System availability' | 'Other'
  summary: string
  status: 'New' | 'In progress' | 'Resolved'
  created_at: string
  updated_at: string
  created_by: { id: string; role: string }
  assigned_to: 'Help Desk Operator' | 'IT Support Staff'
}

export type ServiceDiagnostic = {
  name: string
  status: 'Operational' | 'Available' | 'Needs attention'
  pending_count?: number | null
  queued_count?: number | null
  run_count?: number | null
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = window.sessionStorage.getItem('bhusha_access_token')
  if (!token) throw new Error('Sign in again to use support tools.')
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Support request failed.')
  return result as T
}

export const supportApi = {
  tickets: () => request<{ tickets: SupportTicket[]; ticket_intake_enabled: boolean }>('/api/v1/support/tickets'),
  createTicket: (category: SupportTicket['category'], summary: string) =>
    request<{ ticket: SupportTicket }>('/api/v1/support/tickets', { method: 'POST', body: JSON.stringify({ category, summary }) }),
  updateTicket: (id: string, status: SupportTicket['status'], assigned_to?: SupportTicket['assigned_to']) =>
    request<{ ticket: SupportTicket }>(`/api/v1/support/tickets/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status, assigned_to }) }),
  diagnostics: () => request<{ checked_at: string; services: ServiceDiagnostic[] }>('/api/v1/support/diagnostics'),
}