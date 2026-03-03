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

  const renderComment = (comment, appendToBottom = true, shouldPulse = false, container = list) => {
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

    const metaDiv = document.createElement('div');
    metaDiv.className = 'public-comment-meta';

    const headerRow = document.createElement('div');
    headerRow.className = 'd-flex align-items-center gap-2 mb-1';

    const authorLink = document.createElement('a');
    authorLink.href = comment.author_profile_url || '#';
    authorLink.className = 'public-comment-author-row text-decoration-none';

    if (comment.author_avatar_url) {
      const img = document.createElement('img');
      img.src = String(comment.author_avatar_url);
      img.alt = comment.author_username || 'User';
      img.className = 'public-comment-author-avatar';
      img.setAttribute('loading', 'lazy');
      authorLink.appendChild(img);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'public-comment-author-fallback shadow-sm';
      fallback.setAttribute('aria-hidden', 'true');
      const icon = document.createElement('i');
      icon.className = 'bi bi-person-fill';
      fallback.appendChild(icon);
      authorLink.appendChild(fallback);
    }

    const authorSpan = document.createElement('span');
    authorSpan.className = 'public-comment-author';
    authorSpan.textContent = comment.author_username || 'Unknown user';
    authorLink.appendChild(authorSpan);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'public-comment-time';
    timeSpan.textContent = comment.created_at_display || '';

    headerRow.appendChild(authorLink);
    headerRow.appendChild(timeSpan);
    metaDiv.appendChild(headerRow);

    if (Boolean(comment.can_delete)) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-sm btn-link text-danger text-decoration-none p-0';
      delBtn.dataset.commentDelete = '';
      delBtn.textContent = 'Удалить';
      metaDiv.appendChild(delBtn);
    }

    const textP = document.createElement('p');
    textP.className = 'public-comment-text';
    textP.textContent = comment.text || ''; 

    item.appendChild(metaDiv);
    item.appendChild(textP);

    if (appendToBottom) {
      container.appendChild(item);
    } else {
      container.prepend(item);
    }

    knownIds.add(id);
    
    if (container === list) {
        updateMeta();
    }

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

    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    knownIds.clear();

    const fragment = document.createDocumentFragment();

    (payload.results || []).forEach((comment) => {
        renderComment(comment, true, false, fragment);
    });

    list.appendChild(fragment);
    
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
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }
    removeCommentById(commentId);
  };

  list.addEventListener('click', async (event) => {
    const target = event.target;
    if (!target || !target.hasAttribute('data-comment-delete')) {
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

    socket.addEventListener('open', () => {
      clearReconnect();
    });

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