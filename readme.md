![GitHub last commit](https://img.shields.io/github/last-commit/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Repository size](https://img.shields.io/github/repo-size/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-%23e0115f)
![License](https://img.shields.io/github/license/MRGiorgiosDev8/musicPlatform_api_django?color=%23e0115f)
![Tests](https://img.shields.io/github/actions/workflow/status/MRGiorgiosDev8/musicPlatform_api_django/tests.yml?label=tests&logo=github&color=%23e0115f)
![Deploy](https://img.shields.io/github/actions/workflow/status/MRGiorgiosDev8/musicPlatform_api_django/main.yml?label=deploy&logo=github&color=%23e0115f)

---

# 🎸 RubySound.fm (Kubernetes Version)

Данная ветка проекта переведена на работу в среде Kubernetes. 

---

## 🛠 1. Подготовка (Установка инструментов)

Перед запуском убедитесь, что у вас установлены следующие инструменты:

- **Docker Desktop** — Скачать.
  - Linux (Ubuntu/Debian):
    ```bash
    sudo apt update
    sudo apt install docker.io
    sudo systemctl enable docker
    sudo systemctl start docker
    ```
- **Minikube** — Локальный Kubernetes-кластер для разработки.
  - Mac: `brew install minikube`
  - Windows: `choco install minikube`
  - Linux:
    ```bash
    curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
    sudo install minikube-linux-amd64 /usr/local/bin/minikube
    ```
  - После установки запустите кластер:
    ```bash
    minikube start
    ```
  - Проверить статус:
    ```bash
    minikube status
    ```
- **kubectl** — Утилита для управления кластером.
  - Mac: `brew install kubernetes-cli`
  - Windows: `choco install kubernetes-cli`
  - Linux:
    ```bash
    sudo apt update
    sudo apt install kubectl
    ```
- **Skaffold** — Инструмент для автоматизации разработки.
  - Mac: `brew install skaffold`
  - Windows: `choco install skaffold`
  - Linux:
    ```bash
    curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
    chmod +x skaffold
    sudo mv skaffold /usr/local/bin
    ```
  
---

## 🚀 2. Быстрый старт

### Шаг 1: Проверка контекста

Убедитесь, что вы работаете с локальным кластером:

```bash
kubectl config current-context
```

Если вы используете Minikube, контекст должен быть `minikube`.

Должно быть `docker-desktop` или `minikube`.

---

### Шаг 2: Запуск проекта

Запустите систему в режиме разработки. Skaffold сам соберет образы, применит манифесты и настроит проброс портов:

```bash
skaffold dev
```

---

### Шаг 3: Доступ к приложению

После того как в терминале появится надпись о готовности, проект будет доступен по адресу:

👉 http://127.0.0.1:8000

---

## 📋 3. Полезные команды

### Работа с подами (контейнерами)

Посмотреть состояние всех компонентов:

```bash
kubectl get all
```

Посмотреть логи конкретного пода:

```bash
kubectl logs -f <название_пода>
```

Зайти внутрь контейнера Django (например, для миграций):

```bash
kubectl exec -it deployment/django-app -- python manage.py migrate
```

---

### Масштабирование

Хотите проверить мощь K8s? Увеличьте количество копий Django прямо на лету:

```bash
kubectl scale deployment django-app --replicas=3
```

---

## 🔑 4. Секреты и конфигурация

Все настройки Kubernetes находятся в папке `/k8s`:

- `django.yml` — описание приложения и сервиса.
- `db-storage.yml` — хранилище для базы данных (чтобы данные не пропадали).
- `db-secrets.yml` — пароли и ключи (в формате base64).

> Важно: При изменении кода в Python, Skaffold автоматически обновит поды в кластере. Вам не нужно перезапускать команду.

---

## 🛑 5. Остановка

Чтобы удалить все ресурсы из кластера, просто нажмите `Ctrl+C` в окне, где запущен `skaffold dev`.

Если нужно принудительно очистить всё:

```bash
skaffold delete
```

---

## 🧩 Запуск без Skaffold (ручной режим)

Примените конфигурации и манифесты:

```bash
kubectl apply -f k8s/
```

Проверьте, что все поды поднялись:

```bash
kubectl get pods
```

---

## 🌐 Способы доступа к приложению

### Вариант А: Через Minikube 

Используйте встроенную функцию Minikube, которая сама откроет браузер на нужном IP-адресе:

```bash
minikube service django-service
```

---

### Вариант Б: Через Port Forwarding 

Если вам нужно, чтобы проект был доступен строго по адресу http://localhost:8000:

```bash
kubectl port-forward service/django-service 8000:8000
```

---

## 📜 История изменений 

### [24.02.2026] — Оркестрация и отказоустойчивость (Kubernetes)
**Добавлено:**
* **Init-контейнеры (Database Readiness):** Внедрен `initContainer` в манифест Django. Теперь приложение ожидает готовности порта PostgreSQL (5432) перед запуском основного процесса. Это решило проблему падения контейнера при холодном старте БД.
* **Liveness & Readiness Probes:** * В Django создан системный эндпоинт `/health/`.
    * Настроена **Readiness Probe**: Kubernetes не направляет трафик на под, пока Django полностью не загрузится.
    * Настроена **Liveness Probe**: Автоматический перезапуск контейнера в случае "зависания" Python-процесса.
