import Glass from '../components/ui/Glass';

export default function ScheduleTab({ races, nextRace, currentSeason, onSelect }) {
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
