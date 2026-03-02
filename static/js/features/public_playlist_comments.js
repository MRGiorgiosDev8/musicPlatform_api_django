document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-public-comments-root]');
  if (!root) {
    return;
  }

  const username = root.dataset.publicUsername || '';
  const list = document.getElementById('public-comments-list');
  const empty = document.getElementById('public-comments-empty');
  const countNode = document.getElementById('public-comments-count');
  const form = document.getElementById('public-comment-form');
  const textInput = document.getElementById('public-comment-text');
  const submitButton = document.getElementById('public-comment-submit');

  if (!username || !list || !empty || !countNode) {
    return;
  }

  const knownIds = new Set();
  let socket = null;
  let reconnectTimer = null;
  let commentsCount = Number.parseInt(countNode.textContent || '0', 10) || 0;

  const escapeHtml = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const updateMeta = () => {
    const count = list.querySelectorAll('[data-comment-id]').length;
    if (count !== commentsCount) {
      if (
        window.PublicCommentsAnimation &&
        typeof window.PublicCommentsAnimation.flipCommentsCount === 'function'
      ) {
        window.PublicCommentsAnimation.flipCommentsCount(countNode, count);
      } else {
        countNode.textContent = String(count);
      }
      commentsCount = count;
    }
    empty.classList.toggle('d-none', count > 0);
  };

  const removeCommentById = (commentId) => {
    const node = list.querySelector(`[data-comment-id="${commentId}"]`);
    const finalize = () => {
      if (node) {
        node.remove();
      }
      knownIds.delete(Number(commentId));
      updateMeta();
    };

    if (
      node &&
      window.PublicCommentsAnimation &&
      typeof window.PublicCommentsAnimation.collapseDeleteComment === 'function'
    ) {
      window.PublicCommentsAnimation.collapseDeleteComment(node, finalize);
      return;
    }
    finalize();
  };

  const renderComment = (comment, appendToBottom = true, shouldPulse = false) => {
    if (!comment || !Number.isInteger(Number(comment.id))) {
      return;
    }
    const id = Number(comment.id);
    if (knownIds.has(id)) {
      return;
    }

    const item = document.createElement('article');
    item.className = 'public-comment-item';
    item.dataset.commentId = String(id);

    const authorUrl = comment.author_profile_url || '#';
    const canDelete = Boolean(comment.can_delete);
    const timeText = comment.created_at_display || '';
    const author = escapeHtml(comment.author_username || 'Unknown user');
    const text = escapeHtml(comment.text || '');
    const avatarUrl = comment.author_avatar_url ? String(comment.author_avatar_url) : '';
    const safeAvatarUrl = escapeHtml(avatarUrl);
    const authorAvatar = avatarUrl
      ? `<img src="${safeAvatarUrl}" alt="${author}" class="public-comment-author-avatar" loading="lazy">`
      : '<span class="public-comment-author-fallback" aria-hidden="true"><i class="bi bi-person-fill"></i></span>';

    item.innerHTML = `
      <div class="public-comment-meta">
        <div class="d-flex align-items-center gap-2">
          <a href="${authorUrl}" class="public-comment-author-row text-decoration-none">
            ${authorAvatar}
            <span class="public-comment-author">${author}</span>
          </a>
          <span class="public-comment-time">${timeText}</span>
        </div>
        ${
          canDelete
            ? '<button type="button" class="btn btn-sm btn-link text-danger text-decoration-none p-0" data-comment-delete>Удалить</button>'
            : ''
        }
      </div>
      <p class="public-comment-text">${text}</p>
    `;

    if (appendToBottom) {
      list.appendChild(item);
    } else {
      list.prepend(item);
    }
    knownIds.add(id);
    updateMeta();

    if (
      shouldPulse &&
      window.PublicCommentsAnimation &&
      typeof window.PublicCommentsAnimation.pulseNewComment === 'function'
    ) {
      window.PublicCommentsAnimation.pulseNewComment(item);
    }
  };

  const loadComments = async () => {
    const response = await fetch(
      `/api/playlists/public/${encodeURIComponent(username)}/comments/`,
      {
        method: 'GET',
        credentials: 'same-origin',
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }

    list.innerHTML = '';
    knownIds.clear();
    (payload.results || []).forEach((comment) => renderComment(comment, true, false));
    commentsCount = list.querySelectorAll('[data-comment-id]').length;
    updateMeta();
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!form || !textInput || !submitButton) {
      return;
    }
    const text = textInput.value.trim();
    if (!text) {
      return;
    }

    submitButton.disabled = true;
    try {
      const response = await fetch(
        `/api/playlists/public/${encodeURIComponent(username)}/comments/`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers:
            typeof window.buildAuthHeaders === 'function'
              ? window.buildAuthHeaders(true, true)
              : { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || `HTTP ${response.status}`);
      }

      renderComment(payload, true, true);
      textInput.value = '';
    } catch (error) {
      console.error('Create comment failed:', error);
    } finally {
      submitButton.disabled = false;
    }
  };

  const deleteComment = async (commentId) => {
    const response = await fetch(
      `/api/playlists/public/${encodeURIComponent(username)}/comments/${commentId}/`,
      {
        method: 'DELETE',
        credentials: 'same-origin',
        headers:
          typeof window.buildAuthHeaders === 'function'
            ? window.buildAuthHeaders(true, true)
            : { 'Content-Type': 'application/json' },
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }
    removeCommentById(commentId);
  };

  list.addEventListener('click', async (event) => {
    const target = event.target;
    if (!target || target.nodeType !== 1 || !target.hasAttribute('data-comment-delete')) {
      return;
    }
    const item = target.closest('[data-comment-id]');
    if (!item) {
      return;
    }
    const commentId = Number(item.getAttribute('data-comment-id'));
    if (!Number.isInteger(commentId)) {
      return;
    }
    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('Delete comment failed:', error);
    }
  });

  if (form) {
    form.addEventListener('submit', submitComment);
  }

  const clearReconnect = () => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const connectSocket = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws/comments/public/${encodeURIComponent(username)}/`;
    clearReconnect();
    socket = new WebSocket(wsUrl);

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'playlist_comment_created') {
          renderComment(payload.comment, true, true);
        } else if (payload.type === 'playlist_comment_deleted') {
          removeCommentById(payload.comment_id);
        }
      } catch (error) {
        console.error('WS comments parse error:', error);
      }
    });

    socket.addEventListener('close', () => {
      reconnectTimer = window.setTimeout(connectSocket, 2000);
    });
  };

  loadComments()
    .catch((error) => {
      console.error('Load comments failed:', error);
    })
    .finally(() => {
      connectSocket();
    });
});
