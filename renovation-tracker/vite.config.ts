import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The dev server listens on localhost only (Vite's default). Do not add `host: true`.
export default defineConfig({
  // Relative paths so the build works from any folder, e.g. https://martbazinet.github.io/ipad-hello/renovation/
  base: './',
  build: {
    // GitHub Pages serves the ipad-hello repo; the built app goes in its renovation/ folder.
    outDir: '../renovation',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    VitePWA({
      // A new version installs itself the next time the app is opened online.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Renovation Tracker',
        short_name: 'Renovation',
        description: 'Track renovation rooms, tasks, costs, quotes and schedule. Works offline.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f4f5f7',
        theme_color: '#1f2933',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Cache every built file so the app opens with no internet connection.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
