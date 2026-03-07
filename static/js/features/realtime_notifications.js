document.addEventListener('DOMContentLoaded', () => {
  const notificationsBlock = document.getElementById('block-like-notifications');
  const notificationsList = document.getElementById('like-notifications-list');
  const notificationsEmpty = document.getElementById('like-notifications-empty');

  if (!notificationsBlock || !notificationsList) {
    return;
  }
  if (document.body?.dataset?.isAuthenticated !== 'true') {
    return;
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${window.location.host}/ws/notifications/`;
  let socket = null;
  let reconnectTimer = null;

  const clearReconnect = () => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const syncEmptyState = () => {
    if (!notificationsEmpty) {
      return;
    }
    const hasItems = Boolean(notificationsList.querySelector('.js-like-notification-item'));
    notificationsEmpty.classList.toggle('d-none', hasItems);
  };

  const renderPlaylistLike = (payload) => {
    if (!payload || payload.type !== 'playlist_like') {
      return;
    }

    const item = document.createElement('div');
    item.className = 'small js-like-notification-item';
    if (Number.isInteger(Number(payload.notification_id))) {
      item.dataset.notificationId = String(payload.notification_id);
    }
    if (Number.isInteger(Number(payload.actor_id))) {
      item.dataset.actorId = String(payload.actor_id);
    }
    if (Number.isInteger(Number(payload.playlist_id))) {
      item.dataset.playlistId = String(payload.playlist_id);
    }

    const profileLink = document.createElement('a');
    profileLink.href = payload.actor_profile_url || '#';
    profileLink.className = 'text-decoration-none';
    const strong = document.createElement('strong');
    strong.textContent = payload.actor_username || 'Unknown user';
    profileLink.appendChild(strong);

    const timestamp = document.createElement('span');
    timestamp.className = 'text-muted';
    timestamp.textContent = ` (${payload.created_at || ''})`;

    item.appendChild(profileLink);
    item.appendChild(document.createTextNode(' поставил(а) лайк вашему плейлисту'));
    item.appendChild(timestamp);

    notificationsList.prepend(item);
    syncEmptyState();
  };

  const removePlaylistLike = (payload) => {
    if (!payload || payload.type !== 'playlist_like_removed') {
      return;
    }

    let item = null;
    const notificationId = Number(payload.notification_id);
    if (Number.isInteger(notificationId)) {
      item = notificationsList.querySelector(
        `.js-like-notification-item[data-notification-id="${notificationId}"]`
      );
    }

    if (!item) {
      const actorId = Number(payload.actor_id);
      const playlistId = Number(payload.playlist_id);
      if (Number.isInteger(actorId) && Number.isInteger(playlistId)) {
        item = notificationsList.querySelector(
          `.js-like-notification-item[data-actor-id="${actorId}"][data-playlist-id="${playlistId}"]`
        );
      }
    }

    if (item) {
      item.remove();
      syncEmptyState();
    }
  };

  const connect = () => {
    clearReconnect();
    socket = new WebSocket(wsUrl);

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'playlist_like') {
          renderPlaylistLike(payload);
        } else if (payload.type === 'playlist_like_removed') {
          removePlaylistLike(payload);
        }
      } catch (error) {
        console.error('WS notification parse error:', error);
      }
    });

    socket.addEventListener('close', () => {
      reconnectTimer = window.setTimeout(connect, 2000);
    });
  };

  connect();
});
