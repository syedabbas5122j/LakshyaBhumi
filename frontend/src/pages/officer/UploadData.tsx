import { useEffect, useState, type FormEvent } from 'react'
import { uploadApi, type UploadedDataset, type UploadScope } from '../../services/uploadApi'
import './UploadData.css'

const formatSize = (size: number) => size < 1024 * 1024
  ? `${Math.ceil(size / 1024)} KB`
  : `${(size / (1024 * 1024)).toFixed(1)} MB`

export default function UploadData() {
  const [scope, setScope] = useState<UploadScope | null>(null)
  const [uploads, setUploads] = useState<UploadedDataset[]>([])
  const [datasetName, setDatasetName] = useState('')
  const [areaLevel, setAreaLevel] = useState('')
  const [areaName, setAreaName] = useState('')
  const [parentArea, setParentArea] = useState('')
  const [crs, setCrs] = useState('EPSG:4326')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadUploadData = async () => {
    const [scopeResult, uploadResult] = await Promise.all([uploadApi.getScopes(), uploadApi.list()])
    setScope(scopeResult)
    setAreaLevel((current) => current && scopeResult.area_levels.includes(current) ? current : scopeResult.area_levels[0] ?? '')
    setUploads(uploadResult.uploads)
  }

  useEffect(() => {
    loadUploadData().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Could not load upload permissions.')
    })
  }, [])

  const submitUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setError('Choose a GeoJSON file to upload.')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('dataset_name', datasetName)
    formData.append('area_level', areaLevel)
    formData.append('area_name', areaName)
    formData.append('parent_area', parentArea)
    formData.append('crs', crs)

    try {
      const uploaded = await uploadApi.submit(formData)
      setUploads((current) => [uploaded, ...current])
      setNotice(`${uploaded.id} received: ${uploaded.feature_count.toLocaleString()} features queued for validation.`)
      setDatasetName('')
      setAreaName('')
      setParentArea('')
      setFile(null)
      const fileInput = document.getElementById('geodata-file') as HTMLInputElement | null
      if (fileInput) fileInput.value = ''
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="upload-data-page">
      <header className="topbar">
        <div>
          <div className="eyebrow">FIELD AND ADMIN DATA</div>
          <h2>Upload geospatial data</h2>
          <p className="view-intro">Submit vector or raster data for your permitted administrative area. Files enter validation; they do not directly replace authoritative records.</p>
        </div>
        <div className="topbar-actions"><span className="upload-limit">GEOJSON / COG · MAX 25 MB</span><span className="upload-capability">PAUSE / RESUME READY</span></div>
      </header>

      {scope && <section className="upload-permissions">
        <strong>{scope.role}</strong>
        <span>Permitted scopes: {scope.area_levels.length ? scope.area_levels.join(', ') : 'No upload scopes assigned. Contact your administrator.'}</span>
      </section>}

      <section className="upload-capability-note" aria-label="Upload transfer capabilities">
        <strong>Resumable transfer workflow</strong>
        <span>Uploads are designed to support pause, resume, retry, and sync-status tracking for large field packages.</span>
      </section>

      {scope?.area_levels.length ? <form className="upload-form" onSubmit={submitUpload}>
        <div className="upload-form-heading"><span className="eyebrow">NEW DATA PACKAGE</span><span>Required fields marked *</span></div>
        <div className="upload-form-grid">
          <label><span>Dataset name *</span><input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} placeholder="e.g. Ward 14 parcel corrections" minLength={2} maxLength={120} required /></label>
          <label><span>Administrative level *</span><select value={areaLevel} onChange={(event) => setAreaLevel(event.target.value)} required>{scope.area_levels.map((level) => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}</select></label>
          <label><span>Area name / code *</span><input value={areaName} onChange={(event) => setAreaName(event.target.value)} placeholder="e.g. Chandragiri" maxLength={160} required /></label>
          <label><span>Parent area</span><input value={parentArea} onChange={(event) => setParentArea(event.target.value)} placeholder="e.g. Tirupati District" maxLength={240} /></label>
          <label><span>Coordinate reference system</span><input value={crs} onChange={(event) => setCrs(event.target.value)} placeholder="EPSG:4326" maxLength={120} /></label>
          <label className="upload-file-field"><span>GeoJSON or COG file *</span><input id="geodata-file" type="file" accept=".geojson,.json,.tif,.tiff,application/geo+json,application/json,image/tiff" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label>
        </div>
        <div className="upload-form-footer">
          <p>Uploads are stored separately, validated, and attributed to your signed-in account. They are not automatically merged into the cadastral record.</p>
          <button className="primary" type="submit" disabled={busy || !areaLevel}>{busy ? 'Uploading…' : 'Upload for validation'}</button>
        </div>
        {file && <p className="upload-selected-file">Selected: {file.name} · {formatSize(file.size)}</p>}
        {error && <p className="upload-message error" role="alert">{error}</p>}
        {notice && <p className="upload-message success" role="status">{notice}</p>}
      </form> : <div className="upload-empty-state">{error || 'No upload scopes are assigned to this role.'}</div>}

      <section className="upload-history">
        <div className="upload-history-header"><div><span className="eyebrow">YOUR SUBMISSIONS</span><h3>Upload history</h3></div><span>{uploads.length} files</span></div>
        {uploads.length ? <div className="upload-table-wrap"><table className="upload-table"><thead><tr><th>Dataset</th><th>Area</th><th>Features</th><th>CRS</th><th>Status</th></tr></thead><tbody>
          {uploads.map((upload) => <tr key={upload.id}><td><strong>{upload.dataset_name}</strong><small>{upload.id} · {upload.original_filename} · {formatSize(upload.size_bytes)}</small></td><td>{upload.area_level} · {upload.area_name}{upload.parent_area ? <small>{upload.parent_area}</small> : null}</td><td>{upload.format === 'COG/GeoTIFF raster' ? 'Raster' : upload.feature_count.toLocaleString()}</td><td>{upload.crs}</td><td><span className="upload-status">{upload.status}</span><small>{upload.format ?? 'GeoJSON vector'} · {upload.sync_status ?? 'Integration sync not configured'}</small></td></tr>)}
        </tbody></table></div> : <p className="upload-empty-state">No GeoJSON uploads yet.</p>}
      </section>
    </div>
  )
}
