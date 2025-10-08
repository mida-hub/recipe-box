import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        importScripts: ['./firebase-messaging-sw.js']
      },
      manifest: {
        name: 'レシピメモ',
        short_name: 'レシピ',
        description: '家族向けのシンプルな料理レシピメモアプリ',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1976d2',
        icons: [
          {
            src: '/memo_x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/memo_x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
