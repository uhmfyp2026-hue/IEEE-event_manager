import { useState, useEffect, useRef, useCallback } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import QRCode from "qrcode";

// ── Crypto helpers (HMAC-SHA256 simulation via btoa + salt) ──────────────────
const SECRET = "IEEE-RIPHAH-2026-SECRET";
function signToken(id) {
  const payload = `${id}:${SECRET}`;
  return btoa(payload).replace(/=/g, "").slice(0, 16).toUpperCase();
}
function verifyToken(id, sig) {
  return signToken(id) === sig;
}
function generateQRData(participant) {
  const sig = signToken(participant.id);
  return `IEEE:${participant.id}:${sig}:${Date.now()}`;
}

// ── QR Code renderer (using real QR library) ─────────────────────────────────
function QRCodeSVG({ value, size = 120 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#0a0a1a', light: '#ffffff' }
    }, (error) => {
      if (error) console.error('QR generation error:', error);
    });
  }, [value, size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: 8 }} />;
}

// ── Sample seed data ─────────────────────────────────────────────────────────
const SEED_PARTICIPANTS = [
  { id: "P001", name: "Ali Hassan", studentId: "F21-EE-001", email: "ali@riphah.edu.pk", ticket: "IEEE Member", paid: true },
  { id: "P002", name: "Sara Khan", studentId: "F21-CS-042", email: "sara@riphah.edu.pk", ticket: "Non-Member", paid: true },
  { id: "P003", name: "Umar Farooq", studentId: "F22-EE-018", email: "umar@riphah.edu.pk", ticket: "IEEE Member", paid: true },
  { id: "P004", name: "Ayesha Malik", studentId: "F22-CS-055", email: "ayesha@riphah.edu.pk", ticket: "Non-Member", paid: false },
  { id: "P005", name: "Bilal Ahmed", studentId: "F21-ME-033", email: "bilal@riphah.edu.pk", ticket: "IEEE Member", paid: true },
];

// ── Parse CSV ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map((line, i) => {
    const vals = line.split(",").map(v => v.trim());
    const obj = {};
    headers.forEach((h, j) => obj[h] = vals[j] || "");
    return {
      id: `P${String(i + 100).padStart(3, "0")}`,
      name: obj["name"] || obj["full name"] || "Unknown",
      studentId: obj["studentid"] || obj["student id"] || obj["id"] || "",
      email: obj["email"] || "",
      ticket: obj["ticket"] || obj["ticket type"] || "General",
      paid: (obj["paid"] || obj["payment"] || "").toLowerCase() !== "no",
    };
  });
}

