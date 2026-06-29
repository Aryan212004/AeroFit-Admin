import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import SuperAdminDashboard from './superadmin'
import AdminDashboard from './admin'

function DashboardSelector() {
  const nav = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F6F6F1',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      flexDirection: 'column',
      gap: 30,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 10 }}>
          Aero<span style={{ color: '#0F6E56' }}>fit</span>
        </div>
        <div style={{ fontSize: 16, color: '#888780', marginTop: 8, maxWidth: 400 }}>
          Platform Admin Console. Choose your role to continue.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => nav('/gym-admin')}
          style={{
            padding: '18px 40px',
            background: '#0F6E56',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(15, 110, 86, 0.2)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => e.target.style.boxShadow = '0 6px 24px rgba(15, 110, 86, 0.3)'}
          onMouseOut={(e) => e.target.style.boxShadow = '0 4px 16px rgba(15, 110, 86, 0.2)'}
        >
          🏢 Gym Admin Console
        </button>

        <button
          onClick={() => nav('/super-admin')}
          style={{
            padding: '18px 40px',
            background: '#534AB7',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(83, 74, 183, 0.2)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => e.target.style.boxShadow = '0 6px 24px rgba(83, 74, 183, 0.3)'}
          onMouseOut={(e) => e.target.style.boxShadow = '0 4px 16px rgba(83, 74, 183, 0.2)'}
        >
          👑 Super Admin Console
        </button>
      </div>

      <div style={{
        marginTop: 40,
        padding: 20,
        background: '#EEEDFE',
        borderRadius: 12,
        border: '1px solid #534AB7',
        maxWidth: 500,
        fontSize: 12,
        color: '#534AB7',
        lineHeight: 1.6,
      }}>
        <strong>👑 Super Admin:</strong> Create gyms, manage gym admins, view platform stats & billing
        <br /><br />
        <strong>🏢 Gym Admin:</strong> Manage banners, notifications, users & subscriptions for your gym
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardSelector />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/gym-admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}