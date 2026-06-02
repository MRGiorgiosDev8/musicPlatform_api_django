# Папка для локальных бэкапов PostgreSQL
BACKUP_DIR ?= backups

# Имя базы и пользователя внутри Docker Compose
DB_SERVICE ?= postgres
DB_NAME ?= music_platform
DB_USER ?= postgres

# Файл бэкапа по умолчанию с timestamp
BACKUP_FILE ?= $(BACKUP_DIR)/music_platform_$(shell date +%Y%m%d-%H%M%S).dump

# Запустить все тесты в Docker
# Теперь pytest сам возьмет настройки из pytest.ini
test:
	docker compose exec web pytest

# Запустить все тесты локально (macOS)
# Подставляем текущего пользователя Mac как владельца БД
test-local:
	DJANGO_SETTINGS_MODULE=music_project.settings.test \
	DATABASE_URL=postgres://$(shell whoami):@localhost:5432/music_platform \
	pytest

# Запустить тесты с отчетом о покрытии (coverage)
test-cov:
	docker compose exec web pytest --cov=music_api --cov=users --cov-report=term-missing

# Создать миграции
migrations:
	docker compose exec web python manage.py makemigrations

# Применить миграции
migrate:
	docker compose exec web python manage.py migrate

# Создать суперпользователя
admin:
	docker compose exec web python manage.py createsuperuser

# Создать backup PostgreSQL в формате custom dump
db-backup:
	mkdir -p $(BACKUP_DIR)
	docker compose exec -T $(DB_SERVICE) pg_dump -U $(DB_USER) -d $(DB_NAME) -Fc --no-owner --no-privileges > $(BACKUP_FILE)
	@echo "Backup saved to $(BACKUP_FILE)"

# Восстановить backup PostgreSQL
# Использование: make db-restore FILE=backups/music_platform_YYYYMMDD-HHMMSS.dump
db-restore:
	@test -n "$(FILE)" || (echo "Usage: make db-restore FILE=backups/your_backup.dump" && exit 1)
	@test -f "$(FILE)" || (echo "Backup file not found: $(FILE)" && exit 1)
	docker compose exec -T $(DB_SERVICE) pg_restore -U $(DB_USER) -d $(DB_NAME) --clean --if-exists --no-owner --no-privileges < "$(FILE)"
	@echo "Restored from $(FILE)"

# Запустить нагрузочное тестирование k6 на локальном стеке
k6-load:
	docker compose -f docker-compose.yml -f docker-compose.k6.yml run --rm k6

# Остановить и удалить контейнеры
down:
	docker compose down
