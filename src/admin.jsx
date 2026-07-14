import { useState, useEffect, useRef } from "react";

const API = "https://aero-fit-backend.onrender.com";

async function apiFetch(path, opts = {}) {
  const url = `${API}${path}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...opts,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (e) {
      if (attempt === 0) { await new Promise(r => setTimeout(r, 4000)); continue; }
      throw e;
    }
  }
}

// ── Razorpay checkout script loader ───────────────────────────────────────────
// Loads the Razorpay widget script once and caches the promise so multiple
// "Pay Now" clicks don't inject the <script> tag more than once.
let _razorpayScriptPromise = null;
function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (_razorpayScriptPromise) return _razorpayScriptPromise;
  _razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => { _razorpayScriptPromise = null; reject(new Error("Failed to load payment gateway")); };
    document.body.appendChild(script);
  });
  return _razorpayScriptPromise;
}

const T = {
  teal50: "#E1F5EE", teal100: "#9FE1CB", teal600: "#0F6E56", teal700: "#085041", teal800: "#04342C",
  purple50: "#EEEDFE", purple600: "#534AB7",
  amber50: "#FAEEDA", amber600: "#854F0B",
  coral50: "#FAECE7", coral600: "#993C1D",
  gray50: "#F1EFE8", gray200: "#B4B2A9", gray600: "#5F5E5A",
  blue50: "#E6F1FB", blue600: "#185FA5",
  green50: "#EAF3DE", green600: "#3B6D11",
  red50: "#FCEBEB", red200: "#F7C1C1", red600: "#A32D2D",
  bg: "#F6F6F1", surface: "#FFFFFF",
  border: "rgba(0,0,0,0.07)", borderMid: "rgba(0,0,0,0.12)",
  text: "#1A1A18", textMid: "#444441", textMuted: "#888780",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v._seconds ? v._seconds * 1000 : v);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return v; }
}

function fmtINR(v) {
  return "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function expiryCountdown(expiresAt) {
  if (!expiresAt) return null;
  const now  = Date.now();
  const end  = new Date(expiresAt).getTime();
  const diff = end - now;
  if (diff <= 0) return { label: "Expired", urgent: true };
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0)  return { label: `${days}d left`,  urgent: days <= 7  };
  if (hours > 0) return { label: `${hours}h left`, urgent: true       };
  return { label: "< 1h left", urgent: true };
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: T.surface, borderRadius: 14, padding: "24px 28px", width: 360,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)", border: `0.5px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8 }}>Confirm Delete</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 22, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 8, border: `0.5px solid ${T.borderMid}`,
            background: T.bg, color: T.textMid, fontSize: 13, cursor: "pointer", fontWeight: 500,
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: T.red600, color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 2000,
      background: type === "error" ? T.red600 : T.teal600,
      color: "#fff", borderRadius: 10, padding: "12px 20px",
      fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      display: "flex", alignItems: "center", gap: 10,
      animation: "slideIn 0.2s ease",
    }}>
      {type === "error" ? "✕" : "✓"} {message}
      <style>{`@keyframes slideIn { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ── UI Primitives ─────────────────────────────────────────────────────────────
function Badge({ label }) {
  const MAP = {
    Active:    { bg: T.teal50,   color: T.teal600   },
    Scheduled: { bg: T.amber50,  color: T.amber600  },
    Draft:     { bg: T.gray50,   color: T.gray600   },
    Inactive:  { bg: T.gray50,   color: T.gray600   },
    general:   { bg: T.blue50,   color: T.blue600   },
    billing:   { bg: T.purple50, color: T.purple600 },
    class:     { bg: T.teal50,   color: T.teal600   },
    promo:     { bg: T.purple50, color: T.purple600 },
    active:    { bg: T.teal50,   color: T.teal600   },
    Available: { bg: T.teal50,   color: T.teal600   },
    Used:      { bg: T.gray50,   color: T.gray600   },
    paid:      { bg: T.green50,  color: T.green600  },
    pending:   { bg: T.amber50,  color: T.amber600  },
    overdue:   { bg: T.red50,    color: T.red600    },
    cancelled: { bg: T.gray50,   color: T.gray600   },
  };
  const s = MAP[label] || { bg: T.gray50, color: T.gray600 };
  return (
    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap", background: s.bg, color: s.color }}>
      {label}
    </span>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 14, overflow: "hidden", ...style }}>{children}</div>;
}

function CardHeader({ title, icon, action }) {
  return (
    <div style={{ padding: "14px 18px", borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontWeight: 500, fontSize: 13.5, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}{title}
      </div>
      {action}
    </div>
  );
}

function Btn({ children, onClick, variant = "ghost", style = {}, disabled = false }) {
  const base = { fontSize: 12.5, border: "none", cursor: disabled ? "not-allowed" : "pointer", padding: "6px 13px", borderRadius: 8, fontWeight: 500, opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 5 };
  const vars = {
    ghost:       { background: "none",    color: T.teal600, border: `0.5px solid ${T.border}` },
    primary:     { background: T.teal600, color: "#fff" },
    danger:      { background: T.red50,   color: T.red600 },
    dangerSolid: { background: T.red600,  color: "#fff" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, outline: "none", background: T.bg, color: T.text, width: "100%", boxSizing: "border-box" }} />
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ width: 24, height: 24, border: `2.5px solid ${T.teal50}`, borderTop: `2.5px solid ${T.teal600}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FullScreenSpinner() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner />
    </div>
  );
}

