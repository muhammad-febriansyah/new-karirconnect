#!/bin/sh
# Move data from the current (non-Docker) server into the Docker stack.
#
#   1. On the old server:
#        mysqldump --single-transaction --routines --triggers -u USER -p karirconnect > karirconnect.sql
#        tar -czf storage-public.tgz -C /path/to/karirconnect/storage/app public
#   2. Copy both files next to docker-compose.prod.yml on the new server.
#   3. ./docker/scripts/import-legacy.sh karirconnect.sql storage-public.tgz
#
# The stack must be up (docker compose -f docker-compose.prod.yml up -d).
set -eu

dump="${1:?usage: import-legacy.sh <dump.sql> [storage-public.tgz]}"
archive="${2:-}"
compose="docker compose -f docker-compose.prod.yml"

# Read only what is needed: a Laravel .env is not always valid shell.
DB_DATABASE=$(grep -E '^DB_DATABASE=' .env | tail -1 | cut -d= -f2- | tr -d "\"'")
: "${DB_DATABASE:?DB_DATABASE missing in .env}"

# Start from an empty database: the app container already created the new
# schema on first start, and leftover tables would clash with the migrations
# that run after the import. This only touches the MySQL container.
echo "Resetting database ${DB_DATABASE} in the mysql container ..."
$compose exec -T mysql sh -c "exec mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" -e 'DROP DATABASE IF EXISTS \`$DB_DATABASE\`; CREATE DATABASE \`$DB_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"

echo "Importing database ${DB_DATABASE} ..."
$compose exec -T mysql sh -c "exec mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \"$DB_DATABASE\"" < "$dump"

if [ -n "$archive" ]; then
    echo "Restoring uploaded files ..."
    $compose exec -T --user root app sh -c 'tar -xzf - -C /var/www/html/storage/app && chown -R www-data:www-data /var/www/html/storage/app' < "$archive"
fi

echo "Running new migrations and clearing caches ..."
$compose exec app php artisan migrate --force
$compose exec app php artisan optimize:clear
$compose restart app queue crawler scheduler

echo "Done."
