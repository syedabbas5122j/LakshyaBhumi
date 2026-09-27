export type UploadScope = {
  role: string
  area_levels: string[]
}

export type UploadedDataset = {
  id: string
  dataset_name: string
  original_filename: string
  size_bytes: number
  feature_count: number
  area_level: string
  area_name: string
  parent_area: string
  crs: string
  status: string
  submitted_role: string
  sync_status?: string
  format?: string
}

const getToken = () => window.sessionStorage.getItem('bhusha_access_token')

const getJson = async <T>(path: string): Promise<T> => {
  const token = getToken()
  if (!token) throw new Error('Sign in again to upload data.')
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Could not load upload information.')
  return result as T
}

export const uploadApi = {
  getScopes: () => getJson<UploadScope>('/api/v1/ingestion/upload-scopes'),
  list: () => getJson<{ uploads: UploadedDataset[] }>('/api/v1/ingestion/uploads'),
  submit: async (formData: FormData) => {
    const token = getToken()
    if (!token) throw new Error('Sign in again to upload data.')
    const response = await fetch('/api/v1/ingestion/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Upload failed.')
    return result.upload as UploadedDataset
  },
}
