import { useState, useEffect, lazy, Suspense } from 'react';
import { ChevronLeft, MapPin, Check } from 'lucide-react';
import Glass from '../components/ui/Glass';
import DriverAvatar from '../components/ui/DriverAvatar';
import { SkeletonList, SkeletonCard } from '../components/ui/Skeleton';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { fetchWithRetry } from '../services/api';
import { getF1CountryName, getTeamColor } from '../utils/helpers';

const RaceStrategy = lazy(() => import('../components/OpenF1Widgets').then(module => ({ default: module.RaceStrategy })));
const RaceRecap = lazy(() => import('../components/OpenF1Widgets').then(module => ({ default: module.RaceRecap })));

export default function RaceDetail({ race, results, loading, onBack, openF1Drivers }) {
  const [weather, setWeather] = useState(null);
  const [meetingSessions, setMeetingSessions] = useState([]);
  const [activeSessionKey, setActiveSessionKey] = useState(null);
  const [showFullResults, setShowFullResults] = useState(false);
  const [selectedRaceTimeLeft, setSelectedRaceTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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

  useEffect(() => {
    if (!upcoming) return;
    const calculateTimeLeft = () => {
      const diff = new Date(`${race.date}T${race.time || '15:00:00Z'}`).getTime() - Date.now();
      if (diff <= 0) {
        setSelectedRaceTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setSelectedRaceTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      });
    };
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [race, upcoming]);

  return (
    <div style={{ animation:'fadeUp 0.3s ease', position:'relative', paddingBottom: 20 }}>
      <div style={{ position:'relative', minHeight:280, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'24px 20px', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow:'hidden' }}>
        <img loading="lazy" src="https://images.unsplash.com/photo-1614949194403-9602bdc14a3a?q=80&w=871&auto=format&fit=crop" alt="Background" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', filter:'brightness(0.2) saturate(1)', zIndex: 0 }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(7,7,20,1) 0%, rgba(7,7,20,0.4) 50%, transparent 100%)', zIndex: 1 }} />
        
        {/* Tombol Kembali */}
        <button onClick={onBack} style={{ position:'absolute',top:16,left:16,display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'rgba(255,255,255,0.08)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,cursor:'pointer',color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:600,zIndex:10 }}>
          <ChevronLeft size={14} /> Kembali
        </button>

        <div style={{ position:'relative', zIndex: 2, paddingTop: 60 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
            <span style={{ fontSize:10,fontWeight:700,color:'#FF2744',background:'rgba(255,39,68,0.15)',padding:'4px 10px',borderRadius:12,letterSpacing:'0.1em' }}>ROUND {race.round}</span>
            <div style={{ padding:'2px 8px',borderRadius:20,background:upcoming?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${upcoming?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.06)'}` }}>
              <span style={{ fontSize:8,fontWeight:700,color:upcoming?'#22C55E':'rgba(255,255,255,0.3)' }}>{upcoming?'Mendatang':'Selesai'}</span>
            </div>
          </div>
          <h2 style={{ fontSize:32,fontWeight:900,fontStyle:'italic',textTransform:'uppercase',color:'#fff',lineHeight:1.1,letterSpacing:'-1px', display:'-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {race.raceName.replace('Grand Prix','GP')}
          </h2>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:12 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            <SkeletonCard height={120} />
            <SkeletonCard height={80} />
            <SkeletonList rows={3} />
          </div>
        ) : (
          <>
            {/* 1. Circuit Info Card */}
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

            {/* 2. Countdown Timer (antara Circuit Info Card dan Schedule List) */}
            {upcoming && (
              <Glass style={{ padding: '20px 18px', marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Hitung Mundur Sesi</span>
                  <div style={{ background: 'rgba(255,39,68,0.12)', border: '1px solid rgba(255,39,68,0.25)', padding: '3px 10px', borderRadius: 20, backdropFilter: 'blur(10px)' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#FF2744', letterSpacing: '0.08em' }}>ROUND {race.round}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[
                    { v: selectedRaceTimeLeft.days, l: 'Hari' },
                    { v: selectedRaceTimeLeft.hours, l: 'Jam' },
                    { v: selectedRaceTimeLeft.minutes, l: 'Menit' },
                    { v: selectedRaceTimeLeft.seconds, l: 'Detik', r: true }
                  ].map(({ v, l, r }) => (
                    <div key={l} style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '12px 4px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'DM Mono', monospace", color: r ? '#FF2744' : '#fff', lineHeight: 1 }}>{String(v).padStart(2, '0')}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </Glass>
            )}

            {/* 3. Schedule List (Jadwal Sesi) */}
            {sessions.length > 0 && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Jadwal Sesi Akhir Pekan
                  </span>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>WIB TIMEZONE</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sessions.map(({ name, session, isMain }) => {
                    const isCompleted = new Date(`${session.date}T${session.time || '15:00:00Z'}`) < new Date();
                    const hasResults = isMain && results && results.length > 0;
                    const isQualifying = name.includes('Kualifikasi');
                    const startingGrid = (isQualifying && results && results.length > 0) 
                      ? [...results].filter(r => r.grid && r.grid !== "0").sort((a,b) => parseInt(a.grid) - parseInt(b.grid)).slice(0, 3) 
                      : null;
                    
                    return (
                      <div 
                        key={name} 
                        style={{
                          background: 'rgba(15, 15, 15, 0.75)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: isMain ? '1px solid rgba(255, 39, 68, 0.15)' : '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 20,
                          padding: 16,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12
                        }}
                      >
                        {/* Session Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: isMain ? '#FF2744' : '#1D4ED8',
                              color: '#fff',
                              fontSize: 9,
                              fontWeight: 900,
                              letterSpacing: '0.05em'
                            }}>
                              F1
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: isMain ? '#FF2744' : '#fff' }}>
                              {name}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: isMain ? '#FF2744' : 'rgba(255,255,255,0.55)' }}>
                            {session.time ? new Date(`${session.date}T${session.time.endsWith('Z') ? session.time : session.time + 'Z'}`).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'TBA'}
                          </div>
                        </div>

                        {/* Session Sub-info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                          <span>{session.date ? new Date(session.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' }) : ''}</span>
                        </div>

                        {/* Starting Grid (Qualifying Results) */}
                        {startingGrid && startingGrid.length > 0 && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>STARTING GRID (TOP 3)</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {startingGrid.map((r, i) => {
                                const tColor = getTeamColor(r.constructorId || r.Constructor?.constructorId);
                                return (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', width: 14, textAlign: 'center', fontStyle: 'italic' }}>{r.grid}</span>
                                    <div style={{ width: 2, height: 16, background: tColor, borderRadius: 2 }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{r.Driver?.givenName} {r.Driver?.familyName}</span>
                                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{r.Constructor?.name}</span>
                                    </div>
                                    {r.grid === "1" && <span style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: 4 }}>POLE</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Leaderboard if completed & has results */}
                        {isMain && hasResults ? (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>FINAL RESULTS</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', fontSize: 9, fontWeight: 700 }}>
                                <Check size={10} />
                                <span>COMPLETED</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(showFullResults ? results : results.slice(0, 3)).map((res, idx) => {
                                const tColor = getTeamColor(res.Constructor.name || '');
                                return (
                                  <div 
                                    key={res.position} 
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 10, 
                                      padding: '8px 0', 
                                      borderBottom: idx < (showFullResults ? results.length - 1 : 2) ? '1px solid rgba(255,255,255,0.04)' : 'none' 
                                    }}
                                  >
                                    <span style={{ width: 16, textAlign: 'center', fontSize: 11, fontWeight: 900, fontStyle: 'italic', color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'rgba(255,255,255,0.4)' }}>
                                      {res.position}
                                    </span>
                                    <div style={{ width: 2, height: 24, borderRadius: 2, background: tColor }} />
                                    <div style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${tColor}30` }}>
                                      <DriverAvatar
                                        openF1Drivers={openF1Drivers}
                                        driver={res.Driver}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                                      />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {res.Driver.givenName} {res.Driver.familyName}
                                      </div>
                                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{res.Constructor.name}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: idx === 0 ? '#FF2744' : 'rgba(255,255,255,0.6)' }}>
                                        {res.Time ? res.Time.time : res.status}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {results.length > 3 && (
                              <button 
                                onClick={() => setShowFullResults(!showFullResults)} 
                                style={{ 
                                  width: '100%', 
                                  textAlign: 'center', 
                                  padding: '10px 0', 
                                  background: 'rgba(255,255,255,0.01)', 
                                  border: 'none', 
                                  borderTop: '1px solid rgba(255,255,255,0.05)', 
                                  fontSize: '9px', 
                                  fontWeight: 900, 
                                  letterSpacing: '0.1em', 
                                  color: '#E2E8F0', 
                                  cursor: 'pointer', 
                                  marginTop: 8,
                                  borderRadius: '0 0 14px 14px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {showFullResults ? 'COLLAPSE RESULTS ▲' : 'VIEW FULL RESULTS ▼'}
                              </button>
                            )}
                          </div>
                        ) : isMain && isCompleted && !results ? (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, textAlign: 'center', padding: '12px 0' }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>Data hasil balapan belum diupdate.</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
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
          {activeSessionKey && (
            <ErrorBoundary>
              <Suspense fallback={<SkeletonCard height={200} />}>
                <RaceStrategy sessionKey={activeSessionKey} results={results} />
                <RaceRecap sessionKey={activeSessionKey} openF1Drivers={openF1Drivers} />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
        
      </div>
    </div>
  );
}
