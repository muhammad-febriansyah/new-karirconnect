# syntax=docker/dockerfile:1.7
#
# KarirConnect production image. Targets:
#   app      php-fpm (also used by the queue and scheduler services)
#   crawler  app + Python 3.12 + Playwright Chromium for the job scraper
#   web      Caddy with the built public/ directory
#
# Built and run by docker-compose.prod.yml; see docs/DEPLOY_DOCKER.md.

ARG PHP_VERSION=8.4

# ------------------------------------------------------------------ base
FROM ubuntu:24.04 AS base
ARG PHP_VERSION
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Jakarta \
    LANG=C.UTF-8

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg software-properties-common tzdata unzip \
 && add-apt-repository -y ppa:ondrej/php \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      php${PHP_VERSION}-fpm php${PHP_VERSION}-cli php${PHP_VERSION}-mysql php${PHP_VERSION}-sqlite3 \
      php${PHP_VERSION}-mbstring php${PHP_VERSION}-xml php${PHP_VERSION}-curl php${PHP_VERSION}-zip \
      php${PHP_VERSION}-gd php${PHP_VERSION}-intl php${PHP_VERSION}-bcmath php${PHP_VERSION}-redis \
      php${PHP_VERSION}-opcache php${PHP_VERSION}-readline \
 && apt-get purge -y software-properties-common && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* \
 && ln -sf /usr/sbin/php-fpm${PHP_VERSION} /usr/local/sbin/php-fpm

COPY docker/php/php.ini /etc/php/${PHP_VERSION}/fpm/conf.d/99-karirconnect.ini
COPY docker/php/php.ini /etc/php/${PHP_VERSION}/cli/conf.d/99-karirconnect.ini
COPY docker/php/www.conf /etc/php/${PHP_VERSION}/fpm/pool.d/www.conf
# FPM runs as www-data in the foreground: log to the container output and
# skip the pid file (both default to root-only paths).
RUN sed -i \
      -e 's|^error_log = .*|error_log = /proc/self/fd/2|' \
      -e 's|^pid = |;pid = |' \
      /etc/php/${PHP_VERSION}/fpm/php-fpm.conf \
 && grep -q '^error_log = /proc/self/fd/2' /etc/php/${PHP_VERSION}/fpm/php-fpm.conf

WORKDIR /var/www/html

# ----------------------------------------------------------------- build
FROM base AS build

COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer
COPY --from=node:22.12.0-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22.12.0-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --no-scripts --no-autoloader

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Wayfinder runs `php artisan` during the Vite build; it needs a key but no database.
RUN composer dump-autoload --optimize --no-dev \
 && APP_KEY=base64:$(head -c 32 /dev/urandom | base64) DB_CONNECTION=sqlite DB_DATABASE=:memory: npm run build \
 && rm -rf node_modules public/hot \
 && rm -rf tests crawler/.venv crawler/tests .git

# ------------------------------------------------------------------- app
FROM base AS app

COPY --from=build --chown=www-data:www-data /var/www/html /var/www/html
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint \
 && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache

USER www-data
EXPOSE 9000
ENTRYPOINT ["entrypoint"]
CMD ["php-fpm", "-F"]

# --------------------------------------------------------------- crawler
FROM app AS crawler
USER root
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    CRAWLER_PYTHON=/opt/crawler-venv/bin/python \
    CRAWLER_WORKER_PATH=/var/www/html/crawler

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-venv \
 && python3 -m venv /opt/crawler-venv \
 && /opt/crawler-venv/bin/pip install --no-cache-dir -r crawler/requirements-browser.txt \
 && /opt/crawler-venv/bin/playwright install --with-deps chromium \
 && rm -rf /var/lib/apt/lists/* \
 && chmod -R a+rX /ms-playwright

USER www-data
CMD ["php", "artisan", "queue:work", "crawler", "--queue=crawler", "--timeout=390", "--tries=1", "--max-time=3600"]

# ------------------------------------------------------------------- web
FROM caddy:2.8.4-alpine AS web
COPY docker/caddy/Caddyfile docker/caddy/Caddyfile.behind-proxy docker/caddy/app.caddy /etc/caddy/
COPY --from=build /var/www/html/public /var/www/html/public
