import { useMemo, useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import Glass from '../components/ui/Glass';
import { formatSessionTime, getF1CountryName } from '../utils/helpers';
import { fetchWithRetry } from '../services/api';

export default function HomeTab({ nextRace, timeLeft, currentSeason }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
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
