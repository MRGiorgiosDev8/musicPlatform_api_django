/* @vitest-environment jsdom */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createCommentDOM = () => {
  document.body.innerHTML = `
    <div data-public-comments-root data-public-username="test user">
      <span id="public-comments-count">0</span>
      <form id="public-comment-form">
        <textarea id="public-comment-text" placeholder="Напишите комментарий..."></textarea>
        <button type="submit" id="public-comment-submit">Отправить</button>
      </form>
      <div id="public-comments-empty">Комментариев пока нет.</div>
      <div id="public-comments-list" aria-live="polite"></div>
    </div>
  `;
};

const createSocketMock = () => {
  const sockets = [];
  const WebSocketMock = vi.fn(function MockWebSocket(url) {
    const listeners = {};
    const socket = {
      url,
      addEventListener: vi.fn((event, handler) => {
        listeners[event] = handler;
      }),
      close: vi.fn(),
      emit(event, payload) {
        if (listeners[event]) {
          listeners[event](payload);
        }
      },
    };
    sockets.push(socket);
    return socket;
  });
  global.WebSocket = WebSocketMock;
  return sockets;
};

let isCommentsModuleLoaded = false;

const initCommentsModule = async () => {
  if (!isCommentsModuleLoaded) {
    await import('../../static/js/features/public_playlist_comments.js');
    isCommentsModuleLoaded = true;
  }
  document.dispatchEvent(new globalThis.Event('DOMContentLoaded'));
  await flushPromises();
};

