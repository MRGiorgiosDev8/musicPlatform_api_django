(function () {
  'use strict';

  const PING_URL = '/health/live';
  const PING_INTERVAL_MS = 2000;
  const PING_MAX_ATTEMPTS = 30;
  const SW_URL = '/service-worker.js';

  const splash = document.getElementById('pwaSplash');
  const statusNode = document.getElementById('pwaSplashStatus');

  let currentPercent = 0;
  let percentInterval = null;

  function setStatus(message) {
    if (statusNode) {
      statusNode.textContent = message;
    }
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function startPercentLoader() {
    percentInterval = window.setInterval(() => {
      if (currentPercent < 95) {
        let step = 1;

        if (currentPercent < 40) {
          step = Math.floor(Math.random() * 3) + 2; 
        } else if (currentPercent < 75) {
          step = Math.floor(Math.random() * 2) + 1; 
        } else {
          step = Math.random() > 0.5 ? 1 : 0;
        }

        currentPercent += step;

        // Страховка, чтобы анимация не перешагнула порог до реального ответа сервера
        if (currentPercent > 95) {
          currentPercent = 95;
        }

        setStatus(`Загрузка… ${currentPercent}%`);
      }
    }, 450); 
  }

  function stopPercentLoader(isSuccess) {
    if (percentInterval) {
      window.clearInterval(percentInterval);
    }
    if (isSuccess) {
      setStatus('Загрузка… 100%');
    }
  }

  async function pingBackend() {
    for (let attempt = 1; attempt <= PING_MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(PING_URL, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          return true;
        }
      } catch (error) {

      }

      if (attempt < PING_MAX_ATTEMPTS) {
        await wait(PING_INTERVAL_MS);
      }
    }

    return false;
  }

  function hideSplash() {
    if (!splash || splash.dataset.hidden === 'true') {
      return;
    }

    splash.dataset.hidden = 'true';

    const finish = () => {
      splash.classList.add('is-hidden');
      splash.setAttribute('hidden', '');
      splash.setAttribute('aria-hidden', 'true');
    };

    if (window.gsap) {
      window.gsap.to(splash, {
        autoAlpha: 0,
        duration: 0.55,
        ease: 'power2.out',
        onComplete: finish,
      });
      return;
    }

    splash.style.opacity = '0';
    splash.style.visibility = 'hidden';
    window.setTimeout(finish, 550);
  }

  async function initSplashGate() {
    if (!splash) {
      return;
    }

    setStatus('Запуск RubySound.fm… 0%');
    startPercentLoader();

    const isReady = await pingBackend();

    if (isReady) {
      stopPercentLoader(true);
      await wait(350); 
      hideSplash();
      return;
    }

    stopPercentLoader(false);
    setStatus('Сервер недоступен. Показываем интерфейс…');
    hideSplash();
  }

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
  initSplashGate();
})();