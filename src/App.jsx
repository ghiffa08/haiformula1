import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { AlertCircle, Flag, RefreshCw } from 'lucide-react';
import { fetchWithRetry, fetchWithCache, fetchRaceResults, fetchDriverPhotos } from './services/api';
import { syncNextRaceToWidget, syncRaceResultsToWidget } from './services/widgetSync';
import { requestNotificationPermissions, scheduleSmartNotifications } from './services/notifications';
import { MOCK_RACES, MOCK_DRIVER_STANDINGS, MOCK_CONSTRUCTOR_STANDINGS } from './services/mockData';
import BottomNav from './components/BottomNav';

// Lazy loaded pages/tabs
const HomeTab = lazy(() => import('./pages/HomeTab'));
const ScheduleTab = lazy(() => import('./pages/ScheduleTab'));
const StandingsTab = lazy(() => import('./pages/StandingsTab'));
const TelemetryTab = lazy(() => import('./pages/TelemetryTab'));
const ChampionsTab = lazy(() => import('./pages/ChampionsTab'));
import { SkeletonPage } from './components/ui/Skeleton';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const DriverDetail = lazy(() => import('./pages/DriverDetail'));
const RaceDetail = lazy(() => import('./pages/RaceDetail'));

// Loading Fallback Component
const LoadingFallback = () => <SkeletonPage />;

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
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

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadF1 = useCallback(async () => {
    await Promise.resolve(); // Defer state updates to avoid synchronous setState inside useEffect
    setIsLoading(true); setErrorMsg(null);
    try {
      const s = await fetchWithCache('https://f1api.dev/api/current', 'f1_races_cache', 360);
      const rawRaces = s.races || [];
      const rd = rawRaces.map(r => ({
        round: String(r.round),
        raceName: (r.raceName || '').replace("Formula 1", "").replace("Formula One", "").replace("Grand Prix", "GP").replace(/\b202\d\b/g, "").replace(/\s+/g, " ").trim(),
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

      const cachedRaces = localStorage.getItem('last_saved_races');
      const cachedDrivers = localStorage.getItem('last_saved_driver_standings');
      const cachedConstructors = localStorage.getItem('last_saved_constructor_standings');
      
      if (cachedRaces) {
        try {
          rd = JSON.parse(cachedRaces);
          if (cachedDrivers) ds = JSON.parse(cachedDrivers);
          if (cachedConstructors) cs = JSON.parse(cachedConstructors);
        } catch { /* ignore */ }
      }
      
      if (rd.length === 0) {
        try {
          const response = await fetch('/data/f1_2026_fallback.json');
          if (response.ok) {
            const data = await response.json();
            rd = data.races || [];
            ds = data.driverStandings || [];
            cs = data.constructorStandings || [];
            
            localStorage.setItem('last_saved_races', JSON.stringify(rd));
            localStorage.setItem('last_saved_driver_standings', JSON.stringify(ds));
            localStorage.setItem('last_saved_constructor_standings', JSON.stringify(cs));
          }
        } catch { /* ignore */ }
      }
      
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
      const nextRaceObj = rd.find(r => new Date(`${r.date}T${r.time||'15:00:00Z'}`) > now) || rd[rd.length-1];
      setNextRace(nextRaceObj);

      // Async sync last race results for widget
      setTimeout(async () => {
        try {
          const nextIndex = rd.findIndex(r => new Date(`${r.date}T${r.time||'15:00:00Z'}`) > now);
          const lastRace = nextIndex > 0 ? rd[nextIndex - 1] : (nextIndex === -1 ? rd[rd.length - 1] : null);
          if (lastRace) {
            const res = await fetchRaceResults(lastRace.season || '2026', lastRace.round);
            let rawResults = [];
            if (res && res.races) {
              if (Array.isArray(res.races)) rawResults = res.races[0]?.results || [];
              else rawResults = res.races.results || [];
            } else if (res && res.race_results) {
              rawResults = res.race_results;
            }
            if (rawResults && rawResults.length > 0) {
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
                  nationality: r.team?.nationality || '',
                  constructorId: r.team?.teamId || ''
                }
              }));
              syncRaceResultsToWidget(lastRace, resultsList);
            }
          }
        } catch (e) {
          console.error("Gagal sync hasil balapan untuk widget:", e);
        }
      }, 1000);
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
    if (races && races.length > 0) {
      const initNotifications = async () => {
        const hasPerm = await requestNotificationPermissions();
        if (hasPerm) {
          await scheduleSmartNotifications(races);
        }
      };
      initNotifications();
    }
  }, [races]);
  
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
        background:'rgba(7,7,20,0.7)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(255,255,255,0.03)',
        padding:'16px 20px', display:'flex', alignItems:'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Flag size={16} color="#FF2744" fill="#FF2744" />
          <span style={{ fontWeight:900, fontSize:16, letterSpacing:'-0.5px', color:'#fff', fontStyle:'italic' }}>
            HAI<span style={{ color:'#FF2744' }}>F1</span>
          </span>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <div style={{ width:6,height:6,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 8px rgba(34,197,94,0.6)',animation:'blink 2s infinite' }} />
            <span style={{ fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.7)',letterSpacing:'0.05em' }}>LIVE API</span>
          </div>
          <button onClick={()=>{loadF1();loadOpenF1();}} style={{ background:'transparent',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={14} style={{ animation:isLoading?'spin 1s linear infinite':'none' }} />
          </button>
        </div>
      </header>

      <main style={{ position:'relative', zIndex:1, flex:1, overflowY:'auto', paddingBottom:90 }}>
        {errorMsg && (
          <div style={{ margin:'12px 16px', padding:'10px 14px', background:'rgba(232,0,45,0.08)', border:'1px solid rgba(232,0,45,0.15)', borderRadius:14, backdropFilter:'blur(20px)', display:'flex', alignItems:'center', gap:8 }}>
            <AlertCircle size={13} color="#FF2744" />
            <span style={{ fontSize:11, color:'#FF2744' }}>{errorMsg}</span>
          </div>
        )}

        {isOffline && (
          <div style={{ margin:'0 16px 12px 16px', padding:'10px 14px', background:'rgba(245, 158, 11, 0.1)', border:'1px solid rgba(245, 158, 11, 0.2)', borderRadius:14, backdropFilter:'blur(20px)', display:'flex', alignItems:'center', gap:8, animation: 'fadeUp 0.3s ease' }}>
            <AlertCircle size={13} color="#F59E0B" />
            <span style={{ fontSize:11, color:'#F59E0B', fontWeight: 600 }}>Anda sedang offline. Data mungkin tidak terbaru.</span>
          </div>
        )}

        {isLoading ? (
          <SkeletonPage />
        ) : (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
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
            </Suspense>
          </ErrorBoundary>
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
