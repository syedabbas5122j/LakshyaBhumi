import { useState, type FormEvent } from 'react'
import { authApi } from '../services/authApi'
import './LandingAuth.css'

type PortalMode = 'landing' | 'officer-login' | 'citizen-login'
type Audience = 'Officer' | 'Citizen'

type RoleLevel = {
  level: number
  name: string
  roles: string[]
}

const roleLevels: RoleLevel[] = [
  { level: 1, name: 'Field workers', roles: ['Village Surveyor', 'Ground Truth Surveyor', 'Drone Pilot', 'GCP Marker', 'Field Data Collector'] },
  { level: 2, name: 'Village / ward', roles: ['Village Revenue Officer (VRO)', 'Ward Secretary', 'Patwari / Lekhpal', 'Village Administrative Officer'] },
  { level: 3, name: 'Mandal / taluka', roles: ['Mandal Revenue Officer (MRO)', 'Tahsildar', 'Survey Inspector', 'Mandal Surveyor'] },
  { level: 4, name: 'District', roles: ['District Collector / District Magistrate', 'District Survey Officer', 'City Surveyor', 'District Land Records Officer'] },
  { level: 5, name: 'Urban local body', roles: ['Municipal Commissioner', 'Chief Town Planner', 'GIS Manager (Municipality)', 'Property Tax Officer'] },
  { level: 6, name: 'State', roles: ['Commissioner of Land Administration', 'Director of Survey & Land Records', 'State GIS Coordinator', 'Chief Cartographer'] },
  { level: 7, name: 'Citizens & stakeholders', roles: ['Land Owner', 'Property Buyer / Seller', 'Property Lawyer', 'Bank / Mortgage Officer', 'Real Estate Developer'] },
  { level: 8, name: 'Technical & support', roles: ['System Administrator', 'Data Entry Operator', 'IT Support Staff', 'Help Desk Operator'] },
]

const officerRoles = roleLevels.filter((group) => group.level !== 7)
const stakeholderRoles = roleLevels.find((group) => group.level === 7)?.roles ?? []

type LandingAuthProps = {
  mode: PortalMode
  onNavigate: (mode: PortalMode) => void
  onEnterWorkspace: (audience: Audience, role: string) => void
}

