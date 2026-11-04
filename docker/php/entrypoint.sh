#!/bin/sh
# Container start-up for every PHP service (app, queue, crawler, scheduler).
set -e

cd /var/www/html

# Storage is a shared volume: make sure the folders Laravel expects exist.
mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs

if [ "${CONTAINER_ROLE:-app}" = "app" ]; then
    if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
        php artisan migrate --force --no-interaction
    fi
    php artisan storage:link --force >/dev/null 2>&1 || true
fi

# Cache config/routes/views/events for this release (each container builds its own).
php artisan optimize --no-interaction >/dev/null

exec "$@"
