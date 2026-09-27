export type AuthSession = {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  user: {
    id: string
    audience: 'officer' | 'citizen'
    role: string
  }
}

type OtpRequestResult = {
  message: string
  debug_code?: string
}

type DemoAccess = {
  audience: 'officer' | 'citizen'
  role: string
  username?: string
  password?: string
  contact?: string
}

const postJson = async <T>(path: string, payload: unknown): Promise<T> => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(typeof result.detail === 'string' ? result.detail : 'Sign-in failed. Please try again.')
  }

  return result as T
}

export const authApi = {
  demoAccess: (role: string) => fetch(`/api/v1/auth/demo-access?role=${encodeURIComponent(role)}`)
    .then(async (response) => {
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof result.detail === 'string' ? result.detail : 'Demo access is unavailable.')
      }
      return result as DemoAccess
    }),
  officerLogin: (payload: { username: string; password: string; role: string }) =>
    postJson<AuthSession>('/api/v1/auth/officer/login', payload),
  requestCitizenOtp: (payload: { contact: string; role: string }) =>
    postJson<OtpRequestResult>('/api/v1/auth/citizen/otp/request', payload),
  verifyCitizenOtp: (payload: { contact: string; code: string; role: string }) =>
    postJson<AuthSession>('/api/v1/auth/citizen/otp/verify', payload),
  signOut: async () => {
    const token = window.sessionStorage.getItem('bhusha_access_token')
    try {
      if (token) {
        const response = await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          throw new Error('Session could not be revoked by the server.')
        }
      }
    } finally {
      authApi.clearSession()
    }
  },
  clearSession: () => {
    window.sessionStorage.removeItem('bhusha_access_token')
    window.sessionStorage.removeItem('bhusha_user')
  },
  saveSession: (session: AuthSession) => {
    window.sessionStorage.setItem('bhusha_access_token', session.access_token)
    window.sessionStorage.setItem('bhusha_user', JSON.stringify(session.user))
  },
}
