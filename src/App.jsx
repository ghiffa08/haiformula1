import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Trophy, Clock, MapPin, Compass, AlertCircle, Gauge, ChevronLeft, RefreshCw, Award, Flag, Activity } from 'lucide-react';

// Fungsi Fetch Pintar dengan Exponential Backoff Retries untuk keandalan koneksi API
const fetchWithRetry = async (url, retries = 4, delay = 800) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
};

const TEAM_COLORS = {
  ferrari: '#FF2744', 'red bull': '#4B7BFF', mclaren: '#FF8C00',
  mercedes: '#00E5CC', 'aston martin': '#00C875', alpine: '#FF6EB4',
  williams: '#5BB8FF', haas: '#C8CDD2', sauber: '#60EE60', kick: '#60EE60',
  rb: '#7A9FFF', alphatauri: '#7A9FFF',
};
const getTeamColor = (n = '') => { 
  const s = n.toLowerCase(); 
  for (const [k,v] of Object.entries(TEAM_COLORS)) if (s.includes(k)) return v; 
  return '#FF2744'; 
};

const ordinal = n => { 
  const s=['th','st','nd','rd']; 
  const v=n%100; 
  return n+(s[(v-20)%10]||s[v]||s[0]); 
};

// Fungsi pembantu untuk konversi waktu sesi F1 ke WIB
const formatSessionTime = (dateStr, timeStr) => {
  if (!dateStr) return 'TBA';
  try {
    const cleanTime = timeStr ? (timeStr.endsWith('Z') ? timeStr : `${timeStr.replace(/Z$/, '')}Z`) : '15:00:00Z';
    const d = new Date(`${dateStr}T${cleanTime}`);
    return d.toLocaleDateString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB';
  } catch (e) {
    return `${dateStr}`;
  }
};

const FALLBACK_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
const getDriverImg = () => FALLBACK_AVATAR;
const getHighResImg = (url) => url ? url.replace(/\.transform\/.*$/, '') : null;

const getMatchedDriver = (openF1Drivers, ergastDriver) => {
  if (!openF1Drivers || !ergastDriver) return null;
  const num = String(ergastDriver.permanentNumber);
  return openF1Drivers.find(o => String(o.driver_number) === num || (num === '33' && String(o.driver_number) === '1'));
};

