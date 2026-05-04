(() => {
    const root = document.documentElement;
    const toggleButton = document.getElementById('themeToggle');
    const footer = document.querySelector('footer');
    const storageKey = 'site-theme';
    const allowedThemes = new Set(['default', 'dark']);
    const showAfterScrollY = 120;

    const getTheme = () => {
        const currentTheme = root.getAttribute('data-theme');
        return allowedThemes.has(currentTheme) ? currentTheme : 'default';
    };

    const syncToggleVisibility = () => {
        if (!toggleButton) {
            return;
        }
        const passedHeaderZone = window.scrollY > showAfterScrollY;
        let overlapsFooter = false;
        if (footer) {
            const footerTopInViewport = footer.getBoundingClientRect().top;
            overlapsFooter = footerTopInViewport <= window.innerHeight - 24;
        }
        const shouldShow = passedHeaderZone && !overlapsFooter;
        toggleButton.classList.toggle('is-visible', shouldShow);
    };

    const applyTheme = (theme) => {
        const nextTheme = allowedThemes.has(theme) ? theme : 'default';
        root.setAttribute('data-theme', nextTheme);
        localStorage.setItem(storageKey, nextTheme);
        if (!toggleButton) {
            return;
        }
        const isDark = nextTheme === 'dark';
        toggleButton.classList.toggle('is-dark', isDark);
        toggleButton.setAttribute(
            'aria-label',
            isDark ? 'Переключить на текущую тему' : 'Переключить на тёмную тему'
        );
        toggleButton.setAttribute(
            'title',
            isDark ? 'Тёмная тема включена' : 'Текущая тема включена'
        );
    };

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            const nextTheme = getTheme() === 'dark' ? 'default' : 'dark';
            applyTheme(nextTheme);
        });

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) {
                return;
            }
            ticking = true;
            window.requestAnimationFrame(() => {
                syncToggleVisibility();
                ticking = false;
            });
        }, { passive: true });

        window.addEventListener('resize', syncToggleVisibility, { passive: true });
    }

    applyTheme(getTheme());
    syncToggleVisibility();
})();
