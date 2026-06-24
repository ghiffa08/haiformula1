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

    const raceData = {
      round: nextRace.round,
      raceName: nextRace.raceName,
      circuitName: nextRace.Circuit?.circuitName,
      locality: nextRace.Circuit?.Location?.locality,
      country: nextRace.Circuit?.Location?.country,
      sessionName: sessionName,
      date: sessionDate,
      time: sessionTime,
    };

    await Preferences.set({
      key: 'widget_next_race',
      value: JSON.stringify(raceData),
    });

    console.log('[WidgetSync] Data sesi berhasil disinkronkan:', sessionName);
  } catch (error) {
    console.error('[WidgetSync] Gagal menyimpan data untuk widget:', error);
  }
};
