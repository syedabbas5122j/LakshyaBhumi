import { useEffect, useState, type FormEvent } from 'react'
import { groundTruthApi, type FieldSubmission, type FieldSubmissionKind } from '../../services/groundTruthApi'
import './CitizenPortal.css'

type CitizenPortalProps = {
  role: string
  onSignOut: () => void
}

const citizenProfiles: Record<string, { intro: string; action: string; focus: string[] }> = {
  'Land Owner': {
    intro: 'Find your parcel on the official cadastral map and review the available land-record context.',
    action: 'Open my parcel map',
    focus: ['Parcel location and boundaries', 'Survey number and map context', 'Ground-truth and record history'],
  },
  'Property Buyer / Seller': {
    intro: 'Check the mapped parcel and available record context before a property transaction.',
    action: 'Open parcel verification',
    focus: ['Parcel identity and boundary context', 'Mapped area and location', 'Record and survey history'],
  },
  'Property Lawyer': {
    intro: 'Review cadastral context and available records while preparing a property matter.',
    action: 'Open dispute context',
    focus: ['Parcel map and boundary context', 'Dispute-related record context', 'Survey and version history'],
  },
  'Bank / Mortgage Officer': {
    intro: 'Perform property collateral appraisal, verify non-encumbrance (EC), inspect boundary integrity & export audit certificates before loan sanction.',
    action: 'Open collateral appraisal view',
    focus: [
      'Encumbrance certificate (EC) & title verification',
      'Cadastral boundary integrity & overlap risk check',
      'Govt. SRO guidance valuation & classification',
      'Auditable Bank Due-Diligence PDF report export',
    ],
  },
  'Real Estate Developer': {
    intro: 'Explore cadastral context alongside the official land-map service.',
    action: 'Open area map',
    focus: ['Parcel and administrative boundaries', 'Municipal and planning context', 'Area-level map review'],
  },
}

const officialMapUrl = 'https://bhunaksha.ap.gov.in/bhunakshalpm/28/index.jsp'

const parcelRecords = [
  { survey: '241/6', village: 'Tirupati Urban', mandal: 'Tirupati Urban', district: 'Tirupati District', area: '0.82 acre', status: 'Mapped', confidence: '92%', updated: '27 Sep 2026' },
  { survey: '241/7', village: 'Tirupati Urban', mandal: 'Tirupati Urban', district: 'Tirupati District', area: '1.14 acre', status: 'Mapped', confidence: '89%', updated: '22 Sep 2026' },
  { survey: '242/1', village: 'Chandragiri', mandal: 'Chandragiri', district: 'Tirupati District', area: '0.64 acre', status: 'Review available', confidence: '76%', updated: '18 Sep 2026' },
  { survey: '184/2', village: 'Puttur', mandal: 'Puttur', district: 'Tirupati District', area: '2.08 acre', status: 'Mapped', confidence: '94%', updated: '15 Sep 2026' },
]

