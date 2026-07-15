import { useNavigate } from 'react-router-dom'

// Shared across Home.jsx and ConsoleSelector.jsx — keep this the single source of
// truth for the nav so the two pages never drift apart again.
//
// actionLabel/actionTo let each page swap the right-hand button:
//   Home        -> "Admin Login" -> /console
//   Console     -> "Back to site" -> /

export default function Header({ actionLabel = 'Admin Login', actionTo = '/console', links = true }) {
  const nav = useNavigate()

  return (
    <nav className="af-nav">
      <div className="af-logo" onClick={() => nav('/')} role="button" tabIndex={0}>
        Aero<span>fit</span>
      </div>
      <div className="af-nav-links">
        {links && (
          <>
            <a href="/#features">Features</a>
            <a href="/#how-it-works">How it works</a>
          </>
        )}
        <button className="af-console-link" onClick={() => nav(actionTo)}>{actionLabel}</button>
      </div>
    </nav>
  )
}