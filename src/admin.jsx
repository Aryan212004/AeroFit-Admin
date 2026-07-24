import { useState, useEffect, useRef, Fragment } from "react";

const API = "https://aero-fit-backend.onrender.com";

async function apiFetch(path, opts = {}) {
  const url = `${API}${path}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...opts,
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.detail) detail = body.detail;
        } catch (_) {}
        throw new Error(detail);
      }
      return res.json();
    } catch (e) {
      if (attempt === 0) { await new Promise(r => setTimeout(r, 4000)); continue; }
      throw e;
    }
  }
}

// ── Razorpay checkout script loader ───────────────────────────────────────────
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

// ── 24h "HH:MM" (native <input type="time"> value) → 12h "h:mm AM/PM" ────────
function to12Hour(t) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

// Locked is the safe default: a member is only ever treated as unlocked when
// the backend explicitly says workout_plans_locked === false. Brand-new
// members (freshly redeemed a User ID, no field written yet) fall through to
// locked=true here, so nobody gets accidental access before an admin assigns
// a trainer and flips them on.
function isWorkoutLocked(m) {
  return m?.workout_plans_locked !== false;
}

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
    Locked:    { bg: T.red50,    color: T.red600    },
    Unlocked:  { bg: T.teal50,   color: T.teal600   },
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
  { id: "workout_access", icon: "🔒", label: "Workout Access", section: "Members" },
  { id: "batches",       icon: "📅", label: "Batches",       section: "Members"   },
  { id: "billing",       icon: "💰", label: "Billing",       section: "Finance"   },
  { id: "banners",       icon: "🖼",  label: "Banners",       section: "Content"   },
  { id: "trainers", icon: "🏋️", label: "Trainers", section: "Members" },
  { id: "notifications", icon: "🔔", label: "Notifications", section: "Content"   },
  { id: "config",        icon: "⚙",  label: "App Config",    section: "Settings"  },
];
const SECTIONS = [...new Set(NAV.map(n => n.section))];

// ── Forgot / reset password flow — used inside the AdminLogin card ───────────
// Mirrors the backend's gym-admin reset endpoints exactly:
//   POST /gym-admin/forgot-password   { email }                → generic "ok" response
//   POST /gym-admin/verify-otp        { email, otp }            → { reset_token }
//   POST /gym-admin/reset-password    { email, reset_token, new_password }
function ForgotPasswordPanel({ initialEmail, onDone, onBackToLogin }) {
  const [step, setStep]         = useState("email"); // "email" | "otp" | "reset" | "success"
  const [email, setEmail]       = useState(initialEmail || "");
  const [otp, setOtp]           = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPass, setNewPass]   = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [info, setInfo]         = useState("");

  async function sendOtp() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Enter your email first"); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      await apiFetch("/gym-admin/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      });
      setEmail(trimmed);
      setStep("otp");
      setInfo("If an admin account exists for this email, we've sent a 6-digit code.");
    } catch (e) {
      setError(e.message || "Could not send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) { setError("Enter the code from your email"); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      const res = await apiFetch("/gym-admin/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp: otp.trim() }),
      });
      setResetToken(res.reset_token);
      setStep("reset");
    } catch (e) {
      setError(e.message || "Incorrect or expired code.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (newPass.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPass !== confirmPass) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    try {
      await apiFetch("/gym-admin/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, reset_token: resetToken, new_password: newPass }),
      });
      setStep("success");
    } catch (e) {
      setError(e.message || "Could not reset your password. Please start over.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: T.text }}>Aero<span style={{ color: T.teal600 }}>fit</span></div>
        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
          {step === "success" ? "Password reset" : "Reset your password"}
        </div>
      </div>

      {step === "email" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}>
            Enter the email you use to sign in. We'll send a 6-digit code to reset your password.
          </div>
          <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="admin@fitzone.in" />
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
          <button onClick={sendOtp} disabled={loading} style={{ background: T.teal600, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Sending…" : "Send Code"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}>
            Enter the 6-digit code sent to <strong style={{ color: T.text }}>{email}</strong>.
          </div>
          <Input label="Code" value={otp} onChange={v => setOtp(v.replace(/\D/g, "").slice(0, 6))} type="text" placeholder="123456" />
          {info && <div style={{ fontSize: 12, color: T.teal600, background: T.teal50, padding: "8px 12px", borderRadius: 8 }}>{info}</div>}
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
          <button onClick={verifyOtp} disabled={loading} style={{ background: T.teal600, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Verifying…" : "Verify Code"}
          </button>
          <button onClick={sendOtp} disabled={loading} style={{ background: "none", border: "none", color: T.textMuted, fontSize: 12, cursor: loading ? "not-allowed" : "pointer", textDecoration: "underline", alignSelf: "center" }}>
            Resend code
          </button>
        </div>
      )}

      {step === "reset" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}>
            Choose a new password for <strong style={{ color: T.text }}>{email}</strong>.
          </div>
          <Input label="New password" value={newPass} onChange={setNewPass} type="password" placeholder="At least 6 characters" />
          <Input label="Confirm new password" value={confirmPass} onChange={setConfirmPass} type="password" placeholder="Re-enter password" />
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
          <button onClick={resetPassword} disabled={loading} style={{ background: T.teal600, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </div>
      )}

      {step === "success" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: T.teal50, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <div style={{ fontSize: 13, color: T.teal700, lineHeight: 1.5 }}>
              Your password has been reset. You can now sign in with your new password.
            </div>
          </div>
          <button onClick={onDone} style={{ background: T.teal600, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            Back to Sign In
          </button>
        </div>
      )}

      {step !== "success" && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button onClick={onBackToLogin} style={{ background: "none", border: "none", color: T.textMuted, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
            ← Back to sign in
          </button>
        </div>
      )}
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [mode, setMode]   = useState("login"); // "login" | "forgot"
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
        {mode === "login" ? (
          <>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: T.text }}>Aero<span style={{ color: T.teal600 }}>fit</span></div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>Gym Admin Console</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="admin@fitzone.in" />
              <div>
                <Input label="Password" value={pass} onChange={setPass} type="password" placeholder="••••••••" />
                <button
                  onClick={() => { setError(""); setMode("forgot"); }}
                  style={{ background: "none", border: "none", color: T.teal600, fontSize: 11.5, cursor: "pointer", marginTop: 6, padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
              <button onClick={login} disabled={loading} style={{ background: T.teal600, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </div>
            <div style={{ marginTop: 16, fontSize: 11.5, color: T.textMuted, textAlign: "center" }}>
              Credentials provided by your Aerofit super admin.
            </div>
          </>
        ) : (
          <ForgotPasswordPanel
            initialEmail={email}
            onDone={() => setMode("login")}
            onBackToLogin={() => setMode("login")}
          />
        )}
      </div>
    </div>
  );
}

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

function TrainersTab({ gymId }) {
  const [trainers, setTrainers]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null); // trainer object being edited, or null = "add" mode
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [toast, setToast]           = useState(null);
  const [error, setError]           = useState("");

  const emptyForm = { name: "", specialty: "", experience_years: 1, certifications: "" };
  const [form, setForm] = useState(emptyForm);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function loadTrainers() {
    setLoading(true);
    try {
      const data = await apiFetch(`/gym/${gymId}/trainers`);
      setTrainers(Array.isArray(data) ? data : []);
    } catch { setTrainers([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTrainers(); }, [gymId]);

  function openAddForm() {
    setEditingTrainer(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEditForm(trainer) {
    setEditingTrainer(trainer);
    setForm({
      name: trainer.name || "",
      specialty: trainer.specialty || "",
      experience_years: trainer.experience_years ?? 1,
      certifications: (trainer.certifications || []).join(", "),
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTrainer(null);
    setForm(emptyForm);
    setError("");
  }

  async function submit() {
    if (!form.name.trim() || !form.specialty.trim()) {
      setError("Name and specialty are required.");
      return;
    }
    setSubmitting(true); setError("");
    const payload = {
      name: form.name.trim(),
      specialty: form.specialty.trim(),
      experience_years: Number(form.experience_years) || 0,
      certifications: form.certifications.split(",").map(c => c.trim()).filter(Boolean),
    };
    try {
      if (editingTrainer) {
        await apiFetch(`/gym/${gymId}/trainers/${editingTrainer.trainer_id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setToast({ message: "Trainer updated", type: "success" });
      } else {
        await apiFetch(`/gym/${gymId}/trainers`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToast({ message: "Trainer added", type: "success" });
      }
      closeForm();
      await loadTrainers();
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  function askDelete(trainer) { setConfirm({ id: trainer.trainer_id, title: trainer.name }); }

  async function confirmDelete() {
    const { id, title } = confirm;
    setConfirm(null);
    setDeletingId(id);
    setTrainers(prev => prev.filter(t => t.trainer_id !== id));
    try {
      await apiFetch(`/gym/${gymId}/trainers/${id}`, { method: "DELETE" });
      setToast({ message: `"${title}" removed`, type: "success" });
    } catch (e) {
      await loadTrainers();
      setToast({ message: `Delete failed: ${e.message}`, type: "error" });
    } finally { setDeletingId(null); }
  }

  return (
    <div>
      {confirm && (
        <ConfirmDialog
          message={`Remove trainer "${confirm.title}"? This will remove them from the app immediately.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn variant="primary" onClick={() => (showForm ? closeForm() : openAddForm())}>
          {showForm ? "✕ Cancel" : "+ Add Trainer"}
        </Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <CardHeader title={editingTrainer ? "Edit Trainer" : "Add Trainer"} icon="🏋️" />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Name *" value={form.name} onChange={set("name")} placeholder="Rohan Verma" />
              <Input label="Specialty *" value={form.specialty} onChange={set("specialty")} placeholder="Strength & Powerlifting" />
            </div>
            <Input label="Experience (years)" value={form.experience_years} onChange={set("experience_years")} type="number" />
            <Input label="Certifications (comma separated)" value={form.certifications} onChange={set("certifications")} placeholder="ACE-CPT, Sports Nutrition" />
            {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <Btn variant="primary" onClick={submit} disabled={submitting} style={{ alignSelf: "flex-end", padding: "8px 20px" }}>
              {submitting ? "Saving…" : editingTrainer ? "Save Changes" : "Add Trainer"}
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={`Trainers (${trainers.length})`} icon="🏋️"
          action={<Btn variant="ghost" onClick={loadTrainers} style={{ fontSize: 11, padding: "4px 10px" }}>🔄 Refresh</Btn>}
        />
        {loading ? <Spinner /> : trainers.length === 0 ? (
          <Empty msg="No trainers yet. Add one above to show it in the app." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Name", "Specialty", "Experience", "Certifications", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textTransform: "uppercase" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {trainers.map(t => (
                  <tr key={t.trainer_id} style={{ borderBottom: `0.5px solid ${T.border}`, opacity: deletingId === t.trainer_id ? 0.4 : 1 }}>
                    <td style={{ padding: "11px 14px", fontWeight: 500, color: T.text }}>{t.name}</td>
                    <td style={{ padding: "11px 14px", color: T.textMuted }}>{t.specialty}</td>
                    <td style={{ padding: "11px 14px", color: T.textMuted }}>{t.experience_years} yrs</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {(t.certifications || []).map(c => <Badge key={c} label={c} />)}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="ghost" onClick={() => openEditForm(t)} style={{ fontSize: 12, padding: "4px 10px" }}>
                          ✏️ Edit
                        </Btn>
                        <Btn variant="danger" onClick={() => askDelete(t)} disabled={deletingId === t.trainer_id} style={{ fontSize: 12, padding: "4px 10px" }}>
                          {deletingId === t.trainer_id ? "Removing…" : "Remove"}
                        </Btn>
                      </div>
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

// ── Signature capture — mouse + touch canvas, produces a PNG data URL ────────
function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const hasDrawn  = useRef(false);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.strokeStyle = T.text;
  }, []);

  function pointFromEvent(e) {
    const rect  = canvasRef.current.getBoundingClientRect();
    const point = e.touches && e.touches[0] ? e.touches[0] : e;
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return { x: (point.clientX - rect.left) * scaleX, y: (point.clientY - rect.top) * scaleY };
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    const { x, y } = pointFromEvent(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = pointFromEvent(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawn.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasDrawn.current) onChange(canvasRef.current.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={460}
        height={150}
        style={{ width: "100%", height: 150, border: `0.5px solid ${T.borderMid}`, borderRadius: 10, background: "#fff", touchAction: "none", cursor: "crosshair", display: "block" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <button onClick={clear} style={{ marginTop: 8, background: "none", border: "none", color: T.textMuted, fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}>
        Clear signature
      </button>
    </div>
  );
}

// ── Gym Partnership Agreement gate — shown once, after Pro Activation is
// paid and before the rest of the dashboard unlocks. Mirrors the backend's
// AgreementSubmit model exactly: admin_name, gym_name, id_type, id_number,
// signature_base64, id_proof_base64. ─────────────────────────────────────────
function AgreementGate({ gymInfo, monthlyFee, onSigned }) {
  const [gymName, setGymName]       = useState(gymInfo.gym_name   || "");
  const [adminName, setAdminName]   = useState(gymInfo.admin_name || "");
  const [idType, setIdType]         = useState("Aadhar");
  const [idNumber, setIdNumber]     = useState("");
  const [signature, setSignature]   = useState("");
  const [idProofB64, setIdProofB64] = useState("");
  const [idProofPreview, setIdProofPreview] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const fileRef = useRef();

  function pickIdProof(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setIdProofB64(ev.target.result); setIdProofPreview(ev.target.result); };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!gymName.trim() || !adminName.trim() || !idNumber.trim() || !signature || !idProofB64) {
      setError("Please fill all fields, upload your ID proof, and sign above.");
      return;
    }
    setLoading(true); setError("");
    try {
      await apiFetch(`/gym/${gymInfo.gym_id}/agreement/submit`, {
        method: "POST",
        body: JSON.stringify({
          admin_name:       adminName.trim(),
          gym_name:         gymName.trim(),
          id_type:          idType,
          id_number:        idNumber.trim(),
          signature_base64: signature,
          id_proof_base64:  idProofB64,
        }),
      });
      onSigned();
    } catch (e) {
      setError(e.message || "Failed to submit the agreement. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif", padding: 20 }}>
      <div style={{ background: T.surface, borderRadius: 18, padding: 34, border: `0.5px solid ${T.border}`, width: 480, maxWidth: "94vw", boxShadow: "0 4px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: T.teal50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16 }}>📝</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>Sign Your Partnership Agreement</div>
        <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
          One last step before your dashboard unlocks — this confirms the ₹{monthlyFee}/user monthly fee and platform terms. Takes under a minute.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Gym Name" value={gymName} onChange={setGymName} placeholder="FitZone Gurugram" />
          <Input label="Your Full Name" value={adminName} onChange={setAdminName} placeholder="Rahul Sharma" />
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>ID Proof Type</label>
            <select value={idType} onChange={e => setIdType(e.target.value)}
              style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.bg, color: T.text }}>
              {["Aadhar", "Driving License", "Other"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="ID Number" value={idNumber} onChange={setIdNumber} placeholder="e.g. XXXX XXXX 1234" />
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>ID Proof Image</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={() => fileRef.current.click()} style={{ background: "none", color: T.teal600, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, cursor: "pointer", fontWeight: 500 }}>
                📁 {idProofPreview ? "Change image" : "Upload image"}
              </button>
              {idProofPreview && <img src={idProofPreview} alt="ID proof preview" style={{ height: 40, borderRadius: 6, objectFit: "cover" }} />}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickIdProof} style={{ display: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>Signature</label>
            <SignaturePad onChange={setSignature} />
          </div>
          {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "9px 13px", borderRadius: 8 }}>❌ {error}</div>}
          <button onClick={submit} disabled={loading} style={{ background: T.teal600, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 2 }}>
            {loading ? "Submitting…" : "I Agree & Sign"}
          </button>
          <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5, textAlign: "center" }}>
            Your signature and ID are stored securely and used only for verification and legal record-keeping.
          </div>
        </div>
      </div>
    </div>
  );
}

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

function DashboardTab({ banners, notifications, userIds, billingSummary }) {
  const activeIds = userIds.filter(u => u.status === "active").length;
  const usedIds   = userIds.filter(u => u.status === "used").length;
  const totalMembers = usedIds;

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
  const [payingId, setPayingId]   = useState(null);
  const [toast, setToast]         = useState(null);

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
            onRefresh?.();
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
          {[
            { label: "Pending", value: fmtINR(summary.total_pending), sub: `${summary.pending_count} invoice(s)`, icon: "⏳", accent: T.amber50, color: T.amber600 },
            ...(summary.next_billing_date ? [{
              label: "Next Monthly Invoice",
              value: fmtDate(summary.next_billing_date),
              sub: "auto-generated 2 days prior",
              icon: "📅", accent: T.blue50, color: T.blue600,
            }] : []),
          ].map(s => (
            <div key={s.label} style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: s.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, marginTop: 3, color: T.textMuted }}>{s.sub}</div>
            </div>
          ))}
        </div>
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

// ── Batches Tab ───────────────────────────────────────────────────────────────
// ── Batches Tab ───────────────────────────────────────────────────────────────
function BatchesTab({ gymId }) {
  const [batches, setBatches]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId]   = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [toast, setToast]           = useState(null);
  const [error, setError]           = useState("");
  const [expandedId, setExpandedId] = useState(null); // batch_id currently showing its member list

  const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const emptyForm = { name: "", days: [], startTime: "", endTime: "", trainer_name: "", capacity: 20 };
  const [form, setForm] = useState(emptyForm);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function loadBatches() {
    setLoading(true);
    try {
      const data = await apiFetch(`/gym/${gymId}/batches`);
      setBatches(Array.isArray(data) ? data : []);
    } catch { setBatches([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadBatches(); }, [gymId]);

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }));
  }

  async function submit() {
    if (!form.name.trim() || form.days.length === 0 || !form.startTime || !form.endTime || !form.trainer_name.trim()) {
      setError("Please fill in name, days, time, and trainer.");
      return;
    }
    setSubmitting(true); setError("");
    try {
      await apiFetch(`/gym/${gymId}/batches`, {
        method: "POST",
        body: JSON.stringify({
          name:         form.name.trim(),
          time:         `${to12Hour(form.startTime)} – ${to12Hour(form.endTime)}`,
          days_label:   form.days.join(" · "),
          trainer_name: form.trainer_name.trim(),
          capacity:     Number(form.capacity) || 20,
          member_count: 0,
        }),
      });
      setForm(emptyForm);
      setShowForm(false);
      await loadBatches();
      setToast({ message: "Batch created", type: "success" });
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  async function updateMemberCount(batch, count) {
    setBatches(prev => prev.map(b => b.batch_id === batch.batch_id ? { ...b, member_count: count } : b));
    try {
      await apiFetch(`/gym/${gymId}/batches/${batch.batch_id}`, {
        method: "PATCH",
        body: JSON.stringify({ member_count: count }),
      });
    } catch (e) {
      await loadBatches();
      setToast({ message: "Failed to update: " + e.message, type: "error" });
    } finally { setEditingId(null); }
  }

  function askDelete(batch) { setConfirm({ id: batch.batch_id, title: batch.name }); }

  async function confirmDelete() {
    const { id, title } = confirm;
    setConfirm(null);
    setDeletingId(id);
    setBatches(prev => prev.filter(b => b.batch_id !== id));
    try {
      await apiFetch(`/gym/${gymId}/batches/${id}`, { method: "DELETE" });
      setToast({ message: `"${title}" deleted`, type: "success" });
    } catch (e) {
      await loadBatches();
      setToast({ message: `Delete failed: ${e.message}`, type: "error" });
    } finally { setDeletingId(null); }
  }

  // Prefer the live enrolled_emails count once it exists (self-enroll flow is
  // the source of truth going forward); fall back to the manually-edited
  // member_count for batches created before enrolled_emails was introduced.
  function displayCount(b) {
    const enrolled = b.enrolled_emails;
    if (Array.isArray(enrolled)) return enrolled.length;
    return b.member_count ?? 0;
  }

  return (
    <div>
      {confirm && (
        <ConfirmDialog
          message={`Delete the batch "${confirm.title}"? This will remove it from the app immediately.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn variant="primary" onClick={() => setShowForm(v => !v)}>{showForm ? "✕ Cancel" : "+ New Batch"}</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <CardHeader title="Create Batch" icon="📅" />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
            <Input label="Batch Name *" value={form.name} onChange={set("name")} placeholder="Morning Strength" />
            <div>
              <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>Days *</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAY_OPTIONS.map(day => (
                  <button key={day} onClick={() => toggleDay(day)} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
                    border: form.days.includes(day) ? `1.5px solid ${T.teal600}` : `0.5px solid ${T.borderMid}`,
                    background: form.days.includes(day) ? T.teal50 : T.surface,
                    color: form.days.includes(day) ? T.teal600 : T.textMid,
                  }}>{day}</button>
                ))}
              </div>
            </div>
            {/* Start / End time — native time-picker bar instead of free text */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Start Time *" value={form.startTime} onChange={set("startTime")} type="time" />
              <Input label="End Time *" value={form.endTime} onChange={set("endTime")} type="time" />
            </div>
            {(form.startTime || form.endTime) && (
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: -6 }}>
                Preview: {form.startTime ? to12Hour(form.startTime) : "—"} – {form.endTime ? to12Hour(form.endTime) : "—"}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Trainer Name *" value={form.trainer_name} onChange={set("trainer_name")} placeholder="Rohan Verma" />
              <Input label="Capacity" value={form.capacity} onChange={set("capacity")} type="number" placeholder="25" />
            </div>
            {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <Btn variant="primary" onClick={submit} disabled={submitting} style={{ alignSelf: "flex-end", padding: "8px 20px" }}>
              {submitting ? "Saving…" : "Create Batch"}
            </Btn>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={`Batches (${batches.length})`} icon="📅"
          action={<Btn variant="ghost" onClick={loadBatches} style={{ fontSize: 11, padding: "4px 10px" }}>🔄 Refresh</Btn>}
        />
        {loading ? <Spinner /> : batches.length === 0 ? (
          <Empty msg="No batches yet. Create one above to show it in the app." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Name", "Schedule", "Trainer", "Members", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 500, color: T.textMuted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textTransform: "uppercase" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {batches.map(b => {
                  const enrolled = Array.isArray(b.enrolled_emails) ? b.enrolled_emails : [];
                  const hasEnrolledList = enrolled.length > 0;
                  const isExpanded = expandedId === b.batch_id;
                  return (
                    <Fragment key={b.batch_id}>
                      <tr style={{ borderBottom: `0.5px solid ${T.border}`, opacity: deletingId === b.batch_id ? 0.4 : 1 }}>
                        <td style={{ padding: "11px 14px", fontWeight: 500, color: T.text }}>{b.name}</td>
                        <td style={{ padding: "11px 14px", color: T.textMuted }}>{b.days_label} · {b.time}</td>
                        <td style={{ padding: "11px 14px", color: T.textMuted }}>{b.trainer_name}</td>
                        <td style={{ padding: "11px 14px" }}>
                          {editingId === b.batch_id ? (
                            <input type="number" autoFocus defaultValue={b.member_count}
                              onBlur={e => updateMemberCount(b, Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ width: 60, border: `1.5px solid ${T.teal600}`, borderRadius: 6, padding: "3px 6px", fontSize: 12 }} />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <button onClick={() => setEditingId(b.batch_id)} title="Click to edit"
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.teal600 }}>
                                {displayCount(b)}/{b.capacity} ✏️
                              </button>
                              {hasEnrolledList && (
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : b.batch_id)}
                                  style={{
                                    fontSize: 10.5, fontWeight: 600, background: T.teal50, color: T.teal600,
                                    border: "none", borderRadius: 20, padding: "2px 8px", cursor: "pointer",
                                  }}
                                >
                                  {isExpanded ? "Hide list ▲" : "View list ▼"}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <Btn variant="danger" onClick={() => askDelete(b)} disabled={deletingId === b.batch_id} style={{ fontSize: 12, padding: "4px 10px" }}>
                            {deletingId === b.batch_id ? "Deleting…" : "Delete"}
                          </Btn>
                        </td>
                      </tr>
                      {isExpanded && hasEnrolledList && (
                        <tr style={{ borderBottom: `0.5px solid ${T.border}` }}>
                          <td colSpan={5} style={{ padding: "8px 14px 12px", background: T.bg }}>
                            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>
                              Enrolled members ({enrolled.length}):
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {enrolled.map(email => (
                                <span key={email} style={{ fontSize: 11, background: T.teal50, color: T.teal600, padding: "3px 9px", borderRadius: 20 }}>
                                  {email}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

// ── Workout Access Tab ────────────────────────────────────────────────────────
// Lets the gym admin lock/unlock the "Workout Plans" screen per member.
// Batches and Trainers always stay visible to every member regardless of this
// setting. Backed by:
//   GET   /gym/{gym_id}/members
//   PATCH /gym/{gym_id}/members/{email}/workout-lock   { locked }
function LockToggle({ locked, busy, onToggle }) {
  // locked=true  → switch OFF (grey, knob left)
  // locked=false → switch ON  (teal, knob right) = unlocked/access granted
  const on = !locked;
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      title={locked ? "Locked — click to unlock" : "Unlocked — click to lock"}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 20,
        border: "none",
        cursor: busy ? "not-allowed" : "pointer",
        background: on ? T.teal600 : T.gray200,
        opacity: busy ? 0.6 : 1,
        transition: "background 0.2s ease",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}

function WorkoutAccessTab({ gymId }) {
  const [members, setMembers]         = useState([]);
  const [trainers, setTrainers]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [busyEmail, setBusyEmail]     = useState(null);
  const [toast, setToast]             = useState(null);
  const [search, setSearch]           = useState("");
  const [assignModal, setAssignModal] = useState(null); // { email, name }
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [planModal, setPlanModal]     = useState(null); // { email, name, text }

  async function loadAll() {
    if (!gymId) return;
    setLoading(true); setError("");
    try {
      const [m, t] = await Promise.all([
        apiFetch(`/gym/${gymId}/members`),
        apiFetch(`/gym/${gymId}/trainers`).catch(() => []),
      ]);
      setMembers(Array.isArray(m) ? m : []);
      setTrainers(Array.isArray(t) ? t : []);
    } catch (e) { setError("Failed to load: " + e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, [gymId]);

  function openUnlock(m) {
    if (trainers.length === 0) {
      setToast({ message: "Add a trainer first (Trainers tab) before unlocking.", type: "error" });
      return;
    }
    setSelectedTrainer(m.assigned_trainer_id || trainers[0]?.trainer_id || "");
    setAssignModal({ email: m.email, name: m.name });
  }

  async function confirmUnlock() {
    if (!selectedTrainer) { setToast({ message: "Choose a trainer", type: "error" }); return; }
    const { email } = assignModal;
    setBusyEmail(email);
    setAssignModal(null);
    try {
      await apiFetch(`/gym/${gymId}/members/${email}/workout-lock`, {
        method: "PATCH",
        body: JSON.stringify({ locked: false, trainer_id: selectedTrainer }),
      });
      await loadAll();
      setToast({ message: `Unlocked for ${email}`, type: "success" });
    } catch (e) {
      setToast({ message: "Failed: " + e.message, type: "error" });
    } finally { setBusyEmail(null); }
  }

  async function lockMember(m) {
    setBusyEmail(m.email);
    try {
      await apiFetch(`/gym/${gymId}/members/${m.email}/workout-lock`, {
        method: "PATCH",
        body: JSON.stringify({ locked: true }),
      });
      await loadAll();
      setToast({ message: `Locked for ${m.email}`, type: "success" });
    } catch (e) {
      setToast({ message: "Failed: " + e.message, type: "error" });
    } finally { setBusyEmail(null); }
  }

  // Single entry point for the sliding toggle — routes to the assign-trainer
  // modal when turning access ON, or straight to lockMember when turning it OFF.
  // Uses isWorkoutLocked() (not the raw field) so members missing the field
  // entirely — e.g. brand-new registrations — read as locked, matching the
  // "locked by default" behavior we want for new User IDs.
  function handleToggle(m) {
    if (isWorkoutLocked(m)) openUnlock(m);
    else lockMember(m);
  }

  function openPlan(m) {
    setPlanModal({ email: m.email, name: m.name, text: m.fitness_plan_text || "" });
  }

  async function savePlan() {
    const { email, text } = planModal;
    setBusyEmail(email);
    setPlanModal(null);
    try {
      await apiFetch(`/gym/${gymId}/members/${email}/fitness-plan`, {
        method: "PATCH",
        body: JSON.stringify({ fitness_plan_text: text }),
      });
      await loadAll();
      setToast({ message: `Fitness plan saved for ${email}`, type: "success" });
    } catch (e) {
      setToast({ message: "Failed: " + e.message, type: "error" });
    } finally { setBusyEmail(null); }
  }

  const filtered = members.filter(m => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (m.name || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
  });
  const lockedMembers   = filtered.filter(m => isWorkoutLocked(m));
  const unlockedMembers = filtered.filter(m => !isWorkoutLocked(m));
  const lockedCount = members.filter(m => isWorkoutLocked(m)).length;

  function MemberRow(m) {
    const locked = isWorkoutLocked(m);
    const busy = busyEmail === m.email;
    return (
      <div key={m.email} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: `0.5px solid ${T.border}` }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.teal50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: T.teal600, flexShrink: 0 }}>
          {(m.name || m.email)[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{m.name || "—"}</div>
          <div style={{ fontSize: 11.5, color: T.textMuted }}>{m.email}</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>
            {m.assigned_trainer_name ? `🏋️ ${m.assigned_trainer_name}` : "No trainer assigned"}
          </div>
        </div>
        {/* Plan editing only makes sense once a member has workout access */}
        {!locked && (
          <Btn variant="ghost" onClick={() => openPlan(m)} disabled={busy} style={{ fontSize: 11.5, padding: "4px 10px" }}>📋 Plan</Btn>
        )}
        <span style={{ fontSize: 11, color: T.textMuted, minWidth: 50, textAlign: "right" }}>
          {busy ? "…" : locked ? "Locked" : "Unlocked"}
        </span>
        <LockToggle locked={locked} busy={busy} onToggle={() => handleToggle(m)} />
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {assignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setAssignModal(null)}>
          <div style={{ background: T.surface, borderRadius: 14, padding: 24, width: 380, border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>Assign trainer & unlock</div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 16 }}>{assignModal.name || assignModal.email}</div>
            <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: "block", marginBottom: 6 }}>Trainer</label>
            <select value={selectedTrainer} onChange={e => setSelectedTrainer(e.target.value)}
              style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "8px 11px", fontSize: 13, width: "100%", background: T.bg, color: T.text, marginBottom: 20 }}>
              {trainers.map(t => <option key={t.trainer_id} value={t.trainer_id}>{t.name} — {t.specialty}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setAssignModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `0.5px solid ${T.borderMid}`, background: T.bg, color: T.textMid, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmUnlock} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: T.teal600, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Assign & Unlock</button>
            </div>
          </div>
        </div>
      )}

      {planModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setPlanModal(null)}>
          <div style={{ background: T.surface, borderRadius: 14, padding: 24, width: 460, border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>Fitness plan</div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 16 }}>{planModal.name || planModal.email}</div>
            <textarea
              value={planModal.text}
              onChange={e => setPlanModal(p => ({ ...p, text: e.target.value }))}
              rows={8}
              placeholder={"Week 1: Full body basics...\nWeek 2: ..."}
              style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", resize: "vertical", background: T.bg, color: T.text, marginBottom: 20 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setPlanModal(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `0.5px solid ${T.borderMid}`, background: T.bg, color: T.textMid, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={savePlan} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: T.teal600, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Plan</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total Members", value: members.length, color: T.text,    bg: T.surface },
          { label: "Locked",        value: lockedCount,    color: T.red600,  bg: T.red50   },
          { label: "Unlocked",      value: members.length - lockedCount, color: T.teal600, bg: T.teal50 },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ fontSize: 12, color: T.red600, background: T.red50, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>{error}</div>}

      <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
        Flip the switch to unlock a member's <strong>Add Exercises / Fitness Plan</strong> tabs — this requires assigning them a trainer. Their trainer and fitness plan can be updated anytime, even while locked. New members are locked by default until you assign a trainer.
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: T.textMuted }}>{filtered.length} member{filtered.length !== 1 ? "s" : ""} match your search</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email"
            style={{ border: `0.5px solid ${T.borderMid}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, background: T.bg, color: T.text, outline: "none", width: 180 }} />
          <Btn variant="ghost" onClick={loadAll} style={{ fontSize: 11, padding: "4px 10px" }}>🔄 Refresh</Btn>
        </div>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Card><Empty msg={members.length === 0 ? "No members yet." : "No members match your search."} /></Card>
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <CardHeader title={`🔒 Locked (${lockedMembers.length})`} />
            {lockedMembers.length === 0
              ? <Empty msg="No locked members." />
              : <div>{lockedMembers.map(MemberRow)}</div>}
          </Card>

          <Card>
            <CardHeader title={`🔓 Unlocked (${unlockedMembers.length})`} />
            {unlockedMembers.length === 0
              ? <Empty msg="No unlocked members." />
              : <div>{unlockedMembers.map(MemberRow)}</div>}
          </Card>
        </>
      )}
    </div>
  );
}

// ── Banners Tab ───────────────────────────────────────────────────────────────
function BannersTab({ gymId, onRefresh }) {
  const [banners, setBanners]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [deletingId, setDeletingId]     = useState(null);
  const [confirm, setConfirm]           = useState(null);
  const [toast, setToast]               = useState(null);
  const [error, setError]               = useState("");
  const [form, setForm]                 = useState({ title: "", screen: "home", status: "active", expires_at: "", deep_link: "" });
  const [imageB64, setImageB64]         = useState("");
  const [previewUrl, setPreviewUrl]     = useState("");
  const fileRef = useRef();
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

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
      setForm({ title: "", screen: "home", status: "active", expires_at: "", deep_link: "" });
      setImageB64(""); setPreviewUrl(""); setShowForm(false);
      await loadBanners();
      onRefresh();
      setToast({ message: "Banner created", type: "success" });
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  function askDelete(banner) {
    setConfirm({ id: banner.banner_id, title: banner.title });
  }

  async function confirmDelete() {
    const { id, title } = confirm;
    setConfirm(null);
    setDeletingId(id);

    setBanners(prev => prev.filter(b => b.banner_id !== id));

    try {
      await apiFetch(`/gym/${gymId}/banners/${id}`, { method: "DELETE" });
      setToast({ message: `"${title}" deleted`, type: "success" });
      onRefresh();
    } catch (e) {
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
  const [deletingId, setDeletingId]       = useState(null);
  const [confirm, setConfirm]             = useState(null);
  const [toast, setToast]                 = useState(null);
  const [error, setError]                 = useState("");
  const [form, setForm]                   = useState({ title: "", body: "", type: "general", deep_link: "" });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

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
      await loadNotifications();
      onRefresh();
      setToast({ message: "Notification sent", type: "success" });
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  function askDelete(notif) {
    setConfirm({ id: notif.notification_id, title: notif.title });
  }

  async function confirmDelete() {
    const { id, title } = confirm;
    setConfirm(null);
    setDeletingId(id);

    setNotifications(prev => prev.filter(n => n.notification_id !== id));

    try {
      await apiFetch(`/gym/${gymId}/notifications/${id}`, { method: "DELETE" });
      setToast({ message: `"${title}" deleted`, type: "success" });
      onRefresh();
    } catch (e) {
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
function ConfigTab({ gymId }) {
  const gymInfo = JSON.parse(sessionStorage.getItem("gym_info") || "{}");
  const [agreement, setAgreement] = useState(null);

  useEffect(() => {
    if (!gymId) return;
    apiFetch(`/gym/${gymId}/agreement`).then(setAgreement).catch(() => setAgreement(null));
  }, [gymId]);

  const items = [
    { label: "Gym Name",    value: gymInfo.gym_name    || "—" },
    { label: "Gym ID",      value: gymInfo.gym_id      || "—" },
    { label: "Admin Name",  value: gymInfo.admin_name  || "—" },
    { label: "Admin Email", value: gymInfo.admin_email || "—" },
    { label: "AI Model",    value: "gemini-2.5-flash-lite" },
  ];
  return (
    <div>
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
      {agreement && (
        <Card style={{ marginTop: 16 }}>
          <CardHeader title="Partnership Agreement" icon="📝" />
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Signed on {fmtDate(agreement.agreement_date?.split("-").reverse().join("-") || agreement.created_at)}</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Signed by {agreement.admin_name} · ID: {agreement.id_type}</div>
            </div>
            {agreement.agreement_pdf_url && (
              <Btn variant="ghost" onClick={() => window.open(agreement.agreement_pdf_url, "_blank")}>📄 View PDF</Btn>
            )}
          </div>
        </Card>
      )}
    </div>
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

  const [checkingActivation, setCheckingActivation] = useState(true);
  const [activationRequired, setActivationRequired] = useState(false);
  const [activationExpired, setActivationExpired]   = useState(false);
  const [activationAmount, setActivationAmount]     = useState(5000);

  // ── Gym Partnership Agreement gate — runs once activation is resolved ──────
  const [checkingAgreement, setCheckingAgreement] = useState(true);
  const [agreementRequired, setAgreementRequired] = useState(false);

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

  // ── Once activation is confirmed NOT required, check the agreement gate ────
  useEffect(() => {
    if (!authed || !gymId || checkingActivation || activationRequired) return;
    setCheckingAgreement(true);
    apiFetch(`/gym/${gymId}/agreement-status`)
      .then(s => setAgreementRequired(!!s.required))
      .catch(() => setAgreementRequired(false))
      .finally(() => setCheckingAgreement(false));
  }, [authed, gymId, checkingActivation, activationRequired]);

  useEffect(() => {
    if (authed && !checkingActivation && !activationRequired && !checkingAgreement && !agreementRequired) loadAll();
  }, [authed, checkingActivation, activationRequired, checkingAgreement, agreementRequired]);

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
  if (checkingAgreement) return <FullScreenSpinner />;
  if (agreementRequired) {
    return (
      <AgreementGate
        gymInfo={gymInfo}
        monthlyFee={35}
        onSigned={() => setAgreementRequired(false)}
      />
    );
  }

  const currentLabel = NAV.find(n => n.id === active)?.label || "";

  const unreadBillingAlerts = notifications.filter(n => n.type === "billing" && n.read !== true).length;
  const pendingInvoices     = billingSummary?.pending_count || 0;
  const billingBadgeCount   = pendingInvoices + unreadBillingAlerts;

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
            <button onClick={() => { sessionStorage.removeItem("af_admin"); sessionStorage.removeItem("gym_info"); setAuthed(false); setCheckingActivation(true); setActivationRequired(false); setCheckingAgreement(true); setAgreementRequired(false); }} style={{ height: 34, borderRadius: 8, border: `0.5px solid ${T.border}`, background: "none", cursor: "pointer", fontSize: 12, color: T.textMuted, padding: "0 12px" }}>Sign out</button>
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
              {active === "workout_access" && <WorkoutAccessTab gymId={gymId} />}
              {active === "billing"       && <BillingTab gymId={gymId} onRefresh={refreshBillingBadge} />}
              {active === "banners"       && <BannersTab gymId={gymId} onRefresh={loadAll} />}
              {active === "trainers"      && <TrainersTab gymId={gymId} />} 
              {active === "notifications" && <NotificationsTab gymId={gymId} onRefresh={loadAll} />}
              {active === "batches"       && <BatchesTab gymId={gymId} />}
              {active === "config"        && <ConfigTab gymId={gymId} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}