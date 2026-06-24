import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar, Trophy, MapPin, AlertCircle, Gauge, ChevronLeft, RefreshCw, Award, Flag, Activity } from 'lucide-react';
import { RaceStrategy, RaceRecap } from './components/OpenF1Widgets';
import { fetchWithRetry, fetchWithCache, fetchRaceResults, fetchDriverPhotos } from './services/api';
import { syncNextRaceToWidget } from './services/widgetSync';
import { MOCK_RACES, MOCK_DRIVER_STANDINGS, MOCK_CONSTRUCTOR_STANDINGS } from './services/mockData';

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
  } catch {
    return `${dateStr}`;
  }
};

const FALLBACK_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
const getHighResImg = (url) => url ? url.replace(/\.transform\/.*$/, '') : null;

const getMatchedDriver = (openF1Drivers, ergastDriver) => {
  if (!openF1Drivers || !ergastDriver) return null;
  const num = String(ergastDriver.permanentNumber || ergastDriver.number || '');
  const code = String(ergastDriver.code || '').toUpperCase();
  const familyName = String(ergastDriver.familyName || '').toLowerCase();
  
  return openF1Drivers.find(o => {
    // 1. Match by driver number
    const oNum = String(o.driver_number || '');
    if (num && oNum && (oNum === num || (num === '33' && oNum === '1') || (num === '1' && oNum === '33'))) {
      return true;
    }
    // 2. Match by abbreviation code (e.g., HAM, RUS)
    const oCode = String(o.name_acronym || '').toUpperCase();
    if (code && oCode && oCode === code) {
      return true;
    }
    // 3. Match by family name
    const oLastName = String(o.last_name || '').toLowerCase();
    if (familyName && oLastName && oLastName.includes(familyName)) {
      return true;
    }
    return false;
  });
};

const DriverAvatar = ({ openF1Drivers, driver, style, className }) => {
  const matched = getMatchedDriver(openF1Drivers, driver);
  const headshotUrl = matched ? getHighResImg(matched.headshot_url) : null;

  return (
    <img
      loading="lazy"
      decoding="async"
      src={headshotUrl || FALLBACK_AVATAR}
      alt={driver?.familyName || 'Driver'}
      style={style}
      className={className}
      onError={(e) => {
        if (e.target.src !== FALLBACK_AVATAR) {
          e.target.src = FALLBACK_AVATAR;
        }
      }}
    />
  );
};

// main API urls are now queried directly to https://f1api.dev

