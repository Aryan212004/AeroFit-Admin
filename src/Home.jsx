import Header from './Header'

const APP_STORE_URL = 'https://apps.apple.com/in/app/aero-fit/id6783025771'

// ---- Design tokens -----------------------------------------------------
// Background: #F6F6F1 (cream)      Surface: #FFFFFF
// Ink:        #14161A              Muted: #6B6F76
// Green:      #0F6E56  (gym / primary)   tint #E4F3EE
// Purple:     #534AB7  (AI / secondary)  tint #EEEDFE
// Divider:    #E7E6DF
// Display face: Bricolage Grotesque — bold, athletic, a little irregular
// Body face:    DM Sans (existing brand voice)
// Utility face: JetBrains Mono — for stat digits & macro readouts

const FEATURES = [
  {
    icon: '🍽️',
    accent: 'green',
    title: 'AI Meal Scanning',
    desc: 'Point your camera at a meal and get calories, protein, carbs and fat back in seconds, powered by Gemini.',
  },
  {
    icon: '🏋️',
    accent: 'purple',
    title: 'Guided Workouts',
    desc: 'Muscle-region level exercise detail so you always know what to train and how to do it right.',
  },
  {
    icon: '📊',
    accent: 'green',
    title: 'Activity Tracking',
    desc: 'Steps, workouts and body metrics in one place, synced automatically as you move through your day.',
  },
  {
    icon: '⚖️',
    accent: 'purple',
    title: 'BMI & Body Metrics',
    desc: 'A clear read on where you stand, updated as your weight and measurements change over time.',
  },
  {
    icon: '🏢',
    accent: 'green',
    title: 'Gym or Independent',
    desc: "Train inside a partnered gym's membership plan, or go fully independent — Aerofit adapts to you.",
  },
  {
    icon: '🔔',
    accent: 'purple',
    title: 'Stay On Track',
    desc: 'Push reminders for workouts, meals and membership status, so nothing slips through the cracks.',
  },
]

const STEPS = [
  { n: '01', title: 'Create your profile', desc: 'Sign up as a gym member or go independent — takes under a minute.' },
  { n: '02', title: 'Scan & track', desc: 'Log meals with your camera and track workouts as you train.' },
  { n: '03', title: 'Get guided', desc: 'Follow tailored workout guidance and watch your metrics move.' },
]

