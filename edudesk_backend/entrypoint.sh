#!/bin/sh
set -e
python manage.py migrate --noinput
python manage.py load_reference_data 2>/dev/null || true
exec "$@"
