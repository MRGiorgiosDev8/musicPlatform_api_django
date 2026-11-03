# ---------- Frontend build (Node) ----------
FROM node:22-alpine AS frontend
WORKDIR /frontend

COPY package.json package-lock.json ./
RUN npm ci
COPY static/js ./static/js
COPY vite.config.ts ./
RUN npm run build:frontend

# ---------- Runtime (Python/Django) ----------
FROM python:3.12-slim

RUN apt-get update && apt-get install -y gcc build-essential postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Собранный Vite-бандл из Node-стадии: кладем в static/frontend,
# чтобы `collectstatic` (см. CMD ниже) забрал его в staticfiles.
COPY --from=frontend /frontend/static/frontend ./static/frontend

ENV USE_DOCKER=true

EXPOSE 8000

CMD ["sh", "-c", "mkdir -p /tmp/media && python manage.py migrate --noinput && python manage.py collectstatic --noinput && (python manage.py createsuperuser --noinput || true) && uvicorn music_project.asgi:application --host 0.0.0.0 --port 8000 --workers 1"]