FROM python:3.12-slim

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput
RUN python manage.py compress


EXPOSE 8000

CMD ["uvicorn", "music_project.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]