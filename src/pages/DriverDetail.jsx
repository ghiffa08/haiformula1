import { ChevronLeft, Award } from 'lucide-react';
import Glass from '../components/ui/Glass';
import DriverAvatar from '../components/ui/DriverAvatar';
import { getTeamColor } from '../utils/helpers';

export default function DriverDetail({ driver, onBack, maxPts, openF1Drivers }) {
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
