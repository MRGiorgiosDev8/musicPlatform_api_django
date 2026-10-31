(function () {
  'use strict';

  const SW_URL = '/service-worker.js';

  function registerServiceWorker(): void {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(SW_URL, { scope: '/' }).catch((error: unknown) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });
    });
  }

  registerServiceWorker();
})();
