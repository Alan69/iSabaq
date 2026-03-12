# Деплой iSabaq.kz на production

## Требования

- Docker и Docker Compose
- Сервер с IP 213.155.23.170 (DNS уже настроен: isabaq.kz, www.isabaq.kz → этот IP)

## Быстрый старт

```bash
# 1. Клонировать репозиторий на сервер
git clone <repo-url> /opt/edudesk
cd /opt/edudesk

# 2. Создать .env
cp .env.example .env
# Отредактировать .env: SECRET_KEY, GEMINI_API_KEY, POSTGRES_PASSWORD

# 3. Запустить
docker compose up -d --build

# 4. Создать суперпользователя
docker compose exec backend python manage.py createsuperuser
```

Сайт будет доступен на http://isabaq.kz (порт 80).

## HTTPS (Let's Encrypt)

Для SSL используйте certbot:

```bash
# Установить certbot (Ubuntu/Debian)
sudo apt install certbot

# Получить сертификат (временно остановить docker на 80 или использовать standalone)
sudo docker compose stop frontend
sudo certbot certonly --standalone -d isabaq.kz -d www.isabaq.kz

# Использовать host nginx для SSL:
# 1. В docker-compose.yml изменить ports frontend: "8080:80"
# 2. Скопировать deploy/nginx-isabaq.conf в /etc/nginx/sites-available/
# 3. Раскомментировать HTTPS блок в конфиге
# 4. sudo nginx -t && sudo systemctl reload nginx
# 5. docker compose up -d
```

## Структура

- **db** — PostgreSQL 16 (порт 5432, внутренний)
- **backend** — Django + Gunicorn + WhiteNoise (порт 8000, внутренний)
- **frontend** — Vite build + Nginx (порт 80, проксирует /api на backend)

## Обновление

```bash
git pull
docker compose up -d --build
```

## Бэкап

```bash
# PostgreSQL
docker compose exec db pg_dump -U edudesk edudesk > backup.sql

# Медиа
docker compose exec backend tar czf - /app/media > media_backup.tar.gz
```
