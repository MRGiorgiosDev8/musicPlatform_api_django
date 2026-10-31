/**
 * Событие из WebSocket-потока присутствия пользователей.
 */
interface PresenceStatusPayload {
  type: 'presence_status';
  user_id?: number | string;
  is_online?: boolean;
  last_seen_display?: string;
  last_seen_iso?: string;
}

document.addEventListener('DOMContentLoaded', () => {
  const badges: HTMLElement[] = Array.from(
    document.querySelectorAll<HTMLElement>('[data-presence-badge]')
  );
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

  const formatLocalLastSeen = (lastSeenIso: string, fallbackDisplay = ''): string => {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (!lastSeenIso) {
      const value = fallbackDisplay || formatter.format(new Date()).replace(',', '');
      return value.startsWith('Был') ? value : `Был(а): ${value}`;
    }
    const parsed = new Date(lastSeenIso);
    if (Number.isNaN(parsed.getTime())) {
      const value = fallbackDisplay || formatter.format(new Date()).replace(',', '');
      return value.startsWith('Был') ? value : `Был(а): ${value}`;
    }
    return `Был(а): ${formatter.format(parsed).replace(',', '')}`;
  };

  const setBadgeState = (
    badge: HTMLElement,
    isOnline: boolean,
    lastSeenDisplay = '',
    lastSeenIso = ''
  ): void => {
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

  const setStatusForUser = (
    userId: number,
    isOnline: boolean,
    lastSeenDisplay = '',
    lastSeenIso = ''
  ): void => {
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
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;

  const clearReconnect = (): void => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const watchUsers = (): void => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    userIds.forEach((userId) => {
      socket!.send(
        JSON.stringify({
          action: 'watch_user',
          user_id: userId,
        })
      );
    });
  };

  const connect = (): void => {
    clearReconnect();
    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      watchUsers();
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload: PresenceStatusPayload = JSON.parse(event.data);
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
