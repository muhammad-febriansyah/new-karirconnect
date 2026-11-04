# Job Scraper — Setup

## Prasyarat

- Aplikasi KarirConnect berjalan seperti biasa (PHP 8.4, MySQL, queue driver `database`).
- Python **3.12** di mesin yang menjalankan queue worker.
- Opsional: Docker, untuk menjalankan worker di container.

## 1. Worker Python (tanpa Docker)

```bash
python3.12 -m venv crawler/.venv
```

```bash
crawler/.venv/bin/pip install -r crawler/requirements.txt
```

Dependency runtime: `httpx`, `beautifulsoup4` (versi dikunci di `requirements.txt`).

**Opsional — engine browser** untuk halaman karier yang hanya tampil dengan JavaScript. Paket `playwright` diunduh dari PyPI, dan Chromium (sekitar 80 MB) dari CDN Playwright:

```bash
crawler/.venv/bin/pip install -r crawler/requirements-browser.txt
```

```bash
crawler/.venv/bin/playwright install chromium
```

Di Linux server, Chromium juga butuh library sistem:

```bash
crawler/.venv/bin/playwright install-deps chromium
```

Tanpa Playwright semua fitur lain tetap jalan; engine browser dilaporkan `unavailable`.

Cek worker:

```bash
crawler/.venv/bin/pip install -r crawler/requirements-dev.txt
```

```bash
crawler/.venv/bin/pytest crawler/tests
```

## 2. Konfigurasi Laravel

Variabel `.env` (semua punya nilai default di `config/crawler.php`):

| Variabel | Default | Keterangan |
|---|---|---|
| `CRAWLER_PYTHON` | `crawler/.venv/bin/python` | Path relatif terhadap root proyek, atau absolut |
| `CRAWLER_WORKER_PATH` | `crawler` | Direktori kerja worker |
| `CRAWLER_USER_AGENT` | `KarirConnectBot/0.1` | Sebaiknya tambahkan URL info bot, mis. `KarirConnectBot/0.1 (+https://karirconnect.id/bot)` |
| `CRAWLER_TIMEOUT` | `300` | Batas detik per run |
| `CRAWLER_MAX_ITEMS` | `2000` | Batas lowongan per run |
| `CRAWLER_QUEUE` | `crawler` | Nama antrean |
| `CRAWLER_QUEUE_RETRY_AFTER` | `600` | Harus lebih besar dari `CRAWLER_TIMEOUT` + 90 |
| `CRAWLER_CIRCUIT_THRESHOLD` | `3` | Kegagalan beruntun sebelum circuit terbuka |
| `CRAWLER_CIRCUIT_OPEN_MINUTES` | `120` | Lama circuit terbuka |
| `CRAWLER_ACCESS_RESTRICTED_COOLDOWN` | `1440` | Jeda (menit) setelah 403/CAPTCHA |
| `CRAWLER_MAX_RATE_LIMIT_COOLDOWN` | `1440` | Batas atas jeda dari Retry-After |

Jalankan migrasi:

```bash
php artisan migrate
```

Logo perusahaan disimpan di disk `public`. Pastikan link storage sudah ada:

```bash
php artisan storage:link
```

Opsional — contoh sumber: template Greenhouse/Lever dalam status nonaktif, dan Glints/JobStreet/LinkedIn/Indeed sebagai `pending_permission`:

```bash
php artisan db:seed --class=JobSourceSeeder
```

## 3. Worker antrean dan scheduler

Crawl berjalan di connection antrean khusus `crawler`. Jalankan worker tersendiri:

```bash
php artisan queue:work crawler --queue=crawler --timeout=390 --tries=1
```

- `--timeout` = `CRAWLER_TIMEOUT` + 90.
- Jumlah proses worker = jumlah crawl paralel. Mulai dari 1.
- Contoh Supervisor:

```ini
[program:karirconnect-crawler]
command=php /var/www/karirconnect/artisan queue:work crawler --queue=crawler --timeout=390 --tries=1 --max-time=3600
numprocs=1
autostart=true
autorestart=true
stopwaitsecs=400
user=www-data
```

Scheduler (`crawler:dispatch-due` tiap 5 menit) ikut berjalan lewat cron Laravel yang sudah ada:

```cron
* * * * * cd /var/www/karirconnect && php artisan schedule:run >> /dev/null 2>&1
```

Saat development, `composer dev` hanya menjalankan antrean `default`. Untuk mencoba crawl, jalankan worker `crawler` di terminal terpisah, atau:

```bash
php artisan crawler:run <slug> --sync
```

## 4. Worker di Docker (opsional)

```bash
docker build --target api -t karir-crawler:api crawler
```

```bash
docker build --target browser -t karir-crawler:browser crawler
```

Lalu arahkan Laravel ke wrapper:

```dotenv
CRAWLER_PYTHON=crawler/bin/docker-worker
CRAWLER_IMAGE=karir-crawler:browser
CRAWLER_LOCK_DIR=/var/lib/karir-crawler
```

`bin/docker-worker` menjalankan setiap crawl di container baru yang dikunci rapat:
- Root filesystem read-only, `/tmp` tmpfs, tanpa capability, `no-new-privileges`.
- Batas 1 GB memori, 1 CPU, 512 proses.
- Lock browser dibagi lewat volume, sehingga aturan satu-browser-per-mesin tetap berlaku antar container.

User yang menjalankan queue worker harus boleh memakai Docker.

## 5. Menambah sumber pertama

1. Admin → **Scraper Lowongan → Sumber Lowongan → Tambah Sumber**.
2. Pilih tipe **Greenhouse Job Board API**, isi board token, lalu klik **Isi otomatis**.
3. Isi **Dasar izin** (mis. "Greenhouse Job Board API publik untuk job board"), centang pemeriksaan robots.txt dan syarat layanan, lalu set status **Aktif**.
4. Simpan, lalu klik **Jalankan** dan pantau di **Monitoring Crawl**.

Contoh nilai per tipe:

| Tipe | URL dasar | Domain | Config |
|---|---|---|---|
| Greenhouse | `https://boards-api.greenhouse.io/v1/boards/{token}/jobs` | `boards-api.greenhouse.io`, `job-boards.greenhouse.io` | board token |
| Lever | `https://api.lever.co/v0/postings/{slug}` | `api.lever.co`, `jobs.lever.co` | slug, nama perusahaan |
| Sitemap | `https://careers.contoh.co.id/sitemap.xml` | `careers.contoh.co.id` | pola URL, mis. `/jobs/` |
| Halaman karier | `https://careers.contoh.co.id/lowongan` | `careers.contoh.co.id` | selector link (mis. `a.job-link`) atau pola URL |
