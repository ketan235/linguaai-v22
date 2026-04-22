import { useState, useRef, useEffect, useCallback } from "react";
import "./styles/globals.css";

/* ── API layer ─────────────────────────────────────────── */

const API_BASE =
  import.meta.env?.VITE_API_URL ||   // for Vite
  process.env?.REACT_APP_API_URL || // for CRA
  "http://localhost:5000";          // fallback for local dev

const api = {
  _token: null,

  init() {
    this._token = localStorage.getItem("lingua_token");
  },

  _set(t) {
    this._token = t;
    t
      ? localStorage.setItem("lingua_token", t)
      : localStorage.removeItem("lingua_token");
  },

  async req(method, path, body, isForm = false) {
    const headers = {};

    const tok = this._token || localStorage.getItem("lingua_token");
    if (tok) headers["Authorization"] = `Bearer ${tok}`;

    if (!isForm && body) headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
  },

  async signin(e, p) {
    const d = await this.req("POST", "/auth/signin", { email: e, password: p });
    this._set(d.token);
    return d.user;
  },

  async signup(n, e, p) {
    const d = await this.req("POST", "/auth/signup", { name: n, email: e, password: p });
    this._set(d.token);
    return d.user;
  },

  async me() {
    return this.req("GET", "/auth/me");
  },

  signout() {
    this._set(null);
  },

  async forgotPassword(email) {
    return this.req("POST", "/auth/forgot-password", { email });
  },

  async resetPassword(token, password) {
    return this.req("POST", "/auth/reset-password", { token, password });
  },

  async getConvs() {
    return this.req("GET", "/chat/conversations");
  },

  async getMsgs(id) {
    return this.req("GET", `/chat/conversations/${id}`);
  },

  async send(cid, content, tl, provider) {
    return this.req("POST", "/chat/message", {
      conversationId: cid,
      content,
      targetLanguage: tl,
      provider,
    });
  },

  async delConv(id) {
    return this.req("DELETE", `/chat/conversations/${id}`);
  },

  async uploadFile(file, tl, provider) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("targetLanguage", tl);
    if (provider) fd.append("provider", provider);
    return this.req("POST", "/file/upload", fd, true);
  },

  async googleStatus() {
    return this.req("GET", "/auth/google/status");
  },
};

api.init();

export default api;
/* ── Language config ───────────────────────────────────── */
const LANGUAGES = ["English","Spanish","French","German","Italian","Portuguese","Russian","Chinese","Japanese","Korean","Arabic","Hindi","Dutch","Polish","Swedish","Turkish","Vietnamese","Thai","Greek","Hebrew","Indonesian","Malay","Czech","Romanian","Hungarian","Danish","Finnish","Norwegian","Ukrainian","Persian","Bengali","Tamil","Telugu","Marathi","Gujarati","Kannada","Punjabi"];

const LANG_BCP47 = {
  English:"en-US",Spanish:"es-ES",French:"fr-FR",German:"de-DE",Italian:"it-IT",
  Portuguese:"pt-BR",Russian:"ru-RU",Chinese:"zh-CN",Japanese:"ja-JP",Korean:"ko-KR",
  Arabic:"ar-SA",Hindi:"hi-IN",Dutch:"nl-NL",Polish:"pl-PL",Swedish:"sv-SE",
  Turkish:"tr-TR",Vietnamese:"vi-VN",Thai:"th-TH",Greek:"el-GR",Hebrew:"he-IL",
  Indonesian:"id-ID",Malay:"ms-MY",Czech:"cs-CZ",Romanian:"ro-RO",Hungarian:"hu-HU",
  Danish:"da-DK",Finnish:"fi-FI",Norwegian:"nb-NO",Ukrainian:"uk-UA",Persian:"fa-IR",
  Bengali:"bn-BD",Tamil:"ta-IN",Telugu:"te-IN",Marathi:"mr-IN",Gujarati:"gu-IN",
  Kannada:"kn-IN",Punjabi:"pa-IN"
};

function pickVoice(lang) {
  const voices = window.speechSynthesis?.getVoices() || [];
  const bcp = LANG_BCP47[lang] || "en-US";
  // Try exact match, then language prefix match, then null (browser will still speak using u.lang)
  return (
    voices.find(v => v.lang === bcp) ||
    voices.find(v => v.lang.startsWith(bcp.split("-")[0])) ||
    null
  );
}

/* ── Feature data ──────────────────────────────────────── */
const FEATURES = [
  { icon:"🌍", title:"37+ Languages",        desc:"Chat and translate across 37+ world languages with native-level accuracy powered by Groq's LLaMA 3 or Google Gemini." },
  { icon:"⚡", title:"Dual AI Providers",     desc:"Switch between Groq (ultra-fast LLaMA 3) and Google Gemini on the fly — pick the model that works best for your task." },
  { icon:"📄", title:"File Translation",      desc:"Upload PDFs, Word docs, or text files. Get a fully translated, downloadable PDF back instantly." },
  { icon:"🎤", title:"Voice in Any Language", desc:"Speak your message and hear AI responses read aloud — full multilingual speech input and output." },
  { icon:"💬", title:"Persistent Chat History",desc:"All your conversations are saved to MongoDB. Resume any chat from any device, anytime." },
  { icon:"🔐", title:"Google Sign-In",        desc:"One-click login with your Google account. No passwords to remember — secure OAuth 2.0." },
];
const STATS = [
  { value:"37+",  label:"Languages Supported" },
  { value:"< 1s", label:"Avg Response Time" },
  { value:"∞",    label:"Saved Conversations" },
  { value:"Free", label:"To Get Started" },
];