const getF1CountryName = (country = '') => {
  const map = {
    'UK': 'Great_Britain',
    'USA': 'United_States',
    'UAE': 'Abu_Dhabi',
    'Saudi Arabia': 'Saudi_Arabia'
  };
  return map[country] || country.replace(/ /g, '_');
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
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedRaceResults, setSelectedRaceResults] = useState(null);
  const [selectedRaceResultsLoading, setSelectedRaceResultsLoading] = useState(false);
  const [standingsSub, setStandingsSub] = useState('drivers');
  const [nextRace, setNextRace] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days:0, hours:0, minutes:0, seconds:0 });
  const [openF1Drivers, setOpenF1Drivers] = useState([]);
  const hasFetchedRef = useRef(false);

  const loadF1 = useCallback(async () => {
    await Promise.resolve(); // Defer state updates to avoid synchronous setState inside useEffect
    setIsLoading(true); setErrorMsg(null);
    try {
      const s = await fetchWithCache('https://f1api.dev/api/current', 'f1_races_cache', 360);
      const rawRaces = s.races || [];
      const rd = rawRaces.map(r => ({
        round: String(r.round),
        raceName: r.raceName,
        date: r.schedule?.race?.date || r.date,
        time: r.schedule?.race?.time || r.time || '15:00:00Z',
        Circuit: {
          circuitName: r.circuit?.circuitName || r.circuitName,
          Location: {
            locality: r.circuit?.city || '',
            country: r.circuit?.country || ''
          }
        },
        FirstPractice: r.schedule?.fp1 ? { date: r.schedule.fp1.date, time: r.schedule.fp1.time } : undefined,
        SecondPractice: r.schedule?.fp2 ? { date: r.schedule.fp2.date, time: r.schedule.fp2.time } : undefined,
        ThirdPractice: r.schedule?.fp3 ? { date: r.schedule.fp3.date, time: r.schedule.fp3.time } : undefined,
        Qualifying: r.schedule?.qualy ? { date: r.schedule.qualy.date, time: r.schedule.qualy.time } : undefined,
        Sprint: r.schedule?.sprintRace?.date ? { date: r.schedule.sprintRace.date, time: r.schedule.sprintRace.time } : undefined,
        season: String(r.championshipId ? r.championshipId.replace('f1_', '') : s.season)
      }));
      setRaces(rd);
      setCurrentSeason(String(s.season || '2026'));
      localStorage.setItem('last_saved_races', JSON.stringify(rd));
      
      const now = new Date();
      setNextRace(rd.find(r => new Date(`${r.date}T${r.time||'15:00:00Z'}`) > now) || rd[rd.length-1]);
      
      const ds = await fetchWithCache('https://f1api.dev/api/current/drivers-championship', 'f1_drivers_standings_cache', 720);
      const driverStandingsList = (ds.drivers_championship || []).map(d => ({
        position: String(d.position),
        points: String(d.points),
        wins: String(d.wins),
        Driver: {
          driverId: d.driverId,
          permanentNumber: d.driver?.number ? String(d.driver.number) : '',
          code: d.driver?.shortName || '',
          givenName: d.driver?.name || '',
          familyName: d.driver?.surname || '',
          nationality: d.driver?.nationality || ''
        },
        Constructors: [{ name: d.team?.teamName || '' }]
      }));
      setDriverStandings(driverStandingsList);
      localStorage.setItem('last_saved_driver_standings', JSON.stringify(driverStandingsList));
      
      const cs = await fetchWithCache('https://f1api.dev/api/current/constructors-championship', 'f1_constructors_standings_cache', 720);
      const constructorStandingsList = (cs.constructors_championship || []).map(team => ({
        position: String(team.position),
        points: String(team.points),
        Constructor: {
          name: team.team?.teamName || '',
          nationality: team.team?.country || ''
        }
      }));
      setConstructorStandings(constructorStandingsList);
      localStorage.setItem('last_saved_constructor_standings', JSON.stringify(constructorStandingsList));
    } catch { 
      setErrorMsg('API sedang sibuk — menggunakan sinkronisasi data lokal.'); 
      
      let rd = [];
      let ds = [];
      let cs = [];

      // Tier 2: Ambil data dari cache localStorage jika tersedia
      const cachedRaces = localStorage.getItem('last_saved_races');
      const cachedDrivers = localStorage.getItem('last_saved_driver_standings');
      const cachedConstructors = localStorage.getItem('last_saved_constructor_standings');
      
      if (cachedRaces) {
        try {
          rd = JSON.parse(cachedRaces);
          if (cachedDrivers) ds = JSON.parse(cachedDrivers);
          if (cachedConstructors) cs = JSON.parse(cachedConstructors);
        } catch {
          /* ignore cache parsing errors */
        }
      }
      
      // Tier 3: Jika cache kosong, ambil dari file JSON statis lokal
      if (rd.length === 0) {
        try {
          const response = await fetch('/data/f1_2026_fallback.json');
          if (response.ok) {
            const data = await response.json();
            rd = data.races || [];
            ds = data.driverStandings || [];
            cs = data.constructorStandings || [];
            
            // Simpan ke localStorage untuk penggunaan Tier 2 berikutnya
            localStorage.setItem('last_saved_races', JSON.stringify(rd));
            localStorage.setItem('last_saved_driver_standings', JSON.stringify(ds));
            localStorage.setItem('last_saved_constructor_standings', JSON.stringify(cs));
          }
        } catch {
          /* ignore fetch errors for local assets */
        }
      }
      
      // Fallback Kode: Jika file asset statis lokal gagal di-fetch (misal instalasi baru & full offline)
      if (rd.length === 0) {
        rd = MOCK_RACES;
        ds = MOCK_DRIVER_STANDINGS;
        cs = MOCK_CONSTRUCTOR_STANDINGS;
        
        localStorage.setItem('last_saved_races', JSON.stringify(MOCK_RACES));
        localStorage.setItem('last_saved_driver_standings', JSON.stringify(MOCK_DRIVER_STANDINGS));
        localStorage.setItem('last_saved_constructor_standings', JSON.stringify(MOCK_CONSTRUCTOR_STANDINGS));
      }
      
      setRaces(rd);
      const now = new Date();
      setNextRace(rd.find(r => new Date(`${r.date}T${r.time||'15:00:00Z'}`) > now) || rd[rd.length-1]);
      setDriverStandings(ds);
      setConstructorStandings(cs);
      setCurrentSeason('2026');
    } finally { 
      setIsLoading(false); 
    }
  }, []);

  const loadOpenF1 = useCallback(async () => {
    try {
      const list = await fetchDriverPhotos();
      if (list && list.length) {
        const u = Array.from(new Map(list.map(d => [d.driver_number, d])).values());
        setOpenF1Drivers(u);
        return;
      }
    } catch (e) {
      console.error('Failed to load cached driver photos:', e);
    }
    try {
      const sessions = await fetchWithRetry('https://api.openf1.org/v1/sessions?year=2024&session_name=Race');
      if (sessions?.length) {
        const lat = sessions[sessions.length-1];
        const list = await fetchWithRetry(`https://api.openf1.org/v1/drivers?session_key=${lat.session_key}`);
        if (list?.length) { 
          const u=Array.from(new Map(list.map(d=>[d.driver_number,d])).values()); 
          setOpenF1Drivers(u); 
          return; 
        }
      }
    } catch { /* ignore */ }
    try {
      const fb = await fetchWithRetry('https://api.openf1.org/v1/drivers?session_key=latest');
      const u=Array.from(new Map(fb.map(d=>[d.driver_number,d])).values()); 
      setOpenF1Drivers(u); 
    } catch { /* ignore */ }
  }, []);

  const handleRaceClick = useCallback(async (race) => {
    setSelectedRace(race);
    setSelectedRaceResults(null);

    const raceDateTime = new Date(`${race.date}T${race.time || '15:00:00Z'}`);
    const isFutureRace = raceDateTime > new Date();

    if (isFutureRace) {
      setSelectedRaceResultsLoading(false);
      setSelectedRaceResults(null);
      return;
    }

    const year = race.season || '2026';
    setSelectedRaceResultsLoading(true);
    try {
      const res = await fetchRaceResults(year, race.round);
      if (res === null) {
        setSelectedRaceResults(null);
        return;
      }
      let rawResults = [];
      if (res && res.races) {
        if (Array.isArray(res.races)) {
          rawResults = res.races[0]?.results || [];
        } else {
          rawResults = res.races.results || [];
        }
      } else if (res && res.race_results) {
        rawResults = res.race_results;
      }

      if (!rawResults || rawResults.length === 0) {
        setSelectedRaceResults(null);
        return;
      }

      const resultsList = rawResults.map(r => ({
        position: String(r.position),
        number: r.driver?.number ? String(r.driver.number) : '',
        Driver: {
          givenName: r.driver?.name || '',
          familyName: r.driver?.surname || '',
          permanentNumber: r.driver?.number ? String(r.driver.number) : '',
          code: r.driver?.shortName || '',
          nationality: r.driver?.nationality || '',
          driverId: r.driver?.driverId || ''
        },
        Constructor: {
          name: r.team?.teamName || '',
          nationality: r.team?.nationality || ''
        },
        Time: typeof r.time === 'string' ? { time: r.time } : (r.Time ? { time: r.Time.time } : null),
        status: r.retired || r.status || (typeof r.time === 'string' && r.time.includes('DNF') ? r.time : 'Finished')
      }));
      setSelectedRaceResults(resultsList);
    } catch (e) {
      console.error(e);
      setSelectedRaceResults([]);
    } finally {
      setSelectedRaceResultsLoading(false);
    }
  }, []);

  useEffect(() => { 
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    setTimeout(() => {
      loadF1(); 
      loadOpenF1(); 
    }, 0);
  }, [loadF1, loadOpenF1]);
  
  useEffect(() => {
    if (!nextRace) return;
    
    const weekendSessions = [
      { name: 'FP1', session: nextRace.FirstPractice },
      { name: 'FP2', session: nextRace.SecondPractice },
      { name: 'FP3', session: nextRace.ThirdPractice },
      { name: 'Sprint', session: nextRace.Sprint },
      { name: 'Qualifying', session: nextRace.Qualifying },
      { name: 'Grand Prix', session: { date: nextRace.date, time: nextRace.time }, isMain: true }
    ].filter(item => item.session && item.session.date);

    const now = Date.now();
    let nextSession = null;
    let closestDiff = Infinity;
    
    for (const s of weekendSessions) {
      const t = new Date(`${s.session.date}T${s.session.time || '15:00:00Z'}`).getTime();
      const diff = t - now;
      if (diff > 0 && diff < closestDiff) {
        closestDiff = diff;
        nextSession = s;
      }
    }
    
    if (!nextSession && weekendSessions.length > 0) {
      nextSession = weekendSessions[weekendSessions.length - 1]; // Fallback ke Main Race
    }

    // Sync data untuk Widget Android
    syncNextRaceToWidget(nextRace, nextSession);

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

  const maxPts = parseFloat(driverStandings[0]?.points||1);

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
              : selectedRace
              ? <RaceDetail race={selectedRace} results={selectedRaceResults} loading={selectedRaceResultsLoading} onBack={()=>setSelectedRace(null)} openF1Drivers={openF1Drivers} />
              : <>
                  {activeTab==='home' && <HomeTab nextRace={nextRace} timeLeft={timeLeft} currentSeason={currentSeason} />}
                  {activeTab==='schedule' && <ScheduleTab races={races} nextRace={nextRace} currentSeason={currentSeason} onSelect={handleRaceClick} />}
                  {activeTab==='standings' && <StandingsTab sub={standingsSub} setSub={setStandingsSub} driverStandings={driverStandings} constructorStandings={constructorStandings} currentSeason={currentSeason} onSelect={setSelectedDriver} maxPts={maxPts} openF1Drivers={openF1Drivers} />}
                  {activeTab==='telemetry' && <TelemetryTab />}
                  {activeTab==='champions' && <ChampionsTab />}
                </>
            }
          </>
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={t=>{setActiveTab(t);setSelectedDriver(null);setSelectedRace(null);setSelectedRaceResults(null);}} selectedDriver={selectedDriver} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes glow { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════
   BERANDA / HOME TAB (Dengan Jadwal Sesi & WIB)
════════════════════════════════════════════ */
function HomeTab({ nextRace, timeLeft, currentSeason }) {
  const [weather, setWeather] = React.useState(null);

  React.useEffect(() => {
    const fetchWeather = async () => {
      if (!nextRace) return;
      try {
        const country = nextRace.Circuit?.Location?.country;
        if (!country) return;
        const queryYear = Math.min(parseInt(currentSeason || '2024') || 2024, 2024);
        const meetingRes = await fetchWithRetry(`https://api.openf1.org/v1/meetings?year=${queryYear}&country_name=${country}`);
        if (meetingRes && meetingRes.length > 0) {
          const meetingKey = meetingRes[0].meeting_key;
          const weatherRes = await fetchWithRetry(`https://api.openf1.org/v1/weather?meeting_key=${meetingKey}`);
          if (weatherRes && weatherRes.length > 0) {
            setWeather(weatherRes[weatherRes.length - 1]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch weather", e);
      }
    };
    fetchWeather();
  }, [nextRace, currentSeason]);

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
          <div style={{ margin: '14px 0', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
            <img 
              loading="lazy"
              src={`https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${getF1CountryName(nextRace.Circuit?.Location?.country)}_Circuit.png`}
              alt={`Layout Trek ${nextRace.Circuit?.circuitName}`}
              style={{ maxWidth: '100%', height: 'auto', maxHeight: 160, filter: 'drop-shadow(0 4px 12px rgba(232,0,45,0.25))' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.05)' }}>
            {[{l:'Panjang Trek',v:'3.337 km'},{l:'Jumlah Belokan',v:'19'},{l:'Zona DRS',v:'01',r:true}].map(({l,v,r})=>(
              <div key={l} style={{ background:'rgba(0,0,0,0.25)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:12,padding:'10px 8px',textAlign:'center' }}>
                <span style={{ fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block' }}>{l}</span>
                <span style={{ fontSize:13,fontWeight:800,fontFamily:"'DM Mono',monospace",color:r?'#FF2744':'#fff',display:'block',marginTop:3 }}>{v}</span>
              </div>
            ))}
          </div>
          {weather && (
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,padding:'12px 14px',background:'rgba(0,0,0,0.2)',borderRadius:14,border:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',flex:1 }}>
                <span style={{ fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:'0.05em' }}>SUHU UDARA</span>
                <span style={{ fontSize:14,fontWeight:800,color:'#fff',marginTop:2 }}>{weather.air_temperature}°C</span>
              </div>
              <div style={{ width:1,height:24,background:'rgba(255,255,255,0.08)' }} />
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',flex:1 }}>
                <span style={{ fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:'0.05em' }}>SUHU TREK</span>
                <span style={{ fontSize:14,fontWeight:800,color:'#fff',marginTop:2 }}>{weather.track_temperature}°C</span>
              </div>
              <div style={{ width:1,height:24,background:'rgba(255,255,255,0.08)' }} />
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',flex:1 }}>
                <span style={{ fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:700,letterSpacing:'0.05em' }}>KELEMBAPAN</span>
                <span style={{ fontSize:14,fontWeight:800,color:'#fff',marginTop:2 }}>{weather.humidity}%</span>
              </div>
            </div>
          )}
        </Glass>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   JADWAL / SCHEDULE TAB
════════════════════════════════════════════ */
function ScheduleTab({ races, nextRace, currentSeason, onSelect }) {
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
            <Glass key={race.round} onClick={() => onSelect && onSelect(race)} accent={isCurrent?'#FF2744':undefined} style={{ padding:'16px 18px' }}>
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
            <button key={t} onClick={()=>{
              if(isDriversTab) setSub('drivers');
              else if(isTeamsTab) setSub('teams');
              else alert(`Kategori "${t}" segera hadir!`);
            }}
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
                      <DriverAvatar openF1Drivers={openF1Drivers} driver={d.Driver} style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'top' }} />
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
                    <DriverAvatar openF1Drivers={openF1Drivers} driver={d.Driver} style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'top',filter:'grayscale(0.4)' }} />
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
        <DriverAvatar openF1Drivers={openF1Drivers} driver={driver.Driver} style={{ position:'absolute',right:0,bottom:0,width:'68%',height:'100%',objectFit:'cover',objectPosition:'top center' }} />
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
function TelemetryTab() {
  return (
    <div style={{ padding: 16, animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#fff', letterSpacing: '-0.5px' }}>Telemetry Lab</h2>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Fitur Telemetri saat ini dinonaktifkan sementara (Coming Soon) untuk mengoptimalkan penggunaan server API.</p>
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

/* ════════════════════════════════════════════
   RACE DETAIL PAGE
════════════════════════════════════════════ */
function RaceDetail({ race, results, loading, onBack, openF1Drivers }) {
  const [weather, setWeather] = useState(null);
  const [meetingSessions, setMeetingSessions] = useState([]);
  const [activeSessionKey, setActiveSessionKey] = useState(null);

  useEffect(() => {
    const fetchWeatherAndSession = async () => {
      if (loading || results === null) return;
      try {
        const country = race.Circuit?.Location?.country;
        if (!country) return;
        const queryYear = Math.min(parseInt(race.season || '2024') || 2024, 2024);
        const meetingRes = await fetchWithRetry(`https://api.openf1.org/v1/meetings?year=${queryYear}&country_name=${country}`);
        if (meetingRes && meetingRes.length > 0) {
          const meetingKey = meetingRes[0].meeting_key;
          const [weatherRes, sessionsRes] = await Promise.all([
            fetchWithRetry(`https://api.openf1.org/v1/weather?meeting_key=${meetingKey}`),
            fetchWithRetry(`https://api.openf1.org/v1/sessions?meeting_key=${meetingKey}`)
          ]);
          
          if (weatherRes && weatherRes.length > 0) {
            setWeather(weatherRes[weatherRes.length - 1]);
          }
          if (sessionsRes && sessionsRes.length > 0) {
            const sortedSessions = sessionsRes.sort((a,b) => new Date(a.date_start) - new Date(b.date_start));
            setMeetingSessions(sortedSessions);
            const raceSession = sortedSessions.find(s => s.session_name === 'Race' || s.session_type === 'Race');
            setActiveSessionKey(raceSession ? raceSession.session_key : sortedSessions[sortedSessions.length - 1].session_key);
          }
        }
      } catch(e) {
        console.error('Error fetching data:', e);
      }
    };
    fetchWeatherAndSession();
  }, [race, results, loading]);

  const sessions = [
    { name: 'Latihan Bebas 1 (FP1)', session: race.FirstPractice },
    { name: 'Latihan Bebas 2 (FP2)', session: race.SecondPractice },
    { name: 'Latihan Bebas 3 (FP3)', session: race.ThirdPractice },
    { name: 'Sprint Shootout / Race', session: race.Sprint },
    { name: 'Kualifikasi (Qualifying)', session: race.Qualifying },
    { name: 'Balapan Utama (Grand Prix)', session: { date: race.date, time: race.time }, isMain: true }
  ].filter(item => item.session && item.session.date);

  const upcoming = new Date(`${race.date}T${race.time||'15:00:00Z'}`) > new Date();

  return (
    <div style={{ animation:'fadeUp 0.3s ease', position:'relative', paddingBottom: 20 }}>
      <div style={{ position:'relative', height:280, overflow:'hidden', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <img loading="lazy" src="https://images.unsplash.com/photo-1614949194403-9602bdc14a3a?q=80&w=871&auto=format&fit=crop" alt="Background" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', filter:'brightness(0.2) saturate(1)' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(7,7,20,1) 0%, rgba(7,7,20,0.4) 50%, transparent 100%)' }} />
        
        {/* Tombol Kembali */}
        <button onClick={onBack} style={{ position:'absolute',top:16,left:16,display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,cursor:'pointer',color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:600,zIndex:10 }}>
          <ChevronLeft size={14} /> Kembali
        </button>

        <div style={{ position:'absolute',bottom:24,left:20,right:20 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
            <span style={{ fontSize:10,fontWeight:700,color:'#FF2744',background:'rgba(255,39,68,0.15)',padding:'4px 10px',borderRadius:12,letterSpacing:'0.1em' }}>ROUND {race.round}</span>
            <div style={{ padding:'2px 8px',borderRadius:20,background:upcoming?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${upcoming?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.06)'}` }}>
              <span style={{ fontSize:8,fontWeight:700,color:upcoming?'#22C55E':'rgba(255,255,255,0.3)' }}>{upcoming?'Mendatang':'Selesai'}</span>
            </div>
          </div>
          <h2 style={{ fontSize:32,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',lineHeight:1,letterSpacing:'-1px' }}>
            {race.raceName.replace('Grand Prix','GP')}
          </h2>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:8 }}>
            <MapPin size={12} color="#FF2744" />
            <span style={{ fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.7)' }}>
              {race.Circuit?.Location?.locality}, {race.Circuit?.Location?.country}
            </span>
          </div>
          {weather && (
            <div style={{ display:'flex',alignItems:'center',gap:12,marginTop:12,padding:'8px 12px',background:'rgba(0,0,0,0.3)',backdropFilter:'blur(10px)',borderRadius:12,border:'1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display:'flex',flexDirection:'column' }}>
                <span style={{ fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700 }}>SUHU UDARA</span>
                <span style={{ fontSize:13,fontWeight:800,color:'#fff' }}>{weather.air_temperature}°C</span>
              </div>
              <div style={{ width:1,height:24,background:'rgba(255,255,255,0.1)' }} />
              <div style={{ display:'flex',flexDirection:'column' }}>
                <span style={{ fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700 }}>SUHU TREK</span>
                <span style={{ fontSize:13,fontWeight:800,color:'#fff' }}>{weather.track_temperature}°C</span>
              </div>
              <div style={{ width:1,height:24,background:'rgba(255,255,255,0.1)' }} />
              <div style={{ display:'flex',flexDirection:'column' }}>
                <span style={{ fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700 }}>KELEMBAPAN</span>
                <span style={{ fontSize:13,fontWeight:800,color:'#fff' }}>{weather.humidity}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Memuat data balapan...</div>
        ) : results && results.length > 0 ? (
          <Glass style={{ padding: 18, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Hasil Balapan
              </span>
              <Trophy size={14} color="#FF2744" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map((res, i) => {
                const tColor = getTeamColor(res.Constructor.name || '');
                return (
                  <div key={res.position} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ width: 24, fontSize: 14, fontWeight: 900, fontStyle: 'italic', color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.5)' }}>
                      {res.position}
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${tColor}40` }}>
                      <DriverAvatar
                        openF1Drivers={openF1Drivers}
                        driver={res.Driver}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{res.Driver.givenName} {res.Driver.familyName}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{res.Constructor.name}</div>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: i === 0 ? '#FF2744' : 'rgba(255,255,255,0.6)' }}>
                      {res.Time ? res.Time.time : res.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </Glass>
        ) : (
          <Glass style={{ padding: 20, marginTop: 16, textAlign: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600 }}>
              {new Date(`${race.date}T${race.time || '15:00:00Z'}`) > new Date()
                ? "Data balapan belum tersedia karena balapan belum dimulai."
                : "Data balapan belum tersedia."}
            </span>
          </Glass>
        )}

        <Glass style={{ padding: '20px 18px', marginTop: 16 }}>
          <div style={{ display:'flex',gap:14,alignItems:'center',marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'0.12em',textTransform:'uppercase',display:'block',marginBottom:4 }}>Informasi Trek</span>
              <h3 style={{ fontSize:16,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',lineHeight:1.2 }}>{race.Circuit?.circuitName}</h3>
            </div>
          </div>
          <div style={{ margin: '14px 0', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
            <img 
              loading="lazy"
              src={`https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${getF1CountryName(race.Circuit?.Location?.country)}_Circuit.png`}
              alt={`Layout Trek ${race.Circuit?.circuitName}`}
              style={{ maxWidth: '100%', height: 'auto', maxHeight: 160, filter: 'drop-shadow(0 4px 12px rgba(232,0,45,0.25))' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </Glass>

        {sessions.length > 0 && (
          <Glass style={{ padding: 18, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Jadwal Sesi
              </span>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>WIB TIMEZONE</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map(({ name, session, isMain }) => (
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
                    {/* fallback timezone using formatSessionTime if imported/available, wait, formatSessionTime is in App.jsx scope! */}
                    {session.time ? new Date(`${session.date}T${session.time.endsWith('Z') ? session.time : session.time + 'Z'}`).toLocaleDateString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'TBA'}
                  </span>
                </div>
              ))}
            </div>
          </Glass>
        )}
        {/* Session Selector (FP1, FP2, Quali, Race) */}
        {meetingSessions.length > 0 && (
          <div style={{ padding: '0 16px', marginBottom: 16 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
              Pilih Sesi untuk Data OpenF1
            </span>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {meetingSessions.map(sess => (
                <button
                  key={sess.session_key}
                  onClick={() => setActiveSessionKey(sess.session_key)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                    background: activeSessionKey === sess.session_key ? '#FF2744' : 'rgba(255,255,255,0.05)',
                    color: activeSessionKey === sess.session_key ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: '1px solid',
                    borderColor: activeSessionKey === sess.session_key ? '#FF2744' : 'rgba(255,255,255,0.1)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: activeSessionKey === sess.session_key ? '0 4px 12px rgba(255,39,68,0.3)' : 'none'
                  }}
                >
                  {sess.session_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OpenF1 Specific Widgets */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {activeSessionKey && <RaceStrategy sessionKey={activeSessionKey} results={results} />}
          {activeSessionKey && <RaceRecap sessionKey={activeSessionKey} openF1Drivers={openF1Drivers} />}
        </div>
        
      </div>
    </div>
  );
}
