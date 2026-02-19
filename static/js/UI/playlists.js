document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('playlists-root');
    if (!root) return;
    const trackList = root.querySelector('.track-list');
    const tracksPerPage = 6;
    let visibleTracksCount = tracksPerPage;
    let loadMoreContainer = null;

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
        if (root.querySelector('.track-item-playlist')) return;
        if (root.querySelector('.alert.alert-secondary.mb-0')) return;
        if (loadMoreContainer) {
            loadMoreContainer.remove();
            loadMoreContainer = null;
        }
        const alert = document.createElement('div');
        alert.className = 'alert alert-secondary mb-0';
        alert.textContent = 'У вас пока нет избранных треков.';
        root.appendChild(alert);
    };

    const getTrackItems = () => (
        trackList ? Array.from(trackList.querySelectorAll('.track-item-playlist')) : []
    );

    const createLoadMoreButton = () => {
        const container = document.createElement('div');
        container.className = 'load-more-container text-center';
        container.style.margin = '12px 0 8px';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-sm btn-show-more mt-2';
        button.style.transform = 'scale(1.1)';
        button.style.transition = 'transform 0.3s ease';
        button.style.backgroundColor = 'transparent';
        button.style.border = 'none';
        button.style.outline = 'none';

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(0.95)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1.1)';
        });
        button.addEventListener('click', () => {
            visibleTracksCount += tracksPerPage;
            renderTrackPagination();
        });

        const arrowIcon = document.createElement('img');
        arrowIcon.src = '/static/images/arrow-down.svg';
        arrowIcon.alt = 'Show More';
        arrowIcon.style.width = '45px';
        arrowIcon.style.height = '45px';

        button.appendChild(arrowIcon);
        container.appendChild(button);
        return container;
    };

    const renderTrackPagination = () => {
        if (!trackList) return;
        const items = getTrackItems();
        if (!items.length) {
            showEmptyStateIfNeeded();
            return;
        }

        const maxVisible = Math.min(visibleTracksCount, items.length);
        items.forEach((item, idx) => {
            item.style.display = idx < maxVisible ? '' : 'none';
        });

        if (!loadMoreContainer) {
            loadMoreContainer = createLoadMoreButton();
            root.appendChild(loadMoreContainer);
        }

        loadMoreContainer.style.display = maxVisible < items.length ? '' : 'none';
    };

    if (trackList) {
        renderTrackPagination();
    }

    root.addEventListener('click', async (event) => {
        const button = event.target.closest('.remove-favorite-btn');
        if (!button) return;

        const trackItem = button.closest('.track-playlist');
        const cardWrapper = button.closest('.track-item-playlist');
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
            renderTrackPagination();
            showToast('Трек удалён');
        } catch (error) {
            showToast('Ошибка удаления трека', true);
            button.disabled = false;
        }
    });
});