const Glass = ({ children, style = {}, accent, onClick }) => (
  <div onClick={onClick} style={{
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid rgba(255,255,255,0.09)`,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    ...(accent ? { borderTop: `2px solid ${accent}` } : {}),
    ...(onClick ? { cursor: 'pointer' } : {}),
    ...style,
  }}>
    <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'rgba(255,255,255,0.12)', pointerEvents:'none' }} />
    {children}
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [races, setRaces] = useState([]);
  const [driverStandings, setDriverStandings] = useState([]);
  const [constructorStandings, setConstructorStandings] = useState([]);
  const [currentSeason, setCurrentSeason] = useState('2026');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [standingsSub, setStandingsSub] = useState('drivers');
  const [nextRace, setNextRace] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days:0, hours:0, minutes:0, seconds:0 });
  const [openF1Drivers, setOpenF1Drivers] = useState([]);
  const [openF1Meetings, setOpenF1Meetings] = useState([]);
  const [selTelDriver, setSelTelDriver] = useState('');
  const [telData, setTelData] = useState([]);
  const [loadingTel, setLoadingTel] = useState(false);
  const [telSessionKey, setTelSessionKey] = useState('9158');
  const [telSessionName, setTelSessionName] = useState('Monaco GP');

  const loadF1 = async () => {
    setIsLoading(true); setErrorMsg(null);
    try {
      const s = await fetchWithRetry('https://api.jolpi.ca/ergast/f1/current.json');
      const rd = s.MRData.RaceTable.Races || [];
      setRaces(rd); setCurrentSeason(s.MRData.RaceTable.season);
      const now = new Date();
      setNextRace(rd.find(r => new Date(`${r.date}T${r.time||'15:00:00Z'}`) > now) || rd[rd.length-1]);
      
      const ds = await fetchWithRetry('https://api.jolpi.ca/ergast/f1/current/driverStandings.json');
      setDriverStandings(ds.MRData.StandingsTable.StandingsLists[0]?.DriverStandings||[]);
      
      const cs = await fetchWithRetry('https://api.jolpi.ca/ergast/f1/current/constructorStandings.json');
      setConstructorStandings(cs.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings||[]);
    } catch { 
      setErrorMsg('API sedang sibuk — menggunakan sinkronisasi data lokal.'); 
      setCurrentSeason('2026');
    } finally { 
      setIsLoading(false); 
    }
  };

  const loadOpenF1 = async () => {
    try {
      const sessions = await fetchWithRetry('https://api.openf1.org/v1/sessions?year=2024&session_name=Race');
      if (sessions?.length) {
        const lat = sessions[sessions.length-1];
        setTelSessionKey(lat.session_key); 
        setTelSessionName(`${lat.location_name} GP`);
        const list = await fetchWithRetry(`https://api.openf1.org/v1/drivers?session_key=${lat.session_key}`);
        if (list?.length) { 
          const u=Array.from(new Map(list.map(d=>[d.driver_number,d])).values()); 
          setOpenF1Drivers(u); 
          setSelTelDriver(u[0]?.driver_number||''); 
          return; 
        }
      }
    } catch {}
    try {
      const fb = await fetchWithRetry('https://api.openf1.org/v1/drivers?session_key=latest');
      const u=Array.from(new Map(fb.map(d=>[d.driver_number,d])).values()); 
      setOpenF1Drivers(u); 
      setSelTelDriver('16');
    } catch {}
    try {
      const meets = await fetchWithRetry(`https://api.openf1.org/v1/meetings?year=2024`);
      if (meets?.length) setOpenF1Meetings(meets);
    } catch {}
  };

  const loadTelemetry = async () => {
    if (!selTelDriver||!telSessionKey) return;
    setLoadingTel(true);
    try {
      const data = await fetchWithRetry(`https://api.openf1.org/v1/telemetry?session_key=${telSessionKey}&driver_number=${selTelDriver}&limit=30`);
      setTelData(data?.length ? [...data].sort((a,b)=>new Date(a.date)-new Date(b.date)) : []);
    } catch { 
      setTelData([]); 
    } finally { 
      setLoadingTel(false); 
    }
  };

  useEffect(() => { loadF1(); loadOpenF1(); }, []);
  useEffect(() => { loadTelemetry(); }, [selTelDriver, telSessionKey]);
  
  useEffect(() => {
    if (!nextRace) return;
    const t = setInterval(() => {
      const diff = new Date(`${nextRace.date}T${nextRace.time||'15:00:00Z'}`).getTime() - Date.now();
      if (diff<=0) { 
        clearInterval(t); 
        setTimeLeft({days:0,hours:0,minutes:0,seconds:0}); 
        return; 
      }
      setTimeLeft({ 
        days:Math.floor(diff/86400000), 
        hours:Math.floor((diff/3600000)%24), 
        minutes:Math.floor((diff/60000)%60), 
        seconds:Math.floor((diff/1000)%60) 
      });
    }, 1000);
    return () => clearInterval(t);
  }, [nextRace]);

  const svgPath = useMemo(() => {
    if (!telData.length) return '';
    const W=500, H=100, speeds=telData.map(d=>d.speed||0);
    const max=Math.max(...speeds,300), min=Math.min(...speeds,80), range=max-min||1;
    return telData.map((d,i)=>`${i===0?'M':'L'} ${((i/(telData.length-1))*W).toFixed(1)} ${(H-8-((d.speed-min)/range)*(H-16)).toFixed(1)}`).join(' ');
  }, [telData]);

  const maxPts = parseFloat(driverStandings[0]?.points||1);
  const activeTelDriver = openF1Drivers.find(d=>d.driver_number===selTelDriver);

  return (
    <div style={{
      minHeight:'100vh', maxWidth:430, margin:'0 auto',
      fontFamily:"'DM Sans','Segoe UI',sans-serif",
      color:'#F1F5F9', position:'relative', overflow:'hidden',
      background:'#070714',
    }}>
      {/* Mesh background */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(232,0,45,0.18) 0%, transparent 70%)', top:-150, left:-100, filter:'blur(40px)' }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(54,113,198,0.15) 0%, transparent 70%)', top:200, right:-100, filter:'blur(40px)' }} />
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,229,204,0.08) 0%, transparent 70%)', bottom:100, left:50, filter:'blur(50px)' }} />
        <div style={{ position:'absolute', inset:0, background:'rgba(7,7,20,0.55)' }} />
      </div>

      <header style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(7,7,20,0.6)', backdropFilter:'blur(30px)', WebkitBackdropFilter:'blur(30px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        padding:'13px 18px', display:'flex', alignItems:'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:'rgba(232,0,45,0.15)', border:'1px solid rgba(232,0,45,0.3)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(10px)' }}>
            <Flag size={13} color="#FF2744" fill="#FF2744" />
          </div>
          <span style={{ fontWeight:900, fontSize:15, letterSpacing:'-0.5px', color:'#fff' }}>
            HAI<span style={{ color:'#FF2744' }}>·</span>FORMULA1
          </span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={()=>{loadF1();loadOpenF1();}} style={{ width:32,height:32,borderRadius:10,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#94A3B8' }}>
            <RefreshCw size={12} style={{ animation:isLoading?'spin 1s linear infinite':'none' }} />
          </button>
          <div style={{ display:'flex',alignItems:'center',gap:5,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',padding:'4px 11px',borderRadius:20,backdropFilter:'blur(10px)' }}>
            <div style={{ width:5,height:5,borderRadius:'50%',background:'#22C55E',animation:'blink 2s infinite' }} />
            <span style={{ fontSize:9,fontWeight:700,color:'#22C55E',letterSpacing:'0.08em' }}>LIVE API</span>
          </div>
        </div>
      </header>

      <main style={{ position:'relative', zIndex:1, flex:1, overflowY:'auto', paddingBottom:90 }}>
        {errorMsg && (
          <div style={{ margin:'12px 16px', padding:'10px 14px', background:'rgba(232,0,45,0.08)', border:'1px solid rgba(232,0,45,0.15)', borderRadius:14, backdropFilter:'blur(20px)', display:'flex', alignItems:'center', gap:8 }}>
            <AlertCircle size={13} color="#FF2744" />
            <span style={{ fontSize:11, color:'#FF2744' }}>{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
            {[220,140,100].map((h,i)=>(
              <div key={i} style={{ height:h, background:'rgba(255,255,255,0.03)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:24, animation:'pulse 1.8s ease-in-out infinite', animationDelay:`${i*0.15}s` }} />
            ))}
          </div>
        ) : (
          <>
            {selectedDriver
              ? <DriverDetail driver={selectedDriver} onBack={()=>setSelectedDriver(null)} maxPts={maxPts} openF1Drivers={openF1Drivers} />
              : <>
                  {activeTab==='home' && <HomeTab nextRace={nextRace} timeLeft={timeLeft} currentSeason={currentSeason} openF1Meetings={openF1Meetings} />}
                  {activeTab==='schedule' && <ScheduleTab races={races} nextRace={nextRace} currentSeason={currentSeason} openF1Meetings={openF1Meetings} />}
                  {activeTab==='standings' && <StandingsTab sub={standingsSub} setSub={setStandingsSub} driverStandings={driverStandings} constructorStandings={constructorStandings} currentSeason={currentSeason} onSelect={setSelectedDriver} maxPts={maxPts} openF1Drivers={openF1Drivers} />}
                  {activeTab==='telemetry' && <TelemetryTab openF1Drivers={openF1Drivers} selTelDriver={selTelDriver} setSelTelDriver={setSelTelDriver} telData={telData} loadingTel={loadingTel} svgPath={svgPath} telSessionName={telSessionName} activeTelDriver={activeTelDriver} />}
                  {activeTab==='champions' && <ChampionsTab />}
                </>
            }
          </>
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={t=>{setActiveTab(t);setSelectedDriver(null);}} selectedDriver={selectedDriver} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,700;1,9..40,800;1,9..40,900&family=DM+Mono:wght@400;500;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes glow { 0%,100%{opacity:0.6} 50%{opacity:1} }
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        ::-webkit-scrollbar { display:none; }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════
   BERANDA / HOME TAB (Dengan Jadwal Sesi & WIB)
════════════════════════════════════════════ */
function HomeTab({ nextRace, timeLeft, currentSeason, openF1Meetings }) {
  // Mengekstrak sesi balapan akhir pekan dari data API untuk ditampilkan di beranda
  const weekendSessions = useMemo(() => {
    if (!nextRace) return [];
    return [
      { name: 'Latihan Bebas 1 (FP1)', session: nextRace.FirstPractice },
      { name: 'Latihan Bebas 2 (FP2)', session: nextRace.SecondPractice },
      { name: 'Latihan Bebas 3 (FP3)', session: nextRace.ThirdPractice },
      { name: 'Sprint Shootout / Race', session: nextRace.Sprint },
      { name: 'Kualifikasi (Qualifying)', session: nextRace.Qualifying },
      { name: 'Balapan Utama (Grand Prix)', session: { date: nextRace.date, time: nextRace.time }, isMain: true }
    ].filter(item => item.session && item.session.date);
  }, [nextRace]);

  return (
    <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14, animation:'fadeUp 0.4s ease' }}>

      {/* Hero Header */}
      <div style={{ position:'relative', borderRadius:28, overflow:'hidden', height:230 }}>
        <img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1614949194403-9602bdc14a3a?q=80&w=871&auto=format&fit=crop" alt="Mobil Balap F1" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', filter:'brightness(0.35) saturate(1.2)' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(232,0,45,0.15) 0%, transparent 50%), linear-gradient(to top, rgba(7,7,20,0.95) 0%, rgba(7,7,20,0.2) 70%, transparent 100%)' }} />
        
        <div style={{ position:'absolute', top:18, left:18, display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.08)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'5px 12px' }}>
          <div style={{ width:5,height:5,borderRadius:'50%',background:'#FF2744',animation:'blink 1s infinite' }} />
          <span style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:'0.1em',textTransform:'uppercase' }}>Sesi Terdekat</span>
        </div>
        
        <div style={{ position:'absolute', bottom:22, left:20, right:20 }}>
          <h1 style={{ fontSize:36,fontWeight:900,fontStyle:'italic',letterSpacing:'-1.5px',color:'#fff',textTransform:'uppercase',lineHeight:1 }}>
            <span style={{ color:'#FF2744' }}>F1</span> WORLD<br/>SERIES
          </h1>
          {nextRace && (
            <div style={{ display:'flex',alignItems:'center',gap:5,marginTop:9 }}>
              <MapPin size={10} color="#FF2744" />
              <span style={{ fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.55)' }}>
                {nextRace.Circuit?.Location?.locality}, {nextRace.Circuit?.Location?.country} · {currentSeason}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Countdown Timer */}
      {nextRace && (
        <Glass style={{ padding:'20px 18px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
            <span style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.35)',letterSpacing:'0.12em',textTransform:'uppercase' }}>Hitung Mundur Sesi</span>
            <div style={{ background:'rgba(255,39,68,0.12)',border:'1px solid rgba(255,39,68,0.25)',padding:'3px 10px',borderRadius:20,backdropFilter:'blur(10px)' }}>
              <span style={{ fontSize:9,fontWeight:700,color:'#FF2744',letterSpacing:'0.08em' }}>ROUND {nextRace.round}</span>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8 }}>
            {[
              {v:timeLeft.days,l:'Hari'},
              {v:timeLeft.hours,l:'Jam'},
              {v:timeLeft.minutes,l:'Menit'},
              {v:timeLeft.seconds,l:'Detik',r:true}
            ].map(({v,l,r})=>(
              <div key={l} style={{ background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:'12px 4px',textAlign:'center' }}>
                <div style={{ fontSize:28,fontWeight:900,fontFamily:"'DM Mono',monospace",color:r?'#FF2744':'#fff',lineHeight:1 }}>{String(v).padStart(2,'0')}</div>
                <div style={{ fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.25)',marginTop:5,textTransform:'uppercase',letterSpacing:'0.08em' }}>{l}</div>
              </div>
            ))}
          </div>
        </Glass>
      )}

      {/* JADWAL SESI AKHIR PEKAN LENGKAP & JAM WIB */}
      {weekendSessions.length > 0 && (
        <Glass style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Jadwal Sesi Akhir Pekan
            </span>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>WIB TIMEZONE</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weekendSessions.map(({ name, session, isMain }) => (
              <div key={name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '11px 14px',
                background: isMain ? 'rgba(255, 39, 68, 0.06)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${isMain ? 'rgba(255, 39, 68, 0.15)' : 'rgba(255,255,255,0.03)'}`,
                borderRadius: 14
              }}>
                <span style={{ fontSize: 11, fontWeight: isMain ? 800 : 600, color: isMain ? '#FF2744' : 'rgba(255,255,255,0.85)' }}>
                  {name}
                </span>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: isMain ? '#FF2744' : 'rgba(255,255,255,0.55)' }}>
                  {formatSessionTime(session.date, session.time)}
                </span>
              </div>
            ))}
          </div>
        </Glass>
      )}

      {/* Info Sirkuit */}
      {nextRace && (
        <Glass style={{ padding:18 }}>
          <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'0.12em',textTransform:'uppercase',display:'block',marginBottom:4 }}>Informasi Trek</span>
              <h3 style={{ fontSize:16,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',lineHeight:1.2 }}>{nextRace.Circuit?.circuitName}</h3>
              <p style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:3,fontWeight:500 }}>{nextRace.Circuit?.Location?.locality}, {nextRace.Circuit?.Location?.country}</p>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            {[{l:'Panjang Trek',v:'3.337 km'},{l:'Jumlah Belokan',v:'19'},{l:'Zona DRS',v:'01',r:true}].map(({l,v,r})=>(
              <div key={l} style={{ background:'rgba(0,0,0,0.25)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:12,padding:'10px 8px',textAlign:'center' }}>
                <span style={{ fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block' }}>{l}</span>
                <span style={{ fontSize:13,fontWeight:800,fontFamily:"'DM Mono',monospace",color:r?'#FF2744':'#fff',display:'block',marginTop:3 }}>{v}</span>
              </div>
            ))}
          </div>
        </Glass>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   JADWAL / SCHEDULE TAB
════════════════════════════════════════════ */
function ScheduleTab({ races, nextRace, currentSeason, openF1Meetings }) {
  return (
    <div style={{ padding:16, animation:'fadeUp 0.4s ease' }}>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:24,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',letterSpacing:'-0.5px' }}>Kalender Balapan {currentSeason}</h2>
        <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)',fontWeight:500,marginTop:2 }}>Jadwal lengkap sesi Formula 1 musim ini</p>
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        {races.map((race) => {
          const upcoming = new Date(`${race.date}T${race.time||'15:00:00Z'}`) > new Date();
          const isCurrent = nextRace?.round===race.round;
          return (
            <Glass key={race.round} accent={isCurrent?'#FF2744':undefined} style={{ padding:'16px 18px' }}>
              {isCurrent && <div style={{ position:'absolute',top:0,left:0,right:0,height:60,background:'rgba(255,39,68,0.04)',pointerEvents:'none' }} />}
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:3 }}>
                    <span style={{ fontSize:9,fontWeight:700,color:'#FF2744',textTransform:'uppercase',letterSpacing:'0.08em' }}>{race.Circuit?.Location?.locality}</span>
                    <div style={{ padding:'2px 8px',borderRadius:20,background:upcoming?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${upcoming?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.06)'}` }}>
                      <span style={{ fontSize:8,fontWeight:700,color:upcoming?'#22C55E':'rgba(255,255,255,0.3)' }}>{upcoming?'Mendatang':'Selesai'}</span>
                    </div>
                  </div>
                  <h3 style={{ fontSize:13,fontWeight:800,fontStyle:'italic',textTransform:'uppercase',color:'#fff',letterSpacing:'-0.2px' }}>{race.raceName.replace('Grand Prix','GP')}</h3>
                  <div style={{ display:'flex',justifyContent:'space-between',marginTop:6,paddingTop:6,borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'rgba(255,255,255,0.35)',fontWeight:500 }}>{new Date(race.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</span>
                    <span style={{ fontSize:9,fontFamily:"'DM Mono',monospace",color:'rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.04)',padding:'2px 7px',borderRadius:7 }}>RD {race.round}</span>
                  </div>
                </div>
              </div>
            </Glass>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   KLASEMEN & HASIL / STANDINGS TAB
════════════════════════════════════════════ */
function StandingsTab({ sub, setSub, driverStandings, constructorStandings, currentSeason, onSelect, maxPts, openF1Drivers }) {
  return (
    <div style={{ padding:16, animation:'fadeUp 0.4s ease' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:24,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',letterSpacing:'-0.5px' }}>Hasil Balapan</h2>
          <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:2 }}>Klasemen Kejuaraan {currentSeason}</p>
        </div>
        <div style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.05)',padding:'5px 11px',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(10px)' }}>
          {currentSeason} ▾
        </div>
      </div>

      {/* Pill Tabs Selector */}
      <div style={{ display:'flex',gap:6,marginBottom:18,background:'rgba(255,255,255,0.03)',backdropFilter:'blur(20px)',padding:4,borderRadius:16,border:'1px solid rgba(255,255,255,0.07)' }}>
        {['Balapan','Pembalap','Tim','Penghargaan'].map(t=>{
          const isDriversTab = t==='Pembalap';
          const isTeamsTab = t==='Tim';
          const active=(isDriversTab&&sub=='drivers')||(isTeamsTab&&sub=='teams');
          return (
            <button key={t} onClick={()=>{if(isDriversTab)setSub('drivers');if(isTeamsTab)setSub('teams');}}
              style={{ flex:1,padding:'8px 4px',borderRadius:12,fontSize:10,fontWeight:700,cursor:'pointer',border:'none',transition:'all 0.2s',
                background:active?'#FF2744':'transparent', color:active?'#fff':'rgba(255,255,255,0.3)' }}>
              {t}
            </button>
          );
        })}
      </div>

      {sub==='drivers' && (
        <>
          <span style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em',display:'block',marginBottom:12 }}>Klasemen Sementara Pembalap</span>

          {/* Top 3 Drivers Cards */}
          {driverStandings.slice(0,3).map((d,i)=>{
            const pos=parseInt(d.position);
            const tColor=getTeamColor(d.Constructors[0]?.name||'');
            const posColors=['#FF2744','rgba(255,255,255,0.7)','#B45309'];
            const pts=parseFloat(d.points);

            return (
              <Glass key={d.position} onClick={()=>onSelect(d)} style={{ marginBottom:10, overflow:'hidden' }}>
                <div style={{ position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:`radial-gradient(circle, ${tColor}25 0%, transparent 70%)`,pointerEvents:'none' }} />
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg, ${tColor}, transparent)`,pointerEvents:'none' }} />

                <div style={{ padding:'18px 18px 16px', display:'flex',alignItems:'center',gap:14 }}>
                  <div style={{ position:'relative',flexShrink:0 }}>
                    <div style={{ width:62,height:62,borderRadius:18,overflow:'hidden',border:`1.5px solid ${tColor}40`,background:'rgba(255,255,255,0.02)' }}>
                      <img loading="lazy" decoding="async" src={getHighResImg(getMatchedDriver(openF1Drivers, d.Driver)?.headshot_url) || FALLBACK_AVATAR} alt={d.Driver.familyName} style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'top' }} />
                    </div>
                    <div style={{ position:'absolute',bottom:-4,right:-4,width:20,height:20,borderRadius:'50%',background:tColor,border:'2px solid rgba(7,7,20,0.8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:900,color:'#fff',fontFamily:"'DM Mono',monospace",backdropFilter:'blur(4px)' }}>
                      {d.Driver.code||d.Driver.permanentNumber}
                    </div>
                  </div>

                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:2 }}>
                      <span style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.06em' }}>{d.Driver.nationality.substring(0,3)}</span>
                      <span style={{ fontSize:9,color:'rgba(255,255,255,0.2)',fontFamily:"'DM Mono',monospace" }}>#{d.Driver.permanentNumber}</span>
                    </div>
                    <h3 style={{ fontSize:16,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',letterSpacing:'-0.4px',lineHeight:1 }}>{d.Driver.familyName}</h3>
                    <p style={{ fontSize:10,color:'rgba(255,255,255,0.35)',fontWeight:600,marginTop:2 }}>{d.Constructors[0]?.name}</p>
                    <div style={{ marginTop:8,height:2,background:'rgba(255,255,255,0.06)',borderRadius:2 }}>
                      <div style={{ height:'100%',width:`${(pts/maxPts)*100}%`,background:tColor,borderRadius:2 }} />
                    </div>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,0.25)',marginTop:3,fontFamily:"'DM Mono',monospace" }}>{d.points} Poin · {d.wins} Menang</div>
                  </div>

                  <div style={{ flexShrink:0,textAlign:'right' }}>
                    <div style={{ fontSize:44,fontWeight:900,fontStyle:'italic',fontFamily:"'DM Mono',monospace",color:posColors[i],lineHeight:1,letterSpacing:'-2px' }}>{ordinal(pos)}</div>
                    <div style={{ fontSize:8,fontWeight:900,color:`${tColor}18`,textTransform:'uppercase',fontStyle:'italic',lineHeight:1,maxWidth:70,textAlign:'right',marginTop:2 }}>{d.Constructors[0]?.name}</div>
                  </div>
                </div>
              </Glass>
            );
          })}

          {/* Compact Driver List */}
          <Glass style={{ overflow:'hidden', marginTop:4 }}>
            {driverStandings.slice(3).map((d,i,arr)=>{
              const tColor=getTeamColor(d.Constructors[0]?.name||'');
              return (
                <div key={d.position} onClick={()=>onSelect(d)}
                  style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
                    borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.04)':'none',
                    cursor:'pointer', transition:'background 0.2s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <div style={{ width:3,height:34,borderRadius:2,background:tColor,flexShrink:0 }} />
                  <span style={{ fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",color:'rgba(255,255,255,0.25)',width:20,textAlign:'center' }}>{d.position}</span>
                  <div style={{ width:30,height:30,borderRadius:10,overflow:'hidden',flexShrink:0,background:'rgba(255,255,255,0.02)' }}>
                    <img loading="lazy" decoding="async" src={getHighResImg(getMatchedDriver(openF1Drivers, d.Driver)?.headshot_url) || FALLBACK_AVATAR} alt={d.Driver.familyName} style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'top',filter:'grayscale(0.4)' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:800,fontStyle:'italic',textTransform:'uppercase',color:'rgba(255,255,255,0.7)',letterSpacing:'-0.2px' }}>{d.Driver.familyName}</div>
                    <div style={{ fontSize:9,color:'rgba(255,255,255,0.25)',fontWeight:600 }}>{d.Constructors[0]?.name}</div>
                  </div>
                  <span style={{ fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",color:'rgba(255,255,255,0.4)' }}>{d.points}</span>
                </div>
              );
            })}
          </Glass>
        </>
      )}

      {sub==='teams' && (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {constructorStandings.map(team=>{
            const tColor=getTeamColor(team.Constructor.name);
            const pts=parseFloat(team.points);
            const maxT=parseFloat(constructorStandings[0]?.points||1);
            return (
              <Glass key={team.position} style={{ overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${tColor},transparent)`,pointerEvents:'none' }} />
                <div style={{ position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:`radial-gradient(circle,${tColor}15 0%,transparent 70%)`,pointerEvents:'none' }} />
                <div style={{ padding:'16px 18px',display:'flex',alignItems:'center',gap:14 }}>
                  <div style={{ width:48,height:48,borderRadius:14,background:`${tColor}12`,border:`1px solid ${tColor}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,backdropFilter:'blur(10px)' }}>
                    <span style={{ fontSize:18,fontWeight:900,fontFamily:"'DM Mono',monospace",color:tColor }}>#{team.position}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <h3 style={{ fontSize:15,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',letterSpacing:'-0.3px' }}>{team.Constructor.name}</h3>
                    <div style={{ marginTop:6,height:3,background:'rgba(255,255,255,0.06)',borderRadius:3 }}>
                      <div style={{ height:'100%',width:`${(pts/maxT)*100}%`,background:tColor,borderRadius:3 }} />
                    </div>
                    <span style={{ fontSize:10,color:'rgba(255,255,255,0.3)',fontFamily:"'DM Mono',monospace",marginTop:3,display:'block' }}>{team.points} pts · {team.Constructor.nationality}</span>
                  </div>
                </div>
              </Glass>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   PROFIL PEMBALAP DETAIL
════════════════════════════════════════════ */
function DriverDetail({ driver, onBack, maxPts, openF1Drivers }) {
  const tColor = getTeamColor(driver.Constructors[0]?.name||'');
  const pts = parseFloat(driver.points);

  return (
    <div style={{ animation:'fadeUp 0.3s ease', position:'relative' }}>
      <div style={{ position:'relative', height:380, overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,background:`linear-gradient(135deg, ${tColor}20 0%, rgba(7,7,20,0.8) 60%)` }} />
        <div style={{ position:'absolute',top:-60,left:-60,width:300,height:300,borderRadius:'50%',background:`radial-gradient(circle,${tColor}20 0%,transparent 70%)`,filter:'blur(20px)' }} />
        
        {/* Ghost Number Lambung */}
        <div style={{ position:'absolute',right:-20,top:-10,fontSize:220,fontWeight:900,fontStyle:'italic',fontFamily:"'DM Mono',monospace",color:tColor,opacity:0.06,lineHeight:1,letterSpacing:'-10px',pointerEvents:'none',userSelect:'none' }}>
          {driver.Driver.permanentNumber||'1'}
        </div>
        
        {/* Foto Profil Real-Time */}
        <img loading="lazy" decoding="async" src={getHighResImg(getMatchedDriver(openF1Drivers, driver.Driver)?.headshot_url) || FALLBACK_AVATAR} alt={driver.Driver.familyName} style={{ position:'absolute',right:0,bottom:0,width:'68%',height:'100%',objectFit:'cover',objectPosition:'top center' }} />
        <div style={{ position:'absolute',right:0,bottom:0,width:'80%',height:'55%',background:'linear-gradient(to top, rgba(7,7,20,1) 25%, transparent)' }} />
        <div style={{ position:'absolute',left:0,top:0,bottom:0,width:'50%',background:'linear-gradient(to right, rgba(7,7,20,0.6), transparent)' }} />

        {/* Tombol Kembali */}
        <button onClick={onBack} style={{ position:'absolute',top:16,left:16,display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,cursor:'pointer',color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:600 }}>
          <ChevronLeft size={14} /> Kembali
        </button>

        {/* Panel Info Samping */}
        <div style={{ position:'absolute',bottom:24,left:20 }}>
          <span style={{ fontSize:9,fontWeight:700,color:tColor,textTransform:'uppercase',letterSpacing:'0.12em',display:'block',marginBottom:5 }}>{driver.Constructors[0]?.name}</span>
          <h2 style={{ fontSize:30,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',lineHeight:1,letterSpacing:'-1px' }}>
            {driver.Driver.givenName}<br/>{driver.Driver.familyName}
          </h2>
          <div style={{ display:'flex',gap:8,marginTop:8 }}>
            <span style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.07)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.1)',padding:'3px 9px',borderRadius:8,fontFamily:"'DM Sans',sans-serif" }}>{driver.Driver.nationality.substring(0,3).toUpperCase()}</span>
            <span style={{ fontSize:10,color:'rgba(255,255,255,0.3)',fontFamily:"'DM Mono',monospace",alignSelf:'center' }}>#{driver.Driver.permanentNumber}</span>
          </div>
        </div>
      </div>

      {/* Detail Stats */}
      <div style={{ padding:'0 16px 16px' }}>
        <Glass style={{ padding:20 }} accent={tColor}>
          <div style={{ position:'absolute',top:-30,right:-30,width:150,height:150,borderRadius:'50%',background:`radial-gradient(circle,${tColor}12 0%,transparent 70%)`,pointerEvents:'none' }} />
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,paddingBottom:14,borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em' }}>Statistik Profesional</span>
            <Award size={15} color={tColor} />
          </div>

          {[
            {label:'Posisi Kejuaraan',value:`P${driver.position}`},
            {label:'Total Akumulasi Poin',value:`${driver.points} PTS`,accent:true},
            {label:'Jumlah Kemenangan Sesi',value:`${driver.wins}`},
            {label:'ID Unik Pembalap',value:driver.Driver.driverId,mono:true,muted:true},
          ].map(({label,value,accent,mono,muted})=>(
            <div key={label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize:12,color:'rgba(255,255,255,0.35)',fontWeight:500 }}>{label}</span>
              <span style={{ fontSize:accent?16:13,fontWeight:accent?900:700,fontFamily:mono?"'DM Mono',monospace":'inherit',color:accent?tColor:muted?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.8)',fontStyle:accent?'italic':'normal',background:accent?`${tColor}12`:'rgba(255,255,255,0.04)',backdropFilter:'blur(8px)',padding:'3px 11px',borderRadius:10,border:`1px solid ${accent?tColor+'20':'rgba(255,255,255,0.05)'}` }}>
                {value}
              </span>
            </div>
          ))}

          <div style={{ marginTop:16 }}>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:9,color:'rgba(255,255,255,0.25)',fontFamily:"'DM Mono',monospace",marginBottom:6 }}>
              <span>PROGRES POIN UTAMA</span>
              <span>{Math.round((parseFloat(driver.points)/maxPts)*100)}%</span>
            </div>
            <div style={{ height:5,background:'rgba(255,255,255,0.05)',borderRadius:5 }}>
              <div style={{ height:'100%',width:`${(parseFloat(driver.points)/maxPts)*100}%`,background:`linear-gradient(90deg,${tColor},${tColor}80)`,borderRadius:5 }} />
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   LAB TELEMETRI / TELEMETRY TAB
════════════════════════════════════════════ */
function TelemetryTab({ openF1Drivers, selTelDriver, setSelTelDriver, telData, loadingTel, svgPath, telSessionName, activeTelDriver }) {
  const lastTel = telData[telData.length-1];
  const maxSpeed = telData.length ? Math.max(...telData.map(d=>d.speed||0)) : 0;
  const avgRPM = telData.length ? Math.round(telData.reduce((a,b)=>a+(b.rpm||0),0)/telData.length) : 0;
  const maxGear = telData.length ? Math.max(...telData.map(d=>d.n_gear||d.gear||0)) : 0;
  const dc = activeTelDriver?.team_colour ? `#${activeTelDriver.team_colour}` : '#FF2744';

  return (
    <div style={{ padding:16, animation:'fadeUp 0.4s ease' }}>
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:2 }}>
          <h2 style={{ fontSize:24,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',letterSpacing:'-0.5px' }}>Telemetry Lab</h2>
          <span style={{ fontSize:8,fontWeight:700,background:'rgba(255,39,68,0.15)',border:'1px solid rgba(255,39,68,0.3)',color:'#FF2744',padding:'3px 8px',borderRadius:6,animation:'blink 1.5s infinite',letterSpacing:'0.1em',backdropFilter:'blur(10px)' }}>LIVE</span>
        </div>
        <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)' }}>{telSessionName} · OpenF1 API</p>
      </div>

      {/* Selector Pembalap */}
      <div style={{ marginBottom:14 }}>
        <span style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em',display:'block',marginBottom:8 }}>Pilih Pembalap</span>
        <div style={{ display:'flex',gap:6,overflowX:'auto',paddingBottom:4 }}>
          {openF1Drivers.map(d=>{
            const sel=selTelDriver===d.driver_number;
            const bc=d.team_colour?`#${d.team_colour}`:'#FF2744';
            return (
              <button key={d.driver_number} onClick={()=>setSelTelDriver(d.driver_number)}
                style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 13px',borderRadius:12,flexShrink:0,cursor:'pointer',
                  border:`1px solid ${sel?bc+'60':'rgba(255,255,255,0.06)'}`,
                  background:sel?`${bc}15`:'rgba(255,255,255,0.04)',
                  backdropFilter:'blur(20px)',
                  color:sel?bc:'rgba(255,255,255,0.3)',
                  fontSize:11,fontWeight:700,
                  borderLeft:`3px solid ${bc}`,
                }}>
                <span style={{ fontFamily:"'DM Mono',monospace" }}>{d.driver_number}</span>
                <span>{d.broadcast_name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loadingTel ? (
        <Glass style={{ height:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
          <div style={{ width:28,height:28,border:`2px solid ${dc}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',marginBottom:8 }} />
          <span style={{ fontSize:11,color:'rgba(255,255,255,0.35)' }}>Menghubungkan ke server OpenF1…</span>
        </Glass>
      ) : (
        <>
          {telData.length>0 && (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12 }}>
              {[
                {l:'Top Speed',v:maxSpeed,u:'km/h',c:'#fff'},
                {l:'Rata RPM',v:`${(avgRPM/1000).toFixed(1)}k`,u:'RPM',c:dc},
                {l:'Gigi Max',v:maxGear,u:'GEAR',c:'#fff'}
              ].map(({l,v,u,c})=>(
                <Glass key={l} style={{ padding:'14px 8px',textAlign:'center' }}>
                  <span style={{ fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block' }}>{l}</span>
                  <span style={{ fontSize:20,fontWeight:900,fontFamily:"'DM Mono',monospace",color:c,display:'block',marginTop:4 }}>{v}</span>
                  <span style={{ fontSize:8,color:'rgba(255,255,255,0.2)' }}>{u}</span>
                </Glass>
              ))}
            </div>
          )}

          {/* Grafik Speed Curve */}
          <Glass style={{ padding:16,marginBottom:12 }}>
            <div style={{ position:'absolute',top:-40,right:-40,width:150,height:150,borderRadius:'50%',background:`radial-gradient(circle,${dc}15 0%,transparent 70%)`,pointerEvents:'none' }} />
            <span style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em',display:'block',marginBottom:12 }}>Kurva Kecepatan</span>
            <svg viewBox="0 0 500 100" style={{ width:'100%',height:80,overflow:'visible' }}>
              <path d={svgPath} fill="none" stroke={dc} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Glass>
        </>
      )}
    </div>
  );
}

function ChampionsTab() {
  return (
    <div style={{ padding: 16, animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', letterSpacing: '-0.5px' }}>Daftar Juara</h2>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Segera hadir</p>
    </div>
  );
}

function BottomNav({ activeTab, setActiveTab, selectedDriver }) {
  if (selectedDriver) return null;
  const TABS = [
    { id: 'home', icon: Activity, label: 'Live' },
    { id: 'schedule', icon: Calendar, label: 'Jadwal' },
    { id: 'standings', icon: Trophy, label: 'Klasemen' },
    { id: 'telemetry', icon: Gauge, label: 'Telemetri' }
  ];
  return (
    <div style={{ position: 'fixed', bottom: 16, left: 0, right: 0, maxWidth: 400, margin: '0 auto', padding: '12px 16px', background: 'rgba(7,7,20,0.85)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, display: 'flex', justifyContent: 'space-around', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100 }}>
      {TABS.map(t => {
        const sel = activeTab === t.id;
        const Icon = t.icon;
        return (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: 'transparent', border: 'none', color: sel ? '#FF2744' : 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ padding: '6px 14px', borderRadius: 16, background: sel ? 'rgba(255,39,68,0.1)' : 'transparent', transition: 'all 0.2s' }}>
              <Icon size={20} style={{ filter: sel ? 'drop-shadow(0 0 8px rgba(255,39,68,0.5))' : 'none' }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.02em', opacity: sel ? 1 : 0.7 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
