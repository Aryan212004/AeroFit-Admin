import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'

// ---- Design tokens -----------------------------------------------------
// Matches Home.jsx exactly, so the two pages read as one product:
// Background: #F6F6F1 (cream)      Surface: #FFFFFF
// Ink:        #14161A              Muted: #6B6F76
// Green:      #0F6E56  (gym)             tint #E4F3EE
// Purple:     #534AB7  (super admin)     tint #EEEDFE
// Divider:    #E7E6DF
// Display face: Bricolage Grotesque | Body: DM Sans | Utility: JetBrains Mono

function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0)
  const startRef = useRef(null)
  useEffect(() => {
    let frame
    const step = (t) => {
      if (startRef.current === null) startRef.current = t
      const progress = Math.min((t - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

function EKGLine() {
  return (
    <svg className="af-ekg" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
      <path
        className="af-ekg-path"
        d="M0,30 L150,30 L170,30 L185,8 L200,52 L215,30 L230,30 L245,18 L255,30 L600,30"
        fill="none"
      />
    </svg>
  )
}

function ConsoleTile({ accent, tint, icon, eyebrow, title, description, points, cta, onClick }) {
  return (
    <button className="af-tile" style={{ '--accent': accent, '--tint': tint }} onClick={onClick}>
      <div className="af-tile-top">
        <span className="af-tile-icon">{icon}</span>
        <span className="af-tile-status">
          <span className="af-status-dot" /> ONLINE
        </span>
      </div>

      <div className="af-tile-eyebrow">{eyebrow}</div>
      <div className="af-tile-title">{title}</div>
      <p className="af-tile-desc">{description}</p>

      <ul className="af-tile-points">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <div className="af-tile-cta">
        {cta}
        <span className="af-tile-arrow">→</span>
      </div>
    </button>
  )
}

export default function ConsoleSelector() {
  const nav = useNavigate()
  const now = useLiveClock()
  const gyms = useCountUp(12)
  const members = useCountUp(3041)
  const uptime = useCountUp(99.9)

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-IN', { hour12: false })

  return (
    <div className="af-console">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        .af-console {
          min-height: 100vh;
          width: 100%;
          background: #F6F6F1;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #14161A;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 60px;
        }

        /* ---------- Shared nav (same classes Header.jsx renders into) ---------- */
        .af-nav {
          max-width: 1140px;
          width: 100%;
          margin: 0 auto;
          padding: 22px 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .af-logo {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-weight: 700;
          font-size: 22px;
          letter-spacing: -0.01em;
          cursor: pointer;
        }
        .af-logo span { color: #0F6E56; }
        .af-nav-links { display: flex; align-items: center; gap: 28px; }
        .af-nav-links a {
          font-size: 14px;
          color: #6B6F76;
          text-decoration: none;
          font-weight: 500;
        }
        .af-nav-links a:hover { color: #14161A; }
        .af-console-link {
          font-size: 13px;
          font-weight: 600;
          color: #534AB7;
          background: #EEEDFE;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
        }
        .af-console-link:hover { background: #E2DFFC; }
        @media (max-width: 720px) { .af-nav-links a:not(.af-console-link) { display: none; } }

        /* ---------- Status strip ---------- */
        .af-statusbar {
          width: 100%;
          max-width: 1140px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          border: 1px solid #E7E6DF;
          border-radius: 10px;
          background: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.02em;
          color: #6B6F76;
          margin: 28px 24px 0;
        }
        .af-status-left { display: flex; align-items: center; gap: 8px; }
        .af-status-left b { color: #14161A; font-weight: 600; }
        .af-clock { color: #0F6E56; font-weight: 600; }
        .af-pulse-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #0F6E56;
          box-shadow: 0 0 0 0 rgba(15,110,86,0.6);
          animation: af-pulse-ring 1.8s infinite;
        }
        @keyframes af-pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(15,110,86,0.5); }
          70% { box-shadow: 0 0 0 8px rgba(15,110,86,0); }
          100% { box-shadow: 0 0 0 0 rgba(15,110,86,0); }
        }

        /* ---------- Hero ---------- */
        .af-hero { text-align: center; max-width: 640px; margin-top: 56px; padding: 0 24px; }
        .af-wordmark {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(38px, 6vw, 56px);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .af-wordmark span { color: #0F6E56; }
        .af-tagline { font-size: 15px; color: #6B6F76; margin-top: 14px; }

        .af-ekg { width: 100%; max-width: 400px; height: 40px; margin: 20px auto 0; display: block; overflow: visible; }
        .af-ekg-path {
          stroke: #0F6E56;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 700;
          stroke-dashoffset: 700;
          animation: af-ekg-draw 2.6s ease-in-out infinite;
        }
        @keyframes af-ekg-draw {
          0%   { stroke-dashoffset: 700; }
          55%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -700; }
        }

        /* ---------- Tiles ---------- */
        .af-tiles {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          width: 100%;
          max-width: 900px;
          margin-top: 50px;
          padding: 0 24px;
        }
        @media (max-width: 720px) { .af-tiles { grid-template-columns: 1fr; } }

        .af-tile {
          text-align: left;
          background: #FFFFFF;
          border: 1px solid #E7E6DF;
          border-radius: 16px;
          padding: 26px 26px 22px;
          cursor: pointer;
          font-family: inherit;
          color: inherit;
          position: relative;
          overflow: hidden;
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .af-tile:hover {
          transform: translateY(-4px);
          border-color: var(--accent);
          box-shadow: 0 16px 34px -20px color-mix(in srgb, var(--accent) 45%, transparent);
        }
        .af-tile:hover .af-tile-arrow { transform: translateX(4px); }

        .af-tile-top { display: flex; align-items: center; justify-content: space-between; }
        .af-tile-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          background: var(--tint);
        }
        .af-tile-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--accent);
          display: flex; align-items: center; gap: 6px;
        }
        .af-status-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }

        .af-tile-eyebrow {
          margin-top: 22px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          color: #6B6F76;
        }
        .af-tile-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 24px;
          font-weight: 700;
          margin-top: 6px;
        }
        .af-tile-desc { font-size: 13.5px; color: #6B6F76; margin-top: 8px; line-height: 1.55; }

        .af-tile-points { list-style: none; padding: 0; margin: 16px 0 0; display: flex; flex-direction: column; gap: 6px; }
        .af-tile-points li { font-size: 12.5px; color: #3D4046; padding-left: 16px; position: relative; }
        .af-tile-points li::before {
          content: '';
          position: absolute;
          left: 0; top: 6px;
          width: 6px; height: 6px;
          border-radius: 2px;
          background: var(--accent);
        }

        .af-tile-cta {
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid #E7E6DF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
        }
        .af-tile-arrow { transition: transform 0.25s ease; }

        /* ---------- Stats ---------- */
        .af-stats {
          margin-top: 50px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #E7E6DF;
          border: 1px solid #E7E6DF;
          border-radius: 14px;
          overflow: hidden;
          max-width: 700px;
          width: calc(100% - 48px);
        }
        .af-stat { background: #FFFFFF; padding: 18px 24px; text-align: center; }
        .af-stat-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 22px;
          font-weight: 600;
          color: #0F6E56;
        }
        .af-stat-label { font-size: 11px; letter-spacing: 0.04em; color: #6B6F76; margin-top: 4px; }

        .af-footer { margin-top: 30px; font-size: 12px; color: #9AA0A8; }

        @media (prefers-reduced-motion: reduce) {
          .af-ekg-path, .af-pulse-dot { animation: none; }
        }
      `}</style>

      <Header actionLabel="Back to site" actionTo="/" links={false} />

      <div className="af-statusbar">
        <div className="af-status-left">
          <span className="af-pulse-dot" />
          <b>Aerofit</b>&nbsp;Ops Console
        </div>
        <div>
          {dateStr} &nbsp;·&nbsp; <span className="af-clock">{timeStr}</span>
        </div>
      </div>

      <div className="af-hero">
        <div className="af-wordmark">
          Aero<span>fit</span>
        </div>
        <div className="af-tagline">Platform control center — select a console to continue.</div>
        <EKGLine />
      </div>

      <div className="af-tiles">
        <ConsoleTile
          accent="#0F6E56"
          tint="#E4F3EE"
          icon="🏢"
          eyebrow="GYM OPERATIONS"
          title="Gym Admin Console"
          description="Run the day-to-day for a single gym — members, banners, notifications and billing."
          points={['Manage members & subscriptions', 'Push banners & notifications', 'Track gym-level billing']}
          cta="Open console"
          onClick={() => nav('/gym-admin')}
        />
        <ConsoleTile
          accent="#534AB7"
          tint="#EEEDFE"
          icon="👑"
          eyebrow="PLATFORM CONTROL"
          title="Super Admin Console"
          description="Oversee every gym on Aerofit — onboarding, admins, platform billing and stats."
          points={['Create & manage gyms', 'Assign gym admins', 'View platform-wide stats']}
          cta="Open console"
          onClick={() => nav('/super-admin')}
        />
      </div>

      <div className="af-stats">
        <div className="af-stat">
          <div className="af-stat-value">{Math.round(gyms)}</div>
          <div className="af-stat-label">GYMS LIVE</div>
        </div>
        <div className="af-stat">
          <div className="af-stat-value">{Math.round(members)}</div>
          <div className="af-stat-label">ACTIVE MEMBERS</div>
        </div>
        <div className="af-stat">
          <div className="af-stat-value">{uptime.toFixed(1)}%</div>
          <div className="af-stat-label">UPTIME (30D)</div>
        </div>
      </div>

      <div className="af-footer">v1.0 · Aerofit Platform Admin</div>
    </div>
  )
}