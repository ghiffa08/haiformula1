import { useState, useEffect, useRef } from 'react';
import { Disc3, Play, Pause, Volume2, Info, AlertTriangle, Activity, MessageSquare } from 'lucide-react';
import { fetchWithRetry } from '../services/api';

// Reusable Glass component for these widgets
const Glass = ({ children, style, accent }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    position: 'relative',
    overflow: 'hidden',
    ...style
  }}>
    {accent && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: accent }} />}
    {children}
  </div>
);

// Komponen state kosong (Wizard)
const EmptyStateWizard = ({ title, icon: Icon, message }) => (
  <Glass style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }}>
      <Icon size={26} color="rgba(255,255,255,0.25)" />
    </div>
    <div>
      <h4 style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginBottom: 6 }}>{title}</h4>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, maxWidth: 250, margin: '0 auto' }}>{message}</p>
    </div>
  </Glass>
);

// Custom Audio Player UI
const CustomAudioPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const duration = audioRef.current.duration || 1;
    const currentTime = audioRef.current.currentTime || 0;
    setProgress((currentTime / duration) * 100);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.3)', padding: '8px 14px', borderRadius: 16, marginTop: 10 }}>
      <button onClick={togglePlay} style={{ background: '#00A8FF', border: 'none', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isPlaying ? <Pause size={14} color="#fff" /> : <Play size={14} color="#fff" style={{ marginLeft: 2 }} />}
      </button>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: '#00A8FF', borderRadius: 2, transition: 'width 0.1s linear' }} />
      </div>
      <Volume2 size={14} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={handleEnded} 
        preload="none" 
      />
    </div>
  );
};

