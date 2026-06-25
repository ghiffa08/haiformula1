import { useState } from 'react';
import { ChevronLeft, Globe, Check, Clock, Calendar, Compass } from 'lucide-react';

/**
 * RaceDetailsSchedule Page Component
 * 
 * An expert-grade motorsport-inspired event page built using Tailwind CSS.
 * Incorporates a premium dark theme, circuit info card, custom navigation tabs,
 * and high-fidelity session results layout.
 */
export default function RaceDetailsSchedule() {
  const [activeTimeTab, setActiveTimeTab] = useState('my'); // 'my' or 'track'
  const [activeSeriesTab, setActiveSeriesTab] = useState('ALL'); // 'ALL', 'F1', 'F2', 'F3'

  const scheduleData = [
    {
      date: 'Friday 01 May',
      sessions: [
        {
          id: 'p1',
          series: 'F1',
          seriesColor: 'bg-red-600',
          name: 'Practice 1',
          time: '17:00 - 18:00',
          completed: true,
          results: [
            { pos: 1, name: 'Charles Leclerc', team: 'Ferrari', teamColor: 'bg-[#FF2744]', time: '1:30.154', gap: 'LAPS 24' },
            { pos: 2, name: 'Max Verstappen', team: 'Red Bull Racing', teamColor: 'bg-[#4B7BFF]', time: '1:30.282', gap: '+0.128s' },
            { pos: 3, name: 'Lando Norris', team: 'McLaren', teamColor: 'bg-[#FF8C00]', time: '1:30.410', gap: '+0.256s' },
          ]
        },
        {
          id: 'p2',
          series: 'F2',
          seriesColor: 'bg-blue-600',
          name: 'Practice Session',
          time: '19:15 - 20:00',
          completed: true,
          results: [
            { pos: 1, name: 'Andrea Kimi Antonelli', team: 'PREMA Racing', teamColor: 'bg-red-500', time: '1:42.502', gap: 'LAPS 18' },
            { pos: 2, name: 'Oliver Bearman', team: 'PREMA Racing', teamColor: 'bg-red-500', time: '1:42.610', gap: '+0.108s' },
            { pos: 3, name: 'Zane Maloney', team: 'Rodin Carlin', teamColor: 'bg-blue-400', time: '1:42.894', gap: '+0.392s' },
          ]
        }
      ]
    },
    {
      date: 'Saturday 02 May',
      sessions: [
        {
          id: 'quali',
          series: 'F1',
          seriesColor: 'bg-red-600',
          name: 'Qualifying',
          time: '16:00 - 17:00',
          completed: false,
          results: []
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-red-600 selection:text-white">
      
      {/* 1. TOP HEADER & NAVIGATION */}
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-md border-b border-neutral-900 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {/* Back button */}
          <button className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Title */}
          <div className="text-center px-4 flex-1">
            <h1 className="text-[10px] font-black tracking-widest text-neutral-400 uppercase leading-none">
              FORMULA 1 CRYPTO.COM MIAMI GRAND PRIX 2026
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <Calendar className="w-3.5 h-3.5 text-red-600" />
              <span className="text-xs font-black text-red-600 uppercase tracking-wider">01 - 03 May</span>
              <span className="text-neutral-600">•</span>
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-400">GMT-4 (WIB -11h)</span>
            </div>
          </div>
          
          {/* Language badge */}
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-neutral-300 transition">
            <Globe className="w-3 h-3" />
            <span>EN</span>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-6">

        {/* 2. CIRCUIT INFO CARD */}
        <section className="bg-white text-black rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          {/* Abstract ambient backdrop on the card */}
          <div className="absolute right-0 top-0 w-48 h-48 bg-neutral-100 rounded-full blur-3xl pointer-events-none opacity-50" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-2">
              <span className="inline-block bg-red-600 text-white font-black text-[9px] tracking-wider uppercase px-2.5 py-1 rounded-md">
                MIAMI INTERNATIONAL AUTODROME
              </span>
              <h2 className="text-3xl font-black italic tracking-tight uppercase leading-none mt-1">Miami</h2>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold">
                <Compass className="w-3.5 h-3.5" />
                <span>United States</span>
              </div>
            </div>
            
            {/* SVG Track Outline */}
            <div className="w-24 h-20 flex items-center justify-center bg-neutral-50 rounded-xl border border-neutral-100 p-1">
              <svg viewBox="0 0 100 80" className="w-full h-full text-black opacity-90" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {/* Simulated Miami Circuit shape */}
                <path d="M10,40 C10,20 30,15 45,15 C60,15 80,25 90,30 C95,35 90,50 80,60 C70,70 45,65 30,65 C15,65 10,60 10,40 Z" />
                <circle cx="10" cy="40" r="3" className="fill-red-600 stroke-white" strokeWidth="1" />
              </svg>
            </div>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-4 gap-2 pt-6 mt-6 border-t border-neutral-100 relative z-10">
            <div className="text-left">
              <p className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase leading-none">Laps</p>
              <p className="text-base font-black tracking-tight mt-1">57</p>
            </div>
            <div className="text-left">
              <p className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase leading-none">Length</p>
              <p className="text-base font-black tracking-tight mt-1">5.412km</p>
            </div>
            <div className="text-left">
              <p className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase leading-none">First Race</p>
              <p className="text-base font-black tracking-tight mt-1">2022</p>
            </div>
            <div className="text-left">
              <p className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase leading-none">Record</p>
              <p className="text-[11px] font-black tracking-tight mt-1 leading-tight">1:29.708</p>
              <p className="text-[8px] font-bold text-neutral-400 leading-none">VER (2023)</p>
            </div>
          </div>
        </section>

        {/* 3. TOGGLE / TABS NAVIGATION */}
        <section className="space-y-4">
          {/* Time toggle */}
          <div className="flex border-b border-neutral-900 justify-start gap-6 text-sm font-black">
            <button 
              onClick={() => setActiveTimeTab('my')}
              className={`pb-2.5 relative transition ${
                activeTimeTab === 'my' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              MY TIME
              {activeTimeTab === 'my' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setActiveTimeTab('track')}
              className={`pb-2.5 relative transition ${
                activeTimeTab === 'track' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              TRACK TIME
              {activeTimeTab === 'track' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
              )}
            </button>
          </div>

          {/* Series Pill-shaped selection tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-full border border-neutral-900 bg-neutral-950/60 max-w-xs">
            {['ALL', 'F1', 'F2', 'F3'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSeriesTab(tab)}
                className={`flex-1 text-center py-1.5 rounded-full text-xs font-black tracking-wider transition ${
                  activeSeriesTab === tab 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        {/* 4. SCHEDULE SECTION */}
        <section className="space-y-5">
          {/* Section title */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <h3 className="text-xs font-black tracking-widest text-neutral-400 uppercase">WEEKEND SCHEDULE</h3>
          </div>

          {/* Dynamic Schedule List */}
          <div className="space-y-6">
            {scheduleData.map((dayGroup) => {
              // Filter sessions by selected series tab
              const filteredSessions = dayGroup.sessions.filter(s => 
                activeSeriesTab === 'ALL' || s.series === activeSeriesTab
              );

              if (filteredSessions.length === 0) return null;

              return (
                <div key={dayGroup.date} className="space-y-3">
                  {/* Day Header */}
                  <h4 className="text-sm font-black text-red-600 tracking-wide">
                    {dayGroup.date}
                  </h4>

                  {/* Sessions */}
                  <div className="space-y-4">
                    {filteredSessions.map((session) => (
                      <div 
                        key={session.id}
                        className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden shadow-lg"
                      >
                        {/* Session Card Header */}
                        <div className="flex items-center justify-between p-4 border-b border-neutral-900 bg-neutral-900/20">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black text-white ${session.seriesColor}`}>
                              {session.series}
                            </span>
                            <span className="text-xs font-black text-white">{session.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-neutral-500" />
                            <span className="text-xs font-bold text-neutral-400">{session.time}</span>
                          </div>
                        </div>

                        {/* Leaderboard or Status details */}
                        {session.completed ? (
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-neutral-500 tracking-wider uppercase">FINAL RESULTS</span>
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-[10px] font-bold">
                                <Check className="w-3 h-3" />
                                <span>COMPLETED</span>
                              </div>
                            </div>

                            {/* Top 3 List */}
                            <div className="divide-y divide-neutral-900">
                              {session.results.map((res) => (
                                <div key={res.pos} className="flex items-center py-2.5 gap-3 first:pt-1 last:pb-1">
                                  {/* Position */}
                                  <span className="w-4 text-center text-xs font-black text-neutral-400 italic">
                                    {res.pos}
                                  </span>
                                  {/* Team stripe */}
                                  <div className={`w-0.5 h-6 rounded-full ${res.teamColor}`} />
                                  
                                  {/* Name & constructor */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white truncate leading-none">
                                      {res.name}
                                    </p>
                                    <p className="text-[10px] text-neutral-500 font-semibold mt-1">
                                      {res.team}
                                    </p>
                                  </div>

                                  {/* Performance value */}
                                  <div className="text-right">
                                    <p className="text-xs font-bold font-mono text-white leading-none">
                                      {res.time}
                                    </p>
                                    <p className="text-[9px] text-neutral-500 font-medium tracking-tight mt-1">
                                      {res.gap}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center text-neutral-500">
                            <span className="text-xs font-bold">Session has not started yet.</span>
                          </div>
                        )}

                        {/* Card Footer */}
                        {session.completed && (
                          <button className="w-full text-center py-3 bg-neutral-900/40 hover:bg-neutral-900 border-t border-neutral-900 text-[10px] font-black tracking-widest text-neutral-300 hover:text-white transition uppercase">
                            VIEW FULL RESULTS &gt;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* FOOTER BRAGGING RIGHTS */}
      <footer className="py-8 text-center text-neutral-600 text-[10px] font-semibold tracking-wider">
        FORMULA 1 APPLICTION DESIGNED FOR HIGH PERFORMANCE
      </footer>

    </div>
  );
}
