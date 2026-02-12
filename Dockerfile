FROM python:3.12-slim

RUN apt-get update && apt-get install -y gcc build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV USE_DOCKER=true

EXPOSE 8000

CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py compress && uvicorn music_project.asgi:application --host 0.0.0.0 --port 8000 --workers 1"]
