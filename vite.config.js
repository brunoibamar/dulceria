import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        id: './',
        name: 'Dulcería',
        short_name: 'Dulcería',
        description: 'Ventas y cuentas, en tu dispositivo',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#171024',
        theme_color: '#171024',
        icons: [
          { src: 'icons/192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
