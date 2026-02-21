document.addEventListener('DOMContentLoaded', () => {
  const publicCard = document.getElementById('public-card');
  const playlistRoot = document.getElementById('public-playlist-root');

  const animatePublicCard = () => {
    if (!publicCard) return;
    if (typeof gsap === 'undefined') {
      publicCard.style.opacity = '1';
      publicCard.style.transform = 'none';
      return;
    }

    gsap.killTweensOf(publicCard);
    gsap.fromTo(
      publicCard,
      { autoAlpha: 0, scale: 0.8, transformOrigin: 'center center' },
      { autoAlpha: 1, scale: 1, duration: 0.48, ease: 'power2.out', overwrite: 'auto' }
    );
  };

  animatePublicCard();
  if (!playlistRoot) return;

  const showWithoutAnimation = () => {
    playlistRoot.querySelectorAll('.track-item-playlist').forEach((item) => {
      if (item.style.display === 'none') return;
      item.style.opacity = '1';
      item.style.transform = 'none';
    });
  };

  const animateTrackItems = (items) => {
    if (!items.length) return;
    if (typeof gsap === 'undefined') {
      showWithoutAnimation();
      return;
    }

    gsap.killTweensOf(items);
    gsap.fromTo(
      items,
      { autoAlpha: 0, y: 14, scale: 0.985 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.38,
        stagger: 0.06,
        ease: 'power2.out',
        overwrite: 'auto',
      }
    );
  };

  const animateTracks = () => {
    const items = Array.from(playlistRoot.querySelectorAll('.track-item-playlist'))
      .filter((item) => item.style.display !== 'none');
    animateTrackItems(items);
  };

  animateTracks();
  document.addEventListener('publicPlaylist:rendered', () => requestAnimationFrame(animateTracks));
  document.addEventListener('publicPlaylist:viewChanged', () => requestAnimationFrame(animateTracks));
  document.addEventListener('publicPlaylist:showMore', (event) => {
    const items = Array.isArray(event.detail?.items) ? event.detail.items : [];
    if (!items.length) return;
    requestAnimationFrame(() => animateTrackItems(items));
  });
});
