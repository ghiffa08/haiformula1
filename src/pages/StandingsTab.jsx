import Glass from '../components/ui/Glass';
import DriverAvatar from '../components/ui/DriverAvatar';
import { getTeamColor, ordinal } from '../utils/helpers';

export default function StandingsTab({ sub, setSub, driverStandings, constructorStandings, currentSeason, onSelect, maxPts, openF1Drivers }) {
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
