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
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }
      throw e;
    }
  }
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  teal50: "#E1F5EE", teal100: "#9FE1CB", teal600: "#0F6E56", teal700: "#085041", teal800: "#04342C",
  purple50: "#EEEDFE", purple600: "#534AB7", purple800: "#3C3489",
  amber50: "#FAEEDA", amber600: "#854F0B",
  coral50: "#FAECE7", coral600: "#993C1D",
  gray50: "#F1EFE8", gray200: "#B4B2A9", gray600: "#5F5E5A",
  blue50: "#E6F1FB", blue600: "#185FA5",
  green50: "#EAF3DE", green600: "#3B6D11",
  red50: "#FCEBEB", red200: "#F7C1C1", red600: "#A32D2D",
  orange50: "#FFF3E0", orange600: "#E65100",
  bg: "#F6F6F1", surface: "#FFFFFF",
  border: "rgba(0,0,0,0.07)", borderMid: "rgba(0,0,0,0.12)",
  text: "#1A1A18", textMid: "#444441", textMuted: "#888780",
};

const STATUS_MAP = {
  Active:    { bg: T.teal50,   color: T.teal600 },
  Scheduled: { bg: T.amber50,  color: T.amber600 },
  Draft:     { bg: T.gray50,   color: T.gray600 },
  Inactive:  { bg: T.gray50,   color: T.gray600 },
  Pro:       { bg: T.purple50, color: T.purple600 },
  Free:      { bg: T.gray50,   color: T.gray600 },
  Trial:     { bg: T.amber50,  color: T.amber600 },
  general:   { bg: T.blue50,   color: T.blue600 },
  class:     { bg: T.teal50,   color: T.teal600 },
  promo:     { bg: T.purple50, color: T.purple600 },
  // subscription statuses
  active:    { bg: T.teal50,   color: T.teal600 },
  expired:   { bg: T.red50,    color: T.red600 },
  expiring:  { bg: T.amber50,  color: T.amber600 },
};

