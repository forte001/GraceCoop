#!/bin/bash

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Creating admin user..."
python manage.py create_admin

echo "Starting Gunicorn..."
exec gunicorn grace_coop.wsgi:application --bind 0.0.0.0:$PORT --log-file -
