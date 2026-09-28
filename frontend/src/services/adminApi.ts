export type AdminRoleCatalog = Record<'officer' | 'citizen', string[]>

export type ManagedUser = {
  identity: string
  id: string
  audience: 'officer' | 'citizen'
  role: string
  district: string
  mandal: string
  village: string
  is_active: boolean
  source: string
}

export type RuntimeConfig = {
  uploads_enabled: boolean
  harmonization_enabled: boolean
  citizen_login_enabled: boolean
  support_tickets_enabled: boolean
}

export type AuditEvent = {
  id: string
  occurred_at: string
  actor_id: string
  actor_role: string
  action: string
  target: string
  details: Record<string, string | number | boolean | string[]>
  previous_hash: string
  event_hash: string
}

export type BackupRecord = { id: string; created_at: string; size_bytes: number; encrypted: boolean }

const getToken = () => window.sessionStorage.getItem('bhusha_access_token')

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = getToken()
  if (!token) throw new Error('Sign in again to use administration controls.')
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Administration request failed.')
  return result as T
}

export const adminApi = {
  roles: () => request<{ roles: AdminRoleCatalog }>('/api/v1/admin/roles').then((result) => result.roles),
  users: () => request<{ users: ManagedUser[] }>('/api/v1/admin/users').then((result) => result.users),
  createUser: (payload: { identity: string; audience: 'officer' | 'citizen'; role: string; password?: string; district: string; mandal: string; village: string }) =>
    request<{ user: ManagedUser }>('/api/v1/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (identity: string, payload: { role?: string; district?: string; mandal?: string; village?: string; is_active?: boolean }) =>
    request<{ user: ManagedUser }>(`/api/v1/admin/users/${encodeURIComponent(identity)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  resetPassword: (identity: string, password: string) =>
    request<{ status: string }>(`/api/v1/admin/users/${encodeURIComponent(identity)}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  config: () => request<{ config: RuntimeConfig }>('/api/v1/admin/config').then((result) => result.config),
  updateConfig: (changes: Partial<RuntimeConfig>) => request<{ config: RuntimeConfig }>('/api/v1/admin/config', { method: 'PATCH', body: JSON.stringify(changes) }).then((result) => result.config),
  audit: () => request<{ events: AuditEvent[]; integrity_valid: boolean }>('/api/v1/admin/audit'),
  backups: () => request<{ backups: BackupRecord[]; encryption_configured: boolean }>('/api/v1/admin/backups'),
  createBackup: () => request<{ backup: BackupRecord }>('/api/v1/admin/backups', { method: 'POST' }).then((result) => result.backup),
  restoreBackup: (id: string) => request<{ backup: BackupRecord; sessions_revoked: boolean }>(`/api/v1/admin/backups/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  downloadBackup: async (id: string) => {
    const token = getToken()
    if (!token) throw new Error('Sign in again to download backups.')
    const response = await fetch(`/api/v1/admin/backups/${encodeURIComponent(id)}/download`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error('Backup download failed.')
    return response.blob()
  },
}