import { Calendar, Trophy, Gauge, Activity } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, selectedDriver }) {
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
