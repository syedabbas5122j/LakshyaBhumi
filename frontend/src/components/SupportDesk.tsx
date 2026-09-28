import { useEffect, useState, type FormEvent } from 'react'
import { supportApi, type ServiceDiagnostic, type SupportTicket } from '../services/supportApi'
import './SupportDesk.css'

type SupportDeskProps = { role: string }

const ticketCategories: SupportTicket['category'][] = ['Account access', 'Upload or sync', 'System availability', 'Other']
const supportRoles = new Set(['Help Desk Operator', 'IT Support Staff', 'System Administrator'])

export default function SupportDesk({ role }: SupportDeskProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketIntakeEnabled, setTicketIntakeEnabled] = useState(false)
  const [category, setCategory] = useState<SupportTicket['category']>('Account access')
  const [summary, setSummary] = useState('')
  const [diagnostics, setDiagnostics] = useState<ServiceDiagnostic[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const isSupportOperator = supportRoles.has(role)
  const isItSupport = role === 'IT Support Staff'
  const canSeeDiagnostics = isItSupport || role === 'System Administrator'
  const canManage = isSupportOperator

  const refresh = async () => {
    const ticketResponse = await supportApi.tickets()
    setTickets(ticketResponse.tickets)
    setTicketIntakeEnabled(ticketResponse.ticket_intake_enabled)
    if (canSeeDiagnostics) setDiagnostics((await supportApi.diagnostics()).services)
  }

  useEffect(() => {
    refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load support tools.'))
  }, [role])

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await supportApi.createTicket(category, summary)
      setSummary('')
      setNotice('Support request submitted.')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit support request.')
    } finally {
      setBusy(false)
    }
  }

  const updateTicket = async (ticket: SupportTicket, status: SupportTicket['status'], assignedTo?: SupportTicket['assigned_to']) => {
    setBusy(true)
    setError('')
    try {
      await supportApi.updateTicket(ticket.id, status, assignedTo)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the ticket.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="support-desk">
      <header className="topbar">
        <div><div className="eyebrow">SUPPORT OPERATIONS</div><h2>{canManage ? 'Support queue' : 'Request support'}</h2><p className="view-intro">Tickets contain service summaries only; parcel records and legal case data are not attached.</p></div>
        <span className="support-role-tag">{role}</span>
      </header>

      {error && <p className="support-message error" role="alert">{error}</p>}
      {notice && <p className="support-message" role="status">{notice}</p>}

      {canSeeDiagnostics && <section className="support-section" aria-labelledby="support-diagnostics-title">
        <div className="support-section-heading"><div><span>TECHNICAL HEALTH</span><h3 id="support-diagnostics-title">Service diagnostics</h3></div><button type="button" className="secondary" disabled={busy} onClick={() => refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Refresh failed.'))}>Refresh checks</button></div>
        <div className="diagnostic-grid">{diagnostics.map((service) => <article className="diagnostic-row" key={service.name}><span className={`diagnostic-status ${service.status === 'Needs attention' ? 'attention' : ''}`} /><div><strong>{service.name}</strong><small>{service.status}</small></div><b>{service.pending_count ?? service.queued_count ?? service.run_count ?? '—'}</b></article>)}</div>
        <p className="support-footnote">Diagnostics return service status and aggregate counts only. No file names, parcel data, or conflict details are exposed.</p>
      </section>}

      {!isItSupport && ticketIntakeEnabled && <section className="support-section" aria-labelledby="support-submit-title">
        <div className="support-section-heading"><div><span>NEW REQUEST</span><h3 id="support-submit-title">Describe the issue</h3></div></div>
        <form className="support-ticket-form" onSubmit={submitTicket}>
          <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as SupportTicket['category'])}>{ticketCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="support-summary-field">Short summary<textarea required minLength={10} maxLength={500} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Describe the sign-in, service, or upload problem" /></label>
          <p>Do not include passwords, OTPs, contact details, parcel identifiers, or legal case information.</p>
          <button type="submit" className="primary" disabled={busy}>Submit request</button>
        </form>
      </section>}

      <section className="support-section" aria-labelledby="support-queue-title">
        <div className="support-section-heading"><div><span>{canManage ? 'TRIAGE' : 'MY REQUESTS'}</span><h3 id="support-queue-title">{canManage ? 'Ticket queue' : 'Request history'}</h3></div><small>{tickets.length} visible</small></div>
        <div className="support-ticket-list">
          {tickets.map((ticket) => (
            <article className="support-ticket" key={ticket.id}>
              <div className="support-ticket-heading"><div><span>{ticket.category}</span><strong>{ticket.id}</strong></div><span className={`ticket-status ${ticket.status.toLowerCase().replace(' ', '-')}`}>{ticket.status}</span></div>
              <p>{ticket.summary}</p>
              <small>Submitted by {ticket.created_by.role} · {new Date(ticket.created_at).toLocaleString()} · Assigned to {ticket.assigned_to}</small>
              {canManage && <div className="support-ticket-actions">
                <label>Status<select value={ticket.status} disabled={busy} onChange={(event) => updateTicket(ticket, event.target.value as SupportTicket['status'])}><option>New</option><option>In progress</option><option>Resolved</option></select></label>
                {!isItSupport && <label>Route<select value={ticket.assigned_to} disabled={busy} onChange={(event) => updateTicket(ticket, ticket.status, event.target.value as SupportTicket['assigned_to'])}><option>Help Desk Operator</option><option>IT Support Staff</option></select></label>}
              </div>}
            </article>
          ))}
          {tickets.length === 0 && <p className="support-empty">No support requests in this view.</p>}
        </div>
      </section>
    </div>
  )
}