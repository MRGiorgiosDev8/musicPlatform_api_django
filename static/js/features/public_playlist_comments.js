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
  const emojiToggleButton = form?.querySelector('[data-comment-emoji-toggle]') || null;
  const emojiPicker = document.getElementById('public-comment-emoji-picker');

  if (!username || !list || !empty || !countNode) {
    return;
  }

  const canCompose = Boolean(form && textInput && submitButton);
  const supportsHoverPopover =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
      : true;
  const defaultPlaceholder = textInput?.getAttribute('placeholder') || 'Напишите комментарий...';

  const knownIds = new Set();
  const pendingLocalDeleteIds = new Set();
  let socket = null;
  let reconnectTimer = null;
  let commentsCount = Number.parseInt(countNode.textContent || '0', 10) || 0;

  let replyParentId = null;
  let replyTargetCommentId = null;
  let replyAuthorName = '';
  let replyMeta = null;
  const commentLikersCache = new Map();
  let likersPopover = null;
  let hideLikersTimer = null;
  let activeLikersCommentId = null;
  let likersModal = null;
  let likersModalCloseTimer = null;
  let mobileLikeLongPressTimer = null;
  let mobileLongPressTriggered = false;
  const MOBILE_LIKERS_LONG_PRESS_MS = 420;
  let isEmojiPickerOpen = false;

  const insertTextAtCursor = (input, value) => {
    if (!input || typeof value !== 'string' || value.length === 0) {
      return;
    }
    const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
    const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : input.value.length;
    input.setRangeText(value, start, end, 'end');
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const setEmojiPickerOpen = (open) => {
    if (!emojiPicker || !emojiToggleButton) {
      return;
    }
    isEmojiPickerOpen = Boolean(open);
    emojiPicker.classList.toggle('is-open', isEmojiPickerOpen);
    emojiToggleButton.setAttribute('aria-expanded', isEmojiPickerOpen ? 'true' : 'false');
  };

  const applyEmojiPickerRubyTheme = () => {
    if (!emojiPicker || !emojiPicker.shadowRoot) {
      return false;
    }

    if (emojiPicker.shadowRoot.querySelector('[data-ruby-emoji-theme]')) {
      return true;
    }

    const rootCss = window.getComputedStyle(document.documentElement);
    const rubyGlow =
      rootCss.getPropertyValue('--shadow-ruby-glow').trim() ||
      '0 0 0 1px rgba(254, 254, 254, 0.3), 0 0 14px rgb(255, 255, 255), 0 0 24px rgba(229, 47, 47, 0.268), 0 10px 26px rgba(0, 0, 0, 0.18)';
    const rubyPrimary = rootCss.getPropertyValue('--color-primary').trim() || '#e52f2f';

    const styleNode = document.createElement('style');
    styleNode.setAttribute('data-ruby-emoji-theme', '1');
    styleNode.textContent = `
      .nav {
        background: #fff;
        border-radius: 12px 12px 0 0;
        box-shadow: ${rubyGlow};
      }
      .tabpanel {
        background: #fff;
        border-radius: 0 0 12px 12px;
      }
      .pad-top,
      .search-row,
      .search-wrapper {
        background: #fff;
      }
      input.search {
        background: #fff !important;
        color: #151515 !important;
        opacity: 1;
      }
      input.search::placeholder {
        color: #7f7f7f !important;
      }
      .indicator-wrapper {
        border-bottom-color: rgba(229, 47, 47, 0.18);
      }
      .indicator {
        background-color: ${rubyPrimary};
      }
    `;
    emojiPicker.shadowRoot.appendChild(styleNode);
    return true;
  };

  const ensureEmojiPickerRubyTheme = () => {
    if (applyEmojiPickerRubyTheme()) {
      return;
    }
    window.requestAnimationFrame(() => {
      applyEmojiPickerRubyTheme();
    });
  };

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

  const updateCommentLikeState = (commentId, { likesCount, likedByMe } = {}) => {
    const id = Number(commentId);
    if (!Number.isInteger(id)) {
      return;
    }
    commentLikersCache.delete(id);

    const node = list.querySelector(`[data-comment-id="${id}"]`);
    if (!node) {
      return;
    }

    const likeCountNode = node.querySelector('[data-comment-like-count]');
    const normalizedCount = Number(likesCount);
    const safeCount = Number.isInteger(normalizedCount) && normalizedCount >= 0 ? normalizedCount : 0;
    if (likeCountNode) {
      const previousCount = Number.parseInt(likeCountNode.textContent || '0', 10) || 0;
      likeCountNode.textContent = String(safeCount);
      if (previousCount !== safeCount) {
        likeCountNode.classList.remove('is-like-count-changing', 'is-like-count-up', 'is-like-count-down');
        likeCountNode.offsetWidth;
        likeCountNode.classList.add('is-like-count-changing');
        likeCountNode.classList.add(safeCount > previousCount ? 'is-like-count-up' : 'is-like-count-down');
      }
    }

    const likeBtn = node.querySelector('[data-comment-like]');
    if (!likeBtn) {
      return;
    }
    const likeIcon = likeBtn.querySelector('[data-comment-like-icon]');
    if (!likeIcon) {
      return;
    }

    if (typeof likedByMe === 'boolean') {
      likeBtn.dataset.liked = likedByMe ? '1' : '0';
    }
    const isLiked = likeBtn.dataset.liked === '1';
    const showFilledByCount = safeCount > 0;
    const shouldShowFilled = isLiked || showFilledByCount;
    likeBtn.classList.add('text-danger');
    likeIcon.className = shouldShowFilled ? 'bi bi-heart-fill me-1' : 'bi bi-heart me-1';
    if (isLiked) {
      likeBtn.classList.remove('is-like-burst');
      likeBtn.offsetWidth;
      likeBtn.classList.add('is-like-burst');
    } else {
      likeBtn.classList.remove('is-like-burst');
    }
  };

  const clearReplyTarget = ({ focus = false } = {}) => {
    replyParentId = null;
    replyTargetCommentId = null;
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

  const clearChildren = (node) => {
    if (!node) {
      return;
    }
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  };

  const renderStateNode = (container, text) => {
    if (!container) {
      return;
    }
    clearChildren(container);
    const state = document.createElement('div');
    state.className = 'public-comment-likers-state';
    state.textContent = text;
    container.appendChild(state);
  };

  const ensureLikersPopover = () => {
    if (likersPopover) {
      return likersPopover;
    }
    likersPopover = document.createElement('div');
    likersPopover.className = 'public-comment-likers-popover d-none';

    const head = document.createElement('div');
    head.className = 'public-comment-likers-popover-head';
    head.textContent = 'Лайкнули';

    const body = document.createElement('div');
    body.className = 'public-comment-likers-popover-body';
    body.dataset.commentLikersBody = '';

    const foot = document.createElement('div');
    foot.className = 'public-comment-likers-popover-foot';
    const openModalBtn = document.createElement('button');
    openModalBtn.type = 'button';
    openModalBtn.className = 'btn btn-sm btn-link text-decoration-none p-0';
    openModalBtn.dataset.commentLikersOpenModal = '';
    openModalBtn.textContent = 'Показать всех';
    foot.appendChild(openModalBtn);

    likersPopover.appendChild(head);
    likersPopover.appendChild(body);
    likersPopover.appendChild(foot);
    likersPopover.addEventListener('mouseenter', () => {
      if (hideLikersTimer) {
        window.clearTimeout(hideLikersTimer);
        hideLikersTimer = null;
      }
    });
    likersPopover.addEventListener('mouseleave', () => {
      hideLikersTimer = window.setTimeout(() => {
        activeLikersCommentId = null;
        likersPopover.classList.add('d-none');
      }, 120);
    });
    document.body.appendChild(likersPopover);
    return likersPopover;
  };

  const renderLikersRows = (container, users) => {
    if (!container) {
      return;
    }
    clearChildren(container);
    const fragment = document.createDocumentFragment();
    users.forEach((row) => {
      const item = document.createElement('a');
      item.className = 'public-comment-liker-row';
      item.href = row.profile_url || '#';
      const avatarWrap = document.createElement('span');
      avatarWrap.className = 'public-comment-liker-avatar-wrap';
      if (row.avatar_url) {
        const img = document.createElement('img');
        img.src = String(row.avatar_url);
        img.alt = row.username || 'User';
        img.className = 'public-comment-liker-avatar';
        img.setAttribute('loading', 'lazy');
        avatarWrap.appendChild(img);
      } else {
        const icon = document.createElement('i');
        icon.className = 'bi bi-person-fill';
        icon.setAttribute('aria-hidden', 'true');
        avatarWrap.appendChild(icon);
      }

      const usernameNode = document.createElement('span');
      usernameNode.className = 'public-comment-liker-name';
      usernameNode.textContent = row.username || 'unknown';

      item.appendChild(avatarWrap);
      item.appendChild(usernameNode);
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
  };

  const renderLikersPopover = ({ loading = false, error = false, users = [] } = {}) => {
    const popover = ensureLikersPopover();
    const body = popover.querySelector('[data-comment-likers-body]');
    const openModalBtn = popover.querySelector('[data-comment-likers-open-modal]');
    if (!body || !openModalBtn) {
      return;
    }

    openModalBtn.disabled = true;
    if (loading) {
      renderStateNode(body, 'Загрузка...');
      return;
    }
    if (error) {
      renderStateNode(body, 'Не удалось загрузить');
      return;
    }
    if (!Array.isArray(users) || users.length === 0) {
      renderStateNode(body, 'Пока нет лайков');
      return;
    }

    openModalBtn.disabled = false;
    renderLikersRows(body, users);
  };

  const positionLikersPopover = (anchor) => {
    const popover = ensureLikersPopover();
    const rect = anchor.getBoundingClientRect();
    const popoverWidth = popover.offsetWidth || 260;
    const popoverHeight = popover.offsetHeight || 180;
    const viewportLeft = window.scrollX + 8;
    const viewportRight = window.scrollX + window.innerWidth - 8;
    const viewportTop = window.scrollY + 8;
    const viewportBottom = window.scrollY + window.innerHeight - 8;

    const preferredLeft = window.scrollX + rect.left - popoverWidth - 10;
    const preferredTop = window.scrollY + rect.top + rect.height / 2 - popoverHeight / 2;

    const left = Math.min(Math.max(preferredLeft, viewportLeft), viewportRight - popoverWidth);
    const top = Math.min(Math.max(preferredTop, viewportTop), viewportBottom - popoverHeight);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  };

  const loadCommentLikers = async (commentId) => {
    if (commentLikersCache.has(commentId)) {
      return commentLikersCache.get(commentId);
    }
    const response = await fetch(
      `/api/playlists/public/${encodeURIComponent(username)}/comments/${commentId}/likes/`,
      {
        method: 'GET',
        credentials: 'same-origin',
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }
    const users = Array.isArray(payload.results) ? payload.results : [];
    commentLikersCache.set(commentId, users);
    return users;
  };

  const showCommentLikersPopover = async (button, commentId) => {
    if (hideLikersTimer) {
      window.clearTimeout(hideLikersTimer);
      hideLikersTimer = null;
    }
    activeLikersCommentId = commentId;
    const popover = ensureLikersPopover();
    popover.dataset.commentId = String(commentId);
    popover.classList.remove('d-none');
    renderLikersPopover({ loading: true });
    positionLikersPopover(button);
    try {
      const users = await loadCommentLikers(commentId);
      if (activeLikersCommentId !== commentId) {
        return;
      }
      renderLikersPopover({ users });
      positionLikersPopover(button);
    } catch (error) {
      if (activeLikersCommentId !== commentId) {
        return;
      }
      renderLikersPopover({ error: true });
    }
  };

  const ensureLikersModal = () => {
    if (likersModal) {
      return likersModal;
    }

    likersModal = document.createElement('div');
    likersModal.className = 'public-comment-likers-modal d-none';

    const backdrop = document.createElement('div');
    backdrop.className = 'public-comment-likers-modal-backdrop';
    backdrop.dataset.commentLikersModalClose = '';

    const dialog = document.createElement('div');
    dialog.className = 'public-comment-likers-modal-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Все лайки комментария');

    const head = document.createElement('div');
    head.className = 'public-comment-likers-modal-head';

    const title = document.createElement('strong');
    title.textContent = 'Все лайки';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.dataset.commentLikersModalClose = '';
    closeBtn.setAttribute('aria-label', 'Закрыть');

    head.appendChild(title);
    head.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'public-comment-likers-modal-body';
    body.dataset.commentLikersModalBody = '';

    dialog.appendChild(head);
    dialog.appendChild(body);
    likersModal.appendChild(backdrop);
    likersModal.appendChild(dialog);

    document.body.appendChild(likersModal);
    return likersModal;
  };

  const hideLikersModal = () => {
    if (!likersModal) {
      return;
    }
    if (likersModal.classList.contains('d-none')) {
      return;
    }
    if (likersModalCloseTimer) {
      window.clearTimeout(likersModalCloseTimer);
      likersModalCloseTimer = null;
    }
    likersModal.classList.remove('is-open');
    likersModal.classList.add('is-closing');
    likersModalCloseTimer = window.setTimeout(() => {
      if (!likersModal) {
        return;
      }
      likersModal.classList.add('d-none');
      likersModal.classList.remove('is-closing');
      document.body.classList.remove('public-comment-modal-open');
      likersModalCloseTimer = null;
    }, 220);
  };

  const renderLikersModal = ({ loading = false, error = false, users = [] } = {}) => {
    const modal = ensureLikersModal();
    const body = modal.querySelector('[data-comment-likers-modal-body]');
    if (!body) {
      return;
    }

    if (loading) {
      renderStateNode(body, 'Загрузка...');
      return;
    }
    if (error) {
      renderStateNode(body, 'Не удалось загрузить');
      return;
    }
    if (!Array.isArray(users) || users.length === 0) {
      renderStateNode(body, 'Пока нет лайков');
      return;
    }
    renderLikersRows(body, users);
  };

  const showLikersModal = async (commentId) => {
    const modal = ensureLikersModal();
    if (likersModalCloseTimer) {
      window.clearTimeout(likersModalCloseTimer);
      likersModalCloseTimer = null;
    }
    modal.classList.remove('d-none');
    modal.classList.remove('is-closing');
    window.requestAnimationFrame(() => {
      modal.classList.add('is-open');
    });
    document.body.classList.add('public-comment-modal-open');
    renderLikersModal({ loading: true });
    try {
      const users = await loadCommentLikers(commentId);
      renderLikersModal({ users });
    } catch (error) {
      renderLikersModal({ error: true });
    }
  };

  const setReplyTarget = (parentCommentId, targetCommentId, authorName) => {
    if (!canCompose) {
      return;
    }
    const normalizedParentId = Number(parentCommentId);
    const normalizedTargetId = Number(targetCommentId);
    if (!Number.isInteger(normalizedParentId) || !Number.isInteger(normalizedTargetId)) {
      return;
    }

    replyParentId = normalizedParentId;
    replyTargetCommentId = normalizedTargetId;
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

    const replyText = document.createElement('span');
    replyText.className = 'small';
    replyText.append('Ответ для ');

    const replyAuthor = document.createElement('strong');
    replyAuthor.dataset.replyAuthor = '';
    replyText.appendChild(replyAuthor);

    const cancelReplyBtn = document.createElement('button');
    cancelReplyBtn.type = 'button';
    cancelReplyBtn.className = 'btn btn-body btn-sm text-decoration-none p-0';
    cancelReplyBtn.dataset.commentReplyCancel = '';
    cancelReplyBtn.textContent = 'Отмена';

    replyMeta.appendChild(replyText);
    replyMeta.appendChild(cancelReplyBtn);
    form.insertBefore(replyMeta, textInput);

    if (emojiToggleButton && emojiPicker) {
      ensureEmojiPickerRubyTheme();

      emojiToggleButton.addEventListener('click', () => {
        setEmojiPickerOpen(!isEmojiPickerOpen);
        ensureEmojiPickerRubyTheme();
      });

      emojiPicker.addEventListener('emoji-click', (event) => {
        const unicode = event?.detail?.unicode;
        if (typeof unicode !== 'string' || unicode.length === 0) {
          return;
        }
        insertTextAtCursor(textInput, unicode);
      });

      document.addEventListener('click', (event) => {
        if (!isEmojiPickerOpen) {
          return;
        }
        const target = event.target;
        if (
          target &&
          (target === emojiToggleButton ||
            emojiToggleButton.contains(target) ||
            target === emojiPicker ||
            emojiPicker.contains(target))
        ) {
          return;
        }
        setEmojiPickerOpen(false);
      });
    }
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

    const likeBtn = document.createElement('button');
    likeBtn.type = 'button';
    likeBtn.className =
      'btn btn-sm btn-link text-danger bg-danger bg-opacity-10 p-1 rounded text-decoration-none p-0';
    likeBtn.dataset.commentLike = '';
    likeBtn.dataset.liked = Boolean(comment.liked_by_me) ? '1' : '0';
    if (!canCompose) {
      likeBtn.disabled = true;
      likeBtn.title = 'Войдите в аккаунт, чтобы поставить лайк';
    }
    const initialLikesCount = Number(comment.likes_count);
    const safeInitialLikesCount =
      Number.isInteger(initialLikesCount) && initialLikesCount >= 0 ? initialLikesCount : 0;
    const likedInitially = Boolean(comment.liked_by_me);
    const showFilledInitially = likedInitially || safeInitialLikesCount > 0;
    const initialIconClass = showFilledInitially ? 'bi bi-heart-fill me-1' : 'bi bi-heart me-1';
    const likeIcon = document.createElement('i');
    likeIcon.className = initialIconClass;
    likeIcon.dataset.commentLikeIcon = '';
    const likeCount = document.createElement('span');
    likeCount.dataset.commentLikeCount = '';
    likeCount.textContent = String(safeInitialLikesCount);
    likeBtn.appendChild(likeIcon);
    likeBtn.appendChild(likeCount);
    actions.appendChild(likeBtn);

    if (canCompose) {
      const replyBtn = document.createElement('button');
      replyBtn.type = 'button';
      replyBtn.className =
        'btn btn-sm btn-link text-body bg-danger bg-opacity-10 p-1 rounded text-decoration-none p-0';
      replyBtn.dataset.commentReply = '';
      replyBtn.textContent = 'Ответить';
      actions.appendChild(replyBtn);
    }

    if (Boolean(comment.can_delete)) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className =
        'btn btn-sm btn-link text-danger bg-danger bg-opacity-10 p-1 rounded text-decoration-none p-0';
      delBtn.dataset.commentDelete = '';
      delBtn.textContent = 'Удалить';
      actions.appendChild(delBtn);
    }

    metaDiv.appendChild(left);

    let replyTo = null;
    if (isReply && comment.reply_to_username) {
      replyTo = document.createElement('div');
      replyTo.className = 'small text-muted';
      replyTo.textContent = `Ответ @${comment.reply_to_username}`;
    }

    const textP = document.createElement('p');
    textP.className = 'public-comment-text';
    textP.textContent = comment.text || '';

    item.appendChild(metaDiv);
    if (replyTo) {
      item.appendChild(replyTo);
    }
    item.appendChild(textP);
    if (actions.childElementCount > 0) {
      item.appendChild(actions);
    }
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

  const renderCommentThread = (
    comment,
    appendToBottom = true,
    shouldPulse = false,
    container = list
  ) => {
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
        parent_id: Number.isInteger(Number(reply.parent_id))
          ? Number(reply.parent_id)
          : Number(comment.id),
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
      if (replyParentId === id || replyTargetCommentId === id) {
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
      if (
        (replyParentId !== null && nestedIds.includes(replyParentId)) ||
        (replyTargetCommentId !== null && nestedIds.includes(replyTargetCommentId))
      ) {
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
        requestBody.reply_to_comment_id = Number.isInteger(replyTargetCommentId)
          ? replyTargetCommentId
          : replyParentId;
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
    pendingLocalDeleteIds.add(Number(commentId));
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
      pendingLocalDeleteIds.delete(Number(commentId));
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }

    removeCommentById(commentId);
    pendingLocalDeleteIds.delete(Number(commentId));
  };

  const toggleCommentLike = async (commentId, isLikedNow) => {
    const method = isLikedNow ? 'DELETE' : 'POST';
    const response = await fetch(
      `/api/playlists/public/${encodeURIComponent(username)}/comments/${commentId}/like/`,
      {
        method,
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
    updateCommentLikeState(commentId, {
      likesCount: payload.likes_count,
      likedByMe: payload.liked_by_me,
    });
  };

  list.addEventListener('click', async (event) => {
    const target = event.target;
    if (!target) {
      return;
    }
    const likeButton = target.closest?.('[data-comment-like]');
    if (likeButton) {
      const item = likeButton.closest('[data-comment-id]');
      if (!item) {
        return;
      }
      const commentId = Number(item.getAttribute('data-comment-id'));
      if (!Number.isInteger(commentId)) {
        return;
      }

      if (!supportsHoverPopover && mobileLongPressTriggered) {
        mobileLongPressTriggered = false;
        return;
      }

      const isLikedNow = likeButton.dataset.liked === '1';
      try {
        await toggleCommentLike(commentId, isLikedNow);
      } catch (error) {
        console.error('Toggle comment like failed:', error);
      }
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
      const parentIdRaw = item.getAttribute('data-parent-id');
      const parentId = parentIdRaw === null ? null : Number(parentIdRaw);
      const threadRootId = Number.isInteger(parentId) ? parentId : commentId;
      const authorNode = item.querySelector('.public-comment-author');
      setReplyTarget(threadRootId, commentId, authorNode ? authorNode.textContent : '');
    }
  });

  if (!supportsHoverPopover) {
    list.addEventListener('touchstart', (event) => {
      const target = event.target;
      if (!target) {
        return;
      }
      const likeButton = target.closest?.('[data-comment-like]');
      if (!likeButton || !list.contains(likeButton)) {
        return;
      }
      const item = likeButton.closest('[data-comment-id]');
      if (!item) {
        return;
      }
      const commentId = Number(item.getAttribute('data-comment-id'));
      if (!Number.isInteger(commentId)) {
        return;
      }
      const likeCountNode = likeButton.querySelector('[data-comment-like-count]');
      const likesCount = Number.parseInt(likeCountNode?.textContent || '0', 10) || 0;
      if (likesCount <= 0) {
        return;
      }

      if (mobileLikeLongPressTimer) {
        window.clearTimeout(mobileLikeLongPressTimer);
      }
      mobileLongPressTriggered = false;
      mobileLikeLongPressTimer = window.setTimeout(async () => {
        mobileLongPressTriggered = true;
        await showLikersModal(commentId);
      }, MOBILE_LIKERS_LONG_PRESS_MS);
    });

    const clearMobileLongPress = () => {
      if (mobileLikeLongPressTimer) {
        window.clearTimeout(mobileLikeLongPressTimer);
        mobileLikeLongPressTimer = null;
      }
    };

    list.addEventListener('touchend', clearMobileLongPress);
    list.addEventListener('touchcancel', clearMobileLongPress);
    list.addEventListener('touchmove', clearMobileLongPress);
  }

  if (supportsHoverPopover) {
    list.addEventListener('mouseover', (event) => {
      const target = event.target;
      if (!target) {
        return;
      }
      const likeButton = target.closest?.('[data-comment-like]');
      if (!likeButton || !list.contains(likeButton)) {
        return;
      }
      const item = likeButton.closest('[data-comment-id]');
      if (!item) {
        return;
      }
      const commentId = Number(item.getAttribute('data-comment-id'));
      if (!Number.isInteger(commentId)) {
        return;
      }
      showCommentLikersPopover(likeButton, commentId);
    });

    list.addEventListener('mouseout', (event) => {
      const target = event.target;
      if (!target) {
        return;
      }
      const likeButton = target.closest?.('[data-comment-like]');
      if (!likeButton || !list.contains(likeButton)) {
        return;
      }
      const next = event.relatedTarget;
      if (likersPopover && next && likersPopover.contains(next)) {
        return;
      }
      hideLikersTimer = window.setTimeout(() => {
        activeLikersCommentId = null;
        if (likersPopover) {
          likersPopover.classList.add('d-none');
        }
      }, 120);
    });
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!target) {
      return;
    }

    if (supportsHoverPopover && target.hasAttribute('data-comment-likers-open-modal')) {
      const popover = ensureLikersPopover();
      const commentId = Number(popover.dataset.commentId);
      if (Number.isInteger(commentId)) {
        showLikersModal(commentId);
      }
      return;
    }

    if (
      target.hasAttribute('data-comment-likers-modal-close') ||
      target.closest?.('[data-comment-likers-modal-close]')
    ) {
      hideLikersModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideLikersModal();
      if (isEmojiPickerOpen) {
        setEmojiPickerOpen(false);
      }
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
          const deletedCommentId = Number(payload.comment_id);
          if (pendingLocalDeleteIds.has(deletedCommentId)) {
            pendingLocalDeleteIds.delete(deletedCommentId);
            return;
          }

          const deletedIds = Array.isArray(payload.deleted_ids)
            ? payload.deleted_ids
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value))
            : [];
          if (deletedIds.length > 0) {
            deletedIds.forEach((deletedId) => {
              knownIds.delete(deletedId);
            });
          }
          removeCommentById(payload.comment_id);
        } else if (payload.type === 'playlist_comment_like_changed') {
          updateCommentLikeState(payload.comment_id, { likesCount: payload.likes_count });
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
