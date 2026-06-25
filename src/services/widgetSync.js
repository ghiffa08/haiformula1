import { Preferences } from '@capacitor/preferences';

/**
 * Menyimpan data sesi balapan terdekat ke Capacitor Preferences.
 * Data ini nantinya akan dibaca oleh Native Android Widget.
 */
export const syncNextRaceToWidget = async (nextRace, nextSession) => {
  if (!nextRace) return;

  try {
    const sessionName = nextSession ? nextSession.name : "Balapan Utama";
    const sessionDate = nextSession ? nextSession.session.date : nextRace.date;
    const sessionTime = nextSession ? nextSession.session.time : (nextRace.time || '15:00:00Z');

    const sessions = [
      { id: "fp1", name: 'PRACTICE 1', date: nextRace.FirstPractice?.date, time: nextRace.FirstPractice?.time },
      { id: "fp2", name: 'PRACTICE 2', date: nextRace.SecondPractice?.date, time: nextRace.SecondPractice?.time },
      { id: "fp3", name: 'PRACTICE 3', date: nextRace.ThirdPractice?.date, time: nextRace.ThirdPractice?.time },
      { id: "sprint", name: 'SPRINT', date: nextRace.Sprint?.date, time: nextRace.Sprint?.time },
      { id: "qualifying", name: 'QUALIFYING', date: nextRace.Qualifying?.date, time: nextRace.Qualifying?.time },
      { id: "race", name: 'GRAND PRIX', date: nextRace.date, time: nextRace.time || '15:00:00Z' }
    ].filter(s => s.date);

    let flagUrl = '';
    try {
      const countryName = (nextRace.Circuit?.Location?.country || '').toLowerCase().trim();
      let code = '';
      
      // Handle F1-specific country name edge cases cleanly
      if (countryName === 'uk' || countryName === 'great britain') code = 'gb';
      else if (countryName === 'usa' || countryName === 'united states' || countryName === 'miami') code = 'us';
      else if (countryName === 'uae' || countryName === 'abu dhabi') code = 'ae';
      
      if (!code && countryName) {
        // Fetch dynamically from RestCountries API
        const res = await fetch(`https://restcountries.com/v3.1/name/${countryName}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            code = data[0].cca2.toLowerCase();
          }
        }
      }

      if (code) {
        flagUrl = `https://flagcdn.com/w160/${code}.png`;
      }
    } catch (e) {
      console.error('[WidgetSync] Gagal memuat bendera:', e);
    }

      const getF1CountryName = (c = '') => {
        const map = {
          'UK': 'Great_Britain',
          'USA': 'United_States',
          'UAE': 'Abu_Dhabi',
          'Saudi Arabia': 'Saudi_Arabia'
        };
        return map[c] || c.replace(/ /g, '_');
      };
      const rawCountry = nextRace.Circuit?.Location?.country || '';
      const circuitImageUrl = `https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${getF1CountryName(rawCountry)}_Circuit.png`;

      const raceData = {
        round: nextRace.round,
        raceName: nextRace.raceName,
        circuitName: nextRace.Circuit?.circuitName,
        locality: nextRace.Circuit?.Location?.locality,
        country: rawCountry,
        sessionName: sessionName,
        date: sessionDate,
        time: sessionTime,
        raceDate: nextRace.date,
        raceTime: nextRace.time || '15:00:00Z',
        sessions: sessions,
        flagUrl: flagUrl,
        circuitImageUrl: circuitImageUrl
      };

    await Preferences.set({
      key: 'widget_next_race',
      value: JSON.stringify(raceData),
    });
  } catch (error) {
    console.error('[WidgetSync] Gagal menyimpan data untuk widget:', error);
  }
};

/**
 * Menyimpan data hasil balapan terakhir ke Capacitor Preferences.
 * Data ini nantinya akan dibaca oleh Native Android Widget.
 */
export const syncRaceResultsToWidget = async (lastRace, results) => {
  if (!lastRace || !results) return;

  try {
    let flagUrl = '';
    try {
      const countryName = (lastRace.Circuit?.Location?.country || '').toLowerCase().trim();
      let code = '';
      
      if (countryName === 'uk' || countryName === 'great britain') code = 'gb';
      else if (countryName === 'usa' || countryName === 'united states' || countryName === 'miami') code = 'us';
      else if (countryName === 'uae' || countryName === 'abu dhabi') code = 'ae';
      
      if (!code && countryName) {
        const res = await fetch(`https://restcountries.com/v3.1/name/${countryName}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            code = data[0].cca2.toLowerCase();
          }
        }
      }

      if (code) {
        flagUrl = `https://flagcdn.com/w160/${code}.png`;
      }
    } catch (e) {
      console.error('[WidgetSync] Gagal memuat bendera:', e);
    }

    // Ambil top 10 pembalap
    const top10 = results.slice(0, 10).map(r => ({
      position: r.position,
      number: r.number,
      givenName: r.Driver?.givenName,
      familyName: r.Driver?.familyName,
      code: r.Driver?.code,
      constructorId: r.Constructor?.constructorId || r.Constructor?.name?.toLowerCase().replace(/\s+/g, '_'),
      constructorName: r.Constructor?.name
    }));

    const resultsData = {
      round: lastRace.round,
      raceName: lastRace.raceName,
      country: lastRace.Circuit?.Location?.country,
      flagUrl: flagUrl,
      results: top10
    };

    await Preferences.set({
      key: 'widget_race_results',
      value: JSON.stringify(resultsData),
    });
  } catch (error) {
    console.error('[WidgetSync] Gagal menyimpan race results untuk widget:', error);
  }
};
