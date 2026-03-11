document.addEventListener('DOMContentLoaded', () => {
  const badges = Array.from(document.querySelectorAll('[data-presence-badge]'));
  if (!badges.length) {
    return;
  }

  const userIds = Array.from(
    new Set(
      badges
        .map((badge) => Number.parseInt(badge.dataset.presenceUserId || '', 10))
        .filter((userId) => Number.isInteger(userId) && userId > 0)
    )
  );

  if (!userIds.length) {
    return;
  }

  const formatLocalLastSeen = (lastSeenIso, fallbackDisplay = '') => {
    if (!lastSeenIso) {
      return fallbackDisplay || 'Был(а) давно';
    }
    const parsed = new Date(lastSeenIso);
    if (Number.isNaN(parsed.getTime())) {
      return fallbackDisplay || 'Был(а) давно';
    }
    const diffMs = Date.now() - parsed.getTime();
    if (diffMs >= 24 * 60 * 60 * 1000) {
      return 'Был(а) давно';
    }
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `Был(а): ${formatter.format(parsed).replace(',', '')}`;
  };

  const setBadgeState = (badge, isOnline, lastSeenDisplay = '', lastSeenIso = '') => {
    const dot = badge.querySelector('.presence-dot');
    const label = badge.querySelector('.presence-label');
    if (dot) {
      dot.classList.toggle('is-online', Boolean(isOnline));
    }
    if (label) {
      label.textContent = isOnline ? 'Онлайн' : formatLocalLastSeen(lastSeenIso, lastSeenDisplay);
    }
    badge.dataset.presenceOnline = isOnline ? 'true' : 'false';
    badge.dataset.presenceLastSeen = lastSeenDisplay || '';
    badge.dataset.presenceLastSeenIso = lastSeenIso || '';
  };

  const setStatusForUser = (userId, isOnline, lastSeenDisplay = '', lastSeenIso = '') => {
    badges.forEach((badge) => {
      const badgeUserId = Number.parseInt(badge.dataset.presenceUserId || '', 10);
      if (badgeUserId === userId) {
        setBadgeState(badge, isOnline, lastSeenDisplay, lastSeenIso);
      }
    });
  };

  badges.forEach((badge) => {
    setBadgeState(
      badge,
      badge.dataset.presenceOnline === 'true',
      badge.dataset.presenceLastSeen || '',
      badge.dataset.presenceLastSeenIso || ''
    );
  });

  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${window.location.host}/ws/presence/`;
  let socket = null;
  let reconnectTimer = null;

  const clearReconnect = () => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const watchUsers = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    userIds.forEach((userId) => {
      socket.send(
        JSON.stringify({
          action: 'watch_user',
          user_id: userId,
        })
      );
    });
  };

  const connect = () => {
    clearReconnect();
    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      watchUsers();
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== 'presence_status') {
          return;
        }
        const userId = Number.parseInt(String(payload.user_id), 10);
        if (!Number.isInteger(userId) || userId <= 0) {
          return;
        }
        setStatusForUser(
          userId,
          Boolean(payload.is_online),
          payload.last_seen_display || '',
          payload.last_seen_iso || ''
        );
      } catch (error) {
        console.error('WS presence parse error:', error);
      }
    });

    socket.addEventListener('close', () => {
      reconnectTimer = window.setTimeout(connect, 2000);
    });
  };

  connect();
});
