/**
 * RaceWidget Component
 * 
 * A premium iOS-inspired glassmorphism widget built for Tailwind CSS v4.
 * Features circuit info, high-fidelity SVG map, and dynamic session schedule layout.
 */
export default function RaceWidget() {
  const sessions = [
    { id: 'fp1', name: 'Practice 1', date: 'Jun 26, Fri', time: '18:30', active: false, strip: 'bg-white/20' },
    { id: 'fp2', name: 'Practice 2', date: 'Jun 26, Fri', time: '22:00', active: false, strip: 'bg-white/20' },
    { id: 'fp3', name: 'Practice 3', date: 'Jun 27, Sat', time: '17:30', active: false, strip: 'bg-white/20' },
    { id: 'quali', name: 'Qualifying', date: 'Jun 27, Sat', time: '21:00', active: true, strip: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' },
    { id: 'gp', name: 'Grand Prix', date: 'Jun 28, Sun', time: '20:00', active: false, strip: 'bg-white/40' },
  ];

  return (
    <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-xl transition-all duration-500 hover:border-white/30 hover:bg-white/12">
      {/* Soft background glow effects */}
      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-red-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

      {/* Main Grid: Responsive layout for mobile (1 col) and larger screens (5 cols) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-5 items-stretch">
        
        {/* LEFT COLUMN: Circuit Details & Map Outline (2 cols span) */}
        <div className="flex flex-col justify-between sm:col-span-2 space-y-5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-wider uppercase text-white leading-none">AUT GP</h2>
              <p className="text-xs font-semibold text-white/50 mt-1">Spielberg</p>
            </div>
            <span className="text-2xl filter drop-shadow-md select-none">🇦🇹</span>
          </div>

          {/* Spielberg circuit SVG outline */}
          <div className="flex-1 flex items-center justify-center py-2 min-h-[100px]">
            <svg 
              viewBox="0 0 120 80" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-full max-w-[130px] text-white/80 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-transform duration-300 hover:scale-105"
            >
              {/* Spielberg / Red Bull Ring Shape */}
              <path d="M 20 65 L 15 50 C 13 45, 12 35, 18 20 C 22 10, 32 8, 38 12 L 85 24 C 92 26, 95 32, 92 40 L 80 58 C 76 64, 68 66, 62 60 L 52 52 C 48 48, 42 48, 38 52 Z" />
              {/* Start/Finish Dot */}
              <circle cx="20" cy="65" r="2.5" className="fill-red-500 stroke-white" strokeWidth="1" />
            </svg>
          </div>

          {/* Footer stats / Live counter */}
          <div className="flex items-end justify-between pt-1">
            <div>
              <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">SEASON 2026</span>
              <div className="text-lg font-black italic text-red-500 tracking-tighter leading-none mt-0.5">R10</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/15 px-3.5 py-1.5 backdrop-blur-md shadow-inner flex items-center gap-2 select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-black tracking-widest text-white">47 HOURS</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Session Schedule List (3 cols span) */}
        <div className="flex flex-col justify-between sm:col-span-3 space-y-2">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              className={`flex items-center justify-between p-2.5 rounded-2xl transition-all duration-300 ${
                session.active 
                  ? 'bg-white/12 border border-white/12 shadow-lg backdrop-blur-md scale-[1.01]' 
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              {/* Session name & strip */}
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full transition-all duration-300 ${session.strip}`} />
                <div>
                  <h4 className={`text-xs transition-colors ${
                    session.active ? 'font-black text-white' : 'font-semibold text-white/70'
                  }`}>
                    {session.name}
                  </h4>
                  <p className="text-[10px] text-white/40 font-semibold mt-0.5">{session.date}</p>
                </div>
              </div>

              {/* Session time */}
              <div className={`text-xs tracking-tight transition-colors ${
                session.active ? 'text-red-400 font-black' : 'text-white/60 font-semibold'
              }`}>
                {session.time}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
