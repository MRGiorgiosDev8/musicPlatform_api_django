interface Window {
  gsap: any;
  MorphSVGPlugin: unknown;
}

(() => {
  if (typeof window.gsap === 'undefined' || typeof window.MorphSVGPlugin === 'undefined') {
    return;
  }

  const gsap = window.gsap;
  const MorphSVGPlugin = window.MorphSVGPlugin;
  gsap.registerPlugin(MorphSVGPlugin);

  const morphToState = (button: Element | null | undefined, isPlaying: boolean) => {
    if (!button) return;
    const path = button.querySelector('path') as SVGPathElement | null;
    if (!path) return;
    const playPath = path.dataset.playPath;
    const pausePath = path.dataset.pausePath;
    if (!playPath || !pausePath) return;

    gsap.killTweensOf(path);
    gsap.to(path, {
      duration: 0.35,
      ease: 'power3.out',
      morphSVG: isPlaying ? pausePath : playPath,
    });

    gsap.killTweensOf(button);
  };

  const initButton = (button: HTMLElement) => {
    if (button.dataset.morphInit === 'true') return;
    button.dataset.morphInit = 'true';
    morphToState(button, button.classList.contains('is-playing'));
  };

  const initButtons = (root: ParentNode) => {
    root
      .querySelectorAll('.audio-preview-toggle, .now-playing-toggle')
      .forEach((btn) => initButton(btn as HTMLElement));
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        const target = mutation.target as Element;
        if (
          target.classList?.contains('audio-preview-toggle') ||
          target.classList?.contains('now-playing-toggle')
        ) {
          morphToState(target, target.classList.contains('is-playing'));
        }
      } else if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (!node || node.nodeType !== 1) return;
          const element = node as HTMLElement;
          if (
            element.classList.contains('audio-preview-toggle') ||
            element.classList.contains('now-playing-toggle')
          ) {
            initButton(element);
          } else {
            initButtons(element);
          }
        });
      }
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    initButtons(document);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  });
})();
