# Laporan Analisis QA Mendalam - haiFormula1 Live Tracker

Laporan ini menyajikan hasil peninjauan kode (*code review*) dan penjaminan mutu (*quality assurance*) menyeluruh terhadap proyek **haiFormula1**. Analisis ini mencakup aspek fungsionalitas, integrasi native Android (Capacitor), build system, standar kode (ESLint), hingga estetika antarmuka pengguna (UI/UX).

---

## 📊 Ringkasan Temuan

| Tingkat Keparahan | Deskripsi Keparahan | Jumlah Temuan | Status |
| :--- | :--- | :---: | :---: |
| 🔴 **Kritis (Critical)** | Bug yang merusak fitur utama atau menyebabkan crash/kegagalan total integrasi. | 2 | Perlu Perbaikan |
| 🟡 **Tinggi (Major)** | Bug logika, disfungsi UI/UX, atau data tidak sinkron/salah yang merusak pengalaman pengguna. | 4 | Perlu Perbaikan |
| 🔵 **Sedang (Minor)** | Kode mati (*dead code*), peringatan linter, atau redundansi konfigurasi. | 3 | Perlu Perbaikan |
| 🟢 **Rendah (Optimization)** | Saran optimasi performa, integrasi PWA, dan peningkatan praktik penulisan kode. | 3 | Rekomendasi |

---

## 🔴 Temuan Kritis (Critical Issues)