export default function CitizenPortal({ role, onSignOut }: CitizenPortalProps) {
  const profile = citizenProfiles[role] ?? citizenProfiles['Land Owner']
  const [parcelQuery, setParcelQuery] = useState('')
  const [selectedParcel, setSelectedParcel] = useState(parcelRecords[0])
  const [submissions, setSubmissions] = useState<FieldSubmission[]>([])
  const [submissionType, setSubmissionType] = useState<FieldSubmissionKind>('Claim')
  const [submissionTitle, setSubmissionTitle] = useState('')
  const [submissionDescription, setSubmissionDescription] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [submissionBusy, setSubmissionBusy] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState('')
  const filteredParcels = parcelRecords.filter((parcel) => `${parcel.survey} ${parcel.village}`.toLowerCase().includes(parcelQuery.toLowerCase()))

  useEffect(() => {
    const loadSubmissions = () => groundTruthApi.listSubmissions().then((result) => setSubmissions(result.submissions)).catch(() => undefined)
    loadSubmissions()
    const interval = window.setInterval(loadSubmissions, 5000)
    return () => window.clearInterval(interval)
  }, [])

  const submitCitizenRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmissionBusy(true)
    setSubmissionMessage('')
    try {
      const result = await groundTruthApi.submitFieldSubmission({
        type: submissionType,
        title: submissionTitle,
        description: submissionDescription,
        area_name: `${selectedParcel.survey} · ${selectedParcel.village}`,
        attachment_name: attachmentName,
        district: selectedParcel.district,
        mandal: selectedParcel.mandal,
        village: selectedParcel.village,
      })
      setSubmissions((current) => [result.submission, ...current])
      setSubmissionTitle('')
      setSubmissionDescription('')
      setAttachmentName('')
      setSubmissionMessage(`${result.submission.id} submitted and queued for verification.`)
    } catch (error) {
      setSubmissionMessage(error instanceof Error ? error.message : 'Could not submit your request.')
    } finally {
      setSubmissionBusy(false)
    }
  }

  const downloadSummary = () => {
    const summary = { citizen_role: role, parcel: selectedParcel, submissions, generated_at: new Date().toISOString() }
    const url = URL.createObjectURL(new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedParcel.survey.replace('/', '-')}-land-summary.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="citizen-portal">
      <header className="citizen-portal-header">
        <a className="citizen-brand" href="#citizen-home" aria-label="BhoomiSync citizen home">
          <span className="citizen-brand-mark">B</span>
          <span><strong>BhoomiSync</strong><small>PUBLIC LAND SERVICES</small></span>
        </a>
        <div className="citizen-account">
          <span>{role}</span>
          <button type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <section className="citizen-welcome" id="citizen-home">
        <div className="citizen-welcome-copy">
          <p className="citizen-eyebrow"><span /> CITIZEN SERVICES / ANDHRA PRADESH</p>
          <h1>Your land, <em>clearly mapped.</em></h1>
          <p>{profile.intro}</p>
          <a className="citizen-primary-action" href="#citizen-services">{profile.action} <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section className="citizen-services" id="citizen-services">
        <div className="citizen-service-heading"><div><p className="citizen-eyebrow">PUBLIC LAND WORKSPACE</p><h2>Search, review, act.</h2></div><button type="button" className="citizen-secondary-action" onClick={downloadSummary}>Download case summary ↓</button></div>
        <div className="citizen-service-grid">
          <section className="citizen-service-panel citizen-parcel-panel">
            <div className="citizen-panel-label">01 / PARCEL SEARCH</div>
            <h3>Find a parcel</h3>
            <input className="citizen-search" value={parcelQuery} onChange={(event) => setParcelQuery(event.target.value)} placeholder="Search survey number or village" />
            <div className="citizen-parcel-results">
              {filteredParcels.map((parcel) => <button type="button" className={`citizen-parcel-result ${selectedParcel.survey === parcel.survey ? 'selected' : ''}`} key={parcel.survey} onClick={() => setSelectedParcel(parcel)}><span><strong>{parcel.survey}</strong><small>{parcel.village}</small></span><b>{parcel.confidence}</b></button>)}
            </div>
            <a className="citizen-inline-link" href={officialMapUrl} target="_blank" rel="noreferrer">Open official Bhu-Naksha ↗</a>
          </section>
          <section className="citizen-service-panel citizen-inspector-panel">
            <div className="citizen-panel-label">{role === 'Bank / Mortgage Officer' ? '02 / COLLATERAL APPRAISAL' : '02 / PARCEL INSPECTOR'}</div>
            <div className="citizen-inspector-top">
              <div>
                <h3>Survey {selectedParcel.survey}</h3>
                <p>{selectedParcel.village} · {selectedParcel.mandal}</p>
              </div>
              <span className="citizen-record-status">{selectedParcel.status}</span>
            </div>
            <div className="citizen-record-grid">
              <div><small>Mapped area</small><strong>{selectedParcel.area}</strong></div>
              <div><small>Confidence</small><strong>{selectedParcel.confidence}</strong></div>
              <div><small>Last update</small><strong>{selectedParcel.updated}</strong></div>
            </div>

            {role === 'Bank / Mortgage Officer' && (
              <div style={{ marginTop: '14px', padding: '10px 12px', background: 'rgba(52, 140, 139, 0.08)', border: '1px solid rgba(52, 140, 139, 0.25)', borderRadius: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 700, color: 'var(--citizen-teal)', letterSpacing: '0.8px', marginBottom: '6px' }}>
                  <span>BANK DUE DILIGENCE</span>
                  <span style={{ color: 'var(--citizen-green)' }}>NIL ENCUMBRANCE (CLEAR)</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--citizen-ink)', lineHeight: '1.6' }}>
                  <div><strong>EC Number:</strong> EC-AP-2026-8812 (SRO Verified)</div>
                  <div><strong>Valuation:</strong> ₹48.50 Lakhs (Govt. Guidance Value)</div>
                  <div><strong>Collateral Risk:</strong> Low · Zero Boundary Overlap Flag</div>
                </div>
              </div>
            )}

            <div className="citizen-history">
              <span>RECORD HISTORY</span>
              <p><b>27 Sep</b> Boundary geometry reviewed</p>
              <p><b>22 Sep</b> Revenue reference linked</p>
              <p><b>18 Sep</b> Survey evidence received</p>
            </div>
          </section>
          <section className="citizen-service-panel citizen-request-panel">
            <div className="citizen-panel-label">03 / REQUEST REVIEW</div><h3>Submit a request</h3><p className="citizen-panel-copy">Send a survey, claim, or objection for this parcel. Each request receives a trackable ID.</p>
            <form className="citizen-request-form" onSubmit={submitCitizenRequest}><label>Request type<select value={submissionType} onChange={(event) => setSubmissionType(event.target.value as FieldSubmissionKind)}><option>Claim</option><option>Objection</option><option>Survey</option></select></label><label>Title<input value={submissionTitle} onChange={(event) => setSubmissionTitle(event.target.value)} placeholder="Short title" required /></label><label>Details<textarea value={submissionDescription} onChange={(event) => setSubmissionDescription(event.target.value)} placeholder="Describe your request" rows={3} required /></label><label>Supporting file<input type="file" onChange={(event) => setAttachmentName(event.target.files?.[0]?.name ?? '')} /></label><button className="citizen-submit-action" type="submit" disabled={submissionBusy}>{submissionBusy ? 'Submitting...' : `Submit ${submissionType}`} <span>→</span></button>{submissionMessage && <p className="citizen-form-message" role="status">{submissionMessage}</p>}</form>
          </section>
          <section className="citizen-service-panel citizen-status-panel">
            <div className="citizen-panel-label">04 / LIVE STATUS</div><div className="citizen-inspector-top"><h3>Your requests</h3><span className="citizen-live-badge">LIVE</span></div>
            <div className="citizen-submission-list">{submissions.length ? submissions.slice(0, 5).map((submission) => <article className="citizen-submission" key={submission.id}><div><strong>{submission.title}</strong><small>{submission.id} · {submission.area_name}</small></div><span>{submission.type_label ?? submission.type}</span><em>{submission.status}</em><details><summary>Correspondence · {submission.review_history?.length ?? 0}</summary>{submission.review_history?.map((event, index) => <p key={`${submission.id}-${index}`}><b>{event.actor.role}</b> · {event.note} <small>{new Date(event.created_at).toLocaleString()}</small></p>)}</details></article>) : <p className="citizen-panel-copy">No requests submitted for this account yet.</p>}</div>
          </section>
        </div>
      </section>

      <section className="citizen-focus-section">
        <div className="citizen-section-heading">
          <div><p className="citizen-eyebrow">YOUR ACCESS PROFILE</p><h2>{role}</h2></div>
          <p>Use the official map service for parcel lookup and land-record access. BhoomiSync account-linked services are not yet connected.</p>
        </div>
        <div className="citizen-focus-list">
          {profile.focus.map((item, index) => (
            <a key={item} href={officialMapUrl} target="_blank" rel="noreferrer" className="citizen-focus-item">
              <span>0{index + 1}</span><strong>{item}</strong><b aria-hidden="true">↗</b>
            </a>
          ))}
        </div>
      </section>

      <footer className="citizen-footer">
        <span>© 2026 BhoomiSync · Andhra Pradesh</span>
        <a href={officialMapUrl} target="_blank" rel="noreferrer">Official cadastral map <span aria-hidden="true">↗</span></a>
      </footer>
    </main>
  )
}
