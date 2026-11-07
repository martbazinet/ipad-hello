import { registerSW } from 'virtual:pwa-register';

/**
 * Offline support and updates.
 *
 * The service worker keeps a copy of the app so it opens offline. Your data lives in
 * localStorage and IndexedDB, which updates never touch.
 *
 * When a new version is published, the app downloads it in the background (checked at
 * launch, whenever the app comes back on screen, and every 30 minutes), then reloads to
 * switch to it. The reload waits while you're typing or a dialog is open, so nothing
 * you haven't finished entering is lost.
 */
export function setupPwa() {
  if (!('serviceWorker' in navigator)) return;

  let pending = false;

  const busy = () => {
    const el = document.activeElement;
    const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
    const dialogOpen = !!document.querySelector('.modal-backdrop, .viewer-backdrop');
    return typing || dialogOpen;
  };

  const applyWhenSafe = () => {
    if (!pending) return;
    if (busy()) {
      setTimeout(applyWhenSafe, 2000);
      return;
    }
    pending = false;
    void updateSW(true); // activates the new version and reloads the page
  };

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      applyWhenSafe();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      setInterval(check, 30 * 60 * 1000);
    },
  });
}