export default function LandingAuth({ mode, onNavigate, onEnterWorkspace }: LandingAuthProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState(officerRoles[0].roles[0])
  const [selectedStakeholder, setSelectedStakeholder] = useState(stakeholderRoles[0])
  const [officerUsername, setOfficerUsername] = useState('')
  const [officerPassword, setOfficerPassword] = useState('')
  const [citizenContact, setCitizenContact] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [otpRequested, setOtpRequested] = useState(false)
  const [developmentOtp, setDevelopmentOtp] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)

  const openPortal = (nextMode: PortalMode) => {
    if (nextMode === 'citizen-login') {
      setCitizenContact('')
      setOtpValue('')
      setOtpRequested(false)
      setDevelopmentOtp('')
      setAuthError('')
    }
    onNavigate(nextMode)
  }

  const enterRole = (level: number, role: string) => {
    if (level === 7) {
      setSelectedStakeholder(role)
      openPortal('citizen-login')
      return
    }

    setSelectedRole(role)
    setOfficerUsername('')
    setOfficerPassword('')
    onNavigate('officer-login')
  }

  const submitLogin = async (event: FormEvent<HTMLFormElement>, audience: Audience, role: string) => {
    event.preventDefault()
    setAuthError('')
    setAuthBusy(true)

    try {
      let session
      if (audience === 'Officer') {
        const formData = new FormData(event.currentTarget)
        session = await authApi.officerLogin({
          username: String(formData.get('username') ?? ''),
          password: String(formData.get('password') ?? ''),
          role,
        })
      } else if (!otpRequested) {
        const result = await authApi.requestCitizenOtp({ contact: citizenContact, role })
        setDevelopmentOtp(result.debug_code ?? '')
        setOtpRequested(true)
        return
      } else {
        session = await authApi.verifyCitizenOtp({ contact: citizenContact, code: otpValue, role })
      }

      authApi.saveSession(session)
      onEnterWorkspace(audience, role)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  const fillDemoAccess = async (role: string) => {
    setAuthError('')
    setDemoBusy(true)
    try {
      const access = await authApi.demoAccess(role)
      if (access.audience === 'officer') {
        setOfficerUsername(access.username ?? '')
        setOfficerPassword(access.password ?? '')
      } else {
        setCitizenContact(access.contact ?? '')
        setOtpValue('')
        setOtpRequested(false)
        setDevelopmentOtp('')
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Demo access is unavailable.')
    } finally {
      setDemoBusy(false)
    }
  }

  if (mode === 'officer-login' || mode === 'citizen-login') {
    const isOfficer = mode === 'officer-login'
    const role = isOfficer ? selectedRole : selectedStakeholder

    return (
      <main className="access-page">
        <header className="access-header">
          <button className="access-brand" type="button" onClick={() => onNavigate('landing')} aria-label="BhoomiSync home">
            <span className="access-brand-mark">B</span>
            <span><strong>BhoomiSync</strong><small>LAND INTELLIGENCE</small></span>
          </button>
          <a className="official-link" href="https://bhunaksha.ap.gov.in/bhunakshalpm/28/index.jsp" target="_blank" rel="noreferrer">Andhra Pradesh Bhu-Naksha <span aria-hidden="true">↗</span></a>
        </header>

        <section className="access-layout">
          <div className={`access-story ${isOfficer ? 'officer-story' : 'citizen-story'}`}>
            <div className="access-kicker"><span /> SECURE PORTAL ACCESS</div>
            <p className="access-index">{isOfficer ? '01 / DEPARTMENT' : '02 / PUBLIC'}</p>
            <h1>{isOfficer ? 'Good work starts with a clear record.' : 'Your land. Your records.'}</h1>
            <p className="access-intro">{isOfficer
              ? 'Review survey evidence, resolve boundary conflicts, and move cases forward across Andhra Pradesh.'
              : 'Access land information and follow the status of property and boundary cases in one place.'}</p>
            <div className="access-art" aria-hidden="true">
              <div className="access-art-top"><span>AP / LAND GRID</span><span>13°37′N 79°25′E</span></div>
              <div className="access-parcel parcel-one"><i>184/2</i></div>
              <div className="access-parcel parcel-two"><i>184/3</i></div>
              <div className="access-parcel parcel-three"><i>185/1</i></div>
              <div className="access-art-crosshair">+</div>
              <div className="access-art-caption"><span>CADASTRAL OVERLAY</span><strong>Verified at every level</strong></div>
            </div>
            <div className="access-trust"><span className="trust-dot" /> Andhra Pradesh land administration workflow</div>
          </div>

          <section className="login-panel" aria-labelledby="login-title">
            <button className="back-link" type="button" onClick={() => onNavigate('landing')}><span aria-hidden="true">←</span> Back to home</button>
            <div className="login-heading">
              <div className="login-symbol" aria-hidden="true">{isOfficer ? '⌖' : '⌂'}</div>
              <p className="login-eyebrow">{isOfficer ? 'GOVERNMENT & FIELD TEAMS' : 'LAND OWNERS & STAKEHOLDERS'}</p>
              <h2 id="login-title">{isOfficer ? 'Officer sign in' : 'Citizen sign in'}</h2>
              <p>{isOfficer ? 'Choose your role to open the right workspace.' : 'Use a one-time code to continue to your land services.'}</p>
            </div>

            {import.meta.env.DEV && (
              <button className="demo-access-action" type="button" onClick={() => fillDemoAccess(role)} disabled={demoBusy}>
                <span>{demoBusy ? 'Loading demo access…' : `Fill demo access · ${role}`}</span><b aria-hidden="true">↗</b>
              </button>
            )}

            <form className="login-form" onSubmit={(event) => submitLogin(event, isOfficer ? 'Officer' : 'Citizen', role)}>
              {isOfficer ? (
                <label className="login-field">
                  <span>Department role</span>
                  <select value={selectedRole} onChange={(event) => {
                    setSelectedRole(event.target.value)
                    setOfficerUsername('')
                    setOfficerPassword('')
                  }} required>
                    {officerRoles.map((group) => (
                      <optgroup key={group.level} label={`Level ${group.level} · ${group.name}`}>
                        {group.roles.map((item) => <option key={item} value={item}>{item}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="login-field">
                  <span>Account type</span>
                  <select value={selectedStakeholder} onChange={(event) => {
                    setSelectedStakeholder(event.target.value)
                    setCitizenContact('')
                    setOtpValue('')
                    setOtpRequested(false)
                    setDevelopmentOtp('')
                  }} required>
                    {stakeholderRoles.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              )}
              <label className="login-field">
                <span>{isOfficer ? 'Employee ID' : 'Mobile number or email'}</span>
                <input
                  autoComplete={isOfficer ? 'username' : 'email'}
                  name="username"
                  placeholder={isOfficer ? 'Enter your employee ID' : 'Enter mobile number or email'}
                  type="text"
                  value={isOfficer ? officerUsername : citizenContact}
                  onChange={(event) => isOfficer ? setOfficerUsername(event.target.value) : setCitizenContact(event.target.value)}
                  readOnly={!isOfficer && otpRequested}
                  required
                />
              </label>
              {isOfficer ? (
                <>
                  <label className="login-field">
                    <span>Password</span>
                    <span className="password-control">
                      <input autoComplete="current-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={officerPassword} onChange={(event) => setOfficerPassword(event.target.value)} required />
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
                    </span>
                  </label>
                  <div className="login-options">
                    <label className="remember-option"><input type="checkbox" /> <span>Remember this device</span></label>
                    <button type="button" className="text-action">Forgot password?</button>
                  </div>
                </>
              ) : (
                <>
                  {otpRequested && (
                    <>
                      <p className="otp-preview-note">
                        {developmentOtp ? `Development OTP: ${developmentOtp}. ` : ''}
                        {developmentOtp ? 'Development mode only.' : 'OTP delivery is not connected in this demo.'}
                      </p>
                      <label className="login-field">
                        <span>6-digit one-time code</span>
                        <input
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          maxLength={6}
                          name="otp"
                          onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          pattern="[0-9]{6}"
                          placeholder="Enter code"
                          required
                          type="text"
                          value={otpValue}
                        />
                      </label>
                    </>
                  )}
                  <button className="login-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : otpRequested ? 'Verify code' : 'Send OTP'} <span aria-hidden="true">→</span></button>
                </>
              )}
              {isOfficer && <button className="login-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : 'Continue to officer workspace'} <span aria-hidden="true">→</span></button>}
            </form>
            {authError && <p className="auth-error" role="alert">{authError}</p>}

            <div className="login-divider"><span /> <small>OR</small> <span /></div>
            <button className="switch-audience" type="button" onClick={() => openPortal(isOfficer ? 'citizen-login' : 'officer-login')}>
              {isOfficer ? 'Accessing land services as a citizen?' : 'Government or field staff?'} <strong>{isOfficer ? 'Citizen sign in' : 'Officer sign in'} →</strong>
            </button>
            <p className="auth-note">{isOfficer
              ? 'Officer accounts and password hashes must be provisioned in backend settings.'
              : 'Citizen OTP requires a configured SMS or email delivery provider.'}</p>
          </section>
        </section>
        <footer className="access-footer"><span>© 2026 BhoomiSync · Andhra Pradesh</span><span>Land records, made legible.</span></footer>
      </main>
    )
  }

  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="#home" aria-label="BhoomiSync home">
          <span className="access-brand-mark">B</span>
          <span><strong>BhoomiSync</strong><small>LAND INTELLIGENCE</small></span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#governance">Governance</a>
          <a href="https://bhunaksha.ap.gov.in/bhunakshalpm/28/index.jsp" target="_blank" rel="noreferrer">Bhu-Naksha <span aria-hidden="true">↗</span></a>
        </nav>
        <div className="landing-actions">
          <button className="landing-signin" type="button" onClick={() => openPortal('citizen-login')}>Citizen sign in</button>
          <button className="landing-officer" type="button" onClick={() => onNavigate('officer-login')}>Officer access <span aria-hidden="true">↗</span></button>
        </div>
      </header>

      <section className="landing-hero" id="home">
        <div className="hero-copy">
          <p className="hero-overline"><span>AP</span> ANDHRA PRADESH · LAND RECORDS & SPATIAL INTELLIGENCE</p>
          <h1>Every parcel has a story. <em>Make it clear.</em></h1>
          <p className="hero-description">A connected view of land records, cadastral maps, and survey evidence for the people who steward and depend on them.</p>
          <div className="hero-ctas">
            <button type="button" className="hero-primary" onClick={() => openPortal('citizen-login')}>Explore citizen services <span aria-hidden="true">→</span></button>
            <button type="button" className="hero-secondary" onClick={() => onNavigate('officer-login')}><span className="play-mark" aria-hidden="true">⌖</span> Officer workspace</button>
          </div>
          <div className="hero-footnote"><span className="trust-dot" /> LAND INFORMATION · SURVEY OPERATIONS · CONFLICT REVIEW</div>
        </div>
        <div className="hero-map-scene" aria-label="Illustrated cadastral map of Andhra Pradesh parcels">
          <div className="map-scene-head"><span>SPATIAL VIEW / 01</span><span>13.6288° N&nbsp;&nbsp; 79.4192° E</span></div>
          <div className="map-paper-grid" />
          <div className="map-river" />
          <div className="map-boundary boundary-a"><span>WARD 14</span></div>
          <div className="map-boundary boundary-b"><span>VILLAGE LIMIT</span></div>
          <div className="map-field field-a"><small>241/6</small></div>
          <div className="map-field field-b"><small>241/7</small></div>
          <div className="map-field field-c"><small>242/1</small></div>
          <div className="map-field field-d"><small>243/2</small></div>
          <div className="map-field field-e"><small>243/3</small></div>
          <div className="map-field field-f"><small>244/1</small></div>
          <div className="map-pin"><span>!</span></div>
          <div className="map-scale"><span /> 500 m</div>
          <div className="map-callout"><span className="callout-alert" /><span><small>BOUNDARY REVIEW</small><strong>Case TPT-00128</strong></span><b>↗</b></div>
          <div className="map-side-stamp">TIRUPATI<br />DISTRICT</div>
          <div className="map-scene-foot"><span>CADASTRAL PARCELS</span><span><i /> CONFLICT DETECTED</span><span>LIVE DEMO DATA</span></div>
        </div>
        <div className="hero-index">01 <span>—</span> LAND, UNDERSTOOD</div>
      </section>

      <section className="landing-service-strip" id="services">
        <div className="service-intro"><span className="section-label">ONE SYSTEM, MANY PERSPECTIVES</span><h2>Built around the people<br />behind every record.</h2></div>
        <button className="audience-card citizen-card" type="button" onClick={() => openPortal('citizen-login')}>
          <span className="audience-number">01 / PUBLIC</span><span className="audience-icon citizen-icon" aria-hidden="true">⌂</span><strong>Citizens & stakeholders</strong><span className="audience-copy">Land owners, buyers, legal and financial partners.</span><span className="audience-link">Open citizen services <b>↗</b></span>
        </button>
        <button className="audience-card officer-card" type="button" onClick={() => onNavigate('officer-login')}>
          <span className="audience-number">02 / GOVERNMENT</span><span className="audience-icon officer-icon" aria-hidden="true">⌖</span><strong>Officers & field teams</strong><span className="audience-copy">Survey, revenue, district, urban and state teams.</span><span className="audience-link">Enter officer workspace <b>↗</b></span>
        </button>
      </section>

      <section className="governance-section" id="governance">
        <div className="governance-heading"><div><span className="section-label">A SHARED CHAIN OF CUSTODY</span><h2>From field evidence<br />to state oversight.</h2></div><p>Land administration works when every level sees its place in the process. BhoomiSync brings operational roles into one connected hierarchy.</p></div>
        <div className="role-hierarchy">
          {roleLevels.map((group) => (
            <article className={`role-level level-${group.level}`} key={group.level}>
              <div className="role-level-heading"><span className="role-level-number">{String(group.level).padStart(2, '0')}</span><div><small>LEVEL {group.level}</small><h3>{group.name}</h3></div><span className="role-count">{String(group.roles.length).padStart(2, '0')} ROLES</span></div>
              <div className="role-list">{group.roles.map((role) => (
                <button key={role} type="button" onClick={() => enterRole(group.level, role)} aria-label={`Sign in as ${role}`}>{role}</button>
              ))}</div>
              <button className="hierarchy-action" type="button" onClick={() => enterRole(group.level, group.roles[0])}>
                {group.level === 7 ? 'Citizen & stakeholder access' : group.level === 8 ? 'Technical support access' : `${group.name} portal`}
                <span>↗</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-reference">
        <div className="reference-seal">AP</div>
        <div><span className="section-label">OFFICIAL CADASTRAL RECORDS</span><h2>Maps and land services,<br />connected to the source.</h2></div>
        <p>View Andhra Pradesh cadastral maps through the official Bhu-Naksha portal.</p>
        <a href="https://bhunaksha.ap.gov.in/bhunakshalpm/28/index.jsp" target="_blank" rel="noreferrer">Open Bhu-Naksha <span aria-hidden="true">↗</span></a>
      </section>
      <footer className="landing-footer"><a className="landing-brand" href="#home"><span className="access-brand-mark">B</span><span><strong>BhoomiSync</strong><small>LAND INTELLIGENCE</small></span></a><span>© 2026 BhoomiSync · Andhra Pradesh</span><span>Land records, made legible.</span></footer>
    </main>
  )
}
