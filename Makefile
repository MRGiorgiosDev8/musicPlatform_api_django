# Запустить все тесты в Docker
test:
	docker compose exec web pytest -v

# Запустить все тесты локально (macOS)
test-local:
	DJANGO_SETTINGS_MODULE=music_project.settings.test \
	DATABASE_URL=postgres://$(shell whoami):@localhost:5432/music_platform \
	pytest -v

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