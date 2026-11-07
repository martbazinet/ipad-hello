import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The dev server listens on localhost only (Vite's default). Do not add `host: true`.
// Shown in the title bar so you can tell which version is running.
const buildStamp = new Date().toLocaleString('en-CA', {
  timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(buildStamp) },
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
      // src/pwa.ts registers the service worker, checks for new versions when the app
      // comes back to the screen, and reloads once it's safe (see that file).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Renovation Tracker',
        short_name: 'Renovation',
        description: 'Track renovation rooms, tasks, costs, quotes and schedule. Works offline.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f4f5f7',
        theme_color: '#6d28d9',
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