describe('public-playlist-comments P1', () => {
  beforeAll(async () => {
    await import('../../static/js/features/public_playlist_comments.js');
    isCommentsModuleLoaded = true;
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();

    globalThis.window.PublicCommentsAnimation = {
      pulseNewComment: vi.fn(),
      collapseDeleteComment: vi.fn((node, done) => done()),
      flipCommentsCount: vi.fn((node, count) => {
        node.textContent = String(count);
      }),
    };

    globalThis.window.buildAuthHeaders = vi.fn(() => ({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test',
    }));
  });

  it('initializes and loads comments when root exists', async () => {
    createCommentDOM();
    const sockets = createSocketMock();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [] }),
    });

    await initCommentsModule();
    await vi.waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/playlists/public/test%20user/comments/',
      expect.objectContaining({ method: 'GET' })
    );
    expect(sockets[0].url).toContain('/ws/comments/public/test%20user/');
  });

  it('does nothing when root is missing', async () => {
    createSocketMock();
    global.fetch = vi.fn();

    await initCommentsModule();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(global.WebSocket).not.toHaveBeenCalled();
  });

  it('renders loaded comments and toggles empty state', async () => {
    createCommentDOM();
    createSocketMock();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: [
          {
            id: 1,
            text: 'Loaded comment',
            author_username: 'alice',
            author_profile_url: '/profile/alice/',
            created_at_display: 'now',
            likes_count: 3,
            liked_by_me: true,
            can_delete: true,
          },
        ],
      }),
    });

    await initCommentsModule();

    const list = document.getElementById('public-comments-list');
    const item = list.querySelector('[data-comment-id="1"]');
    expect(item).toBeTruthy();
    expect(item.querySelector('.public-comment-text').textContent).toBe('Loaded comment');
    expect(item.querySelector('[data-comment-reply]')).toBeTruthy();
    expect(item.querySelector('[data-comment-delete]')).toBeTruthy();
    expect(item.querySelector('[data-comment-like-count]').textContent).toBe('3');
    expect(item.querySelector('[data-comment-like]').dataset.liked).toBe('1');
    expect(document.getElementById('public-comments-empty').classList.contains('d-none')).toBe(
      true
    );
    expect(document.getElementById('public-comments-count').textContent).toBe('1');
  });

  it('submits a new comment via POST and appends it', async () => {
    createCommentDOM();
    createSocketMock();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 10,
          text: 'New comment',
          author_username: 'test user',
          author_profile_url: '/profile/test/',
          created_at_display: 'just now',
          can_delete: true,
        }),
      });

    await initCommentsModule();

    const form = document.getElementById('public-comment-form');
    const textInput = document.getElementById('public-comment-text');
    textInput.value = 'New comment';
    form.dispatchEvent(new globalThis.Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/playlists/public/test%20user/comments/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'New comment' }),
      })
    );
    expect(document.querySelector('[data-comment-id="10"]')).toBeTruthy();
    expect(textInput.value).toBe('');
  });

  it('sets reply target and sends parent_id in POST body', async () => {
    createCommentDOM();
    createSocketMock();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            {
              id: 1,
              text: 'Parent',
              author_username: 'alice',
              author_profile_url: '/profile/alice/',
              created_at_display: 'now',
              can_delete: false,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 2,
          parent_id: 1,
          text: 'Reply',
          author_username: 'test user',
          author_profile_url: '/profile/test/',
          created_at_display: 'just now',
          reply_to_username: 'alice',
          can_delete: true,
        }),
      });

    await initCommentsModule();

    document.querySelector('[data-comment-reply]').click();
    const textInput = document.getElementById('public-comment-text');
    expect(textInput.placeholder).toContain('alice');

    textInput.value = 'Reply';
    document
      .getElementById('public-comment-form')
      .dispatchEvent(new globalThis.Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/playlists/public/test%20user/comments/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'Reply', parent_id: 1, reply_to_comment_id: 1 }),
      })
    );
  });

  it('replies to nested comment without adding a new depth level', async () => {
    createCommentDOM();
    createSocketMock();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            {
              id: 1,
              text: 'Root',
              author_username: 'alice',
              author_profile_url: '/profile/alice/',
              created_at_display: 'now',
              can_delete: false,
              replies: [
                {
                  id: 2,
                  parent_id: 1,
                  text: 'First reply',
                  author_username: 'bob',
                  author_profile_url: '/profile/bob/',
                  created_at_display: 'now',
                  reply_to_username: 'alice',
                  can_delete: false,
                },
              ],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 3,
          parent_id: 1,
          text: 'Directed reply',
          author_username: 'test user',
          author_profile_url: '/profile/test/',
          created_at_display: 'just now',
          reply_to_username: 'bob',
          can_delete: true,
        }),
      });

    await initCommentsModule();

    const replyButtons = document.querySelectorAll('[data-comment-reply]');
    expect(replyButtons.length).toBeGreaterThan(1);
    replyButtons[1].click();

    const textInput = document.getElementById('public-comment-text');
    expect(textInput.placeholder).toContain('bob');

    textInput.value = 'Directed reply';
    document
      .getElementById('public-comment-form')
      .dispatchEvent(new globalThis.Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/playlists/public/test%20user/comments/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'Directed reply',
          parent_id: 1,
          reply_to_comment_id: 2,
        }),
      })
    );
    expect(document.querySelector('[data-comment-id="3"] .small.text-muted')?.textContent).toContain(
      'Ответ @bob'
    );
  });

  it('deletes comment by button click', async () => {
    createCommentDOM();
    createSocketMock();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            {
              id: 1,
              text: 'To delete',
              author_username: 'alice',
              author_profile_url: '/profile/alice/',
              created_at_display: 'now',
              can_delete: true,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true });

    await initCommentsModule();

    document.querySelector('[data-comment-delete]').click();
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/playlists/public/test%20user/comments/1/',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(document.querySelector('[data-comment-id="1"]')).toBeNull();
  });

  it('toggles comment like by button click', async () => {
    createCommentDOM();
    createSocketMock();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            {
              id: 1,
              text: 'Like me',
              author_username: 'alice',
              author_profile_url: '/profile/alice/',
              created_at_display: 'now',
              likes_count: 1,
              liked_by_me: false,
              can_delete: false,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          comment_id: 1,
          likes_count: 2,
          liked_by_me: true,
        }),
      });

    await initCommentsModule();

    const likeButton = document.querySelector('[data-comment-like]');
    likeButton.click();
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/playlists/public/test%20user/comments/1/like/',
      expect.objectContaining({ method: 'POST' })
    );
    expect(document.querySelector('[data-comment-like-count]').textContent).toBe('2');
    expect(likeButton.dataset.liked).toBe('1');
  });

  it('shows hover popup with users who liked comment', async () => {
    createCommentDOM();
    createSocketMock();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            {
              id: 9,
              text: 'Hover me',
              author_username: 'alice',
              author_profile_url: '/profile/alice/',
              created_at_display: 'now',
              likes_count: 2,
              liked_by_me: false,
              can_delete: false,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          comment_id: 9,
          results: [
            {
              user_id: 10,
              username: 'john',
              profile_url: '/profile/john/',
              avatar_url: null,
            },
          ],
          meta: { count: 1 },
        }),
      });

    await initCommentsModule();

    const likeButton = document.querySelector('[data-comment-id="9"] [data-comment-like]');
    likeButton.dispatchEvent(new globalThis.MouseEvent('mouseover', { bubbles: true }));
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/playlists/public/test%20user/comments/9/likes/',
      expect.objectContaining({ method: 'GET' })
    );
    const popover = document.querySelector('.public-comment-likers-popover');
    expect(popover).toBeTruthy();
    expect(popover.classList.contains('d-none')).toBe(false);
    await vi.waitFor(() => {
      expect(popover.textContent).toContain('john');
    });

    const openModalBtn = popover.querySelector('[data-comment-likers-open-modal]');
    openModalBtn.click();
    await flushPromises();

    const modal = document.querySelector('.public-comment-likers-modal');
    expect(modal).toBeTruthy();
    expect(modal.classList.contains('d-none')).toBe(false);
    expect(modal.textContent).toContain('john');
  });

  it('handles websocket create and delete messages', async () => {
    createCommentDOM();
    const sockets = createSocketMock();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [] }),
    });

    await initCommentsModule();
    await vi.waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });

    sockets[0].emit('message', {
      data: JSON.stringify({
        type: 'playlist_comment_created',
        comment: {
          id: 3,
          text: 'WS comment',
          author_username: 'ws-user',
          author_profile_url: '/profile/ws/',
          created_at_display: 'now',
          can_delete: false,
        },
      }),
    });

    expect(document.querySelector('[data-comment-id="3"]')).toBeTruthy();
    expect(globalThis.window.PublicCommentsAnimation.pulseNewComment).toHaveBeenCalled();

    sockets[0].emit('message', {
      data: JSON.stringify({
        type: 'playlist_comment_deleted',
        comment_id: 3,
        deleted_ids: [3],
      }),
    });

    expect(document.querySelector('[data-comment-id="3"]')).toBeNull();

    sockets[0].emit('message', {
      data: JSON.stringify({
        type: 'playlist_comment_created',
        comment: {
          id: 4,
          text: 'Like target',
          author_username: 'ws-user',
          author_profile_url: '/profile/ws/',
          created_at_display: 'now',
          likes_count: 0,
          liked_by_me: false,
          can_delete: false,
        },
      }),
    });
    sockets[0].emit('message', {
      data: JSON.stringify({
        type: 'playlist_comment_like_changed',
        comment_id: 4,
        likes_count: 7,
      }),
    });
    expect(
      document.querySelector('[data-comment-id="4"] [data-comment-like-count]').textContent
    ).toBe('7');
  });

  it('shows filled like icon for guest when likes exist', async () => {
    document.body.innerHTML = `
      <div data-public-comments-root data-public-username="test user">
        <span id="public-comments-count">0</span>
        <div id="public-comments-empty">Комментариев пока нет.</div>
        <div id="public-comments-list" aria-live="polite"></div>
      </div>
    `;
    const sockets = createSocketMock();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: [
          {
            id: 12,
            text: 'Guest visible like',
            author_username: 'alice',
            author_profile_url: '/profile/alice/',
            created_at_display: 'now',
            likes_count: 5,
            liked_by_me: false,
            can_delete: false,
          },
        ],
      }),
    });

    await initCommentsModule();
    await vi.waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });

    const likeButton = document.querySelector('[data-comment-id="12"] [data-comment-like]');
    const likeIcon = likeButton.querySelector('[data-comment-like-icon]');

    expect(likeButton.disabled).toBe(true);
    expect(likeButton.dataset.liked).toBe('0');
    expect(likeIcon.className).toContain('bi-heart-fill');

    sockets[0].emit('message', {
      data: JSON.stringify({
        type: 'playlist_comment_like_changed',
        comment_id: 12,
        likes_count: 0,
      }),
    });

    expect(likeButton.querySelector('[data-comment-like-icon]').className).toContain('bi-heart me-1');
  });

  it('ignores empty form submission', async () => {
    createCommentDOM();
    createSocketMock();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ results: [] }),
    });

    await initCommentsModule();

    const form = document.getElementById('public-comment-form');
    const textInput = document.getElementById('public-comment-text');
    textInput.value = '   ';
    form.dispatchEvent(new globalThis.Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
