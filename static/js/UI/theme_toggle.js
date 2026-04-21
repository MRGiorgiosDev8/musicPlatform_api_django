(() => {
    const root = document.documentElement;
    const toggleButton = document.getElementById('themeToggle');
    const storageKey = 'site-theme';
    const allowedThemes = new Set(['default', 'dark']);

    const getTheme = () => {
        const currentTheme = root.getAttribute('data-theme');
        return allowedThemes.has(currentTheme) ? currentTheme : 'default';
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
    }

    applyTheme(getTheme());
})();
