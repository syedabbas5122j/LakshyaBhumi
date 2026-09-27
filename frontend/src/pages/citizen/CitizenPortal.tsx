import './CitizenPortal.css'

type CitizenPortalProps = {
  role: string
  onSignOut: () => void
}

const citizenProfiles: Record<string, { intro: string; focus: string[] }> = {
  'Land Owner': {
    intro: 'Find your parcel on the official cadastral map and review the available land-record context.',
    focus: ['Parcel location and boundaries', 'Survey number and map context', 'Ground-truth and record history'],
  },
  'Property Buyer / Seller': {
    intro: 'Check the mapped parcel and available record context before a property transaction.',
    focus: ['Parcel identity and boundary context', 'Mapped area and location', 'Record and survey history'],
  },
  'Property Lawyer': {
    intro: 'Review cadastral context and available records while preparing a property matter.',
    focus: ['Parcel map and boundary context', 'Dispute-related record context', 'Survey and version history'],
  },
  'Bank / Mortgage Officer': {
    intro: 'Open cadastral parcel information for property verification workflows.',
    focus: ['Parcel location and boundary context', 'Available ownership-record references', 'Survey history and map view'],
  },
  'Real Estate Developer': {
    intro: 'Explore cadastral context alongside the official land-map service.',
    focus: ['Parcel and administrative boundaries', 'Municipal and planning context', 'Area-level map review'],
  },
}

const officialMapUrl = 'https://bhunaksha.ap.gov.in/bhunakshalpm/28/index.jsp'

export default function CitizenPortal({ role, onSignOut }: CitizenPortalProps) {
  const profile = citizenProfiles[role] ?? citizenProfiles['Land Owner']

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
          <a className="citizen-primary-action" href={officialMapUrl} target="_blank" rel="noreferrer">
            Open official Bhu-Naksha <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="citizen-map-card" aria-label="Cadastral parcel map preview">
          <div className="citizen-map-label"><span>AP / CADASTRAL VIEW</span><b>PUBLIC PORTAL</b></div>
          <div className="citizen-map-grid" />
          <div className="citizen-lot citizen-lot-one"><span>PARCEL</span><b>241/6</b></div>
          <div className="citizen-lot citizen-lot-two"><span>PARCEL</span><b>241/7</b></div>
          <div className="citizen-lot citizen-lot-three"><span>PARCEL</span><b>242/1</b></div>
          <div className="citizen-map-pin">+</div>
          <div className="citizen-map-footer"><span>TIRUPATI DISTRICT</span><span>13.6288° N · 79.4192° E</span></div>
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
