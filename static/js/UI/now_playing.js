(() => {
  const bar = document.getElementById('nowPlayingBar');
  const toggleBtn = document.getElementById('nowPlayingToggle');
  const jumpBtn = document.getElementById('nowPlayingJump');
  const closeBtn = document.getElementById('nowPlayingClose');
  const titleNode = document.getElementById('nowPlayingTitle');
  const artistNode = document.getElementById('nowPlayingArtist');
  const timeNode = document.getElementById('nowPlayingTime');
  const progressNode = document.getElementById('nowPlayingProgressBar');

  if (!bar || !toggleBtn || !jumpBtn || !closeBtn || !titleNode || !artistNode || !timeNode || !progressNode) {
    return;
  }

  let activePreview = null;
  let dismissedByUser = false;
  let visibilitySyncRafId = null;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const findTrackCard = (mount) => {
    if (!mount) return null;
    return (
      mount.closest('.track-playlist') ||
      mount.closest('.year-track-card') ||
      mount.closest('.card') ||
      mount.closest('.track-item') ||
      mount.closest('.track-item-playlist')
    );
  };

  const resolveTitle = (card) => {
    if (!card) return 'Неизвестный трек';
    const dataName = card.dataset?.trackName;
    if (dataName) return dataName;
    const textNode =
      card.querySelector('.track-title-text') ||
      card.querySelector('.year-track-title-text') ||
      card.querySelector('.track-title') ||
      card.querySelector('.card-title');
    return textNode?.textContent?.trim() || 'Неизвестный трек';
  };

  const resolveArtist = (card) => {
    if (!card) return 'Неизвестный артист';
    const dataArtist = card.dataset?.trackArtist;
    if (dataArtist) return dataArtist;
    const textNode =
      card.querySelector('.artist-bio-trigger-text') ||
      card.querySelector('.track-artist') ||
      card.querySelector('.year-track-artist');
    const text = textNode?.textContent?.replace('Артист:', '').trim();
    return text || 'Неизвестный артист';
  };

  const isSourceNearViewport = () => {
    const sourceNode =
      activePreview?.mount?.closest('.audio-preview-player') ||
      activePreview?.mount ||
      activePreview?.card ||
      null;
    if (!sourceNode) return false;

    const rect = sourceNode.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (viewportHeight <= 0) return false;

    const topSafeZone = 110;
    const bottomSafeZone = 150;
    return rect.bottom > topSafeZone && rect.top < viewportHeight - bottomSafeZone;
  };

  const syncMiniPlayerVisibility = () => {
    if (!activePreview?.ws || dismissedByUser) {
      bar.classList.remove('is-visible');
      return;
    }
    bar.classList.toggle('is-visible', !isSourceNearViewport());
  };

  const scheduleVisibilitySync = () => {
    if (visibilitySyncRafId) {
      window.cancelAnimationFrame(visibilitySyncRafId);
    }
    visibilitySyncRafId = window.requestAnimationFrame(() => {
      visibilitySyncRafId = null;
      syncMiniPlayerVisibility();
    });
  };

  const applyState = ({
    title = 'Нет активного трека',
    artist = 'Включите превью',
    currentTime = 0,
    duration = 0,
    isPlaying = false,
    card = null,
    ws = null,
  } = {}) => {
    titleNode.textContent = title;
    artistNode.textContent = artist;
    timeNode.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    const progress = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;
    progressNode.style.width = `${progress}%`;
    bar.classList.toggle('is-playing', Boolean(ws) && isPlaying);
    toggleBtn.classList.toggle('is-playing', Boolean(ws) && isPlaying);
    jumpBtn.disabled = !card;
    syncMiniPlayerVisibility();
  };

  const activateFromDetail = (detail = {}, isPlaying = false) => {
    const { mount, currentTime = 0, duration = 0, ws = null } = detail;
    const card = findTrackCard(mount);
    activePreview = ws ? { ws, card, mount } : null;
    applyState({
      title: resolveTitle(card),
      artist: resolveArtist(card),
      currentTime,
      duration,
      isPlaying,
      card,
      ws,
    });
  };

  const updateProgress = (detail = {}, isPlaying = true) => {
    if (!activePreview || !detail?.ws || activePreview.ws !== detail.ws) return;
    applyState({
      title: titleNode.textContent,
      artist: artistNode.textContent,
      currentTime: detail.currentTime || 0,
      duration: detail.duration || 0,
      isPlaying,
      card: activePreview.card,
      ws: activePreview.ws,
    });
  };

  document.addEventListener('ruby:preview:play', (event) => {
    dismissedByUser = false;
    activateFromDetail(event.detail, true);
  });

  document.addEventListener('ruby:preview:pause', (event) => {
    if (!activePreview || activePreview.ws !== event.detail?.ws) return;
    updateProgress(event.detail, false);
  });

  document.addEventListener('ruby:preview:timeupdate', (event) => {
    updateProgress(event.detail, true);
  });

  document.addEventListener('ruby:preview:finish', (event) => {
    if (!activePreview || activePreview.ws !== event.detail?.ws) return;
    updateProgress(event.detail, false);
  });

  document.addEventListener('ruby:preview:error', (event) => {
    if (!activePreview || activePreview.ws !== event.detail?.ws) return;
    activePreview = null;
    applyState();
  });

  toggleBtn.addEventListener('click', () => {
    if (!activePreview?.ws) return;
    if (activePreview.ws.isPlaying()) {
      activePreview.ws.pause();
    } else {
      activePreview.ws.play();
    }
  });

  jumpBtn.addEventListener('click', () => {
    const card = activePreview?.card;
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('now-playing-source-highlight');
    window.setTimeout(() => {
      card.classList.remove('now-playing-source-highlight');
    }, 1300);
  });

  closeBtn.addEventListener('click', () => {
    dismissedByUser = true;
    bar.classList.remove('is-visible');
    if (activePreview?.ws?.isPlaying()) {
      activePreview.ws.pause();
    }
  });

  window.addEventListener('scroll', scheduleVisibilitySync, { passive: true });
  window.addEventListener('resize', scheduleVisibilitySync, { passive: true });
})();