/* ════════════════════════════════════════════════════════
   GOOGLE SVG ICON
════════════════════════════════════════════════════════ */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ════════════════════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════════════════════ */
function LandingPage({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = document.getElementById("ls");
    if (!el) return;
    const h = () => setScrolled(el.scrollTop > 40);
    el.addEventListener("scroll", h);
    return () => el.removeEventListener("scroll", h);
  }, []);

  return (
    <div id="ls" style={{ height:"100vh", overflowY:"auto", overflowX:"hidden", background:"var(--void)", position:"relative" }}>
      <style>{`
        .lp-nav { position:sticky;top:0;z-index:100;transition:all .3s;padding:0 clamp(16px,4vw,48px); }
        .lp-nav-inner { max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:68px; }
        .lp-logo { display:flex;align-items:center;gap:10px; }
        .lp-logo-text { font-size:22px;font-weight:800;background:linear-gradient(135deg,var(--cyan),var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
        .lp-btn-primary { display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:100px;background:linear-gradient(135deg,var(--cyan),#00b8cc);color:#05050f;font-weight:700;font-size:14px;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(0,229,255,.3);transition:transform .2s,box-shadow .2s;font-family:var(--font); }
        .lp-btn-primary:hover { transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,229,255,.45); }
        .lp-btn-primary.lg { padding:15px 36px;font-size:16px; }
        .lp-btn-ghost { display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:100px;background:transparent;border:1px solid var(--border);color:var(--muted);font-size:14px;cursor:pointer;transition:border-color .2s,color .2s;font-family:var(--font); }
        .lp-btn-ghost:hover { border-color:var(--bhi);color:var(--text); }
        .lp-hero { min-height:90vh;display:flex;align-items:center;justify-content:center;gap:clamp(40px,6vw,80px);padding:80px clamp(16px,5vw,60px) 60px;max-width:1300px;margin:0 auto;flex-wrap:wrap;position:relative; }
        .lp-orb { position:absolute;pointer-events:none;border-radius:50%;animation:orbDrift 10s ease-in-out infinite; }
        .lp-badge { display:inline-block;padding:6px 16px;border-radius:100px;background:var(--cdim);border:1px solid rgba(0,229,255,.25);color:var(--cyan);font-size:13px;font-weight:600;margin-bottom:20px;animation:fadeUp .6s ease both; }
        .lp-h1 { font-size:clamp(38px,6vw,72px);font-weight:800;line-height:1.08;margin-bottom:22px;animation:fadeUp .6s ease .08s both; }
        .lp-grad { background:linear-gradient(135deg,var(--cyan) 0%,var(--green) 50%,var(--gold) 100%);background-size:200%;animation:gradShift 5s ease infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
        .lp-sub { font-size:clamp(15px,2vw,18px);color:var(--muted);line-height:1.75;max-width:520px;animation:fadeUp .6s ease .15s both; }
        .lp-demo-note { margin-top:12px;font-size:13px;color:var(--faint);animation:fadeUp .6s ease .3s both; }
        .lp-demo-note code { color:var(--cyan);background:var(--surface);padding:2px 7px;border-radius:6px; }
        .lp-chat-card { flex:0 0 min(430px,100%);background:var(--raised);border:1px solid var(--border);border-radius:24px;padding:22px;box-shadow:0 32px 80px rgba(0,0,0,.45),0 0 0 1px rgba(0,229,255,.05);animation:slideUp .8s ease .25s both;position:relative;z-index:1; }
        .lp-chat-bubble { padding:11px 15px;border-radius:16px;margin-bottom:10px;font-size:14px;line-height:1.5;animation:fadeUp .45s ease both; }
        .lp-chat-bubble.user { background:linear-gradient(135deg,var(--cyan),#00c8e0);color:#05050f;margin-left:28px;border-radius:16px 16px 4px 16px; }
        .lp-chat-bubble.ai   { background:var(--surface);color:var(--text);margin-right:28px;border-radius:16px 16px 16px 4px; }
        .lp-stats { display:flex;justify-content:center;gap:clamp(24px,5vw,64px);flex-wrap:wrap;padding:52px clamp(16px,4vw,48px);border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--deep); }
        .lp-stat-val { font-size:clamp(32px,5vw,52px);font-weight:800;background:linear-gradient(135deg,var(--cyan),var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent; }
        .lp-stat-lbl { color:var(--muted);font-size:14px;margin-top:4px;font-weight:500; }
        .lp-features { padding:88px clamp(16px,5vw,80px);max-width:1200px;margin:0 auto; }
        .lp-feat-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:20px; }
        .lp-feat-card { background:var(--deep);border:1px solid var(--border);border-radius:20px;padding:30px;transition:transform .25s,border-color .25s,box-shadow .25s;animation:fadeUp .5s ease both; }
        .lp-feat-card:hover { transform:translateY(-5px);border-color:rgba(0,229,255,.25);box-shadow:0 16px 48px rgba(0,0,0,.3); }
        .lp-cta { padding:88px clamp(16px,5vw,80px);text-align:center; }
        .lp-cta-box { position:relative;max-width:680px;margin:0 auto;background:var(--raised);border:1px solid var(--border);border-radius:32px;padding:clamp(48px,8vw,80px) clamp(24px,5vw,64px);overflow:hidden; }
        .lp-cta-box::before { content:'';position:absolute;inset:0;background:radial-gradient(ellipse at top,rgba(0,229,255,.06),transparent 60%);pointer-events:none; }
        .lp-footer { padding:44px 24px;text-align:center;border-top:1px solid var(--border); }
        .lp-footer-links { display:flex;gap:24px;justify-content:center;margin-top:12px;flex-wrap:wrap; }
      `}</style>

      {/* Nav */}
      <nav className="lp-nav" style={{ background: scrolled ? "rgba(5,5,15,.95)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,.07)" : "transparent"}` }}>
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <span style={{ fontSize:28 }}>🌐</span>
            <span className="lp-logo-text">LinguaAI</span>
          </div>
          <button className="lp-btn-primary" onClick={onGetStarted}>Get Started Free →</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-orb" style={{ width:700,height:700,top:"-15%",left:"-15%",background:"radial-gradient(circle,rgba(0,229,255,.1) 0%,transparent 70%)",animationDelay:"0s" }}/>
        <div className="lp-orb" style={{ width:500,height:500,bottom:"5%",right:"-10%",background:"radial-gradient(circle,rgba(167,139,250,.08) 0%,transparent 70%)",animationDelay:"-4s" }}/>
        <div style={{ flex:"1 1 360px",maxWidth:580,position:"relative",zIndex:1 }}>
          <div className="lp-badge">✨ Powered by Groq · Gemini · LLaMA 3 · MongoDB</div>
          <h1 className="lp-h1">
            Break Every<br/>
            <span className="lp-grad">Language Barrier</span><br/>
            With AI
          </h1>
          <p className="lp-sub">Chat in any language, translate documents and download them, speak and listen in 37+ languages — all powered by Groq's ultra-fast AI.</p>
          <div style={{ display:"flex",gap:14,flexWrap:"wrap",marginTop:32 }} className="hero-ctas">
            <button className="lp-btn-primary lg" onClick={onGetStarted}>Start Chatting Free →</button>
            <button className="lp-btn-ghost" onClick={() => document.getElementById("feat")?.scrollIntoView({ behavior:"smooth" })}>See Features ↓</button>
          </div>
          <p className="lp-demo-note">Demo: <code>demo@lingua.ai</code> / <code>demo1234</code></p>
        </div>

        {/* Hero chat preview card */}
        <div className="lp-chat-card hero-card">
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
            <div style={{ display:"flex",gap:6 }}>
              {["#ff5f57","#ffbd2e","#28c941"].map(c => <div key={c} style={{ width:12,height:12,borderRadius:"50%",background:c }}/>)}
            </div>
            <span style={{ color:"var(--muted)",fontSize:13,fontWeight:500 }}>LinguaAI Chat</span>
          </div>
          {[
            { r:"user", t:"Translate 'Good morning, how are you?' to Japanese" },
            { r:"ai",   t:"おはようございます、お元気ですか？\n(Ohayou gozaimasu, o-genki desu ka?)" },
            { r:"user", t:"Now say it in Arabic" },
            { r:"ai",   t:"صباح الخير، كيف حالك؟\n(Sabah al-khayr, kayfa haluk?)" },
          ].map((m, i) => (
            <div key={i} className={`lp-chat-bubble ${m.r}`} style={{ animationDelay:`${i * .12}s` }}>{m.t}</div>
          ))}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--surface)",borderRadius:14,padding:"10px 14px",fontSize:13,marginTop:16,border:"1px solid var(--border)" }}>
            <span style={{ color:"var(--muted)" }}>Speak or type in any language…</span>
            <div style={{ width:30,height:30,borderRadius:10,background:"var(--cyan)",color:"#05050f",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>🎤</div>
          </div>
          <div style={{ display:"flex",gap:8,marginTop:10 }}>
            {["📎 PDF","🎤 Voice","🌍 37 langs"].map(tag => (
              <span key={tag} style={{ fontSize:11,padding:"3px 9px",background:"var(--cdim)",border:"1px solid rgba(0,229,255,.18)",borderRadius:20,color:"var(--cyan)",fontWeight:600 }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="lp-stats">
        {STATS.map((s, i) => (
          <div key={i} style={{ textAlign:"center" }}>
            <div className="lp-stat-val">{s.value}</div>
            <div className="lp-stat-lbl">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section id="feat" className="lp-features">
        <h2 style={{ fontSize:"clamp(26px,4vw,48px)",fontWeight:800,textAlign:"center",marginBottom:12 }}>
          Everything You Need to <span className="lp-grad">Communicate Globally</span>
        </h2>
        <p style={{ color:"var(--muted)",textAlign:"center",fontSize:17,marginBottom:60,maxWidth:540,margin:"0 auto 56px" }}>
          One AI-powered platform for all your language needs
        </p>
        <div className="lp-feat-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="lp-feat-card" style={{ animationDelay:`${i * .07}s` }}>
              <div style={{ fontSize:38,marginBottom:16 }}>{f.icon}</div>
              <h3 style={{ fontSize:18,fontWeight:700,marginBottom:10 }}>{f.title}</h3>
              <p style={{ color:"var(--muted)",fontSize:14,lineHeight:1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:"88px clamp(16px,5vw,80px)",background:"var(--deep)",borderTop:"1px solid var(--border)",borderBottom:"1px solid var(--border)" }}>
        <div style={{ maxWidth:900,margin:"0 auto" }}>
          <h2 style={{ fontSize:"clamp(24px,4vw,42px)",fontWeight:800,textAlign:"center",marginBottom:56 }}>
            How It <span className="lp-grad">Works</span>
          </h2>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:24 }}>
            {[
              { step:"01", title:"Sign Up", desc:"Create a free account or sign in with Google. No credit card needed." },
              { step:"02", title:"Start Chatting", desc:"Type or speak in any language. The AI responds in your chosen target language." },
              { step:"03", title:"Upload Files", desc:"Drop a PDF, Word doc, or text file. Get a translated PDF to download." },
              { step:"04", title:"Review History", desc:"All conversations are saved to your account. Resume any chat anytime." },
            ].map((s, i) => (
              <div key={i} style={{ background:"var(--raised)",borderRadius:20,padding:28,border:"1px solid var(--border)",position:"relative",overflow:"hidden" }}>
                <div style={{ fontSize:48,fontWeight:900,color:"rgba(0,229,255,.08)",position:"absolute",top:-8,right:12,lineHeight:1 }}>{s.step}</div>
                <div style={{ fontSize:13,color:"var(--cyan)",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:".08em" }}>Step {s.step}</div>
                <div style={{ fontSize:17,fontWeight:700,marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:14,color:"var(--muted)",lineHeight:1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-cta-box">
          <h2 style={{ fontSize:"clamp(26px,5vw,48px)",fontWeight:800,marginBottom:16 }}>
            Start Speaking Every Language Today
          </h2>
          <p style={{ color:"var(--muted)",fontSize:18,marginBottom:36,maxWidth:480,margin:"0 auto 36px" }}>
            Free to use. Just add your Groq API key and MongoDB connection.
          </p>
          <button className="lp-btn-primary lg" onClick={onGetStarted}>Get Started Free →</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:8 }}>
          <span style={{ fontSize:26 }}>🌐</span>
          <span style={{ fontWeight:700,fontSize:18 }}>LinguaAI</span>
        </div>
        <p style={{ color:"var(--muted)",fontSize:13 }}>Built with React + Express + Groq AI + MongoDB</p>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   AUTH PAGE
════════════════════════════════════════════════════════ */
function AuthPage({ onAuth }) {
  // screen: "main" | "forgot" | "forgot-sent" | "reset"
  const [screen, setScreen] = useState("main");
  const [mode,   setMode]   = useState("signin");
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [pass,   setPass]   = useState("");
  const [pass2,  setPass2]  = useState("");
  const [resetToken, setResetToken] = useState("");
  const [err,    setErr]    = useState("");
  const [info,   setInfo]   = useState("");
  const [busy,   setBusy]   = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    api.googleStatus().then(d => setGoogleEnabled(d.enabled)).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    const login  = params.get("login");
    const reset  = params.get("reset");
    if (token && login === "google") {
      api._set(token);
      window.history.replaceState({}, "", "/");
      api.me().then(d => onAuth(d.user)).catch(() => setErr("Google sign-in failed."));
    }
    if (reset) {
      // ?reset=TOKEN — user clicked email link
      setResetToken(reset);
      setScreen("reset");
      window.history.replaceState({}, "", "/");
    }
    if (params.get("auth") === "error") {
      window.history.replaceState({}, "", "/");
      setErr("Google sign-in was cancelled or failed. Please try again.");
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setInfo(""); setBusy(true);
    try {
      const user = mode === "signin"
        ? await api.signin(email, pass)
        : await api.signup(name, email, pass);
      onAuth(user);
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  const submitForgot = async (e) => {
    e.preventDefault(); setErr(""); setInfo(""); setBusy(true);
    try {
      await api.forgotPassword(email);
      setScreen("forgot-sent");
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  const submitReset = async (e) => {
    e.preventDefault(); setErr(""); setInfo(""); setBusy(true);
    if (pass !== pass2) { setErr("Passwords do not match."); setBusy(false); return; }
    if (pass.length < 8) { setErr("Password must be at least 8 characters."); setBusy(false); return; }
    try {
      await api.resetPassword(resetToken, pass);
      setInfo("✅ Password reset! You can now sign in.");
      setScreen("main"); setMode("signin"); setPass(""); setPass2("");
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  const handleGoogle = () => { window.location.href = "/api/auth/google"; };

  const authStyles = `
    .auth-orb { position:absolute;border-radius:50%;pointer-events:none; }
    .auth-card { width:min(440px,100%);background:var(--raised);border:1px solid var(--border);border-radius:28px;padding:clamp(28px,5vw,44px) clamp(20px,5vw,40px);animation:slideUp .45s ease;position:relative;z-index:1;box-shadow:0 32px 80px rgba(0,0,0,.55); }
    .auth-toggle { display:flex;background:var(--surface);border-radius:14px;padding:4px;margin-bottom:24px;gap:4px; }
    .auth-toggle button { flex:1;padding:10px;border-radius:11px;border:none;background:none;color:var(--muted);font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;font-family:var(--font); }
    .auth-toggle button.on { background:var(--raised);color:var(--cyan);box-shadow:0 2px 8px rgba(0,0,0,.2); }
    .auth-field { position:relative; }
    .auth-icon { position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none;z-index:1; }
    .auth-eye  { position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:15px;cursor:pointer;z-index:1;background:none;border:none;color:var(--muted);padding:0;line-height:1; }
    .auth-input { width:100%;padding:13px 44px 13px 44px;background:var(--surface);border:1px solid var(--border);border-radius:13px;color:var(--text);font-size:15px;font-family:var(--font);outline:none;transition:border-color .2s,box-shadow .2s; }
    .auth-input.no-left { padding-left:14px; }
    .auth-input:focus { border-color:rgba(0,229,255,.5);box-shadow:0 0 0 3px rgba(0,229,255,.08); }
    .auth-input::placeholder { color:var(--faint); }
    .auth-err  { background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.3);border-radius:10px;padding:10px 14px;color:var(--rose);font-size:13px;animation:shake .4s ease; }
    .auth-info { background:rgba(0,229,255,.07);border:1px solid rgba(0,229,255,.25);border-radius:10px;padding:10px 14px;color:var(--cyan);font-size:13px; }
    .auth-submit { width:100%;padding:14px;border-radius:14px;background:linear-gradient(135deg,var(--cyan),#00b8cc);border:none;color:#05050f;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .2s,transform .15s;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:8px; }
    .auth-submit:hover:not(:disabled) { transform:translateY(-1px); }
    .auth-submit:disabled { opacity:.6;cursor:not-allowed; }
    .auth-spin { width:20px;height:20px;border:2px solid rgba(0,0,0,.2);border-top:2px solid #05050f;border-radius:50%;animation:spin .7s linear infinite;display:inline-block; }
    .auth-link { background:none;border:none;color:var(--cyan);font-size:13px;cursor:pointer;text-decoration:underline;font-family:var(--font);padding:0; }
    .auth-link:hover { color:var(--green); }
    .auth-back { display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;font-family:var(--font);padding:0;margin-bottom:20px; }
    .auth-back:hover { color:var(--text); }
  `;

  const Logo = () => (
    <div style={{ textAlign:"center",marginBottom:28 }}>
      <div style={{ fontSize:48,marginBottom:8 }}>🌐</div>
      <div style={{ fontSize:26,fontWeight:800,background:"linear-gradient(135deg,var(--cyan),var(--green))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>LinguaAI</div>
      <div style={{ color:"var(--muted)",fontSize:14,marginTop:4 }}>Multilingual AI Assistant</div>
    </div>
  );

  const Orbs = () => (
    <>
      <div className="auth-orb" style={{ width:600,height:600,top:"-20%",left:"-15%",background:"radial-gradient(circle,rgba(0,229,255,.1) 0%,transparent 70%)",animation:"orbDrift 9s ease-in-out infinite" }}/>
      <div className="auth-orb" style={{ width:450,height:450,bottom:"-15%",right:"-10%",background:"radial-gradient(circle,rgba(167,139,250,.09) 0%,transparent 70%)",animation:"orbDrift 11s ease-in-out infinite reverse" }}/>
    </>
  );

  /* ── Forgot Password — enter email ── */
  if (screen === "forgot") return (
    <div style={{ width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--void)",position:"relative",overflow:"hidden",padding:"16px" }}>
      <style>{authStyles}</style>
      <Orbs/>
      <div className="auth-card">
        <button className="auth-back" onClick={() => { setScreen("main"); setErr(""); }}>← Back to Sign In</button>
        <Logo/>
        <div style={{ marginBottom:20,color:"var(--muted)",fontSize:14,lineHeight:1.6 }}>
          Enter your account email and we'll send you a link to reset your password.
        </div>
        <form onSubmit={submitForgot} style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div className="auth-field">
            <span className="auth-icon">✉️</span>
            <input className="auth-input" type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
          </div>
          {err && <div className="auth-err">{err}</div>}
          <button className="auth-submit" type="submit" disabled={busy} style={{ marginTop:4 }}>
            {busy ? <span className="auth-spin"/> : "Send Reset Link →"}
          </button>
        </form>
      </div>
    </div>
  );

  /* ── Forgot Password — email sent ── */
  if (screen === "forgot-sent") return (
    <div style={{ width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--void)",position:"relative",overflow:"hidden",padding:"16px" }}>
      <style>{authStyles}</style>
      <Orbs/>
      <div className="auth-card" style={{ textAlign:"center" }}>
        <div style={{ fontSize:56,marginBottom:16 }}>📬</div>
        <div style={{ fontSize:22,fontWeight:800,color:"var(--text)",marginBottom:10 }}>Check your inbox</div>
        <div style={{ color:"var(--muted)",fontSize:14,lineHeight:1.7,marginBottom:24 }}>
          We sent a password reset link to <strong style={{ color:"var(--cyan)" }}>{email}</strong>.<br/>
          Click the link in the email to set a new password.<br/>
          <span style={{ fontSize:12 }}>Didn't get it? Check spam, or try again.</span>
        </div>
        <button className="auth-submit" onClick={() => { setScreen("forgot"); setErr(""); }}>Try a different email</button>
        <div style={{ marginTop:14 }}>
          <button className="auth-link" onClick={() => { setScreen("main"); setErr(""); }}>Back to Sign In</button>
        </div>
      </div>
    </div>
  );

  /* ── Reset Password — set new password ── */
  if (screen === "reset") return (
    <div style={{ width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--void)",position:"relative",overflow:"hidden",padding:"16px" }}>
      <style>{authStyles}</style>
      <Orbs/>
      <div className="auth-card">
        <Logo/>
        <div style={{ marginBottom:20,color:"var(--muted)",fontSize:14 }}>Enter a new password for your account.</div>
        <form onSubmit={submitReset} style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div className="auth-field">
            <span className="auth-icon">🔒</span>
            <input className="auth-input" type={showPass?"text":"password"} placeholder="New password (min 8 chars)" value={pass} onChange={e => setPass(e.target.value)} required autoComplete="new-password"/>
            <button type="button" className="auth-eye" onClick={() => setShowPass(p => !p)}>{showPass ? "🙈" : "👁"}</button>
          </div>
          <div className="auth-field">
            <span className="auth-icon">🔒</span>
            <input className="auth-input" type={showPass?"text":"password"} placeholder="Confirm new password" value={pass2} onChange={e => setPass2(e.target.value)} required autoComplete="new-password"/>
          </div>
          {err  && <div className="auth-err">{err}</div>}
          {info && <div className="auth-info">{info}</div>}
          <button className="auth-submit" type="submit" disabled={busy} style={{ marginTop:4 }}>
            {busy ? <span className="auth-spin"/> : "Set New Password →"}
          </button>
        </form>
      </div>
    </div>
  );

  /* ── Main: Sign In / Sign Up ── */
  return (
    <div style={{ width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--void)",position:"relative",overflow:"hidden",padding:"16px" }}>
      <style>{authStyles}</style>
      <Orbs/>
      <div className="auth-card">
        <Logo/>
        {googleEnabled && (
          <>
            <button className="google-btn" onClick={handleGoogle} style={{ marginBottom:16 }}>
              <GoogleIcon/> Continue with Google
            </button>
            <div className="divider" style={{ marginBottom:16 }}>or</div>
          </>
        )}
        <div className="auth-toggle">
          <button className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setErr(""); setInfo(""); }}>Sign In</button>
          <button className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setErr(""); setInfo(""); }}>Sign Up</button>
        </div>
        <form onSubmit={submit} style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {mode === "signup" && (
            <div className="auth-field">
              <span className="auth-icon">👤</span>
              <input className="auth-input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required autoComplete="name"/>
            </div>
          )}
          <div className="auth-field">
            <span className="auth-icon">✉️</span>
            <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
          </div>
          <div className="auth-field">
            <span className="auth-icon">🔒</span>
            <input className="auth-input" type={showPass?"text":"password"} placeholder="Password (min 8 chars)" value={pass} onChange={e => setPass(e.target.value)} required autoComplete={mode === "signup" ? "new-password" : "current-password"}/>
            <button type="button" className="auth-eye" onClick={() => setShowPass(p => !p)}>{showPass ? "🙈" : "👁"}</button>
          </div>
          {err  && <div className="auth-err">{err}</div>}
          {info && <div className="auth-info">{info}</div>}
          <button className="auth-submit" type="submit" disabled={busy} style={{ marginTop:4 }}>
            {busy ? <span className="auth-spin"/> : mode === "signin" ? "Sign In →" : "Create Account →"}
          </button>
        </form>
        {mode === "signin" && (
          <div style={{ textAlign:"center",marginTop:12 }}>
            <button className="auth-link" onClick={() => { setScreen("forgot"); setErr(""); }}>Forgot your password?</button>
          </div>
        )}
        <div style={{ textAlign:"center",marginTop:16,color:"var(--muted)",fontSize:13 }}>
          Demo: <code style={{ color:"var(--cyan)",background:"var(--surface)",padding:"2px 6px",borderRadius:6 }}>demo@lingua.ai</code> / <code style={{ color:"var(--cyan)",background:"var(--surface)",padding:"2px 6px",borderRadius:6 }}>demo1234</code>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SIDEBAR
════════════════════════════════════════════════════════ */
function Sidebar({ open, onToggle, convs, convId, onSelect, onNew, onDelete, deleteConfirm, setDeleteConfirm, user, ttsEnabled, onToggleTts, onSignout }) {
  return (
    <div style={{ width:open?252:58,minWidth:open?252:58,display:"flex",flexDirection:"column",background:"var(--deep)",borderRight:"1px solid var(--border)",height:"100vh",transition:"width .3s,min-width .3s",overflow:"hidden",flexShrink:0 }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 12px",borderBottom:"1px solid var(--border)",flexShrink:0 }}>
        {open && <span style={{ fontSize:17,fontWeight:800,background:"linear-gradient(135deg,var(--cyan),var(--green))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap" }}>🌐 LinguaAI</span>}
        <button onClick={onToggle} style={{ display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:8,background:"var(--surface)",border:"1px solid var(--border)",color:"var(--muted)",cursor:"pointer",flexShrink:0,fontSize:13 }}>
          {open ? "◀" : "▶"}
        </button>
      </div>

      {/* New chat */}
      <button onClick={onNew} style={{ display:"flex",alignItems:"center",gap:10,margin:"10px 8px 4px",padding:"10px 13px",background:"var(--cdim)",border:"1px solid rgba(0,229,255,.2)",borderRadius:12,color:"var(--cyan)",cursor:"pointer",fontSize:14,fontWeight:600,whiteSpace:"nowrap",flexShrink:0,fontFamily:"var(--font)",justifyContent:open?"flex-start":"center" }}>
        <span>✏️</span>{open && <span>New Chat</span>}
      </button>

      {/* History list */}
      {open && (
        <div className="scroll" style={{ flex:1,padding:"0 8px 8px" }}>
          <div style={{ fontSize:11,color:"var(--muted)",padding:"10px 8px 5px",textTransform:"uppercase",letterSpacing:".07em",fontWeight:700 }}>Chat History</div>
          {convs.length === 0
            ? <div style={{ color:"var(--muted)",fontSize:13,padding:"20px 10px",textAlign:"center",lineHeight:1.6 }}>No conversations yet.<br/>Start a new chat! 🚀</div>
            : convs.map(c => {
                const id = c.id || c._id, active = convId === id;
                return (
                  <div key={id} style={{ marginBottom:3 }}>
                    {deleteConfirm === id ? (
                      <div style={{ background:"rgba(255,107,157,.1)",border:"1px solid rgba(255,107,157,.25)",borderRadius:10,padding:"8px 10px" }}>
                        <div style={{ fontSize:12,color:"var(--text)",marginBottom:8 }}>Delete this chat?</div>
                        <div style={{ display:"flex",gap:6 }}>
                          <button onClick={() => onDelete(id)} style={{ flex:1,padding:"5px 0",background:"var(--rose)",border:"none",borderRadius:7,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"var(--font)" }}>Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ flex:1,padding:"5px 0",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:7,color:"var(--muted)",fontSize:12,cursor:"pointer",fontFamily:"var(--font)" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => onSelect(id)} style={{ padding:"9px 12px",borderRadius:10,background:active?"var(--raised)":"transparent",border:`1px solid ${active?"rgba(0,229,255,.18)":"transparent"}`,cursor:"pointer",transition:"background .15s" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:4 }}>
                          <div style={{ fontSize:13,fontWeight:500,color:active?"var(--cyan)":"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1 }}>{c.title || "Conversation"}</div>
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(id); }} style={{ background:"none",border:"none",color:"var(--faint)",cursor:"pointer",fontSize:13,padding:"0 2px",flexShrink:0 }}>🗑</button>
                        </div>
                        <div style={{ fontSize:11,color:"var(--muted)",marginTop:2 }}>{c.messageCount || 0} messages</div>
                        {c.lastMessage && <div style={{ fontSize:11,color:"var(--faint)",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{c.lastMessage}</div>}
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Footer */}
      <div style={{ padding:"10px 10px",borderTop:"1px solid var(--border)",flexShrink:0 }}>
        {open && (
          <>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"6px 8px" }}>
              {user.picture
                ? <img src={user.picture} alt="" style={{ width:28,height:28,borderRadius:"50%",objectFit:"cover" }}/>
                : <span style={{ fontSize:20 }}>{user.avatar || "🌟"}</span>
              }
              <div style={{ overflow:"hidden" }}>
                <div style={{ fontSize:13,fontWeight:600,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{user.name}</div>
                <div style={{ fontSize:11,color:"var(--muted)" }}>{user.plan || "Free"} Plan</div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 8px",marginBottom:8 }}>
              <span style={{ fontSize:12,color:"var(--muted)" }}>Auto-speak replies</span>
              <button onClick={onToggleTts} style={{ width:40,height:22,borderRadius:11,background:ttsEnabled?"var(--green)":"var(--faint)",border:"none",cursor:"pointer",transition:"background .2s",position:"relative" }}>
                <span style={{ position:"absolute",top:3,left:ttsEnabled?20:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s" }}/>
              </button>
            </div>
          </>
        )}
        <button onClick={onSignout} style={{ display:"flex",alignItems:"center",gap:6,width:"100%",justifyContent:open?"flex-start":"center",background:"none",border:"none",color:"var(--rose)",cursor:"pointer",fontSize:13,padding:"8px 8px",borderRadius:8,fontFamily:"var(--font)",transition:"background .15s" }}>
          🚪{open && " Sign Out"}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   FILE RESULT CARD (in chat)
════════════════════════════════════════════════════════ */
function FileResultCard({ result, onSpeak, speakingId, targetLang }) {
  const downloadPdf = () => {
    const a = document.createElement("a");
    a.href = result.pdfDownloadUrl;
    a.download = `translated_${result.fileName?.replace(/\.[^.]+$/, "")}_${result.targetLanguage}.pdf`;
    a.click();
  };

  if (result.error) return (
    <div style={{ background:"rgba(255,107,157,.1)",border:"1px solid rgba(255,107,157,.25)",borderRadius:14,padding:16,fontSize:14 }}>
      ❌ {result.error}
    </div>
  );

  return (
    <div style={{ background:"var(--raised)",border:"1px solid rgba(0,229,255,.18)",borderRadius:14,padding:18,animation:"fadeUp .3s ease" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:14 }}>
        <div>
          <div style={{ fontWeight:700,color:"var(--green)",fontSize:14 }}>✅ {result.fileName}</div>
          <div style={{ fontSize:12,color:"var(--muted)",marginTop:3 }}>{result.wordCount?.toLocaleString()} words · Translated to {result.targetLanguage}</div>
        </div>
        {result.pdfDownloadUrl && (
          <button onClick={downloadPdf} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:"linear-gradient(135deg,var(--cyan),#00b8cc)",border:"none",borderRadius:10,color:"#05050f",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"var(--font)" }}>
            ⬇️ Download PDF
          </button>
        )}
      </div>
      <div style={{ fontSize:12,color:"var(--muted)",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em",fontWeight:600 }}>Preview</div>
      <div style={{ whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.7,maxHeight:200,overflowY:"auto",background:"var(--surface)",borderRadius:10,padding:14,color:"var(--text)" }}>
        {result.translation?.substring(0, 1500)}{result.translation?.length > 1500 ? "…" : ""}
      </div>
      <div style={{ display:"flex",gap:6,marginTop:10 }}>
        <button onClick={() => navigator.clipboard?.writeText(result.translation)} style={{ background:"none",border:"none",color:"var(--muted)",fontSize:12,cursor:"pointer",padding:"2px 6px",borderRadius:6,fontFamily:"var(--font)" }}>📋 Copy</button>
        <button onClick={() => onSpeak(result.translation, "file", targetLang)} style={{ background:"none",border:"none",color:speakingId==="file"?"var(--cyan)":"var(--muted)",fontSize:12,cursor:"pointer",padding:"2px 6px",borderRadius:6,fontFamily:"var(--font)" }}>
          {speakingId === "file" ? "⏹ Stop" : "🔊 Listen"}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   CHAT PANEL
════════════════════════════════════════════════════════ */
function ChatPanel({ user, msgs, loading, input, setInput, onSend, onKeyDown, targetLang, setTargetLang, attachedFile, onAttachFile, onRemoveFile, onSpeak, speakingId, isListening, onMic, fileInputRef, convId }) {
  const msgEnd  = useRef(null);
  const taRef   = useRef(null);
  const [chatDrag, setChatDrag] = useState(false);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  // Auto-resize textarea
  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + "px";
  }, [input]);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",position:"relative" }}
      onDragOver={e => { e.preventDefault(); setChatDrag(true); }}
      onDragLeave={() => setChatDrag(false)}
      onDrop={e => { e.preventDefault(); setChatDrag(false); const f = e.dataTransfer.files[0]; if (f) onAttachFile(f); }}
    >
      {/* Drag overlay */}
      {chatDrag && (
        <div style={{ position:"absolute",inset:0,background:"rgba(0,229,255,.06)",border:"2px dashed var(--cyan)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",borderRadius:8,backdropFilter:"blur(4px)" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:48,marginBottom:8 }}>📎</div>
            <div style={{ color:"var(--cyan)",fontWeight:700,fontSize:18 }}>Drop to translate</div>
            <div style={{ color:"var(--muted)",fontSize:13,marginTop:4 }}>PDF, DOCX, TXT, CSV supported</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="chat-hdr-inner" style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px",borderBottom:"1px solid var(--border)",background:"var(--deep)",flexShrink:0,gap:10 }}>
        <div>
          <div style={{ fontWeight:600,fontSize:15 }}>{convId ? "Conversation" : "New Chat"}</div>
          <div style={{ fontSize:12,color:"var(--muted)",marginTop:1 }}>LLaMA 3 · {msgs.length} messages · Drag files to chat</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:12,color:"var(--muted)" }}>Reply in:</span>
          <select value={targetLang} onChange={e => setTargetLang(e.target.value)} style={{ background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,color:"var(--text)",padding:"8px 12px",fontSize:13,outline:"none",cursor:"pointer",fontFamily:"var(--font)" }}>
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="scroll" style={{ flex:1,padding:"16px 16px 8px" }}>
        {/* Welcome state */}
        {msgs.length === 0 && !loading && (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16,padding:24,textAlign:"center" }}>
            <div style={{ fontSize:56 }}>🌐</div>
            <div style={{ fontSize:20,fontWeight:700 }}>Start a conversation</div>
            <div style={{ color:"var(--muted)",fontSize:15,maxWidth:420,lineHeight:1.7 }}>
              Type in any language, attach a file to translate it, or use the mic to speak. I'll respond in <strong style={{ color:"var(--cyan)" }}>{targetLang}</strong>.
            </div>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginTop:8 }}>
              {["Say hello in French 🇫🇷","Translate a document 📄","Tell me a joke in Spanish 😄","How do you say 'Thank you' in Japanese?"].map(p => (
                <button key={p} onClick={() => setInput(p)} style={{ padding:"8px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:20,color:"var(--muted)",fontSize:13,cursor:"pointer",fontFamily:"var(--font)",transition:"border-color .2s,color .2s" }}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map(m => (
          <div key={m.id || Math.random()} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:16,animation:"fadeUp .3s ease",gap:8,alignItems:"flex-end" }}>
            {m.role !== "user" && (
              <div style={{ width:34,height:34,borderRadius:"50%",background:"var(--cdim)",border:"1px solid rgba(0,229,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>
                {m.role === "error" ? "⚠️" : "🌐"}
              </div>
            )}
            <div style={{ maxWidth:"min(74%,640px)" }}>
              {m.fileResult ? (
                <FileResultCard result={m.fileResult} onSpeak={onSpeak} speakingId={speakingId} targetLang={targetLang}/>
              ) : (
                <div style={{ padding:"12px 16px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?"linear-gradient(135deg,var(--cyan),#00c8e0)":m.role==="error"?"rgba(255,107,157,.12)":"var(--raised)",color:m.role==="user"?"#05050f":"var(--text)",fontSize:15,lineHeight:1.7,boxShadow:m.role==="user"?"0 4px 20px rgba(0,229,255,.2)":"none",whiteSpace:"pre-wrap",wordBreak:"break-word",border:m.role==="assistant"?"1px solid var(--border)":"none" }}>
                  {m.content}
                </div>
              )}
              <div style={{ display:"flex",gap:4,marginTop:4,justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                <button onClick={() => navigator.clipboard?.writeText(m.content || "")} style={{ background:"none",border:"none",color:"var(--faint)",fontSize:11,cursor:"pointer",padding:"1px 5px",borderRadius:5,fontFamily:"var(--font)" }} title="Copy">📋</button>
                {m.role === "assistant" && (
                  <button onClick={() => onSpeak(m.content, m.id, targetLang)} style={{ background:"none",border:"none",color:speakingId===m.id?"var(--cyan)":"var(--faint)",fontSize:11,cursor:"pointer",padding:"1px 5px",borderRadius:5,fontFamily:"var(--font)" }} title="Read aloud">
                    {speakingId === m.id ? "⏹" : "🔊"}
                  </button>
                )}
              </div>
            </div>
            {m.role === "user" && (
              <div style={{ width:34,height:34,borderRadius:"50%",background:"var(--surface)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>
                {user.picture ? <img src={user.picture} style={{ width:34,height:34,borderRadius:"50%",objectFit:"cover" }} alt=""/> : (user.avatar || "🌟")}
              </div>
            )}
          </div>
        ))}

        {/* AI typing indicator */}
        {loading && (
          <div style={{ display:"flex",alignItems:"flex-end",gap:8,marginBottom:16,animation:"fadeUp .3s ease" }}>
            <div style={{ width:34,height:34,borderRadius:"50%",background:"var(--cdim)",border:"1px solid rgba(0,229,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>🌐</div>
            <div style={{ display:"flex",gap:5,alignItems:"center",background:"var(--raised)",padding:"14px 18px",borderRadius:"18px 18px 18px 4px",border:"1px solid var(--border)" }}>
              {[0,1,2].map(i => <span key={i} style={{ width:7,height:7,borderRadius:"50%",background:"var(--cyan)",display:"inline-block",animation:"pulse 1.2s ease infinite",animationDelay:`${i*.2}s`,opacity:.6 }}/>)}
            </div>
          </div>
        )}
        <div ref={msgEnd}/>
      </div>

      {/* Attached file preview */}
      {attachedFile && (
        <div style={{ margin:"0 14px 6px",padding:"10px 14px",background:"var(--raised)",border:"1px solid rgba(0,229,255,.2)",borderRadius:12,display:"flex",alignItems:"center",gap:10,fontSize:13 }}>
          <span style={{ fontSize:20 }}>📎</span>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ color:"var(--cyan)",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{attachedFile.name}</div>
            <div style={{ color:"var(--muted)",fontSize:11,marginTop:2 }}>{(attachedFile.size/1024).toFixed(0)} KB · Will be translated to {targetLang}</div>
          </div>
          <button onClick={onRemoveFile} style={{ background:"none",border:"none",color:"var(--rose)",cursor:"pointer",fontSize:20,padding:0,lineHeight:1,flexShrink:0 }}>×</button>
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding:"10px 14px 12px",borderTop:"1px solid var(--border)",background:"var(--deep)" }}>
        {isListening && (
          <div style={{ marginBottom:8,padding:"6px 12px",background:"rgba(255,107,157,.1)",border:"1px solid rgba(255,107,157,.25)",borderRadius:8,fontSize:13,color:"var(--rose)",display:"flex",alignItems:"center",gap:8,animation:"pulse 1.5s ease infinite" }}>
            <span>🎤</span> Listening in {targetLang}… speak now
          </div>
        )}
        <div style={{ display:"flex",gap:8,alignItems:"flex-end" }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ width:38,height:38,borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }} title="Attach file">📎</button>
          <input ref={fileInputRef} type="file" style={{ display:"none" }} accept=".pdf,.txt,.md,.docx,.doc,.csv"
            onChange={e => { if (e.target.files[0]) onAttachFile(e.target.files[0]); e.target.value = ""; }}/>
          <textarea
            ref={taRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isListening ? "🎤 Listening…" : "Type in any language, or attach a file…"}
            rows={1}
            style={{ flex:1,background:"var(--surface)",border:`1px solid ${isListening?"rgba(255,107,157,.4)":"var(--border)"}`,borderRadius:14,padding:"11px 14px",color:"var(--text)",fontSize:15,fontFamily:"var(--font)",resize:"none",outline:"none",lineHeight:1.5,maxHeight:120,overflowY:"auto",transition:"border-color .2s,box-shadow .2s",boxShadow:isListening?"0 0 0 3px rgba(255,107,157,.08)":"none" }}
          />
          <button onClick={onMic} style={{ width:38,height:38,borderRadius:10,background:isListening?"rgba(255,107,157,.12)":"var(--surface)",border:`1px solid ${isListening?"rgba(255,107,157,.4)":"var(--border)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,transition:"all .2s" }} title="Voice input">
            {isListening ? "⏹" : "🎤"}
          </button>
          <button onClick={onSend} disabled={loading || (!input.trim() && !attachedFile)} style={{ width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,var(--cyan),#00b8cc)",border:"none",color:"#05050f",fontSize:18,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:(loading||(!input.trim()&&!attachedFile))?0.45:1,transition:"opacity .2s,transform .15s" }}>
            {loading ? <span style={{ width:18,height:18,border:"2px solid rgba(0,0,0,.2)",borderTop:"2px solid #05050f",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite" }}/> : "→"}
          </button>
        </div>
        <div style={{ display:"flex",justifyContent:"center",gap:16,marginTop:7,fontSize:11,color:"var(--faint)" }}>
          <span>Enter to send · Shift+Enter new line</span>
          <span>·</span>
          <span>📎 Attach file to translate it</span>
          <span>·</span>
          <span>🎤 Voice in {targetLang}</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   CHAT APP (main layout)
════════════════════════════════════════════════════════ */
function ChatApp({ user, onSignout }) {
  const [convs,         setConvs]         = useState([]);
  const [convId,        setConvId]        = useState(null);
  const [msgs,          setMsgs]          = useState([]);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [targetLang,    setTargetLang]    = useState("English");
  const [sideOpen,      setSideOpen]      = useState(window.innerWidth > 1024);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [ttsEnabled,    setTtsEnabled]    = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const [speakingId,    setSpeakingId]    = useState(null);
  const [attachedFile,  setAttachedFile]  = useState(null);
  const [aiProvider,    setAiProvider]    = useState("groq");

  const recognitionRef = useRef(null);
  const fileInputRef   = useRef(null);

  const loadConvs = useCallback(async () => {
    try { const d = await api.getConvs(); setConvs(d.conversations || []); } catch {}
  }, []);
  useEffect(() => { loadConvs(); }, [loadConvs]);

  const selectConv = async (id) => {
    setConvId(id); setMsgs([]);
    try { const d = await api.getMsgs(id); setMsgs(d.messages || []); } catch {}
    // Close sidebar on mobile
    if (window.innerWidth <= 600) setSideOpen(false);
  };

  const newChat = () => { setConvId(null); setMsgs([]); setInput(""); setAttachedFile(null); };

  const deleteConv = async (id) => {
    try { await api.delConv(id); } catch {}
    if (convId === id) newChat();
    setConvs(prev => prev.filter(c => (c.id || c._id) !== id));
    setDeleteConfirm(null);
  };

  /* ── TTS ── */
  const speakText = useCallback((text, id, lang = "English") => {
    if (!window.speechSynthesis) return;
    if (speakingId === id) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
    window.speechSynthesis.cancel();
    const doSpeak = () => {
      const u = new SpeechSynthesisUtterance(text);
      // Always set lang so the browser uses the right phoneme engine
      u.lang = LANG_BCP47[lang] || "en-US";
      // Assign a matching voice if one exists — if not, the browser still
      // honours u.lang and will speak using its built-in engine for that language.
      // Never leave u.voice unset only to silence the speech.
      const voice = pickVoice(lang);
      if (voice) u.voice = voice;
      u.rate = 0.9;
      u.pitch = 1;
      u.onstart  = () => setSpeakingId(id);
      u.onend    = () => setSpeakingId(null);
      u.onerror  = (e) => { console.warn("TTS error:", e.error, "lang:", u.lang); setSpeakingId(null); };
      window.speechSynthesis.speak(u);
    };
    // Voices list may be empty on first call — wait for it to load
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", function onVoices() {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
        doSpeak();
      });
    } else {
      doSpeak();
    }
  }, [speakingId]);

  /* ── STT ── */
  const handleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Use Chrome or Edge."); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false;
    rec.lang = LANG_BCP47[targetLang] || "en-US";
    rec.onstart  = () => setIsListening(true);
    rec.onend    = () => setIsListening(false);
    rec.onerror  = () => setIsListening(false);
    rec.onresult = (e) => setInput(p => (p ? p + " " : "") + e.results[0][0].transcript);
    recognitionRef.current = rec;
    rec.start();
  };

  const handleAttachFile = (file) => {
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10 MB."); return; }
    const ok = [".pdf",".txt",".md",".docx",".doc",".csv"];
    if (!ok.some(ext => file.name.toLowerCase().endsWith(ext))) { alert("Supported: PDF, DOCX, TXT, MD, CSV"); return; }
    setAttachedFile(file);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !attachedFile) || loading) return;
    setInput(""); setLoading(true);

    // If there's a file, upload and translate it
    if (attachedFile) {
      const file = attachedFile;
      setAttachedFile(null);
      const userContent = text ? `📎 ${file.name}\n${text}` : `📎 Translating: ${file.name}`;
      const tmpId = `t${Date.now()}`;
      setMsgs(prev => [...prev, { id: tmpId, role:"user", content: userContent }]);
      try {
        const result = await api.uploadFile(file, targetLang, aiProvider);
        const aiMsg = { id: `a${Date.now()}`, role:"assistant", content:`✅ File translated! Here's the result for **${file.name}**:`, fileResult: result };
        setMsgs(prev => [...prev.filter(m => m.id !== tmpId), { id: tmpId, role:"user", content: userContent }, aiMsg]);
        if (!convId) {
          // Save a "file translation" conversation entry
          api.send(null, userContent, targetLang, aiProvider).then(d => { setConvId(d.conversationId); loadConvs(); }).catch(() => {});
        }
        loadConvs();
      } catch (ex) {
        setMsgs(prev => [...prev.filter(m => m.id !== tmpId),
          { id: tmpId, role:"user", content: userContent },
          { id:`e${Date.now()}`, role:"error", content:"❌ " + ex.message }]);
      }
      setLoading(false);
      return;
    }

    // Regular text message
    const tmpId = `t${Date.now()}`;
    setMsgs(prev => [...prev, { id: tmpId, role:"user", content: text }]);
    try {
      const d = await api.send(convId, text, targetLang, aiProvider);
      if (!convId) setConvId(d.conversationId);
      loadConvs();
      setMsgs(prev => [...prev.filter(m => m.id !== tmpId), d.userMessage, d.assistantMessage]);
      if (ttsEnabled && d.assistantMessage?.content) speakText(d.assistantMessage.content, d.assistantMessage.id, targetLang);
    } catch (ex) {
      setMsgs(prev => [...prev.filter(m => m.id !== tmpId),
        { id: tmpId, role:"user", content: text },
        { id:`e${Date.now()}`, role:"error", content:"❌ " + ex.message }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <div style={{ display:"flex",width:"100%",height:"100vh",overflow:"hidden" }}>
      {/* Sidebar — desktop */}
      <div className="dshow">
        <Sidebar open={sideOpen} onToggle={() => setSideOpen(p => !p)} convs={convs} convId={convId} onSelect={selectConv} onNew={newChat} onDelete={deleteConv} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} user={user} ttsEnabled={ttsEnabled} onToggleTts={() => setTtsEnabled(p => !p)} onSignout={onSignout}/>
      </div>

      {/* Main content */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0 }}>
        {/* Top bar */}
        <div style={{ display:"flex",alignItems:"center",padding:"0 10px",borderBottom:"1px solid var(--border)",background:"var(--deep)",gap:4,flexShrink:0,height:50 }}>
          {/* Mobile: show menu button */}
          <button className="mshow" onClick={() => setSideOpen(p => !p)} style={{ display:"none",alignItems:"center",justifyContent:"center",width:34,height:34,borderRadius:8,background:"var(--surface)",border:"1px solid var(--border)",color:"var(--muted)",cursor:"pointer",flexShrink:0 }}>☰</button>
          <div style={{ flex:1,display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:14,fontWeight:600 }}>💬 Chat</span>
            {speakingId && <span style={{ fontSize:12,color:"var(--green)",animation:"pulse 1.5s infinite" }}>🔊 Speaking…</span>}
          </div>
          <button onClick={() => setTtsEnabled(p => !p)} style={{ display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:ttsEnabled?"var(--green)":"var(--muted)",cursor:"pointer",fontSize:13,padding:"6px 8px",borderRadius:8,fontFamily:"var(--font)" }} title="Toggle auto-speak">
            {ttsEnabled ? "🔊 Auto-speak ON" : "🔇 Auto-speak"}
          </button>
          {/* AI Provider Selector */}
          <select value={aiProvider} onChange={e => setAiProvider(e.target.value)} style={{ background:"var(--surface)",border:"1px solid var(--border)",color:"var(--text)",borderRadius:8,padding:"5px 10px",fontSize:13,cursor:"pointer",fontFamily:"var(--font)",outline:"none" }} title="AI Provider">
            <option value="groq">⚡ Groq</option>
            <option value="gemini">✨ Gemini</option>
          </select>
          <button onClick={onSignout} className="d-hide" style={{ display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:"var(--rose)",cursor:"pointer",fontSize:13,padding:"6px 8px",borderRadius:8,fontFamily:"var(--font)" }}>
            🚪 Sign Out
          </button>
        </div>

        {/* Chat */}
        <div style={{ flex:1,overflow:"hidden",display:"flex",flexDirection:"column" }}>
          <ChatPanel user={user} msgs={msgs} loading={loading} input={input} setInput={setInput} onSend={sendMessage} onKeyDown={handleKeyDown} targetLang={targetLang} setTargetLang={setTargetLang} attachedFile={attachedFile} onAttachFile={handleAttachFile} onRemoveFile={() => setAttachedFile(null)} onSpeak={speakText} speakingId={speakingId} isListening={isListening} onMic={handleMic} fileInputRef={fileInputRef} convId={convId}/>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sideOpen && (
        <div className="mshow" style={{ position:"fixed",inset:0,zIndex:200,display:"none" }}>
          <div onClick={() => setSideOpen(false)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)" }}/>
          <div style={{ position:"absolute",left:0,top:0,bottom:0,width:270,zIndex:201 }}>
            <Sidebar open={true} onToggle={() => setSideOpen(false)} convs={convs} convId={convId} onSelect={selectConv} onNew={() => { newChat(); setSideOpen(false); }} onDelete={deleteConv} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} user={user} ttsEnabled={ttsEnabled} onToggleTts={() => setTtsEnabled(p => !p)} onSignout={onSignout}/>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Handle Google OAuth token from URL
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token && params.get("login") === "google") {
      api._set(token);
      window.history.replaceState({}, "", "/");
      api.me().then(d => { setUser(d.user); setPage("app"); }).catch(() => {});
      return;
    }
    // Restore session
    if (localStorage.getItem("lingua_token")) {
      api.me().then(d => { setUser(d.user); setPage("app"); }).catch(() => localStorage.removeItem("lingua_token"));
    }
  }, []);

  if (page === "landing") return <LandingPage onGetStarted={() => setPage("auth")}/>;
  if (page === "auth")    return <AuthPage onAuth={u => { setUser(u); setPage("app"); }}/>;
  return <ChatApp user={user} onSignout={() => { api.signout(); setUser(null); setPage("landing"); }}/>;
}