export function RaceStrategy({ sessionKey, results }) {
  const [stints, setStints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionKey) return;
    const loadStints = async () => {
      setLoading(true);
      try {
        const data = await fetchWithRetry(`https://api.openf1.org/v1/stints?session_key=${sessionKey}`);
        setStints(data);
      } catch (e) {
        console.error("Failed to load stints", e);
      } finally {
        setLoading(false);
      }
    };
    loadStints();
  }, [sessionKey, results]);

  if (loading) return <Glass style={{ padding: 24, textAlign: 'center' }}><span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }}>Memuat strategi ban...</span></Glass>;
  if (!sessionKey || stints.length === 0) return <EmptyStateWizard title="Data Strategi Ban Kosong" icon={Disc3} message="Belum ada data penggunaan ban (stint) yang direkam oleh OpenF1 untuk sesi ini." />;

  // Only show top 5 drivers to avoid cluttering UI too much
  const topDrivers = results ? results.slice(0, 5) : [];

  const getTyreColor = (compound) => {
    switch(compound?.toUpperCase()) {
      case 'SOFT': return '#FF2744';
      case 'MEDIUM': return '#FFD700';
      case 'HARD': return '#FFFFFF';
      case 'INTERMEDIATE': return '#00FF00';
      case 'WET': return '#00A8FF';
      default: return 'rgba(255,255,255,0.4)';
    }
  };

  return (
    <Glass style={{ padding: 18, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Strategi Ban (Top 5)
        </span>
        <Disc3 size={14} color="#FFD700" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {topDrivers.map((driver) => {
          // Find stints for this driver
          const driverStints = stints.filter(s => String(s.driver_number) === String(driver.number)).sort((a,b) => a.stint_number - b.stint_number);
          if(driverStints.length === 0) return null;
          
          return (
            <div key={driver.number} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 35, fontSize: 11, fontWeight: 800, color: '#fff' }}>
                {driver.Driver.code || driver.Driver.familyName.substring(0,3).toUpperCase()}
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                {driverStints.map((s, idx) => {
                  const widthPercent = s.lap_end && s.lap_start ? Math.max(((s.lap_end - s.lap_start) / 60) * 100, 10) : 20; // estimate 60 laps total
                  const color = getTyreColor(s.compound);
                  return (
                    <div key={idx} style={{
                      width: `${widthPercent}%`,
                      height: 16,
                      background: color,
                      borderRadius: 4,
                      opacity: 0.8,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 800, color: s.compound==='HARD'?'#000':'#fff' }}>{s.lap_end ? s.lap_end - s.lap_start : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

export function RaceRecap({ sessionKey, openF1Drivers }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionKey) return;
    const loadTimeline = async () => {
      setLoading(true);
      try {
        const [rcData, radioData] = await Promise.all([
          fetchWithRetry(`https://api.openf1.org/v1/race_control?session_key=${sessionKey}`),
          fetchWithRetry(`https://api.openf1.org/v1/team_radio?session_key=${sessionKey}`)
        ]);

        let combined = [];
        
        if (rcData && rcData.length > 0) {
          const events = rcData.map(ev => ({ ...ev, type: 'race_control' }));
          combined = [...combined, ...events];
        }
        
        if (radioData && radioData.length > 0) {
          const radios = radioData.map(r => ({ ...r, type: 'team_radio' }));
          combined = [...combined, ...radios];
        }
        
        // Sort by date descending (newest on top)
        if (combined.length > 0) {
          combined.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTimeline(combined);
        } else {
          setTimeline([]);
        }
      } catch (e) {
        console.error("Failed to load race recap timeline", e);
      } finally {
        setLoading(false);
      }
    };
    loadTimeline();
  }, [sessionKey]);

  if (loading) return <Glass style={{ padding: 24, textAlign: 'center' }}><span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }}>Memuat timeline sesi...</span></Glass>;
  if (!sessionKey || timeline.length === 0) return <EmptyStateWizard title="Rekap Belum Tersedia" icon={Activity} message="Belum ada kejadian balap atau pesan radio yang dikumpulkan." />;

  return (
    <Glass style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Timeline Sesi (Race Control & Team Radio)
        </span>
        <Activity size={14} color="#FF2744" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto', paddingRight: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {timeline.map((item, idx) => {
          if (item.type === 'team_radio') {
            const driverObj = openF1Drivers?.find(r => String(r.driver_number) === String(item.driver_number));
            const driverName = driverObj ? driverObj.full_name : `Driver #${item.driver_number}`;
            
            return (
              <div key={idx} style={{ padding: 12, background: 'rgba(0, 168, 255, 0.05)', borderRadius: 12, border: '1px solid rgba(0, 168, 255, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={11} color="#00A8FF" />
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#00A8FF' }}>TEAM RADIO - {driverName}</span>
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace" }}>
                    {new Date(item.date).toLocaleTimeString('id-ID')}
                  </span>
                </div>
                <CustomAudioPlayer src={item.recording_url} />
              </div>
            );
          } else {
            // Race Control
            let bgColor = 'rgba(255,255,255,0.03)';
            let borderColor = 'rgba(255,255,255,0.05)';
            let iconColor = '#fff';
            let Icon = Info;
            
            if (item.flag === 'YELLOW' || item.flag === 'DOUBLE YELLOW') { 
              bgColor = 'rgba(255,215,0,0.08)'; borderColor = 'rgba(255,215,0,0.2)'; iconColor = '#FFD700'; Icon = AlertTriangle;
            } else if (item.flag === 'RED') { 
              bgColor = 'rgba(255,39,68,0.1)'; borderColor = 'rgba(255,39,68,0.25)'; iconColor = '#FF2744'; Icon = AlertTriangle;
            } else if (item.flag === 'GREEN' || item.flag === 'CHEQUERED') { 
              bgColor = 'rgba(34,197,94,0.08)'; borderColor = 'rgba(34,197,94,0.2)'; iconColor = '#22C55E';
            } else if (item.category === 'Incident' || item.message?.includes('PENALTY')) {
              iconColor = '#FF8C00'; Icon = AlertTriangle;
            }

            return (
              <div key={idx} style={{ padding: 12, background: bgColor, borderRadius: 12, border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={11} color={iconColor} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: iconColor }}>
                      {item.flag ? `${item.flag} FLAG` : item.category}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace" }}>
                    {new Date(item.date).toLocaleTimeString('id-ID')}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, fontWeight: 600 }}>
                  {item.message}
                </span>
              </div>
            );
          }
        })}
      </div>
    </Glass>
  );
}
