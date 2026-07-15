import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './Home'
import ConsoleSelector from './ConsoleSelector'
import SuperAdminDashboard from './superadmin'
import AdminDashboard from './admin'

// Vite's scaffolded index.css ships with `#root { max-width: 1280px; margin: 0 auto }`
// and a dark `background-color` on `:root`. That's what was showing as the dark strip
// down the right edge — anything past 1280px was falling through to that default
// background instead of your page. This reset removes those constraints globally,
// for every route, without you having to hunt through index.css by hand.
function GlobalReset() {
  return (
    <style>{`
      html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100vh;
        max-width: none;
        background: none;
        overflow-x: hidden;
      }
      * { box-sizing: border-box; }
    `}</style>
  )
}

export default function App() {
  return (
    <Router>
      <GlobalReset />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/console" element={<ConsoleSelector />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/gym-admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}