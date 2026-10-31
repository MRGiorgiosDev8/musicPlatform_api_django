# AGENTS.md

Music streaming aggregator (RubySound.fm): Django 5.1 + DRF, **ASGI-first**. Frontend is Django
templates + vanilla JS — there is **no JS build step**.

## Language

- Always respond to the user in Russian.
- Keep code, identifiers, file paths, commands, and technical terms unchanged.
- Write code comments in Russian.
- Write Git commit messages in Russian.

## Commands

- Dev server: `uvicorn music_project.asgi:application --reload`. Do NOT use `manage.py runserver`
  — the app is async (httpx.AsyncClient, asyncio.gather) and runserver is sync.
- Backend tests: `make test-local` (repo root) or `pytest` with
  `DJANGO_SETTINGS_MODULE=music_project.settings.test` (set by pytest.ini anyway). Requires local
  Postgres. One test: `pytest tests/test_public_api.py -k name`. In Docker: `make test`.
- Frontend tests: `npm run test:js` (Vitest, jsdom). Deps via `npm ci`.
- Lint gate (CI order): `black --check .` → `flake8 .` → `npm run lint:js`.
  JS formatting: `npm run format` / `npm run format:check`.
- Docker: `docker compose up -d --build`, then
  `docker compose exec web python manage.py migrate`. Make targets: `migrate`, `migrations`,
  `admin`, `db-backup`, `db-restore FILE=...`, `k6-load`, `down`.

## Settings & environment

- `.env` (python-decouple) is required — copy `.env.example`. Non-optional: `SECRET_KEY`,
  `LASTFM_KEY`, `DATABASE_URL`. `music_api/views/base.py` reads `THEAUDIO_DB_API_KEY`
  (code default `"123"`).
- Settings are split into `music_project/settings/{base,dev,prod,test}.py`. `manage.py` and
  `asgi.py` select `prod` when `USE_DOCKER=true`, else `dev`. Tests always use `test`.
  There is no `settings.py` — always pass a module.
- Under Docker, PostgreSQL/Redis hostnames are `postgres`/`redis`; locally `localhost`.
  Docker: Redis-backed cache + Channels. Non-Docker: locmem cache, in-memory Channels.

## Tests

- pytest.ini adds `--no-migrations --create-db`, `asyncio_mode=auto`.
- Tests **require PostgreSQL**; `settings/test.py` raises `RuntimeError` otherwise — no SQLite
  fallback. Local runs need `brew services start postgresql redis`.
- `tests/conftest.py` provides `async_api_client` (httpx ASGITransport against the ASGI app) and
  `authorized_async_api_client` (JWT via SimpleJWT); external APIs are mocked with respx; cache is
  cleared between tests by autouse fixtures.

## Architecture

- `music_project/` — settings, root `urls.py`, `asgi.py`/`wsgi.py`, PWA views, WebSocket
  `routing.py`.
- `music_api/` — core app: models/admin, `authentication.py` (`AsyncJWTAuthentication` for ASGI),
  `exception_handler.py` (custom DRF error format), `consumers.py`, `api_urls.py` + `urls.py`.
  Views are split per-feature in `music_api/views/` (`*_async.py` files) and re-exported from
  `views/__init__.py`.
- **External integrations** (Last.fm, TheAudioDB, iTunes/Deezer, Apple Music, Wikipedia) live in
  `music_api/views/services_async.py` — NOT in `music_api/services/` (that has only
  `services/db_backup.py`). The batch fetchers there use httpx.AsyncClient + asyncio.Semaphore +
  Django cache.
- `users/` — custom `User` (`AUTH_USER_MODEL="users.User"`), SimpleJWT auth, presence and
  notification consumers.
- DRF defaults to `IsAuthenticated`; public endpoints must set `AllowAny` explicitly.
  Throttles: anon 100/hr, user 1000/hr.
- JS modules: `static/js/{features,UI,animation}/`, shared utils in
  `static/js/utils/utils.js`. ESLint treats `static/js` as browser scripts (globals like
  `bootstrap`/`gsap` declared in `eslint.config.js`, `no-undef` = error) and `tests/js` as ESM.
  `static/vendor/` is excluded from linting.

## Conventions & gotchas

- Code comments, templates, and UI strings are in Russian (`ru-ru`, `Europe/Moscow`). Match it.
- Render prod uses ephemeral storage — media lives in `/tmp/media` (`prod.py` `SERVE_MEDIA`).
  `backups/` is gitignored.
- `deploy.yml` hardcodes `SECRET_KEY` / `LASTFM_KEY` — do not add more secrets to it.
- CI (`.github/workflows/main.yml`): lint → frontend-test + backend-test (Postgres + Redis
  services) → Docker build/push → Render deploy hook, on `main` only.