// ── ICONS ────────────────────────────────────────────────────────────────────
const Icon = {
  scan: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  upload: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  shield: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><polyline points="20 6 9 17 4 12"/></svg>,
  x: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  logout: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  qr: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/><line x1="14" y1="14" x2="14" y2="14"/><line x1="17" y1="14" x2="17" y2="14"/><line x1="20" y1="14" x2="20" y2="14"/><line x1="14" y1="17" x2="14" y2="17"/><line x1="17" y1="17" x2="20" y2="20"/></svg>,
  chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [auth, setAuth] = useState(null);
  const [screen, setScreen] = useState("login");
  const [participants, setParticipants] = useState(
    SEED_PARTICIPANTS.map(p => ({ ...p, checkedIn: false, checkInTime: null, qrData: generateQRData(p) }))
  );
  const [volunteers, setVolunteers] = useState([
    { id: "V001", name: "Zaid Volunteer", username: "volunteer1", password: "vol123", active: true },
  ]);
  const [scanResult, setScanResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  const addLog = useCallback((msg, type = "info") => {
    setLogs(l => [{ msg, type, time: new Date().toLocaleTimeString() }, ...l].slice(0, 50));
  }, []);

  const handleLogin = (role, name) => {
    setAuth({ role, name });
    setScreen("app");
    setActiveTab(role === "admin" ? "dashboard" : "scanner");
  };

  const handleLogout = () => { setAuth(null); setScreen("login"); setScanResult(null); };

  if (screen === "login") return <LoginScreen onLogin={handleLogin} volunteers={volunteers} />;

  return (
    <AppShell auth={auth} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "dashboard" && auth.role === "admin" && (
        <Dashboard participants={participants} logs={logs} />
      )}
      {activeTab === "participants" && auth.role === "admin" && (
        <ParticipantsPanel
          participants={participants}
          setParticipants={setParticipants}
          addLog={addLog}
        />
      )}
      {activeTab === "scanner" && (
        <ScannerPanel
          participants={participants}
          setParticipants={setParticipants}
          scanResult={scanResult}
          setScanResult={setScanResult}
          addLog={addLog}
          role={auth.role}
        />
      )}
      {activeTab === "volunteers" && auth.role === "admin" && (
        <VolunteersPanel volunteers={volunteers} setVolunteers={setVolunteers} />
      )}
      {activeTab === "logs" && auth.role === "admin" && (
        <LogsPanel logs={logs} />
      )}
    </AppShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin, volunteers }) {
  const [tab, setTab] = useState("admin");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const tryLogin = () => {
    setErr(""); setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (tab === "admin") {
        if (user === "admin" && pass === "ieee2026") onLogin("admin", "Admin");
        else setErr("Invalid credentials. Try admin / ieee2026");
      } else {
        const v = volunteers.find(v => v.username === user && v.password === pass && v.active);
        if (v) onLogin("volunteer", v.name);
        else setErr("Invalid volunteer credentials");
      }
    }, 700);
  };

  return (
    <div style={s.loginBg}>
      <div style={s.loginNoise} />
      <div style={s.loginGrid} />
      <div style={{ ...s.orb, top: "10%", left: "15%", background: "radial-gradient(circle, #00d4ff44 0%, transparent 70%)", width: 300, height: 300 }} />
      <div style={{ ...s.orb, bottom: "15%", right: "10%", background: "radial-gradient(circle, #7b2fff44 0%, transparent 70%)", width: 400, height: 400 }} />
      <div style={s.loginCard}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={s.logoRing}>
            <div style={s.logoInner}><Icon.shield /></div>
          </div>
          <h1 style={s.loginTitle}>IEEE RIPHAH</h1>
          <p style={s.loginSub}>Event Check-In System</p>
        </div>
        <div style={s.tabRow}>
          {["admin", "volunteer"].map(t => (
            <button key={t} style={{ ...s.tabBtn, ...(tab === t ? s.tabBtnActive : {}) }} onClick={() => { setTab(t); setErr(""); setUser(""); setPass(""); }}>
              {t === "admin" ? "🔑 Admin" : "👤 Volunteer"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input style={s.input} placeholder="Username" value={user} onChange={e => setUser(e.target.value)}
            onKeyDown={e => e.key === "Enter" && tryLogin()} />
          <input style={s.input} type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && tryLogin()} />
          {err && <p style={s.errMsg}>{err}</p>}
          <button style={{ ...s.loginBtn, opacity: loading ? 0.7 : 1 }} onClick={tryLogin} disabled={loading}>
            {loading ? "Authenticating…" : "Login →"}
          </button>
        </div>
        <p style={{ textAlign: "center", color: "#ffffff30", fontSize: 11, marginTop: 20 }}>
          Demo: admin / ieee2026 &nbsp;|&nbsp; volunteer1 / vol123
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
function AppShell({ auth, onLogout, activeTab, setActiveTab, children }) {
  const adminTabs = [
    { id: "dashboard", label: "Dashboard", icon: <Icon.chart /> },
    { id: "participants", label: "Participants", icon: <Icon.users /> },
    { id: "scanner", label: "Scanner", icon: <Icon.scan /> },
    { id: "volunteers", label: "Volunteers", icon: <Icon.shield /> },
    { id: "logs", label: "Logs", icon: <Icon.qr /> },
  ];
  const volTabs = [{ id: "scanner", label: "Scanner", icon: <Icon.scan /> }];
  const tabs = auth.role === "admin" ? adminTabs : volTabs;

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.sideHeader}>
          <div style={s.sideLogo}>⚡</div>
          <div>
            <div style={s.sideTitle}>IEEE RIPHAH</div>
            <div style={s.sideSub}>Check-In System</div>
          </div>
        </div>
        <nav style={{ flex: 1 }}>
          {tabs.map(t => (
            <button key={t.id} style={{ ...s.navBtn, ...(activeTab === t.id ? s.navBtnActive : {}) }}
              onClick={() => setActiveTab(t.id)}>
              <span style={{ opacity: 0.8 }}>{t.icon}</span>
              {t.label}
              {activeTab === t.id && <div style={s.navIndicator} />}
            </button>
          ))}
        </nav>
        <div style={s.sideFooter}>
          <div style={s.roleTag}>{auth.role === "admin" ? "🔑 Admin" : "👤 Volunteer"}</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{auth.name}</div>
          <button style={s.logoutBtn} onClick={onLogout}><Icon.logout /> Logout</button>
        </div>
      </aside>
      <main style={s.main}>{children}</main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ participants, logs }) {
  const total = participants.length;
  const checkedIn = participants.filter(p => p.checkedIn).length;
  const paid = participants.filter(p => p.paid).length;
  const pending = total - checkedIn;
  const pct = total ? Math.round((checkedIn / total) * 100) : 0;
  const stats = [
    { label: "Total Registered", value: total, color: "#00d4ff", bg: "#00d4ff15" },
    { label: "Checked In", value: checkedIn, color: "#00ff88", bg: "#00ff8815" },
    { label: "Awaiting Entry", value: pending, color: "#ffaa00", bg: "#ffaa0015" },
    { label: "Paid Tickets", value: paid, color: "#a855f7", bg: "#a855f715" },
  ];
  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Dashboard</h2>
        <p style={s.pageDesc}>IEEE Summer School 2026 — Real-time overview</p>
      </div>
      <div style={s.statsGrid}>
        {stats.map(st => (
          <div key={st.label} style={{ ...s.statCard, background: st.bg, border: `1px solid ${st.color}30` }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: st.color, fontFamily: "'Space Mono', monospace" }}>{st.value}</div>
            <div style={{ color: "#ffffff80", fontSize: 13 }}>{st.label}</div>
          </div>
        ))}
      </div>
      <div style={s.progressCard}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: "#fff", fontWeight: 600 }}>Check-in Progress</span>
          <span style={{ color: "#00d4ff", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{pct}%</span>
        </div>
        <div style={s.progressTrack}>
          <div style={{ ...s.progressFill, width: `${pct}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#ffffff50", fontSize: 12 }}>
          <span>{checkedIn} checked in</span><span>{pending} remaining</span>
        </div>
      </div>
      <div style={s.card}>
        <h3 style={s.cardTitle}>Recent Activity</h3>
        {logs.length === 0 ? (
          <p style={{ color: "#ffffff40", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No activity yet. Start scanning!</p>
        ) : (
          logs.slice(0, 6).map((l, i) => (
            <div key={i} style={s.logRow}>
              <span style={{ ...s.logDot, background: l.type === "success" ? "#00ff88" : l.type === "error" ? "#ff4757" : "#ffaa00" }} />
              <span style={{ color: "#ffffff90", fontSize: 13, flex: 1 }}>{l.msg}</span>
              <span style={{ color: "#ffffff40", fontSize: 11 }}>{l.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICIPANTS PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function ParticipantsPanel({ participants, setParticipants, addLog }) {
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState(null);
  const fileRef = useRef();
  const filtered = participants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.studentId.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );
  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result);
      const newP = parsed.map(p => ({ ...p, checkedIn: false, checkInTime: null, qrData: generateQRData(p) }));
      setParticipants(prev => [...prev, ...newP]);
      addLog(`Imported ${newP.length} participants from CSV`, "success");
      setImporting(false);
    };
    reader.readAsText(file);
  };
  const deleteP = (id) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };
  const resetCheckIn = (id) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, checkedIn: false, checkInTime: null } : p));
    addLog(`Check-in reset for ${participants.find(p => p.id === id)?.name}`, "info");
  };
  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Participants</h2>
          <p style={s.pageDesc}>{participants.length} total registered</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={s.secBtn} onClick={() => fileRef.current.click()} disabled={importing}>
            <Icon.upload /> {importing ? "Importing…" : "Import CSV"}
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
        </div>
      </div>
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={s.searchRow}>
          <Icon.search />
          <input style={s.searchInput} placeholder="Search by name, student ID, email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={s.card}>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead><tr>{["Name", "Student ID", "Ticket", "Status", "Actions"].map(h => (<th key={h} style={s.th}>{h}</th>))}</tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} style={{ ...s.tr, ...(selected?.id === p.id ? s.trSelected : {}) }} onClick={() => setSelected(p)}>
                      <td style={s.td}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ ...s.avatar, background: stringToColor(p.name) }}>{p.name[0]}</div><div><div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{p.name}</div><div style={{ color: "#ffffff50", fontSize: 11 }}>{p.email}</div></div></div></td>
                      <td style={s.td}><span style={s.mono}>{p.studentId}</span></td>
                      <td style={s.td}><span style={{ ...s.badge, background: p.ticket.includes("IEEE") ? "#00d4ff20" : "#a855f720", color: p.ticket.includes("IEEE") ? "#00d4ff" : "#a855f7" }}>{p.ticket}</span></td>
                      <td style={s.td}>{p.checkedIn ? (<span style={{ ...s.badge, background: "#00ff8820", color: "#00ff88" }}>✓ Checked In</span>) : p.paid ? (<span style={{ ...s.badge, background: "#ffaa0020", color: "#ffaa00" }}>⏳ Pending</span>) : (<span style={{ ...s.badge, background: "#ff475720", color: "#ff4757" }}>✗ Unpaid</span>)}</td>
                      <td style={s.td}><div style={{ display: "flex", gap: 6 }}>{p.checkedIn && (<button style={s.iconBtn} title="Reset check-in" onClick={e => { e.stopPropagation(); resetCheckIn(p.id); }}>↩</button>)}<button style={{ ...s.iconBtn, color: "#ff4757" }} title="Delete" onClick={e => { e.stopPropagation(); deleteP(p.id); }}><Icon.trash /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {selected && (
          <div style={{ width: 260 }}>
            <div style={s.card}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ ...s.avatarLg, background: stringToColor(selected.name) }}>{selected.name[0]}</div>
                <h3 style={{ color: "#fff", margin: "12px 0 4px", fontSize: 16 }}>{selected.name}</h3>
                <p style={{ color: "#ffffff60", fontSize: 12 }}>{selected.studentId}</p>
              </div>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <p style={{ color: "#ffffff50", fontSize: 11, marginBottom: 8 }}>QR Code</p>
                <div style={{ display: "inline-block", padding: 8, background: "#fff", borderRadius: 8 }}>
                  <QRCodeSVG value={selected.qrData} size={140} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[["Email", selected.email], ["Ticket", selected.ticket], ["Payment", selected.paid ? "✓ Paid" : "✗ Unpaid"], ["Check-in", selected.checkedIn ? `✓ ${selected.checkInTime}` : "Not yet"]].map(([k, v]) => (<div key={k} style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#ffffff50", fontSize: 12 }}>{k}</span><span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{v}</span></div>))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNER PANEL (UPDATED WITH REAL QR SCANNING)
// ═══════════════════════════════════════════════════════════════════════════════
function ScannerPanel({ participants, setParticipants, scanResult, setScanResult, addLog, role }) {
  const [manualId, setManualId] = useState("");
  const [confirming, setConfirming] = useState(null);
  const scannerRef = useRef(null);

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.1;
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {}
  };

  const processQR = useCallback((raw) => {
    const parts = raw.trim().split(":");
    if (parts[0] !== "IEEE" || parts.length < 3) {
      setScanResult({ type: "invalid", msg: "Invalid QR Code Format", sub: "This QR was not issued by IEEE Riphah system" });
      addLog("Scan attempt: Invalid QR format", "error");
      return;
    }
    const [, id, sig] = parts;
    if (!verifyToken(id, sig)) {
      setScanResult({ type: "forged", msg: "Forged / Tampered QR", sub: "Cryptographic signature verification failed" });
      addLog(`Scan attempt: Forged QR for ID ${id}`, "error");
      return;
    }
    const p = participants.find(x => x.id === id);
    if (!p) {
      setScanResult({ type: "notfound", msg: "Participant Not Found", sub: `ID ${id} is not in the database` });
      addLog(`Scan: ID ${id} not found`, "error");
      return;
    }
    if (!p.paid) {
      setScanResult({ type: "unpaid", msg: "Ticket Not Paid", sub: `${p.name} has not completed payment`, participant: p });
      addLog(`Scan: ${p.name} — unpaid ticket`, "error");
      return;
    }
    if (p.checkedIn) {
      setScanResult({ type: "duplicate", msg: "Already Checked In!", sub: `${p.name} checked in at ${p.checkInTime}`, participant: p });
      addLog(`Scan: ${p.name} — duplicate scan attempt`, "error");
      return;
    }
    setConfirming(p);
    setScanResult({ type: "pending", participant: p });
    playBeep();
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#00ff88;opacity:0.3;pointer-events:none;z-index:9999';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);
  }, [participants, addLog]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      showTorchButton: true,
    }, false);
    scanner.render((decodedText) => processQR(decodedText), (errorMessage) => {});
    scannerRef.current = scanner;
    return () => { if (scannerRef.current) scannerRef.current.clear(); };
  }, [processQR]);

  const confirmEntry = () => {
    if (!confirming) return;
    const time = new Date().toLocaleTimeString();
    setParticipants(prev => prev.map(p => p.id === confirming.id ? { ...p, checkedIn: true, checkInTime: time } : p));
    setScanResult({ type: "success", msg: "Entry Granted!", sub: `${confirming.name} — ${confirming.ticket}`, participant: confirming, time });
    addLog(`✓ ${confirming.name} (${confirming.studentId}) checked in at ${time}`, "success");
    setConfirming(null);
    setTimeout(() => setScanResult(null), 3000);
  };

  const denyEntry = () => {
    addLog(`Entry denied for ${confirming?.name}`, "error");
    setConfirming(null);
    setScanResult(null);
  };

  const handleManual = () => {
    const p = participants.find(x => x.studentId.toLowerCase() === manualId.toLowerCase() || x.name.toLowerCase() === manualId.toLowerCase());
    if (!p) { setScanResult({ type: "notfound", msg: "Not Found", sub: `No participant matching "${manualId}"` }); return; }
    processQR(p.qrData);
    setManualId("");
  };

  const resultColors = {
    success: { border: "#00ff88", bg: "#00ff8810", icon: "✓", iconColor: "#00ff88" },
    pending: { border: "#00d4ff", bg: "#00d4ff10", icon: "👤", iconColor: "#00d4ff" },
    duplicate: { border: "#ff4757", bg: "#ff475710", icon: "⚠️", iconColor: "#ff4757" },
    invalid: { border: "#ff4757", bg: "#ff475710", icon: "❌", iconColor: "#ff4757" },
    forged: { border: "#ff4757", bg: "#ff475710", icon: "🔒", iconColor: "#ff4757" },
    notfound: { border: "#ff4757", bg: "#ff475710", icon: "❓", iconColor: "#ff4757" },
    unpaid: { border: "#ffaa00", bg: "#ffaa0010", icon: "💳", iconColor: "#ffaa00" },
  };
  const rc = scanResult ? resultColors[scanResult.type] : null;

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>QR Scanner</h2>
        <p style={s.pageDesc}>Position QR code in front of camera</p>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 350 }}>
          <div style={s.card}>
            <h3 style={s.cardTitle}>📷 Camera Scanner</h3>
            <div id="qr-reader" style={{ width: "100%", minHeight: "300px", borderRadius: "12px", overflow: "hidden" }} />
            <p style={{ color: "#ffffff40", fontSize: 12, marginTop: 12, textAlign: "center" }}>📸 Allow camera access when prompted</p>
          </div>
          <div style={{ ...s.card, marginTop: 16 }}>
            <h3 style={s.cardTitle}>🔍 Manual Lookup</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <input style={{ ...s.input, flex: 1 }} placeholder="Enter name or student ID" value={manualId} onChange={e => setManualId(e.target.value)} onKeyDown={e => e.key === "Enter" && handleManual()} />
              <button style={s.secBtn} onClick={handleManual}>Search</button>
            </div>
          </div>
        </div>
        <div style={{ width: 350 }}>
          {!scanResult ? (
            <div style={{ ...s.card, textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 60, marginBottom: 16, opacity: 0.3 }}>📷</div>
              <p style={{ color: "#ffffff30", fontSize: 14 }}>Waiting for QR scan...</p>
            </div>
          ) : scanResult.type === "pending" && confirming ? (
            <div style={{ ...s.card, border: `2px solid ${rc.border}`, background: rc.bg }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 56, color: rc.iconColor }}>{rc.icon}</div><h3 style={{ color: "#00d4ff" }}>Verify Participant</h3></div>
              <div style={s.participantInfo}>
                <div style={{ ...s.avatarLg, margin: "0 auto 12px", background: stringToColor(confirming.name) }}>{confirming.name[0]}</div>
                {[["Name", confirming.name], ["Student ID", confirming.studentId], ["Ticket", confirming.ticket], ["Email", confirming.email]].map(([k, v]) => (<div key={k} style={s.infoRow}><span style={{ color: "#ffffff50", fontSize: 12 }}>{k}</span><span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{v}</span></div>))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button style={s.confirmBtn} onClick={confirmEntry}><Icon.check /> Allow Entry</button>
                <button style={s.denyBtn} onClick={denyEntry}><Icon.x /> Deny</button>
              </div>
            </div>
          ) : (
            <div style={{ ...s.card, border: `2px solid ${rc.border}`, background: rc.bg }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 56, color: rc.iconColor }}>{rc.icon}</div><h3 style={{ color: rc.iconColor }}>{scanResult.msg}</h3><p style={{ color: "#ffffff60", fontSize: 13 }}>{scanResult.sub}</p></div>
              {scanResult.participant && (<div style={s.participantInfo}>{[["Name", scanResult.participant.name], ["Student ID", scanResult.participant.studentId]].map(([k, v]) => (<div key={k} style={s.infoRow}><span style={{ color: "#ffffff50", fontSize: 12 }}>{k}</span><span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{v}</span></div>))}</div>)}
              <button style={{ ...s.secBtn, width: "100%", marginTop: 16, justifyContent: "center" }} onClick={() => { setScanResult(null); setConfirming(null); }}>Scan Another QR</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOLUNTEERS PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function VolunteersPanel({ volunteers, setVolunteers }) {
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [msg, setMsg] = useState("");
  const addVol = () => {
    if (!form.name || !form.username || !form.password) { setMsg("All fields required"); return; }
    setVolunteers(prev => [...prev, { id: `V${Date.now()}`, ...form, active: true }]);
    setForm({ name: "", username: "", password: "" });
    setMsg("Volunteer added!");
    setTimeout(() => setMsg(""), 3000);
  };
  const toggleActive = (id) => setVolunteers(prev => prev.map(v => v.id === id ? { ...v, active: !v.active } : v));
  return (
    <div style={s.page}>
      <div style={s.pageHeader}><h2 style={s.pageTitle}>Volunteer Management</h2><p style={s.pageDesc}>Control gate volunteer access</p></div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ ...s.card, width: 280 }}><h3 style={s.cardTitle}>Add Volunteer</h3><div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{["name", "username", "password"].map(f => (<input key={f} style={s.input} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} type={f === "password" ? "password" : "text"} value={form[f]} onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))} />))}{msg && <p style={{ color: "#00ff88", fontSize: 12 }}>{msg}</p>}<button style={s.secBtn} onClick={addVol}>+ Add Volunteer</button></div></div>
        <div style={{ flex: 1 }}><div style={s.card}>{volunteers.map(v => (<div key={v.id} style={s.volRow}><div style={{ ...s.avatar, background: stringToColor(v.name) }}>{v.name[0]}</div><div style={{ flex: 1 }}><div style={{ color: "#fff", fontWeight: 600 }}>{v.name}</div><div style={{ color: "#ffffff50", fontSize: 12 }}>@{v.username}</div></div><button style={{ ...s.badge, cursor: "pointer", background: v.active ? "#00ff8820" : "#ff475720", color: v.active ? "#00ff88" : "#ff4757" }} onClick={() => toggleActive(v.id)}>{v.active ? "Active" : "Revoked"}</button></div>))}</div></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGS PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function LogsPanel({ logs }) {
  return (
    <div style={s.page}>
      <div style={s.pageHeader}><h2 style={s.pageTitle}>Security Logs</h2><p style={s.pageDesc}>All scan attempts and check-in events</p></div>
      <div style={s.card}>{logs.length === 0 ? (<p style={{ color: "#ffffff40", textAlign: "center", padding: "40px 0" }}>No logs yet</p>) : (logs.map((l, i) => (<div key={i} style={{ ...s.logRow, padding: "12px 0", borderBottom: "1px solid #ffffff08" }}><span style={{ ...s.logDot, background: l.type === "success" ? "#00ff88" : l.type === "error" ? "#ff4757" : "#ffaa00", flexShrink: 0 }} /><span style={{ ...s.mono, fontSize: 11, color: "#ffffff40", width: 80, flexShrink: 0 }}>{l.time}</span><span style={{ color: "#ffffff90", fontSize: 13 }}>{l.msg}</span></div>)))}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS & STYLES
// ═══════════════════════════════════════════════════════════════════════════════
function stringToColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const colors = ["#00d4ff", "#a855f7", "#00ff88", "#ffaa00", "#ff6b9d", "#4ecdc4"];
  return colors[Math.abs(h) % colors.length] + "40";
}

const s = {
  loginBg: { minHeight: "100vh", background: "#040410", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", position: "relative", overflow: "hidden" },
  loginNoise: { position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")", opacity: 0.5, pointerEvents: "none" },
  loginGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(#ffffff05 1px, transparent 1px), linear-gradient(90deg, #ffffff05 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" },
  orb: { position: "fixed", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" },
  loginCard: { position: "relative", zIndex: 10, background: "#0d0d2080", border: "1px solid #ffffff15", backdropFilter: "blur(20px)", borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 380, boxShadow: "0 40px 80px #00000080" },
  logoRing: { width: 64, height: 64, borderRadius: "50%", border: "2px solid #00d4ff50", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "radial-gradient(circle, #00d4ff15, transparent)" },
  logoInner: { color: "#00d4ff" },
  loginTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "0.05em" },
  loginSub: { margin: "4px 0 0", color: "#ffffff50", fontSize: 13 },
  tabRow: { display: "flex", background: "#ffffff08", borderRadius: 10, padding: 3, marginBottom: 24, gap: 3 },
  tabBtn: { flex: 1, padding: "8px 0", border: "none", background: "transparent", color: "#ffffff60", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s" },
  tabBtnActive: { background: "#ffffff15", color: "#fff" },
  input: { padding: "12px 16px", border: "1px solid #ffffff15", background: "#ffffff08", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", transition: "border 0.2s" },
  errMsg: { color: "#ff4757", fontSize: 12, margin: 0, padding: "8px 12px", background: "#ff475710", borderRadius: 8 },
  loginBtn: { padding: "13px", background: "linear-gradient(135deg, #00d4ff, #7b2fff)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em" },
  shell: { display: "flex", minHeight: "100vh", background: "#07071a", fontFamily: "'Segoe UI', sans-serif" },
  sidebar: { width: 220, background: "#0a0a1f", borderRight: "1px solid #ffffff0a", display: "flex", flexDirection: "column", padding: "0 0 24px", flexShrink: 0 },
  sideHeader: { display: "flex", alignItems: "center", gap: 12, padding: "24px 20px 20px", borderBottom: "1px solid #ffffff0a" },
  sideLogo: { fontSize: 24, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#00d4ff20,#7b2fff20)", borderRadius: 10, border: "1px solid #ffffff15" },
  sideTitle: { color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em" },
  sideSub: { color: "#ffffff40", fontSize: 10, marginTop: 2 },
  navBtn: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 20px", border: "none", background: "transparent", color: "#ffffff60", cursor: "pointer", fontSize: 13, fontWeight: 500, position: "relative", textAlign: "left", transition: "all 0.2s" },
  navBtnActive: { color: "#fff", background: "#ffffff08" },
  navIndicator: { position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, background: "#00d4ff", borderRadius: 2 },
  sideFooter: { padding: "20px", borderTop: "1px solid #ffffff0a", display: "flex", flexDirection: "column", gap: 8 },
  roleTag: { fontSize: 10, color: "#00d4ff", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" },
  logoutBtn: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#ffffff08", border: "1px solid #ffffff10", borderRadius: 8, color: "#ffffff60", cursor: "pointer", fontSize: 12, marginTop: 4 },
  main: { flex: 1, overflowY: "auto", background: "#07071a" },
  page: { padding: 28, maxWidth: 1200 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle: { margin: 0, color: "#fff", fontSize: 24, fontWeight: 800 },
  pageDesc: { margin: "4px 0 0", color: "#ffffff50", fontSize: 13 },
  card: { background: "#0d0d25", border: "1px solid #ffffff0a", borderRadius: 14, padding: 20 },
  cardTitle: { margin: "0 0 16px", color: "#fff", fontSize: 14, fontWeight: 700 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 16, marginBottom: 20 },
  statCard: { borderRadius: 14, padding: "20px", textAlign: "center" },
  progressCard: { background: "#0d0d25", border: "1px solid #ffffff0a", borderRadius: 14, padding: 20, marginBottom: 20 },
  progressTrack: { height: 8, background: "#ffffff10", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #00d4ff, #7b2fff)", borderRadius: 4, transition: "width 0.8s ease" },
  logRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0" },
  logDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { color: "#ffffff40", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 12px 12px", textAlign: "left", borderBottom: "1px solid #ffffff0a" },
  td: { padding: "12px", borderBottom: "1px solid #ffffff06", verticalAlign: "middle" },
  tr: { cursor: "pointer", transition: "background 0.15s" },
  trSelected: { background: "#ffffff05" },
  avatar: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0 },
  avatarLg: { width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 24 },
  badge: { padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 },
  mono: { fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#ffffff80" },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#ffffff40", padding: 4, display: "flex", alignItems: "center" },
  scanBox: { position: "relative", background: "#ffffff05", border: "1px solid #ffffff10", borderRadius: 12, height: 200, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 0 },
  scanCorner1: { position: "absolute", top: 12, left: 12, width: 24, height: 24, borderTop: "3px solid #00d4ff", borderLeft: "3px solid #00d4ff", borderRadius: "3px 0 0 0" },
  scanCorner2: { position: "absolute", top: 12, right: 12, width: 24, height: 24, borderTop: "3px solid #00d4ff", borderRight: "3px solid #00d4ff", borderRadius: "0 3px 0 0" },
  scanCorner3: { position: "absolute", bottom: 12, left: 12, width: 24, height: 24, borderBottom: "3px solid #00d4ff", borderLeft: "3px solid #00d4ff", borderRadius: "0 0 0 3px" },
  scanCorner4: { position: "absolute", bottom: 12, right: 12, width: 24, height: 24, borderBottom: "3px solid #00d4ff", borderRight: "3px solid #00d4ff", borderRadius: "0 0 3px 0" },
  scanLine: { position: "absolute", left: 20, right: 20, height: 2, background: "linear-gradient(90deg, transparent, #00d4ff, transparent)", animation: "scanLine 2s linear infinite", top: "40%" },
  participantInfo: { background: "#ffffff06", borderRadius: 10, padding: 16 },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #ffffff08" },
  confirmBtn: { flex: 1, padding: "12px", background: "#00ff8820", border: "2px solid #00ff88", borderRadius: 10, color: "#00ff88", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 },
  denyBtn: { flex: 1, padding: "12px", background: "#ff475720", border: "2px solid #ff4757", borderRadius: 10, color: "#ff4757", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13 },
  quickBtn: { padding: "6px 14px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 },
  secBtn: { display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "linear-gradient(135deg, #00d4ff20, #7b2fff20)", border: "1px solid #00d4ff40", borderRadius: 10, color: "#00d4ff", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" },
  searchRow: { display: "flex", alignItems: "center", gap: 10, color: "#ffffff40" },
  searchInput: { flex: 1, border: "none", background: "transparent", color: "#fff", fontSize: 14, outline: "none" },
  volRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #ffffff08" },
};

// Inject keyframes
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `@keyframes scanLine { 0% { top: 15%; } 50% { top: 80%; } 100% { top: 15%; } } input:focus { border-color: #00d4ff50 !important; } button:hover { opacity: 0.85; } tr:hover td { background: #ffffff04; }`;
  document.head.appendChild(style);
}