# ---- база ----
FROM python:3.11-slim

# ---- системные пакеты ----
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# ---- рабочая папка ----
WORKDIR /app

# ---- зависимости ----
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- код ----
COPY . .

# ---- коллекция статики ----
RUN python manage.py collectstatic --noinput

# ---- порт ----
EXPOSE 8000

# ---- старт ----
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "music_project.wsgi:application"]