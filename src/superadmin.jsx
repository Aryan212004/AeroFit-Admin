import { useState, useEffect } from "react";

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

const T = {
  teal50: "#E1F5EE", teal100: "#9FE1CB", teal600: "#0F6E56", teal700: "#085041",
  purple50: "#EEEDFE", purple600: "#534AB7", purple800: "#3C3489",
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

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Badge({ label }) {
  const MAP = {
    Pro:      { bg: T.purple50, color: T.purple600 },
    Starter:  { bg: T.blue50,   color: T.blue600   },
    Trial:    { bg: T.amber50,  color: T.amber600  },
    active:   { bg: T.teal50,   color: T.teal600   },
    trial:    { bg: T.amber50,  color: T.amber600  },
    inactive: { bg: T.gray50,   color: T.gray600   },
    Active:   { bg: T.teal50,   color: T.teal600   },
    Inactive: { bg: T.gray50,   color: T.gray600   },
    paid:     { bg: T.green50,  color: T.green600  },
    pending:  { bg: T.amber50,  color: T.amber600  },
    overdue:  { bg: T.red50,    color: T.red600    },
    cancelled:{ bg: T.gray50,   color: T.gray600   },
    expired:  { bg: T.red50,    color: T.red600    },
  };
  const s = MAP[label] || { bg: T.gray50, color: T.gray600 };
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap", background: s.bg, color: s.color }}>{label}</span>;
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
    ghost:       { background: "none",    color: T.teal600,   border: `0.5px solid ${T.border}` },
    primary:     { background: T.teal600, color: "#fff" },
    danger:      { background: T.red50,   color: T.red600 },
    warning:     { background: T.amber50, color: T.amber600 },
    green:       { background: T.green50, color: T.green600 },
    purple:      { background: T.purple50,color: T.purple600 },
    dangerSolid: { background: T.red600,  color: "#fff" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
}

function Input({ label, value, onChange, type = "text", placeholder = "", note = "" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, outline: "none", background: T.bg, color: T.text, width: "100%", boxSizing: "border-box" }} />
      {note && <span style={{ fontSize: 11, color: T.textMuted }}>{note}</span>}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 24, height: 24, border: `2.5px solid ${T.teal50}`, borderTop: `2.5px solid ${T.teal600}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Empty({ msg = "No data yet" }) {
  return <div style={{ padding: "32px 18px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>{msg}</div>;
}

function fmtDate(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return v; }
}

function fmtINR(v) {
  return "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CUR_MONTH = MONTHS[new Date().getMonth()] + " " + new Date().getFullYear();

const NAV = [
  { id: "dashboard", icon: "⊞", label: "Dashboard",  section: "Overview"   },
  { id: "gyms",      icon: "🏢", label: "Gyms",       section: "Management" },
  { id: "admins",    icon: "🛡", label: "Gym Admins", section: "Management" },
  { id: "members",   icon: "👥", label: "Members",    section: "Management" },
  { id: "billing",   icon: "💰", label: "Billing",    section: "Platform"   },
];
const SECTIONS = [...new Set(NAV.map(n => n.section))];

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════════════════════════
function SuperAdminLogin({ onLogin }) {
  const [user, setUser] = useState(""); const [pass, setPass] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  async function login() {
    if (!user || !pass) { setError("Both fields required"); return; }
    setLoading(true); setError("");
    try {
      await apiFetch("/alpha/login", { method: "POST", body: JSON.stringify({ username: user, password: pass }) });
      sessionStorage.setItem("af_alpha", "1");
      onLogin();
    } catch { setError("Invalid credentials"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: T.surface, borderRadius: 18, padding: 40, border: `0.5px solid ${T.border}`, width: 360, boxShadow: "0 4px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Aero<span style={{ color: T.teal600 }}>fit</span></div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>Platform Console</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, background: T.purple50, color: T.purple600, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>👑 Super Admin</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <Input label="Username" value={user} onChange={setUser} placeholder="superadmin" />
          <Input label="Password" value={pass} onChange={setPass} type="password" placeholder="••••••••" />
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
          <button onClick={login} disabled={loading} style={{ background: T.teal600, color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: 4, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>
        <div style={{ marginTop: 20, fontSize: 11.5, color: T.textMuted, textAlign: "center", lineHeight: 1.6 }}>
          Default: <code style={{ background: T.bg, padding: "3px 7px", borderRadius: 4 }}>superadmin / aerofit_alpha_2025</code>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CASCADE DELETE CONFIRMATION MODAL
// ══════════════════════════════════════════════════════════════════════════════
function DeleteGymModal({ gym, onDeleted, onClose }) {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/alpha/gyms/${gym.gym_id}/delete-preview`)
      .then(data => setPreview(data))
      .catch(() => setPreview(null))
      .finally(() => setLoadingPreview(false));
  }, [gym.gym_id]);

  const CONFIRM_PHRASE = gym.name;
  const canDelete = confirmText.trim() === CONFIRM_PHRASE && !deleting;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true); setError("");
    try {
      await apiFetch(`/alpha/gyms/${gym.gym_id}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      setError(e.message || "Deletion failed. Please try again.");
      setDeleting(false);
    }
  }

  const statRows = preview ? [
    { icon: "👥", label: "Member accounts",    value: preview.members,       color: preview.members > 0 ? T.red600 : T.textMuted },
    { icon: "🍽️", label: "Meal log entries",   value: preview.meals,         color: T.textMuted },
    { icon: "🪪", label: "User ID codes",      value: preview.user_ids,      color: T.textMuted },
    { icon: "📄", label: "Invoices",            value: preview.invoices,      color: T.textMuted },
    { icon: "🖼️", label: "Banners",            value: preview.banners,       color: T.textMuted },
    { icon: "🔔", label: "Notifications",      value: preview.notifications, color: T.textMuted },
    { icon: "🛡", label: "Gym admin accounts", value: preview.admins,        color: T.textMuted },
  ] : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: T.surface, borderRadius: 18, width: 520, maxWidth: "96vw", border: `1px solid ${T.red200}`, overflow: "hidden", boxShadow: "0 20px 60px rgba(163,45,45,0.18)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `0.5px solid ${T.red200}`, background: T.red50, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: T.red600, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🗑️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.red600 }}>Permanently Delete Gym</div>
            <div style={{ fontSize: 12, color: "#b05a5a", marginTop: 2 }}>{gym.name} · {gym.city}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.red600, opacity: 0.6, flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff5f5", border: `1px solid ${T.red200}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: T.red600, lineHeight: 1.5 }}>
            ⚠️ <strong>This action is irreversible.</strong> All data listed below will be permanently erased from the database. There is no undo.
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Data that will be deleted</div>
            {loadingPreview ? (
              <div style={{ background: T.bg, borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 10, color: T.textMuted, fontSize: 13 }}>
                <div style={{ width: 16, height: 16, border: `2px solid ${T.teal100}`, borderTop: `2px solid ${T.teal600}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Counting records…
              </div>
            ) : preview ? (
              <div style={{ background: T.bg, borderRadius: 10, border: `0.5px solid ${T.borderMid}`, overflow: "hidden" }}>
                {statRows.map((row, i) => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", padding: "9px 14px", borderBottom: i < statRows.length - 1 ? `0.5px solid ${T.border}` : "none" }}>
                    <span style={{ fontSize: 15, marginRight: 10, width: 22, textAlign: "center" }}>{row.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, color: T.textMid }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: row.value > 0 ? row.color : T.textMuted }}>{row.value.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {preview.members > 0 && (
                  <div style={{ background: T.red50, padding: "10px 14px", borderTop: `0.5px solid ${T.red200}`, fontSize: 12, color: T.red600, display: "flex", gap: 8 }}>
                    <span>🚨</span>
                    <span><strong>{preview.members.toLocaleString("en-IN")} member{preview.members !== 1 ? "s" : ""}</strong> will lose access to the app immediately upon deletion.</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: T.bg, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: T.textMuted }}>
                Could not fetch preview. You can still proceed with deletion.
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, color: T.textMid, fontWeight: 500, display: "block", marginBottom: 6 }}>
              Type <strong style={{ color: T.red600, fontFamily: "monospace", background: T.red50, padding: "2px 6px", borderRadius: 4 }}>{CONFIRM_PHRASE}</strong> to confirm deletion
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={`Type "${CONFIRM_PHRASE}" here`}
              autoFocus
              style={{ border: `1.5px solid ${confirmText === CONFIRM_PHRASE ? T.red600 : T.borderMid}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", background: T.bg, color: T.text, outline: "none", transition: "border-color 0.15s" }}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "10px 13px", borderRadius: 8, border: `0.5px solid ${T.red200}` }}>❌ {error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <Btn variant="ghost" onClick={onClose} disabled={deleting}>Cancel</Btn>
            <Btn variant="dangerSolid" onClick={handleDelete} disabled={!canDelete} style={{ padding: "8px 20px", opacity: canDelete ? 1 : 0.4 }}>
              {deleting ? "Deleting everything…" : "Delete Gym & All Data"}
            </Btn>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CREDENTIAL MODAL
// ══════════════════════════════════════════════════════════════════════════════
function CredentialModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(`Gym: ${data.gym_name}\nEmail: ${data.admin_email}\nPassword: ${data.admin_password}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: T.surface, borderRadius: 18, width: 480, maxWidth: "95vw", border: `0.5px solid ${T.border}`, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.16)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `0.5px solid ${T.border}`, background: T.teal50, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.teal600, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✓</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.teal700 }}>Gym & Admin Created</div>
            <div style={{ fontSize: 11.5, color: T.teal600, marginTop: 2 }}>Share these credentials with the gym owner</div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ background: T.amber50, border: `0.5px solid #f0c070`, borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: T.amber600, display: "flex", gap: 8 }}>
            <span>⚠️</span><span>Password shown <strong>only once</strong>. Share immediately.</span>
          </div>
          <div style={{ background: T.bg, borderRadius: 12, padding: "16px 18px", border: `0.5px solid ${T.borderMid}`, display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {[["Gym Name", data.gym_name], ["Admin Email", data.admin_email], ["Password", data.admin_password]].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
                <div style={{ fontSize: 13, fontFamily: "monospace", color: T.teal600, fontWeight: 600, background: T.teal50, padding: "6px 10px", borderRadius: 7, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={copy}>{copied ? "✓ Copied!" : "📋 Copy All"}</Btn>
            <Btn variant="primary" onClick={onClose} style={{ padding: "8px 24px" }}>Done</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ADD GYM MODAL (Simplified - No Pricing)
// ══════════════════════════════════════════════════════════════════════════════
function AddGymModal({ onCreated, onClose }) {
  const [form, setForm] = useState({ name: "", city: "", plan: "Pro", admin_name: "", admin_email: "", admin_password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  function suggestPassword() {
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
    if (slug) set("admin_password")(slug + "@2025");
  }

  async function submit() {
    const { name, city, admin_name, admin_email, admin_password } = form;
    if (!name.trim() || !city.trim() || !admin_name.trim() || !admin_email.trim() || !admin_password.trim()) { setError("All fields are required"); return; }
    if (!admin_email.includes("@")) { setError("Enter a valid email"); return; }
    setLoading(true); setError("");
    try {
      const res = await apiFetch("/alpha/gyms", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), city: city.trim(), plan: form.plan, admin_name: admin_name.trim(), admin_email: admin_email.trim().toLowerCase(), admin_password: admin_password.trim() }),
      });
      onCreated({ gym_name: name.trim(), admin_email: admin_email.trim().toLowerCase(), admin_password: admin_password.trim(), gym_id: res.gym_id });
    } catch (e) {
      setError(e.message?.includes("409") ? "An admin with that email already exists" : (e.message || "Failed to create gym"));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "'DM Sans', system-ui, sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.surface, borderRadius: 18, width: 560, maxWidth: "96vw", border: `0.5px solid ${T.border}`, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.14)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>🏢 Add New Gym</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Creates gym + admin credentials (Admin sets pricing)</div>
          </div>
          <button onClick={onClose} style={{ background: T.bg, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: T.textMuted }}>✕</button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 20, maxHeight: "80vh", overflowY: "auto" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Gym Details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Gym Name *" value={form.name} onChange={set("name")} placeholder="FitZone Gurugram" />
                <Input label="City *" value={form.city} onChange={set("city")} placeholder="Gurugram" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 8 }}>Plan</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Starter", "Pro", "Trial"].map(p => (
                    <button key={p} onClick={() => set("plan")(p)} style={{ flex: 1, padding: "9px 8px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 500, border: form.plan === p ? `1.5px solid ${T.teal600}` : `0.5px solid ${T.borderMid}`, background: form.plan === p ? T.teal50 : T.bg, color: form.plan === p ? T.teal600 : T.textMid }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: "0.5px", background: T.border }} />
          <div>
            <div style={{ background: T.blue50, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: T.blue600, display: "flex", gap: 8, marginBottom: 12 }}>
              <span>ℹ️</span>
              <span><strong>Aerofit charges ₹40 per user per month.</strong> The gym admin will set their own pricing when they set up User IDs.</span>
            </div>
          </div>
          <div style={{ height: "0.5px", background: T.border }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Gym Admin Account</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Admin Name *" value={form.admin_name} onChange={set("admin_name")} placeholder="Rahul Sharma" />
                <Input label="Admin Email *" value={form.admin_email} onChange={set("admin_email")} type="email" placeholder="admin@fitzone.in" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 5 }}>Password *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={form.admin_password} onChange={e => set("admin_password")(e.target.value)} placeholder="Set a strong password"
                    style={{ flex: 1, border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, outline: "none", background: T.bg, color: T.text }} />
                  <Btn variant="ghost" onClick={suggestPassword} style={{ whiteSpace: "nowrap" }}>✨ Generate</Btn>
                </div>
              </div>
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "10px 13px", borderRadius: 8, border: `0.5px solid ${T.red200}` }}>❌ {error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={submit} disabled={loading} style={{ padding: "8px 24px" }}>{loading ? "Creating…" : "Create Gym & Admin"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  INVOICE MODAL
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
//  INVOICE MODAL  (auto-calculated: members × ₹40, editable before sending)
// ══════════════════════════════════════════════════════════════════════════════
const AEROFIT_FEE = 40;

function CreateInvoiceModal({ gyms, onCreated, onClose }) {
  const [gymId, setGymId] = useState("");
  const [period, setPeriod] = useState(CUR_MONTH);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [fetchingMembers, setFetchingMembers] = useState(false);

  // gross is the editable total. autoGross is what we'd compute from members × ₹40.
  // We track whether the admin has manually touched the field so we know whether
  // to send an override to the backend or let it auto-calculate again server-side.
  const [gross, setGross] = useState(0);
  const [grossTouched, setGrossTouched] = useState(false);

  const autoGross = Math.round(AEROFIT_FEE * memberCount * 100) / 100;

  useEffect(() => {
    if (!gymId) { setMemberCount(0); setGross(0); setGrossTouched(false); return; }
    setFetchingMembers(true);
    setGrossTouched(false);
    apiFetch(`/gym/${gymId}/user-ids`)
      .then(ids => {
        const usedCount = (Array.isArray(ids) ? ids : []).filter(u => u.status === "used").length;
        setMemberCount(usedCount);
        setGross(Math.round(AEROFIT_FEE * usedCount * 100) / 100);
      })
      .catch(() => { setMemberCount(0); setGross(0); })
      .finally(() => setFetchingMembers(false));
  }, [gymId]);

  function handleGrossChange(v) {
    setGrossTouched(true);
    setGross(parseFloat(v) || 0);
  }

  async function submit() {
    if (!gymId)            { setError("Select a gym"); return; }
    if (memberCount <= 0)  { setError("No active members in this gym yet"); return; }
    if (!period.trim())    { setError("Enter billing period"); return; }
    if (gross <= 0)        { setError("Invoice amount must be greater than ₹0"); return; }
    setLoading(true); setError("");
    try {
      const body = { gym_id: gymId, period: period.trim(), notes };
      // Only send an override if the super admin actually edited the auto-calculated amount
      if (grossTouched && gross !== autoGross) body.gross_override = gross;
      const res = await apiFetch("/alpha/invoices", { method: "POST", body: JSON.stringify(body) });
      onCreated(res);
    } catch (e) { setError(e.message || "Failed to create invoice"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "'DM Sans', system-ui, sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.surface, borderRadius: 18, width: 500, maxWidth: "96vw", border: `0.5px solid ${T.border}`, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.14)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>📄 Generate Invoice</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Auto-calculated as members × ₹{AEROFIT_FEE} — editable before sending</div>
          </div>
          <button onClick={onClose} style={{ background: T.bg, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: T.textMuted }}>✕</button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 5 }}>Gym *</label>
            <select value={gymId} onChange={e => setGymId(e.target.value)} style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.bg, color: gymId ? T.text : T.textMuted }}>
              <option value="">Select gym…</option>
              {gyms.map(g => <option key={g.gym_id} value={g.gym_id}>{g.name}</option>)}
            </select>
          </div>

          {gymId && (
            <div style={{ background: T.bg, border: `0.5px solid ${T.borderMid}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>👥</span>
              <div>
                <div style={{ fontSize: 12, color: T.textMuted }}>Active members (used User IDs)</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.teal600 }}>
                  {fetchingMembers ? "Counting…" : `${memberCount} member${memberCount !== 1 ? "s" : ""}`}
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 5 }}>Billing Period *</label>
            <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="June 2026"
              style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", boxSizing: "border-box", background: T.bg, color: T.text }} />
          </div>

          {gymId && (
            <div>
              <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 5 }}>
                Invoice Amount (₹) {grossTouched && <span style={{ color: T.amber600 }}>· edited</span>}
              </label>
              <input type="number" value={gross} onChange={e => handleGrossChange(e.target.value)}
                style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 15, fontWeight: 600, width: "100%", boxSizing: "border-box", background: T.bg, color: T.text }} />
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                Auto-calculated: {memberCount} × ₹{AEROFIT_FEE} = ₹{autoGross.toLocaleString("en-IN")}
                {grossTouched && gross !== autoGross && (
                  <button onClick={() => { setGross(autoGross); setGrossTouched(false); }} style={{ marginLeft: 8, background: "none", border: "none", color: T.teal600, cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
                    reset to auto
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 5 }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional info…"
              style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", boxSizing: "border-box", resize: "vertical", background: T.bg, color: T.text }} />
          </div>
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "10px 13px", borderRadius: 8 }}>❌ {error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={submit} disabled={loading || memberCount === 0} style={{ padding: "8px 24px" }}>{loading ? "Creating…" : "Create Invoice"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
//  SEND ALERT MODAL
// ══════════════════════════════════════════════════════════════════════════════
function SendAlertModal({ invoice, onSent, onClose }) {
  const [alertType, setAlertType] = useState("payment_reminder");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const TEMPLATES = {
    payment_reminder: `Hi ${invoice.gym_name},\n\nThis is a friendly reminder that invoice ${invoice.invoice_number} for ${invoice.period} (₹${invoice.gross?.toLocaleString("en-IN")}) is due. Please arrange payment at your earliest convenience.\n\nThank you,\nAerofit Team`,
    overdue: `Hi ${invoice.gym_name},\n\nYour invoice ${invoice.invoice_number} for ${invoice.period} (₹${invoice.gross?.toLocaleString("en-IN")}) is OVERDUE. Please settle immediately to avoid service disruption.\n\nAerofit Team`,
    receipt: `Hi ${invoice.gym_name},\n\nWe have received your payment for invoice ${invoice.invoice_number} (${invoice.period}). Thank you!\n\nAerofit Team`,
  };

  function applyTemplate(type) { setAlertType(type); setMessage(TEMPLATES[type]); }
  useEffect(() => { applyTemplate("payment_reminder"); }, []);

  async function send() {
    if (!message.trim()) { setError("Message is required"); return; }
    setLoading(true); setError("");
    try {
      await apiFetch(`/alpha/invoices/${invoice.invoice_id}/alert`, {
        method: "POST",
        body: JSON.stringify({ gym_id: invoice.gym_id, message: message.trim(), alert_type: alertType }),
      });
      onSent();
    } catch (e) { setError(e.message || "Failed to send"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "'DM Sans', system-ui, sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.surface, borderRadius: 18, width: 520, maxWidth: "96vw", border: `0.5px solid ${T.border}`, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.14)" }}>
        <div style={{ padding: "18px 22px", borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>📣 Send Invoice Alert</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{invoice.invoice_number} · {invoice.gym_name}</div>
          </div>
          <button onClick={onClose} style={{ background: T.bg, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: T.textMuted }}>✕</button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 8 }}>Alert Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[["payment_reminder", "💳 Reminder"], ["overdue", "🚨 Overdue"], ["receipt", "✅ Receipt"]].map(([v, l]) => (
                <button key={v} onClick={() => applyTemplate(v)} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500, border: alertType === v ? `1.5px solid ${T.teal600}` : `0.5px solid ${T.borderMid}`, background: alertType === v ? T.teal50 : T.bg, color: alertType === v ? T.teal600 : T.textMid }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 5 }}>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
              style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", resize: "vertical", background: T.bg, color: T.text, lineHeight: 1.6 }} />
          </div>
          <div style={{ background: T.blue50, borderRadius: 9, padding: "10px 14px", fontSize: 12, color: T.blue600 }}>
            ℹ️ This will appear as a <strong>billing notification</strong> in the gym admin's dashboard.
          </div>
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "10px 13px", borderRadius: 8 }}>❌ {error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={send} disabled={loading} style={{ padding: "8px 24px" }}>{loading ? "Sending…" : "Send Alert"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  BILLING TAB
// ══════════════════════════════════════════════════════════════════════════════
function BillingTab({ gyms, stats, onRefresh }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [alertInv, setAlertInv] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const AEROFIT_FEE_PER_USER = 40;

  async function loadInvoices() {
    setLoading(true);
    try {
      const data = await apiFetch("/alpha/invoices");
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadInvoices(); }, []);

  async function markStatus(inv, status) {
    setUpdating(inv.invoice_id);
    try {
      const body = { status };
      if (status === "paid") body.paid_at = new Date().toISOString();
      await apiFetch(`/alpha/invoices/${inv.invoice_id}/status`, { method: "PATCH", body: JSON.stringify(body) });
      await loadInvoices();
      onRefresh();
      setSuccessMsg(`Invoice ${inv.invoice_number} marked as ${status}`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  }

  async function deleteInv(inv) {
    if (!confirm(`Delete invoice ${inv.invoice_number}?`)) return;
    try { await apiFetch(`/alpha/invoices/${inv.invoice_id}`, { method: "DELETE" }); await loadInvoices(); }
    catch (e) { alert(e.message); }
  }

  const filtered      = invoices.filter(i => statusFilter === "all" || i.status === statusFilter);
  const totalGross    = invoices.reduce((a, i) => a + (i.gross || 0), 0);
  const totalAerofit  = invoices.filter(i => i.status === "paid").reduce((a, i) => a + (AEROFIT_FEE_PER_USER * (i.member_count || 0)), 0);
  const totalPending  = invoices.filter(i => i.status === "pending").reduce((a, i) => a + (i.gross || 0), 0);
  const totalOverdue  = invoices.filter(i => i.status === "overdue").reduce((a, i) => a + (i.gross || 0), 0);

  return (
    <div>
      {showCreate && <CreateInvoiceModal gyms={gyms} onCreated={() => { setShowCreate(false); loadInvoices(); onRefresh(); setSuccessMsg("Invoice created!"); setTimeout(() => setSuccessMsg(""), 3000); }} onClose={() => setShowCreate(false)} />}
      {alertInv  && <SendAlertModal invoice={alertInv} onSent={() => { setAlertInv(null); setSuccessMsg("Alert sent to gym admin!"); setTimeout(() => setSuccessMsg(""), 3000); }} onClose={() => setAlertInv(null)} />}
      {successMsg && (
        <div style={{ background: T.green50, border: `0.5px solid ${T.teal100}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: T.green600, display: "flex", alignItems: "center", gap: 8 }}>
          ✅ {successMsg}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Aerofit Earned",  value: fmtINR(totalAerofit), sub: "from paid invoices (₹40 per user)", bg: T.purple50, color: T.purple600, icon: "👑" },
          { label: "Pending",         value: fmtINR(totalPending),  sub: `${invoices.filter(i=>i.status==="pending").length} invoices`, bg: T.amber50,  color: T.amber600,  icon: "⏳" },
          { label: "Overdue",         value: fmtINR(totalOverdue),  sub: `${invoices.filter(i=>i.status==="overdue").length} invoices`, bg: T.red50,    color: T.red600,    icon: "🚨" },
          { label: "Total Invoiced",  value: fmtINR(totalGross),    sub: `${invoices.length} total`,          bg: T.blue50,   color: T.blue600,   icon: "📄" },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "16px 16px 14px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, marginTop: 4, color: T.textMuted }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "pending", "paid", "overdue", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500, border: statusFilter === s ? `1.5px solid ${T.teal600}` : `0.5px solid ${T.borderMid}`, background: statusFilter === s ? T.teal50 : T.surface, color: statusFilter === s ? T.teal600 : T.textMid, textTransform: "capitalize" }}>{s}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={loadInvoices}>🔄 Refresh</Btn>
          <Btn variant="primary" onClick={() => setShowCreate(true)}>📄 Generate Invoice</Btn>
        </div>
      </div>
      <Card>
        <CardHeader title={`Invoices (${filtered.length})`} icon="📄" />
        {loading ? <Spinner /> : filtered.length === 0 ? <Empty msg="No invoices yet. Generate one above." /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Invoice #", "Gym", "Period", "Members", "Total", "Aerofit Fee", "Status", "Due", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted, padding: "8px 12px", borderBottom: `0.5px solid ${T.border}`, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const aerofitAmount = AEROFIT_FEE_PER_USER * (inv.member_count || 0);
                  return (
                    <tr key={inv.invoice_id} style={{ borderBottom: `0.5px solid ${T.border}` }}>
                      <td style={{ padding: "10px 12px" }}><span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: T.teal600, background: T.teal50, padding: "4px 8px", borderRadius: 6 }}>{inv.invoice_number}</span></td>
                      <td style={{ padding: "10px 12px", fontWeight: 500, color: T.text, whiteSpace: "nowrap" }}>{inv.gym_name}</td>
                      <td style={{ padding: "10px 12px", color: T.textMuted, whiteSpace: "nowrap" }}>{inv.period}</td>
                      <td style={{ padding: "10px 12px", color: T.text }}>{inv.member_count}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: T.text }}>{fmtINR(inv.gross)}</td>
                      <td style={{ padding: "10px 12px", color: T.purple600, fontWeight: 500 }}>{fmtINR(aerofitAmount)}</td>
                      <td style={{ padding: "10px 12px" }}><Badge label={inv.status} /></td>
                      <td style={{ padding: "10px 12px", color: inv.status === "overdue" ? T.red600 : T.textMuted, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(inv.due_at)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 5, flexWrap: "nowrap" }}>
                          {inv.status === "pending" && <>
                            <Btn variant="green"   onClick={() => markStatus(inv, "paid")}    disabled={updating === inv.invoice_id} style={{ fontSize: 11, padding: "4px 8px" }}>✓ Paid</Btn>
                            <Btn variant="warning" onClick={() => markStatus(inv, "overdue")} disabled={updating === inv.invoice_id} style={{ fontSize: 11, padding: "4px 8px" }}>Overdue</Btn>
                          </>}
                          {inv.status === "overdue" && (
                            <Btn variant="green" onClick={() => markStatus(inv, "paid")} disabled={updating === inv.invoice_id} style={{ fontSize: 11, padding: "4px 8px" }}>✓ Paid</Btn>
                          )}
                          <Btn variant="ghost"  onClick={() => setAlertInv(inv)} style={{ fontSize: 11, padding: "4px 8px" }}>📣 Alert</Btn>
                          <Btn variant="danger" onClick={() => deleteInv(inv)}   style={{ fontSize: 11, padding: "4px 8px" }}>Del</Btn>
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
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD TAB
// ══════════════════════════════════════════════════════════════════════════════
function DashboardTab({ stats, gyms, onAddGym }) {
  if (!stats) return <Spinner />;
  const AEROFIT_FEE = 40;
  const aerofitEarnings = stats.total_members * AEROFIT_FEE; // Potential earnings from all members
  const statCards = [
    { label: "Total Gyms",           value: stats.total_gyms,           sub: `${stats.active_gyms} active`,                   bg: T.teal50,   icon: "🏢" },
    { label: "Total Members",        value: stats.total_members,        sub: "across all gyms",                              bg: T.blue50,   icon: "👥" },
    { label: "Aerofit Earnings",     value: fmtINR(aerofitEarnings),   sub: "₹40 per member per month",                     bg: T.purple50, icon: "👑" },
    { label: "Outstanding Amount",   value: fmtINR(stats.pending_amount || 0), sub: `${(stats.pending_invoices||0)+(stats.overdue_invoices||0)} invoices`, bg: T.amber50,  icon: "⏳" },
  ];
  const top5 = [...gyms].sort((a, b) => (b.members || 0) - (a.members || 0)).slice(0, 5);
  const maxM  = top5[0]?.members || 1;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 22 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "16px 16px 14px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: T.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, marginTop: 5, color: T.textMuted }}>{s.sub}</div>
          </div>
        ))}
      </div>
      {stats.overdue_invoices > 0 && (
        <div style={{ background: T.red50, border: `0.5px solid ${T.red200}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.red600 }}>
          🚨 <strong>{stats.overdue_invoices} overdue invoice{stats.overdue_invoices > 1 ? "s" : ""}</strong> — send payment reminders from the Billing tab.
        </div>
      )}
      {stats.trial_gyms > 0 && (
        <div style={{ background: T.amber50, border: `0.5px solid #f0c070`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.amber600 }}>
          ⚠️ <strong>{stats.trial_gyms} gym{stats.trial_gyms > 1 ? "s" : ""}</strong> on trial — convert to paid plan.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <CardHeader title="Top Gyms by Members" icon="🏆" />
          <div style={{ padding: "14px 16px" }}>
            {top5.length === 0 ? <Empty msg="No gyms yet" /> : top5.map((g, i) => (
              <div key={g.gym_id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: T.textMuted, width: 16, textAlign: "center", fontWeight: 600 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{g.name}</div>
                  <div style={{ height: 6, background: T.gray50, borderRadius: 3, marginTop: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(g.members || 0) / maxM * 100}%`, background: T.teal600, borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.teal600 }}>{g.members || 0}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recently Added" icon="🏢" action={<Btn variant="primary" onClick={onAddGym} style={{ fontSize: 12, padding: "5px 12px" }}>+ Add Gym</Btn>} />
          <div>
            {gyms.slice(0, 5).length === 0 ? <Empty msg="No gyms yet" /> : gyms.slice(0, 5).map((g, i) => (
              <div key={g.gym_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < 4 ? `0.5px solid ${T.border}` : "none" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: [T.teal50, T.purple50, T.blue50, T.amber50, T.coral50][i % 5], color: [T.teal600, T.purple600, T.blue600, T.amber600, T.coral600][i % 5], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{g.name?.[0] || "?"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{g.city} · {g.members || 0} members</div>
                </div>
                <Badge label={g.plan} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  GYMS TAB (Simplified - No Pricing Edit)
// ══════════════════════════════════════════════════════════════════════════════
function GymsTab({ gyms, onRefresh }) {
  const [showAdd, setShowAdd]           = useState(false);
  const [credential, setCredential]     = useState(null);
  const [search, setSearch]             = useState("");
  const [planFilter, setPlanFilter]     = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [successMsg, setSuccessMsg]     = useState("");

  function handleCreated(cred) { setShowAdd(false); setCredential(cred); onRefresh(); }

  const filtered = gyms.filter(g => {
    const q = search.toLowerCase();
    return (!q || g.name?.toLowerCase().includes(q) || g.city?.toLowerCase().includes(q) || g.admin_email?.toLowerCase().includes(q)) && (planFilter === "all" || g.plan === planFilter);
  });

  return (
    <div>
      {showAdd && <AddGymModal onCreated={handleCreated} onClose={() => setShowAdd(false)} />}
      {credential && <CredentialModal data={credential} onClose={() => setCredential(null)} />}
      {deleteTarget && (
        <DeleteGymModal
          gym={deleteTarget}
          onDeleted={() => {
            setDeleteTarget(null); onRefresh();
            setSuccessMsg(`"${deleteTarget.name}" and all its data have been permanently deleted.`);
            setTimeout(() => setSuccessMsg(""), 5000);
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {successMsg && (
        <div style={{ background: T.green50, border: `0.5px solid ${T.teal100}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: T.green600, display: "flex", alignItems: "center", gap: 8 }}>
          ✅ {successMsg}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.textMuted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gyms…"
            style={{ width: "100%", boxSizing: "border-box", border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 10px 8px 30px", fontSize: 13, background: T.surface, color: T.text, outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "Pro", "Starter", "Trial"].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)} style={{ padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 500, border: planFilter === p ? `1.5px solid ${T.teal600}` : `0.5px solid ${T.borderMid}`, background: planFilter === p ? T.teal50 : T.surface, color: planFilter === p ? T.teal600 : T.textMid }}>{p === "all" ? "All Plans" : p}</button>
          ))}
        </div>
        <Btn variant="primary" onClick={() => setShowAdd(true)} style={{ marginLeft: "auto" }}>🏢 Add Gym</Btn>
      </div>
      <Card>
        <CardHeader title={`Gyms (${filtered.length})`} icon="🏢" />
        {filtered.length === 0 ? <Empty msg={search ? `No gyms matching "${search}"` : "No gyms yet"} /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Gym", "City", "Plan", "Status", "Members", "Admin Email", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textTransform: "uppercase" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((g, i) => (
                  <tr key={g.gym_id} style={{ borderBottom: `0.5px solid ${T.border}` }}>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: [T.teal50, T.purple50, T.blue50, T.amber50, T.coral50][i % 5], color: [T.teal600, T.purple600, T.blue600, T.amber600, T.coral600][i % 5], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{g.name?.[0] || "?"}</div>
                        <span style={{ fontWeight: 500, color: T.text }}>{g.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", color: T.textMuted }}>{g.city}</td>
                    <td style={{ padding: "11px 14px" }}><Badge label={g.plan} /></td>
                    <td style={{ padding: "11px 14px" }}><Badge label={g.status === "active" ? "Active" : "Trial"} /></td>
                    <td style={{ padding: "11px 14px", fontWeight: 500 }}>{g.members || 0}</td>
                    <td style={{ padding: "11px 14px", color: T.textMuted, fontSize: 12 }}>{g.admin_email}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <Btn variant="danger" onClick={() => setDeleteTarget(g)} style={{ fontSize: 11.5, padding: "4px 10px" }}>🗑️ Delete</Btn>
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
//  ADMINS TAB
// ══════════════════════════════════════════════════════════════════════════════
function AdminsTab({ admins, onRefresh }) {
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  async function deleteAdmin(adm) {
    if (!confirm(`Remove admin "${adm.name}"?`)) return;
    setDeleting(adm.admin_id);
    try { await apiFetch(`/alpha/admins/${adm.admin_id}`, { method: "DELETE" }); onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  }

  const filtered = admins.filter(a => {
    const q = search.toLowerCase();
    return !q || a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.gym_name?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.textMuted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search admins…"
            style={{ width: "100%", boxSizing: "border-box", border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 10px 8px 30px", fontSize: 13, background: T.surface, color: T.text, outline: "none" }} />
        </div>
        <span style={{ fontSize: 12, color: T.textMuted, marginLeft: "auto" }}>{filtered.length} admin{filtered.length !== 1 ? "s" : ""}</span>
      </div>
      <Card>
        <CardHeader title="Gym Admins" icon="🛡" />
        {filtered.length === 0 ? <Empty msg={search ? `No admins matching "${search}"` : "No gym admins yet"} /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Admin", "Email", "Gym", "Status", ""].map(h => <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.admin_id} style={{ borderBottom: `0.5px solid ${T.border}` }}>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.teal50, color: T.teal600, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{a.name?.[0]?.toUpperCase() || "?"}</div>
                        <span style={{ fontWeight: 500, color: T.text }}>{a.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", color: T.textMuted }}>{a.email}</td>
                    <td style={{ padding: "11px 14px", color: T.text }}>{a.gym_name}</td>
                    <td style={{ padding: "11px 14px" }}><Badge label={a.status === "active" ? "Active" : "Inactive"} /></td>
                    <td style={{ padding: "11px 14px" }}><Btn variant="danger" disabled={deleting === a.admin_id} onClick={() => deleteAdmin(a)} style={{ fontSize: 11.5, padding: "4px 10px" }}>{deleting === a.admin_id ? "…" : "Delete"}</Btn></td>
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
//  MEMBERS TAB
// ══════════════════════════════════════════════════════════════════════════════
function MembersTab() {
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await apiFetch("/alpha/members");
      setMembers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadMembers(); }, []);

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.gym_name?.toLowerCase().includes(q);
    const matchType =
      typeFilter === "all"     ? true :
      typeFilter === "gym"     ? m.member_type === "gym" :
      typeFilter === "indie"   ? m.member_type === "indie" :
      typeFilter === "expired" ? m.membership_expired :
      true;
    return matchSearch && matchType;
  });

  const totalMembers = members.length;
  const gymMembers   = members.filter(m => m.member_type === "gym").length;
  const indieMembers = members.filter(m => m.member_type === "indie").length;
  const expiredCount = members.filter(m => m.membership_expired).length;

  function exportCsv() {
    const headers = ["Name", "Email", "Type", "Gym", "Plan", "BMI", "Status", "Joined", "Expires"];
    const rows = filtered.map(m => [
      m.name,
      m.email,
      m.member_type === "indie" ? "Indie" : "Gym",
      m.gym_name || "—",
      m.plan_label,
      m.bmi ?? "—",
      m.membership_expired ? "Expired" : "Active",
      fmtDate(m.created_at),
      fmtDate(m.expires_at),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "aerofit_members.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const AVATAR_COLORS = [
    { bg: T.teal50,   color: T.teal600   },
    { bg: T.purple50, color: T.purple600 },
    { bg: T.blue50,   color: T.blue600   },
    { bg: T.amber50,  color: T.amber600  },
    { bg: T.coral50,  color: T.coral600  },
  ];

  function bmiColor(bmi) {
    if (bmi == null) return T.textMuted;
    if (bmi < 18.5)  return T.blue600;
    if (bmi < 25)    return T.teal600;
    if (bmi < 30)    return T.amber600;
    return T.red600;
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Members", value: totalMembers, sub: "all platforms",    bg: T.teal50,   color: T.teal600,   icon: "👥" },
          { label: "Gym Members",   value: gymMembers,   sub: "via gym User IDs", bg: T.purple50, color: T.purple600, icon: "🏢" },
          { label: "Indie Members", value: indieMembers, sub: "via Razorpay",     bg: T.blue50,   color: T.blue600,   icon: "👤" },
          { label: "Expired",       value: expiredCount, sub: "need renewal",     bg: T.red50,    color: T.red600,    icon: "⚠️" },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "16px 16px 14px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, marginTop: 4, color: T.textMuted }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 340 }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.textMuted }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or gym…"
            style={{ width: "100%", boxSizing: "border-box", border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 10px 8px 30px", fontSize: 13, background: T.surface, color: T.text, outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "all",     label: "All"         },
            { key: "gym",     label: "🏢 Gym"      },
            { key: "indie",   label: "👤 Indie"    },
            { key: "expired", label: "⚠️ Expired"  },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              style={{ padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 500, border: typeFilter === f.key ? `1.5px solid ${T.teal600}` : `0.5px solid ${T.borderMid}`, background: typeFilter === f.key ? T.teal50 : T.surface, color: typeFilter === f.key ? T.teal600 : T.textMid }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Btn variant="ghost"  onClick={loadMembers}>🔄 Refresh</Btn>
          <Btn variant="green"  onClick={exportCsv} style={{ gap: 5 }}>⬇ Export CSV</Btn>
        </div>
      </div>

      <Card>
        <CardHeader title={`Members (${filtered.length})`} icon="👥" />
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <Empty msg={search || typeFilter !== "all" ? "No members match your filters" : "No members yet"} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Member", "Type", "Gym", "Plan", "BMI", "Status", "Joined", "Expires"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const av      = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const init    = (m.name || m.email || "?")[0].toUpperCase();
                  const expired = m.membership_expired;

                  return (
                    <tr key={m.email} style={{ borderBottom: `0.5px solid ${T.border}` }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: av.bg, color: av.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{init}</div>
                          <div>
                            <div style={{ fontWeight: 500, color: T.text, fontSize: 13 }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: T.textMuted }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {m.member_type === "indie" ? (
                          <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 500, background: T.purple50, color: T.purple600, whiteSpace: "nowrap" }}>👤 Indie</span>
                        ) : (
                          <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 500, background: T.teal50, color: T.teal600, whiteSpace: "nowrap" }}>🏢 Gym</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", color: m.gym_name ? T.textMid : T.textMuted, fontSize: 12, fontStyle: m.gym_name ? "normal" : "italic" }}>
                        {m.gym_name || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: T.textMid, fontSize: 12 }}>{m.plan_label}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12 }}>
                        {m.bmi != null
                          ? <span style={{ fontWeight: 600, color: bmiColor(m.bmi) }}>{m.bmi}</span>
                          : <span style={{ color: T.textMuted }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Badge label={expired ? "expired" : "active"} />
                      </td>
                      <td style={{ padding: "10px 14px", color: T.textMuted, fontSize: 12, whiteSpace: "nowrap" }}>
                        {fmtDate(m.created_at)}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, whiteSpace: "nowrap", color: expired ? T.red600 : T.textMuted, fontWeight: expired ? 600 : 400 }}>
                        {fmtDate(m.expires_at) || "—"}
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

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function SuperAdminDashboard() {
  const [authed, setAuthed]   = useState(!!sessionStorage.getItem("af_alpha"));
  const [active, setActive]   = useState("dashboard");
  const [gyms, setGyms]       = useState([]);
  const [admins, setAdmins]   = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [g, a, s] = await Promise.all([
        apiFetch("/alpha/gyms").catch(() => []),
        apiFetch("/alpha/admins").catch(() => []),
        apiFetch("/alpha/stats").catch(() => null),
      ]);
      setGyms(Array.isArray(g) ? g : []);
      setAdmins(Array.isArray(a) ? a : []);
      setStats(s);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (authed) loadAll(); }, [authed]);
  if (!authed) return <SuperAdminLogin onLogin={() => setAuthed(true)} />;

  const currentLabel = NAV.find(n => n.id === active)?.label || "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", background: T.bg }}>
      <aside style={{ width: 224, minWidth: 224, background: T.surface, borderRight: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.4px", color: T.text }}>Aero<span style={{ color: T.teal600 }}>fit</span></div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Platform Console</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 7, background: T.purple50, color: T.purple600, fontSize: 10.5, fontWeight: 600, padding: "2px 9px", borderRadius: 20 }}>👑 Super Admin</div>
        </div>
        <nav style={{ padding: "8px 10px", flex: 1, overflowY: "auto" }}>
          {SECTIONS.map(section => (
            <div key={section}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: T.gray200, letterSpacing: "0.06em", textTransform: "uppercase", padding: "10px 8px 4px" }}>{section}</div>
              {NAV.filter(n => n.section === section).map(item => {
                const sel = active === item.id;
                return (
                  <button key={item.id} onClick={() => setActive(item.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13.5, width: "100%", textAlign: "left", border: "none", background: sel ? T.teal50 : "transparent", color: sel ? T.teal600 : T.textMid, fontWeight: sel ? 500 : 400 }}>
                    <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div style={{ padding: 10, borderTop: `0.5px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.purple50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.purple600 }}>SA</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Super Admin</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>alpha@aerofit.app</div>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ background: T.surface, borderBottom: `0.5px solid ${T.border}`, padding: "0 24px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>{currentLabel}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={loadAll} style={{ width: 34, height: 34, borderRadius: 8, border: `0.5px solid ${T.border}`, background: "none", cursor: "pointer", fontSize: 15 }} title="Refresh">🔄</button>
            <button onClick={() => { sessionStorage.removeItem("af_alpha"); setAuthed(false); }} style={{ height: 34, borderRadius: 8, border: `0.5px solid ${T.border}`, background: "none", cursor: "pointer", fontSize: 12, color: T.textMuted, padding: "0 12px" }}>Sign out</button>
          </div>
        </div>
        <div style={{ padding: 24, maxWidth: 1200 }}>
          {loading ? <Spinner /> : (
            <>
              {active === "dashboard" && <DashboardTab stats={stats} gyms={gyms} onAddGym={() => setActive("gyms")} />}
              {active === "gyms"      && <GymsTab gyms={gyms} onRefresh={loadAll} />}
              {active === "admins"    && <AdminsTab admins={admins} onRefresh={loadAll} />}
              {active === "members"   && <MembersTab />}
              {active === "billing"   && <BillingTab gyms={gyms} stats={stats} onRefresh={loadAll} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}