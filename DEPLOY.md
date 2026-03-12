# Деплой iSabaq.kz на production

## Требования

- Docker и Docker Compose
- Сервер с IP 213.155.23.170 (DNS уже настроен: isabaq.kz, www.isabaq.kz → этот IP)

## Установка на сервере

### 1. Установить Docker и Docker Compose (Ubuntu/Debian)

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Выйти и зайти в сессию, чтобы группа применилась

# Docker Compose (если не входит в Docker)
sudo apt update && sudo apt install -y docker-compose-plugin
```

### 2. Скачать проект

```bash
sudo mkdir -p /opt/edudesk
sudo chown $USER:$USER /opt/edudesk
cd /opt/edudesk

git clone https://github.com/Alan69/iSabaq.git .
```

### 3. Настроить .env

```bash
cp .env.example .env
nano .env   # или vim
```

Заполнить:
- `SECRET_KEY` — случайная строка (минимум 50 символов)
- `GEMINI_API_KEY` — ключ API Gemini
- `POSTGRES_PASSWORD` — надёжный пароль для БД

### 4. Запустить

```bash
docker compose up -d --build
```

### 5. Создать админа

```bash
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
