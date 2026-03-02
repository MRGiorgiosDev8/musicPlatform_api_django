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

  const renderPlaylistLike = (payload) => {
    if (!payload || payload.type !== 'playlist_like') {
      return;
    }

    const item = document.createElement('div');
    item.className = 'small js-like-notification-item';

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
    if (notificationsEmpty) {
      notificationsEmpty.classList.add('d-none');
    }
  };

  const connect = () => {
    clearReconnect();
    socket = new WebSocket(wsUrl);

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        renderPlaylistLike(payload);
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
