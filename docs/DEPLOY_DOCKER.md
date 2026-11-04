# Deploy KarirConnect dengan Docker

Satu `docker-compose.prod.yml` menjalankan semua yang dibutuhkan produksi:

| Service | Isi | Catatan |
|---|---|---|
| `web` | Caddy 2 | HTTPS otomatis (Let's Encrypt), HTTP/3, header keamanan, file statis |
| `app` | PHP 8.4-FPM | Menjalankan migrasi saat start bila `RUN_MIGRATIONS=true` |
| `queue` | `queue:work` | Antrean `default` (notifikasi, relay lamaran, dll.) |
| `crawler` | `queue:work crawler` | PHP + Python 3.12 + Chromium untuk Jobs Eksternal |
| `scheduler` | `schedule:work` | Pengganti cron |
| `mysql` | MySQL 8.4 | Volume `mysql` |
| `redis` | Redis 7.4 | Cache dan antrean; volume `redis` |

File yang diunggah ada di volume `storage`, dipakai bersama oleh semua service PHP dan dibaca (read-only) oleh `web`.

## Kebutuhan server

- Linux x86_64 dengan Docker Engine 24+ dan plugin Compose v2.
- RAM minimal 4 GB (Chromium untuk crawler dibatasi 2 GB).
- Port 80 dan 443 terbuka. DNS domain (dan `www`) sudah mengarah ke server.

## Deploy pertama

```bash
git clone <repo> /opt/karirconnect && cd /opt/karirconnect
```

```bash
cp .env.docker.example .env
```

Isi semua `CHANGE_ME` di `.env`, lalu salin juga variabel lain dari `.env` produksi lama: Firebase, Midtrans, Google OAuth, OpenAI, JWT, dan SMTP. **Gunakan `APP_KEY` yang sama dengan server lama**; kalau berbeda, data terenkripsi dan sesi lama tidak bisa dibaca.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Cek status:

```bash
docker compose -f docker-compose.prod.yml ps
```

```bash
curl -I https://<domain>/up
```

## Memindahkan data dari server lama

Langkah lengkapnya ada di komentar `docker/scripts/import-legacy.sh`. Ringkasnya:

1. Di server lama, buat dump database dan arsip file upload:
   - `mysqldump … > karirconnect.sql`
   - `tar -czf storage-public.tgz -C storage/app public`
2. Salin kedua file itu ke server baru, lalu jalankan:

```bash
./docker/scripts/import-legacy.sh karirconnect.sql storage-public.tgz
```

Lakukan saat trafik sepi. Setelah selesai, arahkan DNS ke server baru.

## Update aplikasi

```bash
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

Migrasi berjalan otomatis di container `app`. Untuk menahannya, set `RUN_MIGRATIONS=false`, lalu jalankan manual:

```bash
docker compose -f docker-compose.prod.yml exec app php artisan migrate --force
```

## Perintah yang sering dipakai

```bash
docker compose -f docker-compose.prod.yml logs -f app queue crawler
```

```bash
docker compose -f docker-compose.prod.yml exec app php artisan tinker
```

```bash
docker compose -f docker-compose.prod.yml exec mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction karirconnect' > backup-$(date +%F).sql
```

## Header keamanan (securityheaders.com)

- **Laravel** (`App\Http\Middleware\SecurityHeaders`) mengirim CSP dengan nonce per request, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, dan Permissions-Policy.
- **Caddy** mengirim header yang sama untuk file statis, serta menghapus header `Server` dan `X-Powered-By`.
- Setelah deploy, tes domain di https://securityheaders.com. Targetnya **A+**.
- Saat menambah skrip pihak ketiga baru, set `SECURITY_CSP_REPORT_ONLY=true` dulu, cek console browser, lalu tambahkan domainnya lewat `SECURITY_CSP_*_SRC`.
