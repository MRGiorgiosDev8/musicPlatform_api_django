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

  const canCompose = Boolean(form && textInput && submitButton);
  const defaultPlaceholder = textInput?.getAttribute('placeholder') || 'Напишите комментарий...';

  const knownIds = new Set();
  let socket = null;
  let reconnectTimer = null;
  let commentsCount = Number.parseInt(countNode.textContent || '0', 10) || 0;

  let replyParentId = null;
  let replyAuthorName = '';
  let replyMeta = null;

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

  const clearReplyTarget = ({ focus = false } = {}) => {
    replyParentId = null;
    replyAuthorName = '';
    if (replyMeta) {
      replyMeta.classList.add('d-none');
      const authorNode = replyMeta.querySelector('[data-reply-author]');
      if (authorNode) {
        authorNode.textContent = '';
      }
    }
    if (textInput) {
      textInput.placeholder = defaultPlaceholder;
      if (focus) {
        textInput.focus();
      }
    }
  };

  const setReplyTarget = (commentId, authorName) => {
    if (!canCompose) {
      return;
    }
    if (!Number.isInteger(Number(commentId))) {
      return;
    }

    replyParentId = Number(commentId);
    replyAuthorName = String(authorName || '').trim();

    if (replyMeta) {
      const authorNode = replyMeta.querySelector('[data-reply-author]');
      if (authorNode) {
        authorNode.textContent = replyAuthorName || 'пользователю';
      }
      replyMeta.classList.remove('d-none');
    }

    textInput.placeholder = replyAuthorName
      ? `Ответ для ${replyAuthorName}...`
      : 'Напишите ответ...';
    textInput.focus();
  };

  if (canCompose) {
    replyMeta = document.createElement('div');
    replyMeta.className = 'public-comment-reply-meta d-none';
    replyMeta.innerHTML =
      '<span class="small">Ответ для <strong data-reply-author></strong></span>' +
      '<button type="button" class="btn btn-body btn-sm text-decoration-none p-0" data-comment-reply-cancel>Отмена</button>';
    form.insertBefore(replyMeta, textInput);
  }

  const buildCommentNode = (comment, isReply = false) => {
    const item = document.createElement('article');
    item.className = `public-comment-item${isReply ? ' is-reply' : ''}`;
    item.dataset.commentId = String(comment.id);
    if (Number.isInteger(Number(comment.parent_id))) {
      item.dataset.parentId = String(comment.parent_id);
    }

    const metaDiv = document.createElement('div');
    metaDiv.className = 'public-comment-meta';

    const left = document.createElement('div');
    left.className = 'd-flex align-items-center gap-2 mb-1';

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

    left.appendChild(authorLink);
    left.appendChild(timeSpan);

    const actions = document.createElement('div');
    actions.className = 'public-comment-actions d-flex align-items-center gap-2';

    if (canCompose && !isReply) {
      const replyBtn = document.createElement('button');
      replyBtn.type = 'button';
      replyBtn.className = 'btn btn-sm btn-link text-body bg-danger bg-opacity-10 p-1 rounded text-decoration-none p-0';
      replyBtn.dataset.commentReply = '';
      replyBtn.textContent = 'Ответить';
      actions.appendChild(replyBtn);
    }

    if (Boolean(comment.can_delete)) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-sm btn-link text-danger bg-danger bg-opacity-10 p-1 rounded text-decoration-none p-0';
      delBtn.dataset.commentDelete = '';
      delBtn.textContent = 'Удалить';
      actions.appendChild(delBtn);
    }

    metaDiv.appendChild(left);
    if (actions.childElementCount > 0) {
      metaDiv.appendChild(actions);
    }

    const textP = document.createElement('p');
    textP.className = 'public-comment-text';
    textP.textContent = comment.text || '';

    item.appendChild(metaDiv);
    item.appendChild(textP);

    if (!isReply) {
      const repliesWrap = document.createElement('div');
      repliesWrap.className = 'public-comment-replies';
      repliesWrap.dataset.commentReplies = '';
      item.appendChild(repliesWrap);
    }

    return item;
  };

  const renderComment = (comment, appendToBottom = true, shouldPulse = false, container = list) => {
    if (!comment || !Number.isInteger(Number(comment.id))) {
      return null;
    }

    const id = Number(comment.id);
    if (knownIds.has(id)) {
      return null;
    }

    const parentId = Number(comment.parent_id);
    const isReply = Number.isInteger(parentId);

    let targetContainer = container;
    let effectiveIsReply = isReply;

    if (isReply) {
      const containerIsReplies = Boolean(
        targetContainer &&
        typeof targetContainer.hasAttribute === 'function' &&
        targetContainer.hasAttribute('data-comment-replies')
      );

      if (containerIsReplies) {
        effectiveIsReply = true;
      } else {
        const parentNode = list.querySelector(`[data-comment-id="${parentId}"]`);
        const repliesContainer = parentNode?.querySelector('[data-comment-replies]');
        if (repliesContainer) {
          targetContainer = repliesContainer;
        } else {
          effectiveIsReply = false;
        }
      }
    }

    const item = buildCommentNode(comment, effectiveIsReply);

    if (appendToBottom) {
      targetContainer.appendChild(item);
    } else {
      targetContainer.prepend(item);
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

    return item;
  };

  const renderCommentThread = (comment, appendToBottom = true, shouldPulse = false, container = list) => {
    const rootNode = renderComment(comment, appendToBottom, shouldPulse, container);
    if (!rootNode) {
      return;
    }

    const repliesContainer = rootNode.querySelector('[data-comment-replies]');
    const replies = Array.isArray(comment.replies) ? comment.replies : [];

    replies.forEach((reply) => {
      if (!reply || !Number.isInteger(Number(reply.id))) {
        return;
      }
      const normalizedReply = {
        ...reply,
        parent_id: Number.isInteger(Number(reply.parent_id)) ? Number(reply.parent_id) : Number(comment.id),
      };
      renderComment(normalizedReply, true, false, repliesContainer || list);
    });
  };

  const removeCommentById = (commentId) => {
    const id = Number(commentId);
    if (!Number.isInteger(id)) {
      return;
    }

    const node = list.querySelector(`[data-comment-id="${id}"]`);

    if (!node) {
      knownIds.delete(id);
      if (replyParentId === id) {
        clearReplyTarget();
      }
      updateMeta();
      return;
    }

    const nestedIds = Array.from(node.querySelectorAll('[data-comment-id]'))
      .map((child) => Number(child.dataset.commentId))
      .filter((value) => Number.isInteger(value));
    nestedIds.unshift(id);

    const finalize = () => {
      node.remove();
      nestedIds.forEach((nestedId) => {
        knownIds.delete(nestedId);
      });
      if (replyParentId !== null && nestedIds.includes(replyParentId)) {
        clearReplyTarget();
      }
      updateMeta();
    };

    if (
      window.PublicCommentsAnimation &&
      typeof window.PublicCommentsAnimation.collapseDeleteComment === 'function'
    ) {
      window.PublicCommentsAnimation.collapseDeleteComment(node, finalize);
      return;
    }

    finalize();
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
    clearReplyTarget();

    const fragment = document.createDocumentFragment();

    (payload.results || []).forEach((comment) => {
      renderCommentThread(comment, true, false, fragment);
    });

    list.appendChild(fragment);
    updateMeta();
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!canCompose) {
      return;
    }

    const text = textInput.value.trim();
    if (!text) {
      return;
    }

    submitButton.disabled = true;
    try {
      const requestBody = { text };
      if (Number.isInteger(replyParentId)) {
        requestBody.parent_id = replyParentId;
      }

      const response = await fetch(
        `/api/playlists/public/${encodeURIComponent(username)}/comments/`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers:
            typeof window.buildAuthHeaders === 'function'
              ? window.buildAuthHeaders(true, true)
              : { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || `HTTP ${response.status}`);
      }

      renderComment(payload, true, true);
      textInput.value = '';
      clearReplyTarget();
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
    if (!target) {
      return;
    }

    if (target.hasAttribute('data-comment-delete')) {
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
      return;
    }

    if (target.hasAttribute('data-comment-reply')) {
      const item = target.closest('[data-comment-id]');
      if (!item) {
        return;
      }
      const commentId = Number(item.getAttribute('data-comment-id'));
      if (!Number.isInteger(commentId)) {
        return;
      }
      const authorNode = item.querySelector('.public-comment-author');
      setReplyTarget(commentId, authorNode ? authorNode.textContent : '');
    }
  });

  if (form) {
    form.addEventListener('click', (event) => {
      const target = event.target;
      if (target && target.hasAttribute('data-comment-reply-cancel')) {
        clearReplyTarget({ focus: true });
      }
    });
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
          const deletedIds = Array.isArray(payload.deleted_ids)
            ? payload.deleted_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value))
            : [];
          if (deletedIds.length > 0) {
            deletedIds.forEach((deletedId) => {
              knownIds.delete(deletedId);
            });
          }
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
