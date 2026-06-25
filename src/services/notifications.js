import { LocalNotifications } from '@capacitor/local-notifications';

export const requestNotificationPermissions = async () => {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions', error);
    return false;
  }
};

export const scheduleSmartNotifications = async (races) => {
  try {
    // Check permissions first
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') return;

    // Clear existing notifications to prevent duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const now = new Date().getTime();
    const futureRaces = races.filter(r => new Date(`${r.date}T${r.time || '15:00:00Z'}`).getTime() + 7200000 > now);

    // Only schedule for the next 2 races to avoid hitting OS limits
    const racesToSchedule = futureRaces.slice(0, 2);
    
    let notificationsToSchedule = [];
    let idCounter = 1;

    racesToSchedule.forEach((race) => {
      const raceName = race.raceName.replace('Grand Prix', 'GP');
      
      const sessions = [
        { name: 'FP1', data: race.FirstPractice },
        { name: 'FP2', data: race.SecondPractice },
        { name: 'FP3', data: race.ThirdPractice },
        { name: 'Sprint', data: race.Sprint },
        { name: 'Kualifikasi', data: race.Qualifying },
        { name: 'Balapan Utama (Race)', data: { date: race.date, time: race.time }, isMain: true }
      ].filter(s => s.data && s.data.date);

      sessions.forEach((session) => {
        const sessionDate = new Date(`${session.data.date}T${session.data.time || '15:00:00Z'}`);
        const sessionTimeMs = sessionDate.getTime();
        
        // 1. Pengingat 24 Jam Sebelum Sesi (H-1)
        const dayBefore = new Date(sessionTimeMs - 86400000);
        if (dayBefore.getTime() > now) {
          notificationsToSchedule.push({
            id: idCounter++,
            title: `Besok ada ${session.name} ${raceName}!`,
            body: `Sesi ${session.name} akan dimulai besok pada pukul ${sessionDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB.`,
            schedule: { at: dayBefore },
            smallIcon: 'ic_stat_f1',
            iconColor: '#FF2744'
          });
        }

        // 2. Pengingat 1 Jam Sebelum Sesi
        const hourBefore = new Date(sessionTimeMs - 3600000);
        if (hourBefore.getTime() > now) {
          notificationsToSchedule.push({
            id: idCounter++,
            title: `1 Jam Lagi: ${session.name} ${raceName}`,
            body: `Jangan sampai kelewatan! ${session.name} segera dimulai. Siapkan camilan Anda!`,
            schedule: { at: hourBefore },
            smallIcon: 'ic_stat_f1',
            iconColor: '#FF2744'
          });
        }

        // 3. Notifikasi Pintar "Cek Hasil" (Hanya untuk Balapan Utama)
        // Dijadwalkan 2 Jam setelah jam start balapan
        if (session.isMain) {
          const resultTime = new Date(sessionTimeMs + 7200000);
          if (resultTime.getTime() > now) {
            notificationsToSchedule.push({
              id: idCounter++,
              title: `Balapan ${raceName} Selesai! 🏁`,
              body: `Siapa yang juara dan meraih poin maksimal? Cek hasil lengkap balapan hari ini di HAIF1.`,
              schedule: { at: resultTime },
              smallIcon: 'ic_stat_f1',
              iconColor: '#FF2744'
            });
          }
        }
      });
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }

  } catch (error) {
    console.error('Failed to schedule notifications', error);
  }
};
