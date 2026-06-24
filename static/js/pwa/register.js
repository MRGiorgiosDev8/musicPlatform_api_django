(function () {
  'use strict';

  const SW_URL = '/service-worker.js';

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(SW_URL, { scope: '/' })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    });
  }

  registerServiceWorker();
})();