import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'haiFormula1 Live Tracker',
        short_name: 'haiF1',
        description: 'F1 Schedule, Standings and Live Data',
        theme_color: '#FF2744',
        background_color: '#070714',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=192&h=192&fit=crop',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=512&h=512&fit=crop',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.openf1\.org\/v1\/(circuits|meetings)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openf1-static-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\.openf1\.org\/v1\/(sessions|standings|results|drivers|car_data|position|timing_data)/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'openf1-dynamic-data',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 // 1 Day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {},
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
