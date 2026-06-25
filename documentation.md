# 🏎️ HaiFormula1 - Dokumentasi Proyek Resmi

**HaiFormula1** adalah aplikasi pelacakan informasi Formula 1 komprehensif yang dirancang untuk Web dan Perangkat Bergerak (Mobile/Android) menggunakan teknologi web modern dan Capacitor. Aplikasi ini memberikan penggemar F1 akses langsung ke jadwal balapan, klasemen, statistik detail pembalap, dan analisis strategi (*telemetry*) waktu nyata yang dibalut dalam antarmuka *Glassmorphism* premium.

---

## 🏗️ Teknologi & Stack

Proyek ini dibangun di atas tumpukan teknologi modern untuk memastikan performa yang cepat, ukuran *bundle* yang ringkas, dan kompatibilitas silang (*cross-platform*):

- **Core Framework**: React 18+ (menggunakan JSX Transform terbaru)
- **Build Tool**: Vite (Sangat cepat dengan HMR dan optimasi build)
- **Mobile Runtime**: Capacitor v6+ (Memungkinkan akses API Native Android/iOS seperti Notifications dan Home Screen Widgets)
- **UI/Aesthetics**: CSS murni berbasis *inline-styles* dengan konsep **Glassmorphism**, komponen SVG Ikon dari `lucide-react`.
- **Linter**: ESLint (Dikonfigurasi untuk memastikan standar React Hooks dan *clean code*).

---

## 📂 Arsitektur Proyek

Struktur *folder* proyek mengikuti pola aplikasi React berskala menengah-besar yang memisahkan logika aplikasi, tampilan halaman, komponen modular, dan interaksi layanan API eksternal.

```text
haiformula1/
├── android/                  # Kode Native Android (Capacitor + Java Native Widget)
├── public/                   # Aset publik statis (Ikon, Manifest PWA)
├── src/
│   ├── components/           # Komponen UI modular (BottomNav, OpenF1Widgets)
│   │   └── ui/               # Komponen dasar atomik (Glass, Skeleton, ErrorBoundary)
│   ├── pages/                # Halaman/Tab utama yang di-lazy-load (Home, Schedule, Standings)
│   ├── services/             # Logika eksternal (API Fetcher, Notifications, WidgetSync)
│   ├── utils/                # Fungsi pembantu (*helpers*, pemformat tanggal, warna tim)
│   ├── App.jsx               # Entry point, router, dan state orchestrator utama
│   └── main.jsx              # Bootstrapper React
├── package.json              # Daftar dependensi dan scripts
└── vite.config.js            # Konfigurasi bundler Vite
```

---

## 🔌 Integrasi API & Manajemen Data

Aplikasi mengambil data dari beberapa sumber penyedia data olahraga bermotor terbaik:
1. **F1API.dev / Ergast API**: Digunakan untuk data historis klasemen, hasil balapan resmi, poin, dan jadwal sirkuit musiman.
2. **OpenF1 API**: Digunakan untuk telemetri *real-time*, cuaca sirkuit, strategi pemakaian ban (*stints*), dan radio pembalap.

### Mekanisme *Robust Fetching* (`src/services/api.js`)
- **Exponential Backoff Retry**: Jika API terkena hambatan (Rate Limit 429) atau server *error* (500+), sistem akan mencoba ulang otomatis dengan jeda waktu yang terus melipat ganda.
- **Smart Caching**: Data berat seperti hasil balapan masa lalu, foto pengemudi, dan daftar jadwal dikunci (*cached*) dalam `localStorage` maupun `sessionStorage` untuk mempercepat pemuatan (*load time*) di kunjungan berikutnya serta menghemat *bandwidth*.

---

## 🌟 Fitur Utama

### 1. Dinamika Halaman & Lazy Loading
Setiap tab (Home, Schedule, Standings, Telemetry) dimuat hanya jika dibutuhkan menggunakan `React.lazy()` dan `Suspense`, sehingga ukuran aplikasi awal yang diunduh pengguna sangat kecil.

### 2. Antarmuka Premium (Skeleton & Error Boundary)
- **Skeleton Loaders**: Menampilkan animasi kerangka (*shimmer pulse*) bergaya *glassmorphism* saat mengambil data, menekan masalah lompatan *layout* (CLS).
- **Error Boundaries**: `<ErrorBoundary>` mengisolasi layar yang bermasalah. Jika aplikasi terputus koneksinya saat *lazy load* halaman baru, aplikasi tidak akan *crash*, melainkan menampilkan opsi 'Muat Ulang'.
- **Offline Detector**: Indikator status luring (*offline*) adaptif jika sinyal terputus.

### 3. Smart Local Notifications (Notifikasi Cerdas)
Memanfaatkan plugin `@capacitor/local-notifications`, aplikasi mampu menanamkan pengingat cerdas secara lokal tanpa memerlukan *server backend*:
- Mengirim peringatan *Grand Prix* dan Kualifikasi 1 hari dan 1 jam sebelum dimulai.
- Memberitahu hasil rekapitulasi setelah balapan selesai.

### 4. Native Android Home Screen Widget
Aplikasi ini melampaui batasan standar web dengan menghubungkan logika Javascript ke `AppWidgetProvider` milik native Java Android.
Siklus Kerjanya:
- `src/services/widgetSync.js` menyimpan data balapan terdekat ke Capacitor `Preferences`.
- Java Widget (`F1ScheduleWidget.java`) membaca nilai tersebut untuk dirender di layar beranda *smartphone* pengguna secara *real-time*.

---

## 🛠️ Panduan Pengembang (Developer Scripts)

Berikut adalah daftar skrip perintah yang tersedia dalam `package.json` untuk mengelola pengembangan aplikasi ini:

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan *local server* Vite dengan *Hot Module Replacement* (HMR). |
| `npm run build` | Mengompilasi aplikasi ke dalam bundel siap-produksi di folder `dist`. |
| `npm run lint` | Melakukan audit statis *clean-code* ESLint untuk mencari *error* atau variabel usang. |
| `npx cap sync android` | Menyalin *build* web terbaru (`dist`) ke dalam *folder native* Android Capacitor. |
| `npx cap run android` | Mengompilasi *build* Android Native dan langsung memasangnya (*deploy*) ke emulator/device target yang terkoneksi. |

---

## 🧑‍💻 Pedoman Berkontribusi (Best Practices)

Bagi QA atau pengembang selanjutnya yang ingin berkontribusi:
1. **Komponen UI**: Gunakan komponen dasar seperti `<Glass>`, `<SkeletonCard>`, dan `<DriverAvatar>` jika ingin membuat antarmuka baru demi menjaga estetika seragam.
2. **Pengambilan Data**: Dilarang menggunakan fungsi `fetch()` dasar. Wajib menggunakan `fetchWithRetry()` atau `fetchWithCache()` dari `api.js` untuk menghindari aplikasi lumpuh saat server OpenF1 membatasi akses (Rate Limit).
3. **Impor React**: Proyek ini menggunakan standar React 17+, Anda tidak perlu mendeklarasikan `import React from 'react';` kecuali jika membutuhkan *Hooks* secara eksplisit seperti `import { useState } from 'react';`.

---
*Dokumentasi ini mencerminkan struktur sistem per versi v1.0, dikurasi secara otomatis oleh arsitektur pengembangan HaiFormula1.*
