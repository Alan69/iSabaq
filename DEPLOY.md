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
# Отредактировать .env: SECRET_KEY, GEMINI_API_KEY

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

- **backend** — Django + Gunicorn (порт 8000, внутренний)
- **frontend** — Vite build + Nginx (порт 80, проксирует /api на backend)

## Обновление

```bash
git pull
docker compose up -d --build
```

## Бэкап

```bash
# База и медиа
docker compose exec backend tar czf - /app/data /app/media > backup.tar.gz
```
