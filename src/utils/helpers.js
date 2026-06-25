export const TEAM_COLORS = {
  ferrari: '#FF2744', 'red bull': '#4B7BFF', mclaren: '#FF8C00',
  mercedes: '#00E5CC', 'aston martin': '#00C875', alpine: '#FF6EB4',
  williams: '#5BB8FF', haas: '#C8CDD2', sauber: '#60EE60', kick: '#60EE60',
  rb: '#7A9FFF', alphatauri: '#7A9FFF',
};

export const getTeamColor = (n = '') => { 
  const s = n.toLowerCase(); 
  for (const [k,v] of Object.entries(TEAM_COLORS)) if (s.includes(k)) return v; 
  return '#FF2744'; 
};

export const ordinal = n => { 
  const s=['th','st','nd','rd']; 
  const v=n%100; 
  return n+(s[(v-20)%10]||s[v]||s[0]); 
};

export const formatSessionTime = (dateStr, timeStr) => {
  if (!dateStr) return 'TBA';
  try {
    const cleanTime = timeStr ? (timeStr.endsWith('Z') ? timeStr : `${timeStr.replace(/Z$/, '')}Z`) : '15:00:00Z';
    const d = new Date(`${dateStr}T${cleanTime}`);
    return d.toLocaleDateString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB';
  } catch {
    return `${dateStr}`;
  }
};

export const FALLBACK_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

export const getHighResImg = (url) => url ? url.replace(/\.transform\/.*$/, '') : null;

export const getMatchedDriver = (openF1Drivers, ergastDriver) => {
  if (!openF1Drivers || !ergastDriver) return null;
  const num = String(ergastDriver.permanentNumber || ergastDriver.number || '');
  const code = String(ergastDriver.code || '').toUpperCase();
  const familyName = String(ergastDriver.familyName || '').toLowerCase();
  
  // First pass: Try matching by Acronym or Family Name (Most reliable)
  let match = openF1Drivers.find(o => {
    const oCode = String(o.name_acronym || '').toUpperCase();
    const oLastName = String(o.last_name || '').toLowerCase();
    
    if (code && oCode && oCode === code) return true;
    if (familyName && oLastName && oLastName.includes(familyName)) return true;
    return false;
  });

  if (match) return match;

  // Second pass: Fallback to exact driver number match
  return openF1Drivers.find(o => {
    const oNum = String(o.driver_number || '');
    return num && oNum && oNum === num;
  });
};

export const getF1CountryName = (country = '') => {
  const map = {
    'UK': 'Great_Britain',
    'USA': 'United_States',
    'UAE': 'Abu_Dhabi',
    'Saudi Arabia': 'Saudi_Arabia'
  };
  return map[country] || country.replace(/ /g, '_');
};
