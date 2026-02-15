document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('playlists-root');
    if (!root) return;

    const toastContainerId = 'playlist-toast-container';
    const getToastContainer = () => {
        let container = document.getElementById(toastContainerId);
        if (container) return container;

        container = document.createElement('div');
        container.id = toastContainerId;
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1080';
        document.body.appendChild(container);
        return container;
    };

    const showToast = (message, isError = false) => {
        const container = getToastContainer();
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white border-0 ${isError ? 'bg-danger' : 'bg-success'}`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        const dFlex = document.createElement('div');
        dFlex.className = 'd-flex';
        
        const toastBody = document.createElement('div');
        toastBody.className = 'toast-body';
        toastBody.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close btn-close-white me-2 m-auto';
        closeButton.setAttribute('data-bs-dismiss', 'toast');
        closeButton.setAttribute('aria-label', 'Close');
        
        dFlex.appendChild(toastBody);
        dFlex.appendChild(closeButton);
        toastEl.appendChild(dFlex);
        container.appendChild(toastEl);

        if (window.bootstrap && window.bootstrap.Toast) {
            const instance = new window.bootstrap.Toast(toastEl, { delay: 2500 });
            toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove(), { once: true });
            instance.show();
            return;
        }

        setTimeout(() => toastEl.remove(), 2500);
    };

    const showEmptyStateIfNeeded = () => {
        if (root.querySelector('.track-item-wrapper')) return;
        const col12 = document.createElement('div');
        col12.className = 'col-12';
        
        const alert = document.createElement('div');
        alert.className = 'alert alert-secondary mb-0';
        alert.textContent = 'You have no liked tracks yet.';
        
        col12.appendChild(alert);
        root.appendChild(col12);
    };

    root.addEventListener('click', async (event) => {
        const button = event.target.closest('.remove-favorite-btn');
        if (!button) return;

        const trackItem = button.closest('.track-item');
        const cardWrapper = button.closest('.track-item-wrapper');
        if (!trackItem || !cardWrapper) return;

        const trackName = (trackItem.dataset.trackName || '').trim();
        const trackArtist = (trackItem.dataset.trackArtist || '').trim();
        if (!trackName || !trackArtist) return;

        button.disabled = true;
        try {
            const response = await fetch('/api/playlists/me/tracks/', {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: (typeof window.buildAuthHeaders === 'function')
                    ? window.buildAuthHeaders(true, true)
                    : { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trackName, artist: trackArtist }),
            });

            if (!response.ok) {
                throw new Error(`Failed with status ${response.status}`);
            }

            cardWrapper.remove();
            showEmptyStateIfNeeded();
            showToast('Трек удалён');
        } catch (error) {
            showToast('Ошибка удаления трека', true);
            button.disabled = false;
        }
    });
});