function PhoneMock() {
  return (
    <div className="af-phone">
      <div className="af-phone-notch" />
      <div className="af-phone-screen">
        <div className="af-scan-photo">
          <div className="af-scanline" />
        </div>
        <div className="af-scan-result">
          <div className="af-scan-row af-scan-row-1">
            <span>Calories</span><b>512 kcal</b>
          </div>
          <div className="af-scan-row af-scan-row-2">
            <span>Protein</span><b>34 g</b>
          </div>
          <div className="af-scan-row af-scan-row-3">
            <span>Carbs</span><b>48 g</b>
          </div>
          <div className="af-scan-row af-scan-row-4">
            <span>Fat</span><b>18 g</b>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="af-home">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

        * { box-sizing: border-box; }

        .af-home {
          background: #F6F6F1;
          color: #14161A;
          font-family: 'DM Sans', system-ui, sans-serif;
          min-height: 100vh;
        }

        .af-display { font-family: 'Bricolage Grotesque', sans-serif; }
        .af-mono { font-family: 'JetBrains Mono', monospace; }

        /* ---------- Nav ---------- */
        .af-nav {
          max-width: 1140px;
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

        /* ---------- Hero ---------- */
        .af-hero {
          max-width: 1140px;
          margin: 0 auto;
          padding: 64px 24px 40px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 40px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .af-hero { grid-template-columns: 1fr; padding-top: 40px; }
        }
        .af-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: #0F6E56;
          background: #E4F3EE;
          padding: 6px 12px;
          border-radius: 999px;
        }
        .af-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #0F6E56; }
        .af-h1 {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-weight: 700;
          font-size: clamp(34px, 5vw, 56px);
          line-height: 1.04;
          letter-spacing: -0.02em;
          margin: 18px 0 0;
        }
        .af-h1 em {
          font-style: normal;
          color: #0F6E56;
        }
        .af-sub {
          font-size: 16.5px;
          color: #6B6F76;
          line-height: 1.6;
          margin: 18px 0 0;
          max-width: 460px;
        }
        .af-cta-row { display: flex; gap: 14px; margin-top: 30px; flex-wrap: wrap; }
        .af-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #0F6E56;
          color: #fff;
          border: none;
          padding: 14px 26px;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(15,110,86,0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .af-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,110,86,0.3); }
        .af-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: #14161A;
          border: 1.5px solid #E7E6DF;
          padding: 14px 26px;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .af-btn-secondary:hover { border-color: #0F6E56; background: #E4F3EE; }

        /* ---------- Phone mock (signature element) ---------- */
        .af-phone {
          width: 240px;
          height: 480px;
          margin: 0 auto;
          background: #14161A;
          border-radius: 34px;
          padding: 10px;
          box-shadow: 0 30px 60px -20px rgba(20,22,26,0.35);
          position: relative;
        }
        .af-phone-notch {
          position: absolute;
          top: 10px; left: 50%; transform: translateX(-50%);
          width: 70px; height: 16px;
          background: #14161A;
          border-radius: 0 0 12px 12px;
          z-index: 2;
        }
        .af-phone-screen {
          width: 100%; height: 100%;
          background: #fff;
          border-radius: 26px;
          overflow: hidden;
          position: relative;
        }
        .af-scan-photo {
          height: 58%;
          background:
            linear-gradient(160deg, #E4F3EE, #F6F6F1 60%),
            repeating-linear-gradient(45deg, rgba(15,110,86,0.06) 0 10px, transparent 10px 20px);
          position: relative;
          overflow: hidden;
        }
        .af-scanline {
          position: absolute;
          left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #0F6E56, transparent);
          box-shadow: 0 0 14px 2px rgba(15,110,86,0.6);
          animation: af-scan-move 2.6s ease-in-out infinite;
        }
        @keyframes af-scan-move {
          0%   { top: 4%; opacity: 0.2; }
          10%  { opacity: 1; }
          48%  { top: 92%; opacity: 1; }
          58%  { opacity: 0; }
          100% { top: 4%; opacity: 0; }
        }
        .af-scan-result {
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .af-scan-row {
          display: flex;
          justify-content: space-between;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
          color: #6B6F76;
          opacity: 0;
          transform: translateY(6px);
          animation: af-row-reveal 0.5s ease forwards;
        }
        .af-scan-row b { color: #14161A; font-weight: 600; }
        .af-scan-row-1 { animation-delay: 1.55s; }
        .af-scan-row-2 { animation-delay: 1.75s; }
        .af-scan-row-3 { animation-delay: 1.95s; }
        .af-scan-row-4 { animation-delay: 2.15s; }
        @keyframes af-row-reveal {
          to { opacity: 1; transform: translateY(0); }
        }
        .af-scan-row { animation-iteration-count: 1; }
        .af-scan-photo, .af-scan-result { animation-name: af-cycle-reset; }

        /* restart the reveal loop in sync with the scanline every 2.6s */
        .af-scan-row-1 { animation: af-row-reveal 0.5s ease forwards, af-row-hold 2.6s infinite; animation-delay: 1.55s, 0s; }
        .af-scan-row-2 { animation: af-row-reveal 0.5s ease forwards, af-row-hold 2.6s infinite; animation-delay: 1.75s, 0s; }
        .af-scan-row-3 { animation: af-row-reveal 0.5s ease forwards, af-row-hold 2.6s infinite; animation-delay: 1.95s, 0s; }
        .af-scan-row-4 { animation: af-row-reveal 0.5s ease forwards, af-row-hold 2.6s infinite; animation-delay: 2.15s, 0s; }
        @keyframes af-row-hold {
          0%, 55%   { opacity: 0; transform: translateY(6px); }
          65%, 96%  { opacity: 1; transform: translateY(0); }
          100%      { opacity: 0; transform: translateY(6px); }
        }

        /* ---------- Stat strip ---------- */
        .af-stats {
          max-width: 1140px;
          margin: 40px auto 0;
          padding: 0 24px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: #E7E6DF;
          border: 1px solid #E7E6DF;
          border-radius: 14px;
          overflow: hidden;
        }
        @media (max-width: 720px) { .af-stats { grid-template-columns: repeat(2, 1fr); } }
        .af-stat { background: #fff; padding: 20px 18px; text-align: center; }
        .af-stat-value {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: #0F6E56;
        }
        .af-stat-label { font-size: 12px; color: #6B6F76; margin-top: 4px; }

        /* ---------- Features ---------- */
        .af-section { max-width: 1140px; margin: 0 auto; padding: 100px 24px 0; }
        .af-section-head { max-width: 520px; margin-bottom: 44px; }
        .af-section-eyebrow {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #534AB7;
          text-transform: uppercase;
        }
        .af-section-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(26px, 3.4vw, 36px);
          font-weight: 700;
          letter-spacing: -0.01em;
          margin-top: 10px;
        }

        .af-feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 860px) { .af-feature-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .af-feature-grid { grid-template-columns: 1fr; } }

        .af-feature-card {
          background: #fff;
          border: 1px solid #E7E6DF;
          border-radius: 16px;
          padding: 24px 22px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .af-feature-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px -18px rgba(20,22,26,0.25); }
        .af-feature-icon {
          width: 42px; height: 42px;
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          font-size: 19px;
          margin-bottom: 14px;
        }
        .af-feature-card[data-accent="green"] .af-feature-icon { background: #E4F3EE; }
        .af-feature-card[data-accent="purple"] .af-feature-icon { background: #EEEDFE; }
        .af-feature-title { font-weight: 700; font-size: 16px; }
        .af-feature-desc { font-size: 13.5px; color: #6B6F76; margin-top: 8px; line-height: 1.55; }

        /* ---------- How it works ---------- */
        .af-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          position: relative;
        }
        @media (max-width: 720px) { .af-steps { grid-template-columns: 1fr; } }
        .af-step-n {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: #0F6E56;
          font-weight: 600;
        }
        .af-step-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-weight: 700;
          font-size: 19px;
          margin-top: 8px;
        }
        .af-step-desc { font-size: 13.5px; color: #6B6F76; margin-top: 8px; line-height: 1.55; max-width: 280px; }

        /* ---------- CTA banner ---------- */
        .af-cta-banner {
          max-width: 1140px;
          margin: 110px auto 0;
          padding: 0 24px;
        }
        .af-cta-inner {
          background: #14161A;
          border-radius: 22px;
          padding: 54px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .af-cta-inner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(500px 220px at 50% 0%, rgba(15,110,86,0.35), transparent 70%);
        }
        .af-cta-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          color: #fff;
          font-size: clamp(24px, 3.4vw, 34px);
          font-weight: 700;
          position: relative; z-index: 1;
        }
        .af-cta-sub { color: #9CA0A8; font-size: 14.5px; margin-top: 10px; position: relative; z-index: 1; }
        .af-cta-inner .af-cta-row { justify-content: center; position: relative; z-index: 1; }
        .af-cta-inner .af-btn-secondary { color: #fff; border-color: rgba(255,255,255,0.25); }
        .af-cta-inner .af-btn-secondary:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.4); }

        /* ---------- Footer ---------- */
        .af-footer {
          max-width: 1140px;
          margin: 60px auto 0;
          padding: 28px 24px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #E7E6DF;
          font-size: 12.5px;
          color: #9AA0A8;
        }
        .af-footer a { color: #6B6F76; text-decoration: none; margin-left: 18px; }
        .af-footer a:hover { color: #14161A; }

        @media (prefers-reduced-motion: reduce) {
          .af-scanline, .af-scan-row-1, .af-scan-row-2, .af-scan-row-3, .af-scan-row-4 { animation: none; opacity: 1; transform: none; }
        }
      `}</style>

      <Header actionLabel="Admin Login" actionTo="/console" />

      {/* Hero */}
      <section className="af-hero">
        <div>
          <span className="af-eyebrow"><span className="af-eyebrow-dot" />AI-powered fitness</span>
          <h1 className="af-h1">
            Train, eat and track — <em>all in one app</em>
          </h1>
          <p className="af-sub">
            Aerofit brings gym management, AI meal scanning and guided workouts together, whether you train at a
            partnered gym or go fully independent.
          </p>
          <div className="af-cta-row">
            <a className="af-btn-primary" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Get the app</a>
            <a className="af-btn-secondary" href="#how-it-works">See how it works</a>
          </div>
        </div>
        <PhoneMock />
      </section>

      {/* Stats */}
      <div className="af-stats">
        <div className="af-stat">
          <div className="af-stat-value">12+</div>
          <div className="af-stat-label">Partner gyms</div>
        </div>
        <div className="af-stat">
          <div className="af-stat-value">3K+</div>
          <div className="af-stat-label">Active members</div>
        </div>
        <div className="af-stat">
          <div className="af-stat-value">AI</div>
          <div className="af-stat-label">Meal scanning</div>
        </div>
        <div className="af-stat">
          <div className="af-stat-value">99.9%</div>
          <div className="af-stat-label">Uptime</div>
        </div>
      </div>

      {/* Features */}
      <section className="af-section" id="features">
        <div className="af-section-head">
          <div className="af-section-eyebrow">What's inside</div>
          <div className="af-section-title">Everything you need to stay consistent</div>
        </div>
        <div className="af-feature-grid">
          {FEATURES.map((f) => (
            <div className="af-feature-card" data-accent={f.accent} key={f.title}>
              <div className="af-feature-icon">{f.icon}</div>
              <div className="af-feature-title">{f.title}</div>
              <div className="af-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="af-section" id="how-it-works">
        <div className="af-section-head">
          <div className="af-section-eyebrow">Getting started</div>
          <div className="af-section-title">Up and running in three steps</div>
        </div>
        <div className="af-steps">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="af-step-n">{s.n}</div>
              <div className="af-step-title">{s.title}</div>
              <div className="af-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="af-cta-banner">
        <div className="af-cta-inner">
          <div className="af-cta-title">Ready to train smarter?</div>
          <div className="af-cta-sub">Join Aerofit and bring your workouts, meals and progress into one place.</div>
          <div className="af-cta-row">
            <a className="af-btn-primary" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Get the app</a>
            <a className="af-btn-secondary" href="mailto:aerofityou@gmail.com">Talk to us</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="af-footer">
        <div>© {new Date().getFullYear()} Aerofit</div>
        <div>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="/console">Admin</a>
        </div>
      </footer>
    </div>
  )
}