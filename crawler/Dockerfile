# KarirConnect crawler worker.
#
# Two targets:
#   docker build --target api     -t karir-crawler:api .      # API, sitemap, HTML (no browser), ~150 MB
#   docker build --target browser -t karir-crawler:browser .  # + Chromium via Playwright, ~2 GB
#
# Laravel runs the image through bin/docker-worker (see docs/JOB_SCRAPER_SETUP.md).

# ---------------------------------------------------------------- api target
FROM python:3.12.8-slim-bookworm AS api

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY karir_crawler ./karir_crawler

RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin crawler
USER 10001:10001

ENTRYPOINT ["python"]
CMD ["-m", "karir_crawler.cli"]

# ------------------------------------------------------------ browser target
# Microsoft's image ships Chromium and its system libraries for this exact
# Playwright version, so nothing is downloaded at run time.
FROM mcr.microsoft.com/playwright/python:v1.52.0-noble AS browser

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app
COPY requirements.txt requirements-browser.txt ./
RUN pip install -r requirements-browser.txt

COPY karir_crawler ./karir_crawler

RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin crawler
USER 10001:10001

ENTRYPOINT ["python"]
CMD ["-m", "karir_crawler.cli"]