### 1. Bug Prefiks Kunci Capacitor Preferences pada Widget Android
* **Lokasi Kode:**
  * Penghasil Data (JS): [widgetSync.js:L26](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/services/widgetSync.js#L26)
  * Pembaca Data (Java): [F1ScheduleWidget.java:L22](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/android/app/src/main/java/com/ghiffa/haiformula1/F1ScheduleWidget.java#L22)
* **Deskripsi:** 
  Pada sisi JavaScript, data sesi disinkronkan ke SharedPreferences menggunakan `@capacitor/preferences` dengan kunci `"widget_next_race"`. Namun, plugin ini secara otomatis menambahkan prefiks `_cap_` untuk semua kunci yang disimpan secara native. Pada sisi Java, widget mencoba membaca data menggunakan kunci `"widget_next_race"` langsung tanpa prefiks.
* **Dampak:** 
  Widget Android tidak akan pernah bisa membaca data balapan dan akan terjebak secara permanen pada status **"STANDBY / Sinkronisasi..."**.
* **Visualisasi Alur Data:**
  ```mermaid
  sequenceDiagram
      participant JS as React App (JS)
      participant Cap as Capacitor Preferences
      participant Pref as SharedPreferences (CapacitorStorage)
      participant Java as F1ScheduleWidget (Java)
      
      JS->>Cap: Preferences.set("widget_next_race", data)
      Cap->>Pref: Simpan dengan prefiks: "_cap_widget_next_race"
      Note over Pref: Kunci tersimpan: "_cap_widget_next_race"
      Java->>Pref: prefs.getString("widget_next_race")
      Pref-->>Java: Mengembalikan null (Kunci tidak ditemukan)
      Note over Java: Widget menampilkan: "STANDBY / Sinkronisasi..."
  ```
* **Solusi Perbaikan:**
  Ubah kunci pencarian pada Java di file [F1ScheduleWidget.java](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/android/app/src/main/java/com/ghiffa/haiformula1/F1ScheduleWidget.java) agar menyertakan prefiks `_cap_`:
  ```diff
  - String raceJson = prefs.getString("widget_next_race", null);
  + String raceJson = prefs.getString("_cap_widget_next_race", null);
  ```

---

### 2. Kegagalan Jalur Linter ESLint karena Folder `android/`
* **Lokasi Kode:** [eslint.config.js:L8](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/eslint.config.js#L8)
* **Deskripsi:** 
  Konfigurasi ESLint saat ini hanya mengabaikan folder `dist`. Ketika perintah `npm run lint` dijalankan, ESLint memindai seluruh direktori proyek termasuk `android/app/src/main/assets/public/`. Folder ini berisi aset hasil kompilasi produksi Vite yang sudah diminimalisasi (*minified*), sehingga memicu **456 linter errors** karena tidak mengenali variabel global internal pustaka pihak ketiga.
* **Dampak:** 
  Sistem CI/CD atau proses pre-commit hook akan gagal karena mendeteksi error linter palsu (*false positive*), sehingga menghambat alur perilisan aplikasi.
* **Solusi Perbaikan:**
  Tambahkan folder `android` dan `node_modules` ke dalam daftar abaikan global (*global ignores*) pada [eslint.config.js](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/eslint.config.js):
  ```diff
  export default defineConfig([
  - globalIgnores(['dist']),
  + globalIgnores(['dist', 'android', 'node_modules']),
    {
      files: ['**/*.{js,jsx}'],
  ```

---

## 🟡 Temuan Tinggi (Major Issues)

### 1. Tombol Navigasi Mati (*Dead Tabs*) pada Menu Klasemen
* **Lokasi Kode:** [App.jsx:L504-L515](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L504-L515)
* **Deskripsi:** 
  Di dalam tab klasemen (`StandingsTab`), terdapat kontrol pemilih kategori berupa empat pil navigasi: `'Balapan'`, `'Pembalap'`, `'Tim'`, dan `'Penghargaan'`. Namun, penangan klik (`onClick`) hanya diimplementasikan untuk `'Pembalap'` dan `'Tim'`. Kategori `'Balapan'` dan `'Penghargaan'` tidak melakukan apa pun saat diklik dan tidak memiliki representasi visual aktif.
* **Dampak:** 
  Pengguna mengira aplikasi rusak karena tombol tidak merespons.
* **Solusi Perbaikan:**
  Sembunyikan tombol yang belum siap digunakan atau tampilkan pemberitahuan/placeholder *"Segera Hadir"* kepada pengguna:
  ```javascript
  {['Balapan', 'Pembalap', 'Tim', 'Penghargaan'].map(t => {
    const isDriversTab = t === 'Pembalap';
    const isTeamsTab = t === 'Tim';
    // Sembunyikan atau nonaktifkan tab selain Pembalap & Tim
    if (t === 'Balapan' || t === 'Penghargaan') return null; 
    ...
  ```

---

### 2. Mismatch Tahun pada Pengambilan Data Cuaca OpenF1
* **Lokasi Kode:** [App.jsx:L280](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L280)
* **Deskripsi:** 
  Aplikasi mengambil data cuaca dari OpenF1 API menggunakan parameter `year=${currentSeason}`. Berdasarkan data Ergast API, `currentSeason` saat ini bernilai `"2026"`. Namun, database OpenF1 API saat ini hanya menyediakan data historis hingga tahun `2024` atau `2025`.
* **Dampak:** 
  Permintaan API ke OpenF1 untuk tahun 2026 akan menghasilkan data kosong (`[]`), sehingga panel cuaca pada Beranda tidak akan pernah muncul untuk balapan mendatang.
* **Solusi Perbaikan:**
  Gunakan tahun fallback atau batas atas tahun maksimal (misal `2024`) ketika mengambil data dari OpenF1 jika tahun saat ini melebihi data yang tersedia:
  ```javascript
  const targetYear = parseInt(currentSeason) > 2024 ? '2024' : currentSeason;
  const meetingRes = await fetchWithRetry(`https://api.openf1.org/v1/meetings?year=${targetYear}&country_name=${country}`);
  ```

---

### 3. Ketidaksesuaian Nama Negara untuk Peta Sirkuit (404 Image)
* **Lokasi Kode:** 
  * React App: [App.jsx:L408](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L408) & [App.jsx:L913](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L913)
  * Widget: [F1ScheduleWidget.java:L55](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/android/app/src/main/java/com/ghiffa/haiformula1/F1ScheduleWidget.java#L55)
* **Deskripsi:** 
  Gambar sirkuit diambil langsung dari CDN resmi Formula 1 menggunakan URL berbasis nama negara (`country.replace(" ", "_")`). Ergast API mengembalikan nama negara standar seperti `"UK"`, `"USA"`, `"UAE"`, atau `"Saudi Arabia"`. Namun, CDN Formula 1 menggunakan format nama wilayah/negara resmi seperti `"Great_Britain_Circuit.png"`, `"United_States_Circuit.png"`, `"Abu_Dhabi_Circuit.png"`, dan `"Saudi_Arabia_Circuit.png"`.
* **Dampak:** 
  Gambar sirkuit untuk balapan di Inggris, Amerika Serikat, UEA, Arab Saudi, dan beberapa negara lain akan gagal dimuat (HTTP 404), menyebabkan tampilan trek menjadi kosong.
* **Solusi Perbaikan:**
  Buat fungsi pemetaan (*mapping utility*) sederhana baik di JavaScript maupun Java untuk menerjemahkan nama negara Ergast ke format CDN Formula 1:
  ```javascript
  const getF1CountryName = (country) => {
    const map = {
      'UK': 'Great_Britain',
      'USA': 'United_States',
      'UAE': 'Abu_Dhabi',
      'Saudi Arabia': 'Saudi_Arabia'
    };
    return map[country] || country.replace(/ /g, '_');
  };
  ```

---

### 4. Penanganan Error Palsu (*Fake Offline Synchronization*)
* **Lokasi Kode:** [App.jsx:L93-L95](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L93-L95)
* **Deskripsi:** 
  Ketika pemanggilan API Ergast gagal, blok `catch` menampilkan pesan kesalahan: `'API sedang sibuk — menggunakan sinkronisasi data lokal.'`. Namun, aplikasi tidak memuat data statis cadangan (*offline fallback data*) atau membaca cache dari `localStorage`.
* **Dampak:** 
  Pesan error menyesatkan karena pengguna diinformasikan bahwa data lokal sedang digunakan, padahal layar aplikasi tetap kosong tanpa data sama sekali.
* **Solusi Perbaikan:**
  Simpan respons sukses terakhir ke dalam `localStorage`, lalu muat data tersebut sebagai cadangan jika API mendadak tidak dapat diakses:
  ```javascript
  } catch (e) {
    setErrorMsg('API sedang sibuk — memuat data cache terakhir.');
    const cachedRaces = localStorage.getItem('last_saved_races');
    if (cachedRaces) setRaces(JSON.parse(cachedRaces));
  }
  ```

---

## 🔵 Temuan Sedang (Minor Issues)

### 1. Konflik Registrasi Service Worker PWA
* **Lokasi Kode:** [index.html:L13-L21](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/index.html#L13-L21) vs [vite.config.js:L9](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/vite.config.js#L9)
* **Deskripsi:** 
  Proyek ini menggunakan `vite-plugin-pwa` untuk menangani pembuatan Service Worker secara otomatis saat proses build produksi. Namun, di dalam [index.html](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/index.html) terdapat skrip manual yang mendaftarkan file `/sw.js` dari folder `/public`. File `/public/sw.js` ini masih menggunakan penulisan manual yang mencoba meng-cache `/src/App.jsx` dan file dev lainnya yang tidak ada di build produksi.
* **Dampak:** 
  Terjadi bentrokan daftaran (*registration conflict*) antara Service Worker yang digenerate oleh Workbox dan Service Worker manual. Hal ini mengakibatkan kegagalan fungsi caching offline dan pembaruan aplikasi secara dinamis.
* **Solusi Perbaikan:**
  Hapus skrip registrasi manual di [index.html](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/index.html) dan hapus file `/public/sw.js`. Biarkan `vite-plugin-pwa` menangani pendaftaran secara otomatis dengan menyetel opsi `injectRegister: 'inline'` atau `'script'` pada konfigurasi plugin.

---

### 2. Halaman Klasemen Juara (*ChampionsTab*) Tidak Dapat Diakses
* **Lokasi Kode:** [App.jsx:L245](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L245) & [App.jsx:L728-L733](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L728-L733)
* **Deskripsi:** 
  Komponen `ChampionsTab` dan logika rendering untuk `activeTab === 'champions'` sudah ditulis di dalam `App.jsx`. Namun, menu `'champions'` tidak disertakan ke dalam daftar navigasi `TABS` pada komponen `BottomNav`.
* **Dampak:** 
  Komponen tersebut menjadi kode mati (*dead code*) yang tidak dapat diakses oleh pengguna melalui navigasi utama aplikasi.
* **Solusi Perbaikan:**
  Jika memang direncanakan untuk dirilis nanti, tambahkan tab tersebut ke `BottomNav` dengan ikon yang sesuai, atau hapus logika renderingnya sementara untuk merapikan kode.

---

### 3. Peringatan ESLint pada File `App.jsx`
* **Lokasi Kode:** [App.jsx:L122](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L122) & [App.jsx:L124](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L124)
* **Deskripsi:** 
  Terdapat dua direktif penonaktifan aturan linter: `// eslint-disable-next-line react-hooks/set-state-in-effect`. Aturan `react-hooks/set-state-in-effect` bukanlah aturan ESLint yang valid atau ada secara standar, sehingga menghasilkan peringatan *Unused eslint-disable directive*.
* **Solusi Perbaikan:**
  Hapus baris komentar direktif tersebut karena fungsi dependensi `loadF1` dan `loadOpenF1` sudah dibungkus dengan benar menggunakan `useCallback`.

---

## 🟢 Rekomendasi Optimasi (Optimizations)

### 1. Kebocoran Thread (*Thread Leak*) pada Widget Android
* **Lokasi Kode:** [F1ScheduleWidget.java:L53-L63](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/android/app/src/main/java/com/ghiffa/haiformula1/F1ScheduleWidget.java#L53-L63)
* **Deskripsi:** 
  Di dalam fungsi `updateAppWidget`, setiap kali widget diperbarui, aplikasi membuat utas baru secara manual menggunakan `new Thread(() -> { ... }).start()` untuk mengunduh gambar peta sirkuit.
* **Dampak:** 
  Membuat thread mentah secara berkala tanpa menggunakan pool pekerja (*thread pool* / Executor) dapat memicu pemborosan sumber daya memori dan CPU pada sistem Android, serta berisiko terjadi *race condition* jika pembaruan widget terjadi sangat cepat sebelum unduhan sebelumnya selesai.
* **Rekomendasi Perbaikan:**
  Gunakan executor pool statis berukuran kecil atau gunakan library pemuatan gambar modern jika memungkinkan. Minimal, buat pool executor di kelas widget:
  ```java
  private static final ExecutorService executor = Executors.newSingleThreadExecutor();
  // Jalankan tugas unduh menggunakan executor
  executor.submit(() -> { ... });
  ```

---

### 2. Redundansi Font @import CSS di dalam App.jsx
* **Lokasi Kode:** [App.jsx:L254-L263](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/App.jsx#L254-L263)
* **Deskripsi:** 
  File `App.jsx` menyuntikkan tag `<style>` secara dinamis pada setiap proses render, di mana di dalamnya terdapat pernyataan `@import` untuk memuat Google Fonts (DM Sans & DM Mono).
* **Dampak:** 
  Pernyataan `@import` dalam komponen React yang sering di-render dapat menyebabkan peramban berulang kali melakukan evaluasi CSS, memperlambat proses render awal, dan memicu efek FOUT (*Flash of Unstyled Text*). Terlebih lagi, file [index.css:L1](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/index.css#L1) sudah memuat font tersebut secara global.
* **Rekomendasi Perbaikan:**
  Hapus baris `@import` dari tag `<style>` di dalam `App.jsx` dan letakkan aturan keyframe animasi atau gaya reset murni saja di sana, atau satukan seluruhnya ke dalam `index.css`.

---

### 3. Ruang Lingkup Dependensi (*Dependency Scope*) `@capacitor/preferences`
* **Lokasi Kode:** [package.json:L21](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/package.json#L21)
* **Deskripsi:** 
  Pustaka `@capacitor/preferences` dideklarasikan di dalam objek `devDependencies`. Namun, pustaka ini diimpor dan digunakan secara langsung di dalam kode runtime aplikasi ([widgetSync.js](file:///home/ghiffa/Documents/Projects_Software/Formula1_App/haiformula1/src/services/widgetSync.js)).
* **Dampak:** 
  Meskipun proses build lokal mungkin berjalan lancar karena bundler Vite memaketkan modul tersebut, menaruh pustaka runtime di `devDependencies` dapat menyebabkan masalah kegagalan instalasi native dependensi saat melakukan sinkronisasi Capacitor (`npx cap sync`) di lingkungan CI/CD bersih.
* **Rekomendasi Perbaikan:**
  Pindahkan `@capacitor/preferences` ke objek `dependencies` pada `package.json`:
  ```diff
    "dependencies": {
      "@capacitor/android": "^8.4.0",
      "@capacitor/core": "^8.4.0",
  +   "@capacitor/preferences": "^8.0.1",
      "lucide-react": "^1.17.0",
      "react": "^19.2.6",
      "react-dom": "^19.2.6"
    },
  ```

---

## 📝 Kesimpulan & Rencana Aksi

Aplikasi **haiFormula1** memiliki pondasi desain antarmuka yang sangat indah (penggunaan efek kaca/glassmorphism, gradien neon modern, dan tata letak yang bersih). Namun, fungsionalitas widget native Android dan kestabilan sistem linter saat ini terhambat oleh konfigurasi Capacitor dan ESLint yang kurang tepat.

### Langkah Perbaikan yang Disarankan (Urutan Prioritas):
1. **Perbaikan Integrasi Android Widget:** Perbaiki kunci prefiks SharedPreferences `_cap_widget_next_race` di Java.
2. **Pembersihan Linter:** Perbarui `eslint.config.js` untuk mengabaikan folder `android` agar CI/CD berjalan bersih.
3. **Pemberantasan Konflik PWA:** Hapus pendaftaran service worker manual di `index.html` dan gunakan manajemen otomatis dari `vite-plugin-pwa`.
4. **Pembersihan Antarmuka:** Nonaktifkan tab klasemen yang tidak aktif dan hapus redundansi kode `@import` di `App.jsx`.