function Badge({ label }) {
  const s = STATUS_MAP[label] || { bg: T.gray50, color: T.gray600 };
  return (
    <span style={{
      fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500,
      whiteSpace: "nowrap", background: s.bg, color: s.color, letterSpacing: "0.02em",
    }}>{label}</span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: T.surface, border: `0.5px solid ${T.border}`,
      borderRadius: 14, overflow: "hidden", ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, icon, action }) {
  return (
    <div style={{
      padding: "14px 18px", borderBottom: `0.5px solid ${T.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ fontWeight: 500, fontSize: 13.5, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        {title}
      </div>
      {action}
    </div>
  );
}

function Btn({ children, onClick, variant = "ghost", style = {}, disabled = false }) {
  const base = {
    fontSize: 12.5, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    padding: "6px 13px", borderRadius: 8, fontWeight: 500,
    transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1,
  };
  const vars = {
    ghost:   { background: "none", color: T.teal600 },
    primary: { background: T.teal600, color: "#fff" },
    danger:  { background: T.red50, color: T.red600 },
    warning: { background: T.amber50, color: T.amber600 },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>{label}</label>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px",
          fontSize: 13, outline: "none", background: T.bg, color: T.text,
          width: "100%", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{
        width: 24, height: 24, border: `2.5px solid ${T.teal50}`,
        borderTop: `2.5px solid ${T.teal600}`, borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Empty({ msg = "No data yet" }) {
  return (
    <div style={{ padding: "28px 18px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
      {msg}
    </div>
  );
}

// ── Subscription helpers ──────────────────────────────────────────────────────
const SUBSCRIPTION_KEY = "af_user_subscriptions_v1";

function loadSubscriptions() {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSubscriptions(subs) {
  localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subs));
}

function getSubStatus(sub) {
  if (!sub || !sub.expires_at) return null;
  const now = Date.now();
  const exp = new Date(sub.expires_at).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (exp < now) return "expired";
  if (exp - now < sevenDays) return "expiring";
  return "active";
}

function getDaysLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Nav config ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",     icon: "⊞",  label: "Dashboard",     section: "Overview" },
  { id: "banners",       icon: "🖼",  label: "Banners",       section: "Content" },
  { id: "notifications", icon: "🔔", label: "Notifications", section: "Content" },
  { id: "users",         icon: "👥", label: "Users",         section: "Users" },
  { id: "config",        icon: "⚙",  label: "App Config",    section: "Settings" },
];
const SECTIONS = [...new Set(NAV.map(n => n.section))];

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function AdminLogin({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!user || !pass) { setError("Both fields required"); return; }
    setLoading(true); setError("");
    try {
      await apiFetch("/admin/login", {
        method: "POST",
        body: JSON.stringify({ username: user, password: pass }),
      });
      sessionStorage.setItem("af_admin", "1");
      onLogin();
    } catch { setError("Invalid credentials"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        background: T.surface, borderRadius: 16, padding: 36,
        border: `0.5px solid ${T.border}`, width: 340,
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: T.text }}>
            Aero<span style={{ color: T.teal600 }}>fit</span>
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>Admin Console</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <Input label="Username" value={user} onChange={setUser} placeholder="admin" />
          <Input label="Password" value={pass} onChange={setPass} type="password" placeholder="••••••••" />
          {error && (
            <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>
              {error}
            </div>
          )}
          <button onClick={login} style={{
            background: T.teal600, color: "#fff", border: "none",
            borderRadius: 8, padding: "10px", fontSize: 13.5,
            fontWeight: 600, cursor: "pointer", marginTop: 4,
          }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SUBSCRIPTION MODAL
// ══════════════════════════════════════════════════════════════════════════════
function SubscriptionModal({ user, existing, onSave, onClose }) {
  const DURATIONS = [
    { label: "1 Month",   months: 1 },
    { label: "2 Months",  months: 2 },
    { label: "3 Months",  months: 3 },
    { label: "6 Months",  months: 6 },
    { label: "9 Months",  months: 9 },
    { label: "12 Months", months: 12 },
  ];

  const [selected, setSelected] = useState(null);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(existing?.note || "");

  // Auto-compute expiry
  const expiresAt = (() => {
    if (!selected || !startDate) return null;
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + selected);
    return d.toISOString().slice(0, 10);
  })();

  function save() {
    if (!selected) return;
    onSave({
      months: selected,
      starts_at: startDate,
      expires_at: expiresAt,
      note: note.trim(),
      set_at: new Date().toISOString(),
    });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, fontFamily: "'DM Sans', system-ui, sans-serif",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: T.surface, borderRadius: 18, width: 480, maxWidth: "95vw",
        boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
        border: `0.5px solid ${T.border}`,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: `0.5px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>
              📅 Schedule Access
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
              {user.name} · {user.email}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: T.bg, border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 16, color: T.textMuted,
          }}>✕</button>
        </div>

        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Existing subscription banner */}
          {existing && (
            <div style={{
              background: getSubStatus(existing) === "expired" ? T.red50 : T.amber50,
              border: `0.5px solid ${getSubStatus(existing) === "expired" ? T.red200 : "#f0c070"}`,
              borderRadius: 10, padding: "10px 14px",
              fontSize: 12.5, color: getSubStatus(existing) === "expired" ? T.red600 : T.amber600,
            }}>
              {getSubStatus(existing) === "expired"
                ? `⚠️ Previous subscription expired on ${fmtDate(existing.expires_at)}. Setting a new one will reactivate access.`
                : `ℹ️ Active until ${fmtDate(existing.expires_at)} (${getDaysLeft(existing.expires_at)} days left). This will replace it.`
              }
            </div>
          )}

          {/* Duration picker */}
          <div>
            <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, marginBottom: 10 }}>
              Select Duration
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {DURATIONS.map(d => (
                <button key={d.months} onClick={() => setSelected(d.months)} style={{
                  padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                  fontSize: 13, fontWeight: 500, transition: "all 0.15s",
                  border: selected === d.months ? `1.5px solid ${T.teal600}` : `0.5px solid ${T.borderMid}`,
                  background: selected === d.months ? T.teal50 : T.bg,
                  color: selected === d.months ? T.teal600 : T.textMid,
                }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start date */}
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>
              Start Date
            </label>
            <input type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                border: `0.5px solid ${T.borderMid}`, borderRadius: 8,
                padding: "8px 11px", fontSize: 13, outline: "none",
                background: T.bg, color: T.text, width: "100%", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Computed expiry preview */}
          {expiresAt && (
            <div style={{
              background: T.teal50, borderRadius: 10, padding: "12px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 11, color: T.teal600, fontWeight: 500, marginBottom: 3 }}>ACCESS WINDOW</div>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                  {fmtDate(startDate)} → {fmtDate(expiresAt)}
                </div>
              </div>
              <div style={{
                background: T.teal600, color: "#fff", borderRadius: 8,
                padding: "6px 12px", fontSize: 12, fontWeight: 600,
              }}>
                {selected} mo
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>
              Note (optional)
            </label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Annual plan, renewal, trial extension…"
              style={{
                border: `0.5px solid ${T.borderMid}`, borderRadius: 8,
                padding: "8px 11px", fontSize: 13, outline: "none",
                background: T.bg, color: T.text, width: "100%", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <Btn variant="ghost" onClick={onClose} style={{ border: `0.5px solid ${T.borderMid}` }}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={save} disabled={!selected}
              style={{ padding: "8px 22px", opacity: selected ? 1 : 0.45 }}>
              Set Subscription
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Subscription status pill ───────────────────────────────────────────────────
function SubStatusPill({ sub }) {
  if (!sub) {
    return <span style={{ fontSize: 11, color: T.textMuted }}>—</span>;
  }
  const status = getSubStatus(sub);
  const daysLeft = getDaysLeft(sub.expires_at);
  const cfg = {
    active:   { bg: T.teal50,   color: T.teal600,  icon: "✓" },
    expiring: { bg: T.amber50,  color: T.amber600, icon: "⚠" },
    expired:  { bg: T.red50,    color: T.red600,   icon: "✕" },
  }[status] || { bg: T.gray50, color: T.gray600, icon: "—" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{
        fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500,
        background: cfg.bg, color: cfg.color, display: "inline-flex",
        alignItems: "center", gap: 4, width: "fit-content",
      }}>
        {cfg.icon} {status === "active" ? "Active" : status === "expiring" ? "Expiring" : "Expired"}
      </span>
      <span style={{ fontSize: 10.5, color: T.textMuted }}>
        {status === "expired"
          ? `Expired ${fmtDate(sub.expires_at)}`
          : `${daysLeft}d left · ${fmtDate(sub.expires_at)}`
        }
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD TAB
// ══════════════════════════════════════════════════════════════════════════════
function DashboardTab({ banners, notifications }) {
  const stats = [
    { label: "Active Banners",      value: banners.filter(b => b.status === "active").length, change: `${banners.length} total`, accent: T.teal50,   icon: "🖼" },
    { label: "Total Notifications", value: notifications.length,                              change: "in database",             accent: T.purple50, icon: "🔔" },
    { label: "Daily Scan Limit",    value: 10,                                                change: "per user/day",            accent: T.amber50,  icon: "📸" },
    { label: "Scheduled",           value: banners.filter(b => b.status === "scheduled").length, change: "banners scheduled",   accent: T.blue50,   icon: "📅" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 22 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: T.surface, border: `0.5px solid ${T.border}`,
            borderRadius: 12, padding: "16px 16px 14px",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: s.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, marginBottom: 12,
            }}>{s.icon}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 500, color: T.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, marginTop: 5, color: T.textMuted }}>{s.change}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <CardHeader title="Banners" icon="🖼" />
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {banners.slice(0, 4).length === 0 ? <Empty msg="No banners yet" /> : banners.slice(0, 4).map(b => (
              <div key={b.banner_id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: 10,
                border: `0.5px solid ${T.border}`, borderRadius: 8,
              }}>
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
          <CardHeader title="Recent notifications" icon="🔔" />
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {notifications.slice(0, 4).length === 0 ? <Empty msg="No notifications yet" /> : notifications.slice(0, 4).map((n, i) => (
              <div key={n.notification_id || i} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: 10,
                border: `0.5px solid ${T.border}`, borderRadius: 8,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: T.teal50,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0,
                }}>📣</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: T.text, fontWeight: 500 }}>{n.title}</div>
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

// ══════════════════════════════════════════════════════════════════════════════
//  BANNERS TAB
// ══════════════════════════════════════════════════════════════════════════════
function BannersTab({ banners, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", screen: "home", status: "active", expires_at: "", deep_link: "" });
  const [imageB64, setImageB64] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const fileRef = useRef();

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  function pickFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setImageB64(ev.target.result); setPreviewUrl(ev.target.result); };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setLoading(true); setError("");
    try {
      await apiFetch("/banners", {
        method: "POST",
        body: JSON.stringify({ ...form, image_base64: imageB64 || undefined }),
      });
      setForm({ title: "", screen: "home", status: "active", expires_at: "", deep_link: "" });
      setImageB64(""); setPreviewUrl(""); setShowForm(false);
      onRefresh();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function deleteBanner(id) {
    if (!confirm("Delete this banner?")) return;
    try { await apiFetch(`/banners/${id}`, { method: "DELETE" }); onRefresh(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn variant="primary" onClick={() => setShowForm(v => !v)}>
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
                <select value={form.screen} onChange={e => set("screen")(e.target.value)}
                  style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.bg, color: T.text }}>
                  {["home"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>Status</label>
                <select value={form.status} onChange={e => set("status")(e.target.value)}
                  style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.bg, color: T.text }}>
                  {["active"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <Input label="Deep link (optional)" value={form.deep_link} onChange={set("deep_link")} placeholder="aerofit://screen/workout" />
            <div>
              <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>Banner image</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Btn variant="ghost" onClick={() => fileRef.current.click()} style={{ border: `0.5px solid ${T.borderMid}` }}>
                  📁 Choose image
                </Btn>
                {previewUrl && <img src={previewUrl} alt="preview" style={{ height: 48, borderRadius: 6, objectFit: "cover" }} />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
            </div>
            {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <Btn variant="primary" onClick={submit} style={{ alignSelf: "flex-end", padding: "8px 20px" }}>
              {loading ? "Saving…" : "Create Banner"}
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="All Banners" icon="🖼" />
        {banners.length === 0 ? <Empty msg="No banners. Create one above." /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Preview", "Title", "Screen", "Status", "Expires", ""].map(h => (
                    <th key={h} style={{
                      textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted,
                      padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {banners.map(b => (
                  <tr key={b.banner_id} style={{ borderBottom: `0.5px solid ${T.border}` }}>
                    <td style={{ padding: "10px 14px" }}>
                      {b.image_url
                        ? <img src={b.image_url} alt="" style={{ width: 56, height: 36, objectFit: "cover", borderRadius: 6 }} />
                        : <div style={{ width: 56, height: 36, background: T.teal50, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🖼</div>
                      }
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: T.text }}>{b.title}</td>
                    <td style={{ padding: "10px 14px", color: T.textMuted }}>{b.screen}</td>
                    <td style={{ padding: "10px 14px" }}><Badge label={b.status === "active" ? "Active" : b.status === "scheduled" ? "Scheduled" : "Draft"} /></td>
                    <td style={{ padding: "10px 14px", color: T.textMuted, fontSize: 12 }}>{b.expires_at || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <Btn variant="danger" onClick={() => deleteBanner(b.banner_id)} style={{ fontSize: 12, padding: "4px 10px" }}>Delete</Btn>
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

// ══════════════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS TAB
// ══════════════════════════════════════════════════════════════════════════════
function NotificationsTab({ notifications, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", body: "", type: "general", deep_link: "", segments: ["all"] });

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.title.trim() || !form.body.trim()) { setError("Title and body are required"); return; }
    setLoading(true); setError("");
    try {
      await apiFetch("/notifications", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", body: "", type: "general", deep_link: "", segments: ["all"] });
      setShowForm(false); onRefresh();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function deleteNotification(id) {
    if (!confirm("Delete this notification?")) return;
    try { await apiFetch(`/notifications/${id}`, { method: "DELETE" }); onRefresh(); }
    catch (e) { alert(e.message); }
  }

  function fmtDateLocal(val) {
    if (!val) return "—";
    const d = val.toDate ? val.toDate() : new Date(val._seconds ? val._seconds * 1000 : val);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn variant="primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? "✕ Cancel" : "+ Send Notification"}
        </Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <CardHeader title="New Notification" icon="🔔" />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            <Input label="Title *" value={form.title} onChange={set("title")} placeholder="New workout unlocked 🏋️" />
            <div>
              <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>Body *</label>
              <textarea value={form.body} onChange={e => set("body")(e.target.value)}
                placeholder="Your weekly streak is on fire! Keep it up 🔥"
                rows={3}
                style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", boxSizing: "border-box", resize: "vertical", background: T.bg, color: T.text }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>Type</label>
                <select value={form.type} onChange={e => set("type")(e.target.value)}
                  style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.bg, color: T.text }}>
                  {["general"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Input label="Deep link" value={form.deep_link} onChange={set("deep_link")} placeholder="aerofit://screen/home" />
            </div>
            {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <Btn variant="primary" onClick={submit} style={{ alignSelf: "flex-end", padding: "8px 20px" }}>
              {loading ? "Sending…" : "Send Now"}
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Sent Notifications" icon="🔔" />
        {notifications.length === 0 ? <Empty msg="No notifications sent yet." /> : (
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {notifications.map((n, i) => (
              <div key={n.notification_id || i} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: 12,
                border: `0.5px solid ${T.border}`, borderRadius: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: T.teal50, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>📣</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 500, fontSize: 13, color: T.text }}>{n.title}</span>
                    <Badge label={n.type || "general"} />
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: T.gray200, marginTop: 4 }}>
                    Sent {fmtDateLocal(n.sent_at)} · {(n.segments || ["all"]).join(", ")}
                  </div>
                </div>
                <Btn variant="danger" onClick={() => deleteNotification(n.notification_id)}
                  style={{ fontSize: 12, padding: "4px 10px", flexShrink: 0 }}>
                  Delete
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  USERS TAB  (with subscription scheduling)
// ══════════════════════════════════════════════════════════════════════════════
function UsersTab() {
  const [users, setUsers]               = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [error, setError]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState("");
  const [filter, setFilter]             = useState("all"); // all | active | expiring | expired | none
  const [subModal, setSubModal]         = useState(null);  // user object or null
  const [subscriptions, setSubscriptions] = useState(loadSubscriptions());
  const [form, setForm] = useState({ name: "", email: "", password: "", weight_kg: "", height_cm: "" });

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  // Auto-remove expired users from backend
  useEffect(() => {
    const subs = loadSubscriptions();
    const now = Date.now();
    Object.entries(subs).forEach(([email, sub]) => {
      if (sub && new Date(sub.expires_at).getTime() < now) {
        // Mark as expired in local state — actual deletion on admin's explicit action
        // (we don't auto-delete without admin confirmation)
      }
    });
    setSubscriptions(subs);
  }, []);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const data = await apiFetch("/admin/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
    finally { setLoadingUsers(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  async function addUser() {
    if (!form.name || !form.email || !form.password || !form.weight_kg || !form.height_cm) {
      setError("All fields are required"); return;
    }
    setSaving(true); setError("");
    try {
      await apiFetch("/admin/add-user", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          weight_kg: parseFloat(form.weight_kg),
          height_cm: parseFloat(form.height_cm),
        }),
      });
      setForm({ name: "", email: "", password: "", weight_kg: "", height_cm: "" });
      setShowForm(false);
      loadUsers();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function deleteUser(email) {
    if (!confirm(`Remove ${email}?`)) return;
    try {
      await apiFetch(`/admin/users/${email}`, { method: "DELETE" });
      // Also clear subscription
      const updated = { ...loadSubscriptions() };
      delete updated[email];
      saveSubscriptions(updated);
      setSubscriptions(updated);
      loadUsers();
    } catch (e) { alert(e.message); }
  }

  async function removeExpiredUser(email) {
    if (!confirm(`This user's subscription has expired. Remove ${email} from the system?`)) return;
    try {
      await apiFetch(`/admin/users/${email}`, { method: "DELETE" });
      const updated = { ...loadSubscriptions() };
      delete updated[email];
      saveSubscriptions(updated);
      setSubscriptions(updated);
      loadUsers();
    } catch (e) { alert(e.message); }
  }

  function handleSaveSub(user, subData) {
    const updated = { ...loadSubscriptions(), [user.email]: subData };
    saveSubscriptions(updated);
    setSubscriptions(updated);
    setSubModal(null);
  }

  function clearSub(email) {
    if (!confirm("Remove subscription for this user?")) return;
    const updated = { ...loadSubscriptions() };
    delete updated[email];
    saveSubscriptions(updated);
    setSubscriptions(updated);
  }

  // Filter + search
  const filtered = users.filter(u => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const sub = subscriptions[u.email];
    const status = getSubStatus(sub);
    const matchesFilter =
      filter === "all"      ? true :
      filter === "active"   ? status === "active" :
      filter === "expiring" ? status === "expiring" :
      filter === "expired"  ? status === "expired" :
      filter === "none"     ? !sub :
      true;
    return matchesSearch && matchesFilter;
  });

  // Summary counts
  const counts = {
    active:   users.filter(u => getSubStatus(subscriptions[u.email]) === "active").length,
    expiring: users.filter(u => getSubStatus(subscriptions[u.email]) === "expiring").length,
    expired:  users.filter(u => getSubStatus(subscriptions[u.email]) === "expired").length,
    none:     users.filter(u => !subscriptions[u.email]).length,
  };

  const FILTER_TABS = [
    { id: "all",      label: `All (${users.length})` },
    { id: "active",   label: `Active (${counts.active})` },
    { id: "expiring", label: `Expiring Soon (${counts.expiring})` },
    { id: "expired",  label: `Expired (${counts.expired})` },
    { id: "none",     label: `No Plan (${counts.none})` },
  ];

  return (
    <div>
      {/* Subscription modal */}
      {subModal && (
        <SubscriptionModal
          user={subModal}
          existing={subscriptions[subModal.email]}
          onSave={data => handleSaveSub(subModal, data)}
          onClose={() => setSubModal(null)}
        />
      )}

      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 14, color: T.textMuted, pointerEvents: "none",
          }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{
              width: "100%", boxSizing: "border-box",
              border: `0.5px solid ${T.borderMid}`, borderRadius: 8,
              padding: "8px 11px 8px 32px", fontSize: 13,
              background: T.surface, color: T.text, outline: "none",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: T.textMuted, fontSize: 14, padding: 0, lineHeight: 1,
            }}>✕</button>
          )}
        </div>
        <Btn variant="primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? "✕ Cancel" : "+ Add User"}
        </Btn>
      </div>

      {/* Expiring alerts banner */}
      {counts.expiring > 0 && (
        <div style={{
          background: T.amber50, border: `0.5px solid #f0c070`,
          borderRadius: 10, padding: "10px 16px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 10, fontSize: 13,
          color: T.amber600,
        }}>
          ⚠️ <strong>{counts.expiring} user{counts.expiring > 1 ? "s" : ""}</strong> {counts.expiring > 1 ? "have" : "has"} subscriptions expiring within 7 days.
          <button onClick={() => setFilter("expiring")} style={{
            marginLeft: "auto", background: T.amber600, color: "#fff",
            border: "none", borderRadius: 6, padding: "4px 12px",
            fontSize: 12, cursor: "pointer", fontWeight: 500,
          }}>View</button>
        </div>
      )}

      {/* Expired alert */}
      {counts.expired > 0 && (
        <div style={{
          background: T.red50, border: `0.5px solid ${T.red200}`,
          borderRadius: 10, padding: "10px 16px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 10, fontSize: 13,
          color: T.red600,
        }}>
          ✕ <strong>{counts.expired} user{counts.expired > 1 ? "s" : ""}</strong> {counts.expired > 1 ? "have" : "has"} expired subscriptions and should be removed or renewed.
          <button onClick={() => setFilter("expired")} style={{
            marginLeft: "auto", background: T.red600, color: "#fff",
            border: "none", borderRadius: 6, padding: "4px 12px",
            fontSize: 12, cursor: "pointer", fontWeight: 500,
          }}>View</button>
        </div>
      )}

      {/* Add user form */}
      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <CardHeader title="Add New User" icon="👤" />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Full Name *" value={form.name} onChange={set("name")} placeholder="Aryan Sharma" />
              <Input label="Email *" value={form.email} onChange={set("email")} type="email" placeholder="aryan@gmail.com" />
            </div>
            <Input label="Password *" value={form.password} onChange={set("password")} type="password" placeholder="Set a strong password" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Weight (kg) *" value={form.weight_kg} onChange={set("weight_kg")} placeholder="72" />
              <Input label="Height (cm) *" value={form.height_cm} onChange={set("height_cm")} placeholder="175" />
            </div>
            {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <Btn variant="primary" onClick={addUser} style={{ alignSelf: "flex-end", padding: "8px 20px" }}>
              {saving ? "Adding…" : "Add User"}
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        {/* Filter tabs */}
        <div style={{
          padding: "0 16px", borderBottom: `0.5px solid ${T.border}`,
          display: "flex", gap: 0, overflowX: "auto",
        }}>
          {FILTER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
              padding: "12px 14px", border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: filter === tab.id ? 600 : 400,
              color: filter === tab.id ? T.teal600 : T.textMuted,
              background: "none", borderBottom: filter === tab.id ? `2px solid ${T.teal600}` : "2px solid transparent",
              whiteSpace: "nowrap", transition: "all 0.15s",
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        <CardHeader
          title="Users"
          icon="👥"
          action={
            <span style={{ fontSize: 11, color: T.textMuted }}>
              {filtered.length} of {users.length} users
            </span>
          }
        />

        {loadingUsers ? <Spinner /> : filtered.length === 0 ? (
          <Empty msg={search ? `No users matching "${search}"` : "No users in this category."} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["User", "Email", "Body", "Subscription", "Access Window", ""].map(h => (
                    <th key={h} style={{
                      textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted,
                      padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const sub = subscriptions[u.email];
                  const status = getSubStatus(sub);
                  const isExpired = status === "expired";

                  return (
                    <tr key={u.email} style={{
                      borderBottom: `0.5px solid ${T.border}`,
                      background: isExpired ? "#FFFBFB" : "transparent",
                    }}>
                      {/* Name */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: isExpired ? T.red50 : T.teal50,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 600,
                            color: isExpired ? T.red600 : T.teal600,
                            flexShrink: 0,
                          }}>{u.name?.[0]?.toUpperCase() || "?"}</div>
                          <div>
                            <div style={{ fontWeight: 500, color: T.text, fontSize: 13 }}>
                              {search && u.name?.toLowerCase().includes(search.toLowerCase())
                                ? <HighlightText text={u.name} query={search} />
                                : u.name
                              }
                            </div>
                            {sub?.note && (
                              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>
                                📝 {sub.note}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: "12px 14px", color: T.textMuted }}>
                        {search && u.email?.toLowerCase().includes(search.toLowerCase())
                          ? <HighlightText text={u.email} query={search} />
                          : u.email
                        }
                      </td>

                      {/* Body stats */}
                      <td style={{ padding: "12px 14px", color: T.textMuted, fontSize: 12 }}>
                        {u.weight_kg}kg · {u.height_cm}cm
                      </td>

                      {/* Subscription status */}
                      <td style={{ padding: "12px 14px" }}>
                        <SubStatusPill sub={sub} />
                      </td>

                      {/* Access window */}
                      <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMuted }}>
                        {sub ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span>{fmtDate(sub.starts_at)}</span>
                            <span style={{ color: T.gray200 }}>→ {fmtDate(sub.expires_at)}</span>
                            <span style={{ color: T.textMuted, fontSize: 10.5 }}>{sub.months} month{sub.months > 1 ? "s" : ""}</span>
                          </div>
                        ) : (
                          <span style={{ color: T.gray200 }}>Not set</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <Btn
                            variant="ghost"
                            onClick={() => setSubModal(u)}
                            style={{ border: `0.5px solid ${T.borderMid}`, fontSize: 12, padding: "4px 10px" }}
                          >
                            📅 {sub ? "Edit Plan" : "Set Plan"}
                          </Btn>
                          {sub && (
                            <Btn variant="warning" onClick={() => clearSub(u.email)}
                              style={{ fontSize: 12, padding: "4px 10px" }}>
                              ✕ Clear
                            </Btn>
                          )}
                          {isExpired ? (
                            <Btn variant="danger" onClick={() => removeExpiredUser(u.email)}
                              style={{ fontSize: 12, padding: "4px 10px" }}>
                              Remove
                            </Btn>
                          ) : (
                            <Btn variant="danger" onClick={() => deleteUser(u.email)}
                              style={{ fontSize: 12, padding: "4px 10px" }}>
                              Delete
                            </Btn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Legend */}
      <div style={{
        marginTop: 14, padding: "12px 16px",
        background: T.surface, borderRadius: 10, border: `0.5px solid ${T.border}`,
        display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>SUBSCRIPTION STATUS</span>
        {[
          { color: T.teal600,  bg: T.teal50,  label: "Active — access ongoing" },
          { color: T.amber600, bg: T.amber50, label: "Expiring — less than 7 days left" },
          { color: T.red600,   bg: T.red50,   label: "Expired — should be removed or renewed" },
          { color: T.gray600,  bg: T.gray50,  label: "No plan — not yet assigned" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
            <span style={{ fontSize: 11, color: T.textMuted }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HighlightText({ text, query }) {
  if (!query || !text) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: "#FFF176", color: T.text, borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CONFIG TAB
// ══════════════════════════════════════════════════════════════════════════════
function ConfigTab() {
  const configItems = [
    { label: "API Base URL",       value: API,                     note: "Render deployment URL" },
    { label: "Daily Scan Limit",   value: "10 scans/user/day",     note: "Enforced server-side" },
    { label: "AI Model",           value: "gemini-2.5-flash",      note: "Gemini vision + text" },
    { label: "Storage",            value: "Firebase Storage",      note: "aero-fit.firebasestorage.app" },
    { label: "Database",           value: "Firestore",             note: "Google Cloud project: aero-fit" },
    { label: "Auth",               value: "OTP via Gmail",         note: "aerofityou@gmail.com" },
  ];

  return (
    <Card>
      <CardHeader title="App Configuration" icon="⚙" />
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 0 }}>
        {configItems.map((c, i) => (
          <div key={c.label} style={{
            display: "flex", alignItems: "center", padding: "12px 0",
            borderBottom: i < configItems.length - 1 ? `0.5px solid ${T.border}` : "none",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{c.label}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{c.note}</div>
            </div>
            <div style={{
              fontSize: 12, color: T.teal600, background: T.teal50, padding: "4px 10px",
              borderRadius: 8, fontFamily: "monospace", maxWidth: 260, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{c.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [authed, setAuthed]             = useState(!!sessionStorage.getItem("af_admin"));
  const [active, setActive]             = useState("dashboard");
  const [banners, setBanners]           = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]           = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [b, n] = await Promise.all([
        apiFetch("/banners").catch(() => []),
        apiFetch("/notifications").catch(() => []),
      ]);
      setBanners(Array.isArray(b) ? b : []);
      setNotifications(Array.isArray(n) ? n : []);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (authed) loadAll(); }, [authed]);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  const currentLabel = NAV.find(n => n.id === active)?.label || "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", background: T.bg }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, minWidth: 220, background: T.surface,
        borderRight: `0.5px solid ${T.border}`,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px", color: T.text }}>
            Aero<span style={{ color: T.teal600 }}>fit</span>
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Admin Console</div>
        </div>

        <nav style={{ padding: "10px 10px", flex: 1, overflowY: "auto" }}>
          {SECTIONS.map(section => (
            <div key={section}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: T.gray200,
                letterSpacing: "0.06em", textTransform: "uppercase",
                padding: "10px 8px 4px",
              }}>{section}</div>
              {NAV.filter(n => n.section === section).map(item => {
                const sel = active === item.id;
                return (
                  <button key={item.id} onClick={() => setActive(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                    fontSize: 13.5, width: "100%", textAlign: "left",
                    border: "none", transition: "background 0.12s",
                    background: sel ? T.teal50 : "transparent",
                    color: sel ? T.teal600 : T.textMid,
                    fontWeight: sel ? 500 : 400,
                  }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: 10, borderTop: `0.5px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", background: T.teal50,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600, color: T.teal600,
            }}>AD</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Admin</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>admin@aerofit.app</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{
          background: T.surface, borderBottom: `0.5px solid ${T.border}`,
          padding: "0 24px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>{currentLabel}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={loadAll} style={{
              width: 34, height: 34, borderRadius: 8, border: `0.5px solid ${T.border}`,
              background: "none", cursor: "pointer", fontSize: 15,
            }} title="Refresh">🔄</button>
            <button onClick={() => { sessionStorage.removeItem("af_admin"); setAuthed(false); }} style={{
              height: 34, borderRadius: 8, border: `0.5px solid ${T.border}`,
              background: "none", cursor: "pointer", fontSize: 12,
              color: T.textMuted, padding: "0 12px",
            }}>Sign out</button>
          </div>
        </div>

        <div style={{ padding: 24, maxWidth: 1100 }}>
          {loading ? <Spinner /> : (
            <>
              {active === "dashboard"     && <DashboardTab banners={banners} notifications={notifications} />}
              {active === "banners"       && <BannersTab banners={banners} onRefresh={loadAll} />}
              {active === "notifications" && <NotificationsTab notifications={notifications} onRefresh={loadAll} />}
              {active === "users"         && <UsersTab />}
              {active === "config"        && <ConfigTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}