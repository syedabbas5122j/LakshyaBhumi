import { useEffect, useState, type FormEvent } from 'react'
import { adminApi, type AdminRoleCatalog, type AuditEvent, type BackupRecord, type ManagedUser, type RuntimeConfig } from '../services/adminApi'
import './AdministrationConsole.css'

type AdministrationConsoleProps = { onSignOut: () => void }

const configurationLabels: Record<keyof RuntimeConfig, string> = {
  uploads_enabled: 'Dataset uploads',
  harmonization_enabled: 'AI harmonization',
  citizen_login_enabled: 'Citizen sign-in',
  support_tickets_enabled: 'Support ticket intake',
}

export default function AdministrationConsole({ onSignOut }: AdministrationConsoleProps) {
  const [roles, setRoles] = useState<AdminRoleCatalog>({ officer: [], citizen: [] })
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [config, setConfig] = useState<RuntimeConfig | null>(null)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [auditIntegrity, setAuditIntegrity] = useState<boolean | null>(null)
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [encryptionConfigured, setEncryptionConfigured] = useState(false)
  const [identity, setIdentity] = useState('')
  const [audience, setAudience] = useState<'officer' | 'citizen'>('officer')
  const [role, setRole] = useState('')
  const [password, setPassword] = useState('')
  const [district, setDistrict] = useState('')
  const [mandal, setMandal] = useState('')
  const [village, setVillage] = useState('')
  const [resetIdentity, setResetIdentity] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [editingIdentity, setEditingIdentity] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editDistrict, setEditDistrict] = useState('')
  const [editMandal, setEditMandal] = useState('')
  const [editVillage, setEditVillage] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    const [roleCatalog, managedUsers, runtimeConfig, auditLog, backupList] = await Promise.all([
      adminApi.roles(), adminApi.users(), adminApi.config(), adminApi.audit(), adminApi.backups(),
    ])
    setRoles(roleCatalog)
    setUsers(managedUsers)
    setConfig(runtimeConfig)
    setEvents(auditLog.events)
    setAuditIntegrity(auditLog.integrity_valid)
    setBackups(backupList.backups)
    setEncryptionConfigured(backupList.encryption_configured)
    setRole((current) => current || roleCatalog.officer[0] || '')
  }

  useEffect(() => {
    refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load administrator controls.'))
  }, [])

  const submitUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await adminApi.createUser({ identity, audience, role, ...(audience === 'officer' ? { password } : {}), district, mandal, village })
      setIdentity('')
      setPassword('')
      setNotice('Account created. Credentials are never shown again.')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create account.')
    } finally {
      setBusy(false)
    }
  }

  const toggleUser = async (user: ManagedUser) => {
    setBusy(true)
    setError('')
    try {
      await adminApi.updateUser(user.identity, { is_active: !user.is_active })
      setNotice(`${user.identity} ${user.is_active ? 'deactivated' : 'reactivated'}.`)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update account.')
    } finally {
      setBusy(false)
    }
  }

  const editUser = (user: ManagedUser) => {
    setEditingIdentity(user.identity)
    setEditRole(user.role)
    setEditDistrict(user.district)
    setEditMandal(user.mandal)
    setEditVillage(user.village)
  }

  const submitUserEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingIdentity) return
    setBusy(true)
    setError('')
    try {
      await adminApi.updateUser(editingIdentity, { role: editRole, district: editDistrict, mandal: editMandal, village: editVillage })
      setNotice(`Role and jurisdiction updated for ${editingIdentity}.`)
      setEditingIdentity(null)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update role or jurisdiction.')
    } finally {
      setBusy(false)
    }
  }

  const submitPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetIdentity) return
    setBusy(true)
    setError('')
    try {
      await adminApi.resetPassword(resetIdentity, resetPassword)
      setNotice(`Password reset for ${resetIdentity}.`)
      setResetIdentity(null)
      setResetPassword('')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  const toggleConfig = async (key: keyof RuntimeConfig, value: boolean) => {
    setBusy(true)
    setError('')
    try {
      const updated = await adminApi.updateConfig({ [key]: value })
      setConfig(updated)
      const auditLog = await adminApi.audit()
      setEvents(auditLog.events)
      setAuditIntegrity(auditLog.integrity_valid)
      setNotice(`${configurationLabels[key]} ${value ? 'enabled' : 'disabled'}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update configuration.')
    } finally {
      setBusy(false)
    }
  }

  const makeBackup = async () => {
    setBusy(true)
    setError('')
    try {
      const backup = await adminApi.createBackup()
      setNotice(`Encrypted backup created: ${backup.id}`)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create backup.')
    } finally {
      setBusy(false)
    }
  }

  const downloadBackup = async (backup: BackupRecord) => {
    try {
      const blob = await adminApi.downloadBackup(backup.id)
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = `bhusha-${backup.id}.bhsbak`
      link.click()
      URL.revokeObjectURL(href)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not download backup.')
    }
  }

  const restoreBackup = async (backup: BackupRecord) => {
    if (!window.confirm(`Restore backup ${backup.id}? Current operational data will be replaced and all sessions revoked.`)) return
    setBusy(true)
    setError('')
    try {
      await adminApi.restoreBackup(backup.id)
      setNotice('Restore completed. Signing out because all sessions were revoked.')
      window.setTimeout(onSignOut, 900)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not restore backup.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="administration-console">
      <header className="topbar">
        <div><div className="eyebrow">PRIVILEGED CONTROLS</div><h2>System administration</h2><p className="view-intro">Account access, operational settings and audit history.</p></div>
        <div className="admin-console-badge">SYSTEM ADMINISTRATOR</div>
      </header>

      {error && <p className="admin-message error" role="alert">{error}</p>}
      {notice && <p className="admin-message" role="status">{notice}</p>}

      <section className="admin-section" aria-labelledby="admin-users-title">
        <div className="admin-section-heading"><div><span>IDENTITIES</span><h3 id="admin-users-title">User and role management</h3></div><small>{users.length} accounts</small></div>
        <form className="admin-user-form" onSubmit={submitUser}>
          <label>Login identity<input required minLength={3} maxLength={200} value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="Officer username or citizen contact" /></label>
          <label>Audience<select value={audience} onChange={(event) => { const next = event.target.value as typeof audience; setAudience(next); setRole(roles[next][0] ?? ''); setPassword('') }}><option value="officer">Officer</option><option value="citizen">Citizen</option></select></label>
          <label>Role<select required value={role} onChange={(event) => setRole(event.target.value)}>{roles[audience].map((item) => <option key={item}>{item}</option>)}</select></label>
          {audience === 'officer' && <label>Temporary password<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
          <label>District<input maxLength={160} value={district} onChange={(event) => setDistrict(event.target.value)} /></label>
          <label>Mandal<input maxLength={160} value={mandal} onChange={(event) => setMandal(event.target.value)} /></label>
          <label>Village<input maxLength={160} value={village} onChange={(event) => setVillage(event.target.value)} /></label>
          <button className="primary" type="submit" disabled={busy || !role}>Create account</button>
        </form>
        <div className="admin-user-list">
          {users.map((user) => (
            <article className="admin-user-row" key={user.identity}>
              <div><strong>{user.identity}</strong><small>{user.role} · {user.audience} · {user.source}</small><small>{[user.village, user.mandal, user.district].filter(Boolean).join(' / ') || 'No assigned geographic scope'}</small></div>
              <div className="admin-user-actions">
                {user.source === 'managed' && user.audience === 'officer' && <button type="button" className="secondary" onClick={() => { setResetIdentity(user.identity); setResetPassword('') }}>Reset password</button>}
                {user.source === 'managed' && <><button type="button" className="secondary" onClick={() => editUser(user)}>Edit role / scope</button><button type="button" className="secondary" disabled={busy} onClick={() => toggleUser(user)}>{user.is_active ? 'Deactivate' : 'Reactivate'}</button></>}
                <span className={user.is_active ? 'admin-active' : 'admin-inactive'}>{user.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {editingIdentity === user.identity && <form className="admin-user-edit-form" onSubmit={submitUserEdit}><label>Role<select value={editRole} onChange={(event) => setEditRole(event.target.value)}>{roles[user.audience].map((item) => <option key={item}>{item}</option>)}</select></label><label>District<input value={editDistrict} maxLength={160} onChange={(event) => setEditDistrict(event.target.value)} /></label><label>Mandal<input value={editMandal} maxLength={160} onChange={(event) => setEditMandal(event.target.value)} /></label><label>Village<input value={editVillage} maxLength={160} onChange={(event) => setEditVillage(event.target.value)} /></label><button type="submit" className="primary" disabled={busy}>Save role and scope</button><button type="button" className="secondary" onClick={() => setEditingIdentity(null)}>Cancel</button></form>}
              {resetIdentity === user.identity && <form className="admin-reset-form" onSubmit={submitPasswordReset}><label>New password<input type="password" minLength={12} autoComplete="new-password" required value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /></label><button type="submit" className="primary" disabled={busy}>Set password</button><button type="button" className="secondary" onClick={() => setResetIdentity(null)}>Cancel</button></form>}
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section" aria-labelledby="admin-config-title">
        <div className="admin-section-heading"><div><span>RUNTIME</span><h3 id="admin-config-title">Operational configuration</h3></div><small>Changes are enforced by the API</small></div>
        <div className="admin-config-list">
          {config && (Object.keys(configurationLabels) as (keyof RuntimeConfig)[]).map((key) => (
            <label className="admin-config-row" key={key}><span><strong>{configurationLabels[key]}</strong><small>{key.replaceAll('_', ' ')}</small></span><input type="checkbox" checked={config[key]} disabled={busy} onChange={(event) => toggleConfig(key, event.target.checked)} /></label>
          ))}
        </div>
      </section>

      {encryptionConfigured && <section className="admin-section" aria-labelledby="admin-backup-title">
        <div className="admin-section-heading"><div><span>RECOVERY</span><h3 id="admin-backup-title">Encrypted backups</h3></div><small>{encryptionConfigured ? 'Encryption key configured' : 'Encryption key required'}</small></div>
        <p className="admin-section-note">The backup key is held outside the backup. Store it separately; without it, backups cannot be restored.</p>
        <button type="button" className="primary" disabled={busy} onClick={makeBackup}>Create encrypted backup</button>
        <div className="admin-backup-list">{backups.map((backup) => <div className="admin-backup-row" key={backup.id}><span><strong>{backup.id}</strong><small>{new Date(backup.created_at).toLocaleString()} · {(backup.size_bytes / 1024).toFixed(1)} KB · AES-GCM</small></span><div><button type="button" className="secondary" onClick={() => downloadBackup(backup)}>Download</button><button type="button" className="secondary" disabled={busy} onClick={() => restoreBackup(backup)}>Restore</button></div></div>)}</div>
      </section>}

      <section className="admin-section" aria-labelledby="admin-audit-title">
        <div className="admin-section-heading"><div><span>ACCOUNTABILITY</span><h3 id="admin-audit-title">Administrative audit log</h3></div><small>{auditIntegrity === null ? 'Checking integrity' : auditIntegrity ? 'Hash chain verified' : 'INTEGRITY CHECK FAILED'} · Latest {events.length} events</small></div>
        <div className="admin-audit-list">{events.map((event) => <article className="admin-audit-row" key={event.id}><span>{new Date(event.occurred_at).toLocaleString()}</span><strong>{event.action.replaceAll('_', ' ')}</strong><span>{event.actor_role}</span><code>{event.target}</code></article>)}{events.length === 0 && <p>No administrative events recorded.</p>}</div>
      </section>
    </div>
  )
}