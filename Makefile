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

# Остановить и удалить контейнеры
down:
	docker compose down