function Empty({ msg = "No data yet" }) {
  return <div style={{ padding: "28px 18px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>{msg}</div>;
}

const NAV = [
  { id: "dashboard",     icon: "⊞",  label: "Dashboard",     section: "Overview"  },
  { id: "user_ids",      icon: "🪪", label: "User IDs",      section: "Members"   },
  { id: "billing",       icon: "💰", label: "Billing",       section: "Finance"   },
  { id: "banners",       icon: "🖼",  label: "Banners",       section: "Content"   },
  { id: "notifications", icon: "🔔", label: "Notifications", section: "Content"   },
  { id: "config",        icon: "⚙",  label: "App Config",    section: "Settings"  },
];
const SECTIONS = [...new Set(NAV.map(n => n.section))];

// ── Login ─────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email || !pass) { setError("Email and password required"); return; }
    setLoading(true); setError("");
    try {
      const res = await apiFetch("/gym-admin/login", {
        method: "POST",
        body: JSON.stringify({ username: email.trim().toLowerCase(), password: pass }),
      });
      sessionStorage.setItem("af_admin", "1");
      sessionStorage.setItem("gym_info", JSON.stringify({
        gym_id:      res.gym_id,
        gym_name:    res.gym_name,
        admin_name:  res.name,
        admin_email: res.email,
      }));
      onLogin();
    } catch { setError("Invalid email or password"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: T.surface, borderRadius: 16, padding: 36, border: `0.5px solid ${T.border}`, width: 360, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: T.text }}>Aero<span style={{ color: T.teal600 }}>fit</span></div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>Gym Admin Console</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="admin@fitzone.in" />
          <Input label="Password" value={pass} onChange={setPass} type="password" placeholder="••••••••" />
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
          <button onClick={login} disabled={loading} style={{ background: T.teal600, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>
        <div style={{ marginTop: 16, fontSize: 11.5, color: T.textMuted, textAlign: "center" }}>
          Credentials provided by your Aerofit super admin.
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PRO PLAN ACTIVATION GATE
//  Shown in place of the entire dashboard when a Pro-plan gym's admin has
//  not yet paid the ₹5,000/year activation fee (or it has lapsed). Blocks
//  everything until payment clears — no bypass.
// ══════════════════════════════════════════════════════════════════════════════
function ProActivationGate({ gymInfo, amount, expired, onActivated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setLoading(true); setError("");
    try {
      await loadRazorpayScript();

      const order = await apiFetch(`/gym/${gymInfo.gym_id}/pro-activation/create-order`, { method: "POST" });

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: { email: order.prefill_email, name: order.prefill_name },
        theme: { color: "#0F6E56" },
        handler: async function (response) {
          try {
            await apiFetch(`/gym/${gymInfo.gym_id}/pro-activation/verify-payment`, {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });
            onActivated();
          } catch (e) {
            setError("Payment succeeded but verification failed. Contact Aerofit support with payment ID " + response.razorpay_payment_id);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () { setLoading(false); },
        },
      });

      rzp.open();
    } catch (e) {
      setError(e.message || "Could not start payment");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20 }}>
      <div style={{ background: T.surface, borderRadius: 18, padding: 40, border: `0.5px solid ${T.border}`, width: 420, maxWidth: "94vw", boxShadow: "0 4px 32px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: T.purple50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 18px" }}>👑</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: T.text, marginBottom: 8 }}>
          {expired ? "Renew Your Pro Plan" : "Activate Your Pro Plan"}
        </div>
        <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>
          <strong>{gymInfo.gym_name}</strong> is on the Aerofit <strong>Pro</strong> plan.{" "}
          {expired
            ? "Your yearly access has lapsed. Renew now to unlock your admin dashboard again."
            : "Complete a one-time activation payment to unlock your admin dashboard for a full year."}
        </div>
        <div style={{ background: T.teal50, borderRadius: 12, padding: "16px 20px", margin: "22px 0" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: T.teal700 }}>{fmtINR(amount)}</div>
          <div style={{ fontSize: 12, color: T.teal600, marginTop: 2 }}>Valid for 1 year from today</div>
        </div>
        {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "10px 13px", borderRadius: 8, marginBottom: 16, textAlign: "left" }}>❌ {error}</div>}
        <button onClick={pay} disabled={loading} style={{ width: "100%", background: T.teal600, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Opening payment…" : `💳 Pay ${fmtINR(amount)} & ${expired ? "Renew" : "Activate"}`}
        </button>
        <div style={{ marginTop: 18, fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
          Secured by Razorpay. Contact Aerofit support if you run into any issues completing payment.
        </div>
        <button
          onClick={() => { sessionStorage.removeItem("af_admin"); sessionStorage.removeItem("gym_info"); window.location.reload(); }}
          style={{ marginTop: 14, background: "none", border: "none", color: T.textMuted, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  RENEWAL REMINDER BANNER
//  Non-blocking — shown on every tab once the Pro fee is within 15 days of
//  expiry, turning red inside the last 5 days. Dismissible per-session so it
//  doesn't nag on every click, but reappears on next login until renewed.
// ══════════════════════════════════════════════════════════════════════════════
function RenewalReminderBanner({ daysLeft, expiresAt, onRenew, onDismiss }) {
  const urgent = daysLeft <= 5;
  return (
    <div style={{
      background: urgent ? T.red50 : T.amber50,
      border: `0.5px solid ${urgent ? T.red200 : "#f0c070"}`,
      borderRadius: 10, padding: "11px 16px", marginBottom: 18,
      display: "flex", alignItems: "center", gap: 12, fontSize: 13,
      color: urgent ? T.red600 : T.amber600, flexWrap: "wrap",
    }}>
      <span>{urgent ? "🚨" : "⏰"}</span>
      <span style={{ flex: 1, minWidth: 200 }}>
        <strong>Your Pro plan {daysLeft <= 0 ? "expires today" : `expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}</strong>
        {" "}({fmtDate(expiresAt)}). Renew now to avoid losing access to banners, notifications, and User IDs.
      </span>
      <Btn variant={urgent ? "dangerSolid" : "primary"} onClick={onRenew} style={{ fontSize: 12, padding: "6px 14px", flexShrink: 0 }}>
        Renew Now
      </Btn>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "inherit", opacity: 0.6, flexShrink: 0 }} title="Dismiss for now">✕</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  RENEW PRO PLAN MODAL
//  Non-blocking version of ProActivationGate — opened from the reminder
//  banner so the admin can renew early without losing dashboard access.
// ══════════════════════════════════════════════════════════════════════════════
function RenewProModal({ gymInfo, amount, onRenewed, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setLoading(true); setError("");
    try {
      await loadRazorpayScript();
      const order = await apiFetch(`/gym/${gymInfo.gym_id}/pro-activation/create-order`, { method: "POST" });

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: { email: order.prefill_email, name: order.prefill_name },
        theme: { color: "#0F6E56" },
        handler: async function (response) {
          try {
            const res = await apiFetch(`/gym/${gymInfo.gym_id}/pro-activation/verify-payment`, {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });
            onRenewed(res.expires_at);
          } catch (e) {
            setError("Payment succeeded but verification failed. Contact Aerofit support with payment ID " + response.razorpay_payment_id);
          } finally {
            setLoading(false);
          }
        },
        modal: { ondismiss: function () { setLoading(false); } },
      });
      rzp.open();
    } catch (e) {
      setError(e.message || "Could not start payment");
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "'DM Sans', system-ui, sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.surface, borderRadius: 18, width: 420, maxWidth: "94vw", border: `0.5px solid ${T.border}`, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.14)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.purple50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👑</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>Renew Pro Plan</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{gymInfo.gym_name}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.textMuted }}>✕</button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: T.teal50, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: T.teal700, lineHeight: 1.5 }}>
            Renewing extends your Pro access by <strong>1 year</strong> from your current expiry — no interruption.
          </div>
          <div style={{ background: T.bg, borderRadius: 12, padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.teal700 }}>{fmtINR(amount)}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Valid for 1 more year</div>
          </div>
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "10px 13px", borderRadius: 8 }}>❌ {error}</div>}
          <button onClick={pay} disabled={loading} style={{ background: T.teal600, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Opening payment…" : `💳 Pay ${fmtINR(amount)} & Renew`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ banners, notifications, userIds, billingSummary }) {
  const activeIds = userIds.filter(u => u.status === "active").length;
  const usedIds   = userIds.filter(u => u.status === "used").length;
  const totalMembers = usedIds; // members currently registered to this gym (consumed User IDs)

  const expiringCount = userIds.filter(u => {
    if (u.status !== "used" || !u.expires_at) return false;
    const cd = expiryCountdown(u.expires_at);
    return cd?.urgent;
  }).length;

  const stats = [
    { label: "Total Members",       value: totalMembers,                                       change: "registered to your gym",                    accent: T.green50,  icon: "👥" },
    { label: "Active Banners",      value: banners.filter(b => b.status === "active").length, change: `${banners.length} total`,                   accent: T.teal50,   icon: "🖼" },
    { label: "Total Notifications", value: notifications.length,                              change: "sent so far",                                accent: T.purple50, icon: "🔔" },
    { label: "Available User IDs",  value: activeIds,                                         change: `${usedIds} used`,                            accent: T.blue50,   icon: "🪪" },
    { label: "Expiring Soon",       value: expiringCount,                                     change: "within 7 days",                              accent: expiringCount > 0 ? T.amber50 : T.gray50, icon: "⏰" },
  ];

  return (
    <div>
      {expiringCount > 0 && (
        <div style={{ background: T.amber50, border: `0.5px solid ${T.amber600}33`, borderRadius: 10, padding: "11px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.amber600 }}>
          ⏰ <strong>{expiringCount} member{expiringCount > 1 ? "s'" : "'s"} membership</strong> expires within 7 days. Go to User IDs to review.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 22 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "16px 16px 14px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: s.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: T.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, marginTop: 5, color: T.textMuted }}>{s.change}</div>
          </div>
        ))}
      </div>

      {expiringCount > 0 && (
        <Card style={{ marginBottom: 18 }}>
          <CardHeader title="Memberships Expiring Soon" icon="⏰" />
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {userIds
              .filter(u => u.status === "used" && u.expires_at && expiryCountdown(u.expires_at)?.urgent)
              .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))
              .map(uid => {
                const cd = expiryCountdown(uid.expires_at);
                return (
                  <div key={uid.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: `0.5px solid ${T.amber600}33`, borderRadius: 8, background: T.amber50 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: T.teal600, background: "#fff", padding: "4px 8px", borderRadius: 6 }}>{uid.code}</span>
                    <span style={{ fontSize: 12, color: T.textMuted, flex: 1 }}>{uid.used_by || "—"}</span>
                    <span style={{ fontSize: 12, color: T.amber600, fontWeight: 600 }}>{cd?.label}</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{fmtDate(uid.expires_at)}</span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <CardHeader title="Recent Banners" icon="🖼" />
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {banners.slice(0, 4).length === 0 ? <Empty msg="No banners yet" /> : banners.slice(0, 4).map(b => (
              <div key={b.banner_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, border: `0.5px solid ${T.border}`, borderRadius: 8 }}>
                {b.image_url
                  ? <img src={b.image_url} alt="" style={{ width: 52, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                  : <div style={{ width: 52, height: 36, borderRadius: 6, background: T.teal50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🖼</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.text }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{b.screen} screen</div>
                </div>
                <Badge label={b.status === "active" ? "Active" : b.status === "scheduled" ? "Scheduled" : "Draft"} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent Notifications" icon="🔔" />
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {notifications.slice(0, 4).length === 0 ? <Empty msg="No notifications yet" /> : notifications.slice(0, 4).map((n, i) => (
              <div key={n.notification_id || i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 10, border: `0.5px solid ${T.border}`, borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: n.type === "billing" ? T.purple50 : T.teal50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                  {n.type === "billing" ? "💰" : "📣"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                  <div style={{ marginTop: 4 }}><Badge label={n.type || "general"} /></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Billing Tab ───────────────────────────────────────────────────────────────
function BillingTab({ gymId, onRefresh }) {
  const [invoices, setInvoices]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [statusFilter, setFilter] = useState("all");
  const [payingId, setPayingId]   = useState(null);   // invoice_id currently in checkout
  const [toast, setToast]         = useState(null);    // { message, type }

  async function load() {
    if (!gymId) return;
    setLoading(true); setError("");
    try {
      const [inv, sum] = await Promise.all([
        apiFetch(`/gym/${gymId}/invoices`).catch(() => []),
        apiFetch(`/gym/${gymId}/billing-summary`).catch(() => null),
      ]);
      setInvoices(Array.isArray(inv) ? inv : []);
      setSummary(sum);
    } catch (e) { setError("Failed to load: " + e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [gymId]);

  async function payInvoice(inv) {
    setPayingId(inv.invoice_id); setError("");
    try {
      await loadRazorpayScript();

      const order = await apiFetch(`/gym/${gymId}/invoices/${inv.invoice_id}/create-payment-order`, { method: "POST" });

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: { email: order.prefill_email, name: order.prefill_name },
        theme: { color: "#0F6E56" },
        handler: async function (response) {
          try {
            await apiFetch(`/gym/${gymId}/invoices/${inv.invoice_id}/verify-payment`, {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });
            setToast({ message: `Payment received for ${inv.invoice_number}!`, type: "success" });
            await load();
            onRefresh?.();   // sync the sidebar badge's pending-invoice count now that
                             // this one is paid — same pattern Banners/Notifications use.
          } catch (e) {
            setToast({ message: "Payment succeeded but verification failed. Contact support with payment ID " + response.razorpay_payment_id, type: "error" });
          } finally {
            setPayingId(null);
          }
        },
        modal: {
          ondismiss: function () { setPayingId(null); },
        },
      });

      rzp.open();
    } catch (e) {
      setError(e.message || "Could not start payment");
      setPayingId(null);
    }
  }

  const filtered = invoices.filter(i => statusFilter === "all" || i.status === statusFilter);

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      {error && (
        <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>{error}</div>
      )}

      {summary && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              { label: "Pending",             value: fmtINR(summary.total_pending),      sub: `${summary.pending_count} invoice(s)`, icon: "⏳", accent: T.amber50, color: T.amber600 },
            ].map(s => (
              <div key={s.label} style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: s.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, marginTop: 3, color: T.textMuted }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        {["all", "pending", "paid", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "6px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500, border: statusFilter === s ? `1.5px solid ${T.teal600}` : `0.5px solid ${T.borderMid}`, background: statusFilter === s ? T.teal50 : T.surface, color: statusFilter === s ? T.teal600 : T.textMid, textTransform: "capitalize" }}>{s}</button>
        ))}
        <Btn variant="ghost" onClick={load} style={{ marginLeft: "auto", fontSize: 11, padding: "4px 10px" }}>🔄 Refresh</Btn>
      </div>

      <Card>
        <CardHeader title={`Invoices (${filtered.length})`} icon="📄" />
        {loading ? <Spinner /> : filtered.length === 0 ? <Empty msg="No invoices yet. Invoices will appear here once Aerofit generates them for your gym." /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Invoice #", "Period", "Members", "Total", "Status", "Due", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.invoice_id} style={{ borderBottom: `0.5px solid ${T.border}` }}>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: T.teal600, background: T.teal50, padding: "4px 8px", borderRadius: 6 }}>{inv.invoice_number}</span>
                    </td>
                    <td style={{ padding: "11px 14px", color: T.textMuted, whiteSpace: "nowrap" }}>{inv.period}</td>
                    <td style={{ padding: "11px 14px", color: T.text }}>{inv.member_count}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: T.text }}>{fmtINR(inv.gross)}</td>
                    <td style={{ padding: "11px 14px" }}><Badge label={inv.status} /></td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMuted, whiteSpace: "nowrap" }}>{fmtDate(inv.due_at)}</td>
                    <td style={{ padding: "11px 14px" }}>
                      {inv.status === "paid" && <span style={{ fontSize: 11, color: T.green600, fontWeight: 500 }}>✓ Paid {fmtDate(inv.paid_at)}</span>}
                      {inv.status === "pending" && (
                        <Btn variant="primary" onClick={() => payInvoice(inv)} disabled={payingId === inv.invoice_id} style={{ fontSize: 11.5, padding: "5px 12px" }}>
                          {payingId === inv.invoice_id ? "Opening…" : "💳 Pay Now"}
                        </Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <BillingNotifications gymId={gymId} />
    </div>
  );
}

// ── Billing Notifications ─────────────────────────────────────────────────────
function BillingNotifications({ gymId }) {
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/gym/${gymId}/notifications`)
      .then(data => {
        const billing = (Array.isArray(data) ? data : []).filter(n => n.type === "billing");
        setNotes(billing);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gymId]);

  if (loading || notes.length === 0) return null;

  return (
    <Card style={{ marginTop: 18 }}>
      <CardHeader title="Billing Alerts from Aerofit" icon="📣" />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {notes.map((n, i) => (
          <div key={n.notification_id || i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 12, border: `0.5px solid ${T.border}`, borderRadius: 10, background: n.title?.includes("Overdue") ? T.red50 : n.title?.includes("Payment Due") ? T.amber50 : T.teal50 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {n.title?.includes("Overdue") ? "🚨" : n.title?.includes("Received") ? "✅" : "💳"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{n.title}</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3, lineHeight: 1.5 }}>{n.body}</div>
              <div style={{ fontSize: 11, color: T.gray200, marginTop: 5 }}>{fmtDate(n.sent_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── User IDs Tab ──────────────────────────────────────────────────────────────
function UserIdsTab({ gymInfo }) {
  const gymId = gymInfo?.gym_id;

  const [ids, setIds]                   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [error, setError]               = useState("");
  const [copied, setCopied]             = useState(null);
  const [editingPlan, setEditingPlan]   = useState(null);

  const [showGenPanel, setShowGenPanel] = useState(false);
  const [genCount, setGenCount]         = useState(1);
  const [genMonths, setGenMonths]       = useState(1);

  async function loadIds() {
    if (!gymId) return;
    setLoading(true); setError("");
    try {
      const data = await apiFetch(`/gym/${gymId}/user-ids`);
      setIds(Array.isArray(data) ? data : []);
    } catch (e) { setError("Failed to load: " + e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadIds(); }, [gymId]);

  async function generate() {
    if (genCount < 1) { setError("Count must be at least 1"); return; }
    setGenerating(true); setError("");
    try {
      await apiFetch(`/gym/${gymId}/user-ids/generate`, {
        method: "POST",
        body: JSON.stringify({ count: genCount, plan_months: genMonths }),
      });
      setShowGenPanel(false);
      await loadIds();
    } catch (e) { setError("Failed: " + e.message); }
    finally { setGenerating(false); }
  }

  async function updatePlan(code, months) {
    try {
      await apiFetch(`/gym/${gymId}/user-ids/${code}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ plan_months: months }),
      });
      setIds(prev => prev.map(u => u.code === code
        ? { ...u, plan_months: months, plan_label: `${months} Month${months > 1 ? "s" : ""}` }
        : u
      ));
    } catch (e) { alert("Failed to update plan: " + e.message); }
    finally { setEditingPlan(null); }
  }

  async function revoke(code) {
    if (!confirm(`Revoke ${code}? This cannot be undone.`)) return;
    try { await apiFetch(`/gym/${gymId}/user-ids/${code}`, { method: "DELETE" }); await loadIds(); }
    catch (e) { alert(e.message); }
  }

  async function copyCode(code) {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1800); }
    catch (_) {}
  }

  const activeCount   = ids.filter(u => u.status === "active").length;
  const usedCount     = ids.filter(u => u.status === "used").length;
  const expiringCount = ids.filter(u => {
    if (u.status !== "used" || !u.expires_at) return false;
    return expiryCountdown(u.expires_at)?.urgent;
  }).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total",          value: ids.length,    color: T.text,      bg: T.surface },
          { label: "Available",      value: activeCount,   color: T.teal600,   bg: T.teal50  },
          { label: "Used",           value: usedCount,     color: T.textMuted, bg: T.gray50  },
          { label: "Expiring ≤ 7d",  value: expiringCount, color: expiringCount > 0 ? T.amber600 : T.textMuted, bg: expiringCount > 0 ? T.amber50 : T.gray50 },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 14 }}>
        <Btn variant="primary" onClick={() => setShowGenPanel(v => !v)}>
          {showGenPanel ? "✕ Cancel" : "＋ Generate User IDs"}
        </Btn>
      </div>

      {showGenPanel && (
        <Card style={{ marginBottom: 18 }}>
          <CardHeader title="Generate New User IDs" icon="🪪" />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>How many IDs?</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => setGenCount(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: `0.5px solid ${T.borderMid}`, background: T.bg, cursor: "pointer", fontSize: 16, color: T.text }}>−</button>
                  <input type="number" min={1} value={genCount} onChange={e => setGenCount(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: 60, textAlign: "center", border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "6px 8px", fontSize: 15, fontWeight: 600, background: T.surface, color: T.text }} />
                  <button onClick={() => setGenCount(c => c + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: `0.5px solid ${T.borderMid}`, background: T.bg, cursor: "pointer", fontSize: 16, color: T.text }}>+</button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>Membership Duration</label>
                <select value={genMonths} onChange={e => setGenMonths(parseInt(e.target.value))}
                  style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.surface, color: T.text, cursor: "pointer" }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{m} Month{m > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ background: T.teal50, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🪪</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.teal600 }}>
                  {genCount} User ID{genCount > 1 ? "s" : ""} × {genMonths} Month{genMonths > 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                  Members who register with these codes will get a <strong>{genMonths}-month</strong> membership that auto-expires.
                </div>
              </div>
            </div>
            <Btn variant="primary" onClick={generate} disabled={generating} style={{ alignSelf: "flex-end", padding: "8px 22px", fontSize: 13 }}>
              {generating ? "Generating…" : `Generate ${genCount} ID${genCount > 1 ? "s" : ""}`}
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={`User IDs (${ids.length})`} icon="🪪"
          action={<Btn variant="ghost" onClick={loadIds} style={{ fontSize: 11, padding: "4px 10px" }}>🔄 Refresh</Btn>}
        />
        {loading ? <Spinner /> : ids.length === 0 ? <Empty msg="No User IDs yet. Generate some above." /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Code", "Plan", "Status", "Created", "Expires", "Countdown", "Used By", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ids.map(uid => {
                  const cd = uid.expires_at ? expiryCountdown(uid.expires_at) : null;
                  return (
                    <tr key={uid.code} style={{ borderBottom: `0.5px solid ${T.border}`, background: cd?.urgent && uid.status === "used" ? `${T.amber600}08` : "transparent" }}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", background: T.bg, padding: "5px 10px", borderRadius: 6, color: uid.status === "active" ? T.teal600 : T.textMuted, border: `0.5px solid ${uid.status === "active" ? T.teal100 : T.border}` }}>
                            {uid.code}
                          </span>
                          {uid.status === "active" && (
                            <button onClick={() => copyCode(uid.code)} style={{ background: "none", border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 11, color: copied === uid.code ? T.teal600 : T.textMuted }}>
                              {copied === uid.code ? "✓ Copied" : "Copy"}
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        {uid.status === "active" ? (
                          editingPlan === uid.code ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <select autoFocus defaultValue={uid.plan_months || 1}
                                onChange={e => updatePlan(uid.code, parseInt(e.target.value))}
                                onBlur={() => setEditingPlan(null)}
                                style={{ border: `1.5px solid ${T.teal600}`, borderRadius: 8, padding: "4px 8px", fontSize: 13, background: T.surface, color: T.text, cursor: "pointer", outline: "none" }}>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                  <option key={m} value={m}>{m} Month{m > 1 ? "s" : ""}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <button onClick={() => setEditingPlan(uid.code)} title="Click to change plan"
                              style={{ fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20, background: T.teal50, color: T.teal600, border: `1px dashed ${T.teal100}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                              {uid.plan_label || `${uid.plan_months || 1}mo`}
                              <span style={{ fontSize: 10, opacity: 0.7 }}>✏️</span>
                            </button>
                          )
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20, background: T.gray50, color: T.gray600 }}>
                            {uid.plan_label || `${uid.plan_months || 1}mo`}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px" }}><Badge label={uid.status === "active" ? "Available" : "Used"} /></td>
                      <td style={{ padding: "11px 14px", color: T.textMuted, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(uid.created_at)}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, whiteSpace: "nowrap", color: uid.expires_at ? T.textMuted : T.gray200 }}>{uid.expires_at ? fmtDate(uid.expires_at) : "—"}</td>
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                        {cd ? (
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: cd.urgent ? (cd.label === "Expired" ? T.red50 : T.amber50) : T.teal50, color: cd.urgent ? (cd.label === "Expired" ? T.red600 : T.amber600) : T.teal600 }}>
                            {cd.urgent && cd.label !== "Expired" ? "⏰ " : ""}{cd.label}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: T.gray200 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", color: T.textMuted, fontSize: 12 }}>{uid.used_by || "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        {uid.status === "active"
                          ? <Btn variant="danger" onClick={() => revoke(uid.code)} style={{ fontSize: 11.5, padding: "4px 10px" }}>Revoke</Btn>
                          : <span style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>Consumed</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Banners Tab ───────────────────────────────────────────────────────────────
function BannersTab({ gymId, onRefresh }) {
  const [banners, setBanners]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [deletingId, setDeletingId]     = useState(null);   // banner_id being deleted
  const [confirm, setConfirm]           = useState(null);   // { id, title }
  const [toast, setToast]               = useState(null);   // { message, type }
  const [error, setError]               = useState("");
  const [form, setForm]                 = useState({ title: "", screen: "home", status: "active", expires_at: "", });
  const [imageB64, setImageB64]         = useState("");
  const [previewUrl, setPreviewUrl]     = useState("");
  const fileRef = useRef();
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  // ── load banners locally so this tab owns its data ──────────────────────
  async function loadBanners() {
    setLoading(true);
    try {
      const data = await apiFetch(`/gym/${gymId}/banners`);
      setBanners(Array.isArray(data) ? data : []);
    } catch { setBanners([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadBanners(); }, [gymId]);

  function pickFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setImageB64(ev.target.result); setPreviewUrl(ev.target.result); };
    reader.readAsDataURL(file);
  }

  const BANNER_LIMIT = 3;
  const limitReached = banners.length >= BANNER_LIMIT;

  async function submit() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (limitReached) { setError(`You can only have ${BANNER_LIMIT} banners at a time. Delete one first.`); return; }
    setSubmitting(true); setError("");
    try {
      await apiFetch(`/gym/${gymId}/banners`, {
        method: "POST",
        body: JSON.stringify({ ...form, gym_id: gymId, image_base64: imageB64 || undefined }),
      });
      setForm({ title: "", screen: "home", status: "active", expires_at: ""});
      setImageB64(""); setPreviewUrl(""); setShowForm(false);
      await loadBanners();   // refresh local list
      onRefresh();            // sync dashboard counts
      setToast({ message: "Banner created", type: "success" });
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  // ── Step 1: show confirm dialog ──────────────────────────────────────────
  function askDelete(banner) {
    setConfirm({ id: banner.banner_id, title: banner.title });
  }

  // ── Step 2: confirmed — call API, optimistically remove, then sync ───────
  async function confirmDelete() {
    const { id, title } = confirm;
    setConfirm(null);
    setDeletingId(id);

    // Optimistic removal — instant visual feedback
    setBanners(prev => prev.filter(b => b.banner_id !== id));

    try {
      await apiFetch(`/gym/${gymId}/banners/${id}`, { method: "DELETE" });
      setToast({ message: `"${title}" deleted`, type: "success" });
      onRefresh();   // sync dashboard banner count
    } catch (e) {
      // Rollback: re-fetch on failure
      await loadBanners();
      setToast({ message: `Delete failed: ${e.message}`, type: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {confirm && (
        <ConfirmDialog
          message={`Delete the banner "${confirm.title}"? This will remove it from the app immediately.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
  {limitReached && !showForm && (
    <div style={{ fontSize: 12, color: T.amber600, background: T.amber50, padding: "6px 12px", borderRadius: 8 }}>
      Limit reached — {BANNER_LIMIT}/{BANNER_LIMIT} banners. Delete one to add another.
    </div>
  )}
  <Btn
    variant="primary"
    onClick={() => setShowForm(v => !v)}
    disabled={limitReached && !showForm}
    style={{ marginLeft: "auto" }}
  >
    {showForm ? "✕ Cancel" : "+ New Banner"}
  </Btn>
</div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <CardHeader title="Create Banner" icon="🖼" />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            <Input label="Title *" value={form.title} onChange={set("title")} placeholder="Summer Challenge 2025" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>Screen</label>
                <select value={form.screen} onChange={e => set("screen")(e.target.value)} style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.bg, color: T.text }}>
                  {["home"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>Status</label>
                <select value={form.status} onChange={e => set("status")(e.target.value)} style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.bg, color: T.text }}>
                  {["active"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>Banner image</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Btn variant="ghost" onClick={() => fileRef.current.click()}>📁 Choose image</Btn>
                {previewUrl && <img src={previewUrl} alt="preview" style={{ height: 48, borderRadius: 6, objectFit: "cover" }} />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
            </div>
            {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <Btn variant="primary" onClick={submit} disabled={submitting} style={{ alignSelf: "flex-end", padding: "8px 20px" }}>
              {submitting ? "Saving…" : "Create Banner"}
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={`Your Gym's Banners (${banners.length})`} icon="🖼"
          action={<Btn variant="ghost" onClick={loadBanners} style={{ fontSize: 11, padding: "4px 10px" }}>🔄 Refresh</Btn>}
        />
        {loading ? <Spinner /> : banners.length === 0 ? (
          <Empty msg="No banners yet. Create one above to show it in the app." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Preview", "Title", "Screen", "Status", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textTransform: "uppercase" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {banners.map(b => (
                  <tr key={b.banner_id} style={{
                    borderBottom: `0.5px solid ${T.border}`,
                    opacity: deletingId === b.banner_id ? 0.4 : 1,
                    transition: "opacity 0.2s",
                  }}>
                    <td style={{ padding: "10px 14px" }}>
                      {b.image_url
                        ? <img src={b.image_url} alt="" style={{ width: 56, height: 36, objectFit: "cover", borderRadius: 6 }} />
                        : <div style={{ width: 56, height: 36, background: T.teal50, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🖼</div>}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: T.text }}>{b.title}</td>
                    <td style={{ padding: "10px 14px", color: T.textMuted }}>{b.screen}</td>
                    <td style={{ padding: "10px 14px" }}><Badge label={b.status === "active" ? "Active" : "Draft"} /></td>
                    <td style={{ padding: "10px 14px" }}>
                      <Btn
                        variant="danger"
                        onClick={() => askDelete(b)}
                        disabled={deletingId === b.banner_id}
                        style={{ fontSize: 12, padding: "4px 10px" }}
                      >
                        {deletingId === b.banner_id ? "Deleting…" : "Delete"}
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab({ gymId, onRefresh }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [deletingId, setDeletingId]       = useState(null);   // notification_id being deleted
  const [confirm, setConfirm]             = useState(null);   // { id, title }
  const [toast, setToast]                 = useState(null);   // { message, type }
  const [error, setError]                 = useState("");
  const [form, setForm]                   = useState({ title: "", body: "", type: "general" });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  // ── load notifications locally so this tab owns its data ────────────────
  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await apiFetch(`/gym/${gymId}/notifications`);
      const nonBilling = (Array.isArray(data) ? data : []).filter(n => n.type !== "billing");
      setNotifications(nonBilling);
    } catch { setNotifications([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadNotifications(); }, [gymId]);

  async function submit() {
    if (!form.title.trim() || !form.body.trim()) { setError("Title and body required"); return; }
    setSubmitting(true); setError("");
    try {
      await apiFetch(`/gym/${gymId}/notifications`, {
        method: "POST",
        body: JSON.stringify({ ...form, gym_id: gymId, segments: ["all"] }),
      });
      setForm({ title: "", body: "", type: "general", deep_link: "" });
      setShowForm(false);
      await loadNotifications();   // refresh local list
      onRefresh();                  // sync dashboard counts
      setToast({ message: "Notification sent", type: "success" });
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  // ── Step 1: show confirm dialog ──────────────────────────────────────────
  function askDelete(notif) {
    setConfirm({ id: notif.notification_id, title: notif.title });
  }

  // ── Step 2: confirmed — call API, optimistically remove, then sync ───────
  async function confirmDelete() {
    const { id, title } = confirm;
    setConfirm(null);
    setDeletingId(id);

    // Optimistic removal — instant visual feedback
    setNotifications(prev => prev.filter(n => n.notification_id !== id));

    try {
      await apiFetch(`/gym/${gymId}/notifications/${id}`, { method: "DELETE" });
      setToast({ message: `"${title}" deleted`, type: "success" });
      onRefresh();   // sync dashboard notification count
    } catch (e) {
      // Rollback: re-fetch on failure
      await loadNotifications();
      setToast({ message: `Delete failed: ${e.message}`, type: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {confirm && (
        <ConfirmDialog
          message={`Delete the notification "${confirm.title}"? It will be removed from the database permanently.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn variant="primary" onClick={() => setShowForm(v => !v)}>{showForm ? "✕ Cancel" : "+ Send Notification"}</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <CardHeader title="New Notification" icon="🔔" />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            <Input label="Title *" value={form.title} onChange={set("title")} placeholder="New workout unlocked 🏋️" />
            <div>
              <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>Body *</label>
              <textarea value={form.body} onChange={e => set("body")(e.target.value)} placeholder="Your weekly streak is on fire 🔥" rows={3}
                style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", boxSizing: "border-box", resize: "vertical", background: T.bg, color: T.text }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>Type</label>
                <select value={form.type} onChange={e => set("type")(e.target.value)} style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.bg, color: T.text }}>
                  {["general"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Input label="Deep link" value={form.deep_link} onChange={set("deep_link")} placeholder="aerofit://screen/home" />
            </div>
            {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <Btn variant="primary" onClick={submit} disabled={submitting} style={{ alignSelf: "flex-end", padding: "8px 20px" }}>
              {submitting ? "Sending…" : "Send Now"}
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={`Your Gym's Notifications (${notifications.length})`} icon="🔔"
          action={<Btn variant="ghost" onClick={loadNotifications} style={{ fontSize: 11, padding: "4px 10px" }}>🔄 Refresh</Btn>}
        />
        {loading ? <Spinner /> : notifications.length === 0 ? (
          <Empty msg="No notifications yet. Send one above." />
        ) : (
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {notifications.map((n, i) => (
              <div key={n.notification_id || i} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: 12,
                border: `0.5px solid ${T.border}`, borderRadius: 10,
                opacity: deletingId === n.notification_id ? 0.4 : 1,
                transition: "opacity 0.2s",
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: n.type === "billing" ? T.purple50 : T.teal50, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  {n.type === "billing" ? "💰" : "📣"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 500, fontSize: 13, color: T.text }}>{n.title}</span>
                    <Badge label={n.type || "general"} />
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: T.gray200, marginTop: 4 }}>Sent {fmtDate(n.sent_at)}</div>
                </div>
                {n.type !== "billing" && (
                  <Btn
                    variant="danger"
                    onClick={() => askDelete(n)}
                    disabled={deletingId === n.notification_id}
                    style={{ fontSize: 12, padding: "4px 10px", flexShrink: 0 }}
                  >
                    {deletingId === n.notification_id ? "Deleting…" : "Delete"}
                  </Btn>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Config Tab ────────────────────────────────────────────────────────────────
function ConfigTab() {
  const gymInfo = JSON.parse(sessionStorage.getItem("gym_info") || "{}");
  const items = [
    { label: "Gym Name",    value: gymInfo.gym_name    || "—" },
    { label: "Gym ID",      value: gymInfo.gym_id      || "—" },
    { label: "Admin Name",  value: gymInfo.admin_name  || "—" },
    { label: "Admin Email", value: gymInfo.admin_email || "—" },
    { label: "AI Model",    value: "gemini-2.5-flash-lite" },
  ];
  return (
    <Card>
      <CardHeader title="Gym Config" icon="⚙" />
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column" }}>
        {items.map((c, i) => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: i < items.length - 1 ? `0.5px solid ${T.border}` : "none" }}>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.text }}>{c.label}</div>
            <div style={{ fontSize: 12, color: T.teal600, background: T.teal50, padding: "4px 10px", borderRadius: 8, fontFamily: "monospace" }}>{c.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authed, setAuthed]               = useState(!!sessionStorage.getItem("af_admin"));
  const [active, setActive]               = useState("dashboard");
  const [banners, setBanners]             = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userIds, setUserIds]             = useState([]);
  const [billingSummary, setBillingSummary] = useState(null);
  const [loading, setLoading]             = useState(true);

  // ── Pro plan activation gate state ────────────────────────────────────────
  // checkingActivation: still waiting on the backend to tell us whether this
  // gym's ₹5,000/year Pro fee has been paid. activationRequired: true means
  // render the payment gate instead of the dashboard — no bypass.
  const [checkingActivation, setCheckingActivation] = useState(true);
  const [activationRequired, setActivationRequired] = useState(false);
  const [activationExpired, setActivationExpired]   = useState(false);
  const [activationAmount, setActivationAmount]     = useState(5000);

  // ── Renewal reminder state (non-blocking, shown when NOT gated) ──────────
  const [proExpiresAt, setProExpiresAt]         = useState(null);
  const [proDaysLeft, setProDaysLeft]           = useState(null);
  const [proExpiringSoon, setProExpiringSoon]   = useState(false);
  const [renewDismissed, setRenewDismissed]     = useState(false);
  const [showRenewModal, setShowRenewModal]     = useState(false);

  const gymInfo = JSON.parse(sessionStorage.getItem("gym_info") || "{}");
  const gymId   = gymInfo?.gym_id;

  async function loadAll() {
    if (!gymId) return;
    setLoading(true);
    try {
      const [b, n, u, s] = await Promise.all([
        apiFetch(`/gym/${gymId}/banners`).catch(() => []),
        apiFetch(`/gym/${gymId}/notifications`).catch(() => []),
        apiFetch(`/gym/${gymId}/user-ids`).catch(() => []),
        apiFetch(`/gym/${gymId}/billing-summary`).catch(() => null),
      ]);
      setBanners(Array.isArray(b) ? b : []);
      setNotifications(Array.isArray(n) ? n : []);
      setUserIds(Array.isArray(u) ? u : []);
      setBillingSummary(s);
    } finally { setLoading(false); }
  }

  // Step 1 after login: find out if this gym needs to pay the Pro
  // activation fee before it can see anything else. Also captures expiry
  // info for the non-blocking renewal reminder when access IS allowed.
  useEffect(() => {
    if (!authed || !gymId) return;
    setCheckingActivation(true);
    apiFetch(`/gym/${gymId}/pro-activation-status`)
      .then(s => {
        setActivationRequired(!!s.required);
        setActivationExpired(!!s.expired);
        if (s.amount) setActivationAmount(s.amount);
        if (!s.required) {
          setProExpiresAt(s.expires_at ?? null);
          setProDaysLeft(typeof s.days_left === "number" ? s.days_left : null);
          setProExpiringSoon(!!s.expiring_soon);
        }
      })
      .catch(() => setActivationRequired(false))
      .finally(() => setCheckingActivation(false));
  }, [authed, gymId]);

  // Step 2: only load the actual dashboard data once we know activation
  // isn't blocking access.
  useEffect(() => {
    if (authed && !checkingActivation && !activationRequired) loadAll();
  }, [authed, checkingActivation, activationRequired]);

  function handleRenewed(newExpiresAt) {
    setShowRenewModal(false);
    setProExpiresAt(newExpiresAt);
    if (newExpiresAt) {
      setProDaysLeft(Math.ceil((new Date(newExpiresAt).getTime() - Date.now()) / 86400000));
    }
    setProExpiringSoon(false);
    setRenewDismissed(false);
  }

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;
  if (checkingActivation) return <FullScreenSpinner />;
  if (activationRequired) {
    return (
      <ProActivationGate
        gymInfo={gymInfo}
        amount={activationAmount}
        expired={activationExpired}
        onActivated={() => setActivationRequired(false)}
      />
    );
  }

  const currentLabel = NAV.find(n => n.id === active)?.label || "";

  // ── Billing badge = pending invoices (always accurate from data) +
  //    unread billing alerts (cleared once the admin opens Billing).
  //    Unlike before, this no longer depends on which tab is selected —
  //    a paid invoice or a read alert is what actually clears it.
  const unreadBillingAlerts = notifications.filter(n => n.type === "billing" && n.read !== true).length;
  const pendingInvoices     = billingSummary?.pending_count || 0;
  const billingBadgeCount   = pendingInvoices + unreadBillingAlerts;

  // Refreshes only billingSummary — deliberately bypasses loadAll()'s
  // `loading` flag, since that conditional render unmounts whichever tab
  // is showing. BillingTab fetches its own copy on mount; routing this
  // through loadAll() would re-trigger that mount forever. Safe to call
  // from anywhere (tab open, manual refresh, payment success) because it
  // touches nothing but billingSummary.
  function refreshBillingBadge() {
    if (!gymId) return;
    apiFetch(`/gym/${gymId}/billing-summary`).then(setBillingSummary).catch(() => {});
  }

  async function openBilling() {
    setActive("billing");
    refreshBillingBadge();

    if (unreadBillingAlerts > 0 && gymId) {
      try {
        await apiFetch(`/gym/${gymId}/notifications/mark-billing-read`, { method: "POST" });
        // Reflect the read state locally without a full reload, so the
        // pending-invoice count (untouched) stays visible immediately.
        setNotifications(prev => prev.map(n => n.type === "billing" ? { ...n, read: true } : n));
      } catch (_) { /* badge will just re-clear next successful load */ }
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", background: T.bg }}>
      <aside style={{ width: 220, minWidth: 220, background: T.surface, borderRight: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Aero<span style={{ color: T.teal600 }}>fit</span></div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Admin Console</div>
          {gymInfo.gym_name && (
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: T.teal600, background: T.teal50, padding: "3px 10px", borderRadius: 20, display: "inline-block" }}>
              🏢 {gymInfo.gym_name}
            </div>
          )}
        </div>
        <nav style={{ padding: "10px", flex: 1, overflowY: "auto" }}>
          {SECTIONS.map(section => (
            <div key={section}>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.gray200, letterSpacing: "0.06em", textTransform: "uppercase", padding: "10px 8px 4px" }}>{section}</div>
              {NAV.filter(n => n.section === section).map(item => {
                const sel = active === item.id;
                const showBadge = item.id === "billing" && billingBadgeCount > 0;
                return (
                  <button key={item.id} onClick={() => item.id === "billing" ? openBilling() : setActive(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13.5, width: "100%", textAlign: "left", border: "none", background: sel ? T.teal50 : "transparent", color: sel ? T.teal600 : T.textMid, fontWeight: sel ? 500 : 400 }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {item.label}
                    {showBadge && (
                      <span style={{ marginLeft: "auto", background: T.red600, color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 600, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>{billingBadgeCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div style={{ padding: 10, borderTop: `0.5px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.teal50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: T.teal600 }}>
              {gymInfo.admin_name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{gymInfo.admin_name || "Admin"}</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>{gymInfo.gym_name || "Gym"}</div>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ background: T.surface, borderBottom: `0.5px solid ${T.border}`, padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>{currentLabel}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={loadAll} style={{ width: 34, height: 34, borderRadius: 8, border: `0.5px solid ${T.border}`, background: "none", cursor: "pointer", fontSize: 15 }} title="Refresh">🔄</button>
            <button onClick={() => { sessionStorage.removeItem("af_admin"); sessionStorage.removeItem("gym_info"); setAuthed(false); setCheckingActivation(true); setActivationRequired(false); }} style={{ height: 34, borderRadius: 8, border: `0.5px solid ${T.border}`, background: "none", cursor: "pointer", fontSize: 12, color: T.textMuted, padding: "0 12px" }}>Sign out</button>
          </div>
        </div>
        <div style={{ padding: 24, maxWidth: 1100 }}>
          {showRenewModal && (
            <RenewProModal
              gymInfo={gymInfo}
              amount={activationAmount}
              onRenewed={handleRenewed}
              onClose={() => setShowRenewModal(false)}
            />
          )}
          {!activationRequired && proExpiringSoon && !renewDismissed && (
            <RenewalReminderBanner
              daysLeft={proDaysLeft ?? 0}
              expiresAt={proExpiresAt}
              onRenew={() => setShowRenewModal(true)}
              onDismiss={() => setRenewDismissed(true)}
            />
          )}
          {loading ? <Spinner /> : (
            <>
              {active === "dashboard"     && <DashboardTab banners={banners} notifications={notifications} userIds={userIds} billingSummary={billingSummary} />}
              {active === "user_ids"      && <UserIdsTab gymInfo={gymInfo} />}
              {active === "billing"       && <BillingTab gymId={gymId} onRefresh={refreshBillingBadge} />}
              {active === "banners"       && <BannersTab gymId={gymId} onRefresh={loadAll} />}
              {active === "notifications" && <NotificationsTab gymId={gymId} onRefresh={loadAll} />}
              {active === "config"        && <ConfigTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}