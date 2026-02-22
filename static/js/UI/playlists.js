document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('playlists-root');
    if (!root) return;
    const trackList = root.querySelector('.track-list');
    const sortControls = Array.from(document.querySelectorAll('[data-playlist-sort]'));
    const artistControls = Array.from(document.querySelectorAll('[data-playlist-artist-filter]'));
    const titleInputs = Array.from(document.querySelectorAll('[data-playlist-title-input]'));
    const titleSaveButtons = Array.from(document.querySelectorAll('[data-playlist-title-save]'));
    const resetFilterButtons = Array.from(document.querySelectorAll('[data-playlist-reset-filters]'));
    const countDisplays = Array.from(document.querySelectorAll('[data-playlist-count-display]'));
    const filterMetaBlocks = Array.from(document.querySelectorAll('[data-playlist-filter-meta]'));
    const pageSize = 6;
    let visibleTracksCount = pageSize;
    let loadMoreContainer = null;
    let noMatchesAlert = null;
    let activeAudio = null;
    const state = {
        sortMode: sortControls[0]?.value || 'new',
        artistFilter: artistControls[0]?.value || 'all',
        title: titleInputs[0]?.value?.trim() || 'Favorites',
    };

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
        toastEl.className = `toast align-items-center text-white border-0 ${isError ? 'bg-danger' : 'bg-danger'}`;
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
        if (trackList && trackList.querySelector('.track-item-playlist')) return;
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

    const trackRecords = getTrackItems().map((item, idx) => {
        const card = item.querySelector('.track-playlist');
        const artist = ((card?.dataset?.trackArtist || '').trim());
        const indexRaw = Number(item.dataset.trackIndex);
        return {
            element: item,
            artist,
            artistKey: artist.toLowerCase(),
            index: Number.isNaN(indexRaw) ? idx : indexRaw,
        };
    });

    const buildArtistFilterOptions = () => {
        if (!artistControls.length) return;
        const artists = Array.from(
            new Set(
                trackRecords
                    .map((record) => record.artist)
                    .filter((artist) => artist.length > 0)
            )
        ).sort((a, b) => a.localeCompare(b, 'ru'));

        artistControls.forEach((control) => {
            artists.forEach((artist) => {
                const option = document.createElement('option');
                option.value = artist.toLowerCase();
                option.textContent = artist;
                control.appendChild(option);
            });
        });
    };

    const syncControlValues = () => {
        sortControls.forEach((control) => {
            control.value = state.sortMode;
        });
        artistControls.forEach((control) => {
            control.value = state.artistFilter;
        });
        titleInputs.forEach((input) => {
            input.value = state.title;
        });
    };

    const savePlaylistTitle = async () => {
        const nextTitle = titleInputs[0]?.value?.trim() || '';
        if (!nextTitle) {
            showToast('Название не может быть пустым', true);
            syncControlValues();
            return;
        }
        if (nextTitle.length > 255) {
            showToast('Слишком длинное название', true);
            return;
        }

        titleSaveButtons.forEach((button) => { button.disabled = true; });
        try {
            const response = await fetch('/api/playlists/me/', {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: (typeof window.buildAuthHeaders === 'function')
                    ? window.buildAuthHeaders(true, true)
                    : { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: nextTitle }),
            });

            if (!response.ok) {
                throw new Error(`Failed with status ${response.status}`);
            }

            const payload = await response.json().catch(() => ({}));
            state.title = String(payload.title || nextTitle);
            syncControlValues();
            showToast('Название плейлиста обновлено');
        } catch (error) {
            showToast('Ошибка обновления названия', true);
            syncControlValues();
        } finally {
            titleSaveButtons.forEach((button) => { button.disabled = false; });
        }
    };

    const clearNoMatchesState = () => {
        if (!noMatchesAlert) return;
        noMatchesAlert.remove();
        noMatchesAlert = null;
    };

    const resetStaggerAnimationState = () => {
        if (!trackList) return;
        trackList.querySelectorAll('.track-item-playlist').forEach((item) => {
            delete item.dataset.staggerAnimated;
        });
    };

    const markVisibleItemsAsAnimated = () => {
        if (!trackList) return;
        trackList.querySelectorAll('.track-item-playlist').forEach((item) => {
            if (item.style.display !== 'none') {
                item.dataset.staggerAnimated = '1';
            }
        });
    };

    const showNoMatchesState = () => {
        if (noMatchesAlert) return;
        noMatchesAlert = document.createElement('div');
        noMatchesAlert.className = 'alert alert-light border mb-0';
        noMatchesAlert.textContent = 'По выбранному фильтру треки не найдены.';
        root.appendChild(noMatchesAlert);
    };

    const animateTrackRemoval = (element) => new Promise((resolve) => {
        if (!element) {
            resolve();
            return;
        }

        if (typeof gsap === 'undefined') {
            resolve();
            return;
        }

        gsap.killTweensOf(element);
        gsap.fromTo(
            element,
            { autoAlpha: 1, y: 0, scale: 1, height: element.offsetHeight },
            {
                autoAlpha: 0,
                y: -8,
                scale: 0.97,
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                paddingTop: 0,
                paddingBottom: 0,
                duration: 0.32,
                ease: 'power2.inOut',
                onComplete: resolve,
            }
        );
    });

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
            visibleTracksCount += pageSize;
            renderTrackPagination();
        });

        const arrowIcon = document.createElement('i');
        arrowIcon.className = 'bi bi-chevron-double-down';
        arrowIcon.setAttribute('aria-hidden', 'true');
        arrowIcon.style.fontSize = '2rem';
        arrowIcon.style.lineHeight = '1';
        arrowIcon.style.color = 'var(--color-primary)';

        button.appendChild(arrowIcon);
        container.appendChild(button);
        return container;
    };

    const renderTrackPagination = ({ animate = false } = {}) => {
        if (!trackList || !trackRecords.length) {
            showEmptyStateIfNeeded();
            return;
        }

        clearNoMatchesState();
        const { sortMode, artistFilter } = state;
        const filtered = trackRecords.filter((record) => (
            artistFilter === 'all' || record.artistKey === artistFilter
        ));

        const sorted = [...filtered].sort((a, b) => (
            sortMode === 'old' ? a.index - b.index : b.index - a.index
        ));

        trackRecords.forEach((record) => {
            record.element.style.display = 'none';
        });

        if (!sorted.length) {
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            showNoMatchesState();
            countDisplays.forEach((block) => { block.textContent = '0'; });
            filterMetaBlocks.forEach((block) => { block.textContent = 'Найдено: 0 треков'; });
            return;
        }

        sorted.forEach((record) => {
            trackList.appendChild(record.element);
        });

        const maxVisible = Math.min(visibleTracksCount, sorted.length);
        sorted.forEach((record, idx) => {
            record.element.style.display = idx < maxVisible ? '' : 'none';
            if (idx < maxVisible) {
                record.element.style.opacity = '1';
                record.element.style.transform = 'none';
            }
        });

        if (animate && typeof gsap !== 'undefined') {
            const visibleItems = sorted.slice(0, maxVisible).map((record) => record.element);
            if (visibleItems.length) {
                gsap.killTweensOf(visibleItems);
                gsap.fromTo(
                    visibleItems,
                    { autoAlpha: 0, y: 14, scale: 0.985 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.32,
                        stagger: 0.055,
                        ease: 'power2.out',
                        overwrite: 'auto',
                    }
                );
            }
        }

        if (!loadMoreContainer) {
            loadMoreContainer = createLoadMoreButton();
            root.appendChild(loadMoreContainer);
        }

        loadMoreContainer.style.display = maxVisible < sorted.length ? '' : 'none';

        countDisplays.forEach((block) => { block.textContent = `${sorted.length}`; });
        filterMetaBlocks.forEach((block) => { block.textContent = `Показано: ${maxVisible} из ${sorted.length}`; });
    };

    if (trackList) {
        buildArtistFilterOptions();
        syncControlValues();
        renderTrackPagination({ animate: false });
    }

    root.addEventListener('play', (event) => {
        const audio = event.target;
        if (!(audio instanceof HTMLAudioElement)) return;

        if (activeAudio && activeAudio !== audio) {
            activeAudio.pause();
        }

        activeAudio = audio;
    }, true);

    root.addEventListener('ended', (event) => {
        const audio = event.target;
        if (!(audio instanceof HTMLAudioElement)) return;
        if (activeAudio === audio) activeAudio = null;
    }, true);

    root.addEventListener('pause', (event) => {
        const audio = event.target;
        if (!(audio instanceof HTMLAudioElement)) return;
        if (activeAudio === audio) activeAudio = null;
    }, true);

    sortControls.forEach((control) => {
        control.addEventListener('change', () => {
            state.sortMode = control.value || 'new';
            syncControlValues();
            visibleTracksCount = pageSize;
            renderTrackPagination({ animate: false });
            resetStaggerAnimationState();
            markVisibleItemsAsAnimated();
        });
    });

    artistControls.forEach((control) => {
        control.addEventListener('change', () => {
            state.artistFilter = control.value || 'all';
            syncControlValues();
            visibleTracksCount = pageSize;
            renderTrackPagination({ animate: false });
            resetStaggerAnimationState();
            markVisibleItemsAsAnimated();
        });
    });

    resetFilterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            state.sortMode = 'new';
            state.artistFilter = 'all';
            syncControlValues();
            visibleTracksCount = pageSize;
            renderTrackPagination({ animate: false });
            resetStaggerAnimationState();
            markVisibleItemsAsAnimated();
            showToast('Фильтры сброшены');
        });
    });

    titleInputs.forEach((input) => {
        input.addEventListener('input', () => {
            titleInputs.forEach((other) => {
                if (other !== input) other.value = input.value;
            });
        });
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            savePlaylistTitle();
        });
    });

    titleSaveButtons.forEach((button) => {
        button.addEventListener('click', savePlaylistTitle);
    });

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

            await animateTrackRemoval(cardWrapper);
            const audio = cardWrapper.querySelector('audio');
            if (audio && activeAudio === audio) {
                activeAudio.pause();
                activeAudio = null;
            }
            cardWrapper.remove();
            const removedIndex = trackRecords.findIndex((record) => record.element === cardWrapper);
            if (removedIndex > -1) {
                trackRecords.splice(removedIndex, 1);
            }
            renderTrackPagination({ animate: false });
            showEmptyStateIfNeeded();
            showToast('Трек удалён');
        } catch (error) {
            showToast('Ошибка удаления трека', true);
            button.disabled = false;
        }
    });
});
