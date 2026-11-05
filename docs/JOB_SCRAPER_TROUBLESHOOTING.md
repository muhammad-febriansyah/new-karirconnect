# Job Scraper — Troubleshooting

Mulai dari **Monitoring Crawl → detail run**: status, engine yang dicoba, dan log error ada di sana. **Log Crawl** menampilkan error lintas run, per kategori.

## Run tidak pernah mulai (tetap "Antre")

- Worker antrean `crawler` belum jalan. `composer dev` hanya menjalankan antrean `default`. Jalankan:
  ```bash
  php artisan queue:work crawler --queue=crawler,crawler-contacts --timeout=390 --tries=1
  ```
- Untuk tes cepat tanpa worker:
  ```bash
  php artisan crawler:run <slug> --sync
  ```
- Run yang antre bisa dibatalkan dari halaman detail run.

## Scheduler tidak menjalankan sumber

`crawler:dispatch-due` hanya mengantre sumber yang memenuhi semua syarat ini:
- Status **Aktif** dan tidak dihapus.
- Tidak sedang jeda (`cooldown_until` sudah lewat).
- Circuit tidak `open`, atau waktunya sudah habis.
- `last_run_at` + `schedule_minutes` sudah lewat.
- Tidak ada run lain yang `queued`/`running`.

Pastikan juga cron `schedule:run` aktif.

Coba manual:
```bash
php artisan crawler:dispatch-due
```

## Pesan per kategori error

| Kategori / pesan | Penyebab umum | Tindakan |
|---|---|---|
| `access_restricted` — HTTP 403/401 | Sumber menolak akses | **Jangan diakali.** Periksa izin; hubungi pemilik situs atau gunakan API resmi. Sumber dijeda 24 jam |
| `access_restricted` — robots.txt disallows | Path dilarang robots.txt | Gunakan path/API lain yang diizinkan, atau minta izin tertulis |
| `captcha` | Halaman tantangan bot | Sama seperti 403. Worker tidak memecahkan CAPTCHA |
| `rate_limited` | 429 dari sumber | Turunkan `rate_limit_per_minute`; sumber dijeda sesuai Retry-After |
| `ssrf_blocked` — not in the source allowlist | Host URL/redirect tidak ada di domain yang diizinkan | Tambahkan domain yang benar (mis. `job-boards.greenhouse.io` untuk logo Greenhouse) |
| `ssrf_blocked` — non-public address | Domain mengarah ke IP privat | Periksa DNS; jangan arahkan sumber ke jaringan internal |
| `unknown` — HTTP 404 not found | Board token / slug salah | Cek token di `job-boards.greenhouse.io/<token>` atau `jobs.lever.co/<slug>` |
| `parse_error` — no job postings found | Halaman tanpa JSON-LD `JobPosting` dan selector tidak cocok, halaman hanya tampil lewat JavaScript, atau batas halaman terlalu kecil | Isi selector CSS; aktifkan browser untuk tipe Halaman Karier; naikkan `max_pages` |
| `parse_error` — sitemap contains a DTD | Sitemap memakai DOCTYPE/ENTITY | Ditolak demi keamanan; gunakan sitemap lain |
| `parse_error` — url_pattern | Regex salah | Perbaiki pola, mis. `/jobs/\d+` |
| `validation_error` | Item tanpa judul, judul > 180 karakter, apply URL bukan http(s), tanggal/gaji tidak valid | Item dilewati; periksa selector judul/link |
| `timeout` | Run melewati `CRAWLER_TIMEOUT`, atau browser lama memuat | Kurangi `max_pages`, naikkan timeout (juga `CRAWLER_QUEUE_RETRY_AFTER` dan `--timeout` worker) |
| `unknown` — Output worker bukan JSON | Python/venv tidak ditemukan atau crash | Cek `CRAWLER_PYTHON`; jalankan `crawler/.venv/bin/python -m karir_crawler.cli < request.json` |
| `unknown` — no implemented engine | Tipe `platform`, atau engine tidak cocok | Platform tidak bisa di-crawl |

## Engine browser "Belum tersedia"

Playwright belum terpasang di venv worker:

```bash
crawler/.venv/bin/pip install -r crawler/requirements-browser.txt
```

```bash
crawler/.venv/bin/playwright install chromium
```

Di Linux, error `browser could not start` biasanya berarti library sistem belum ada:

```bash
crawler/.venv/bin/playwright install-deps chromium
```

`another browser crawl is still running`: hanya satu browser boleh berjalan per mesin, dan crawl lain menunggu paling lama 60 detik. Kurangi worker paralel, atau jadwalkan sumber berbasis browser di jam berbeda.

## Status "Diduga Tidak Lengkap" (`suspected_partial`)

Jumlah lowongan di bawah `expected_min_items`, atau turun di bawah 50% median 5 run sukses terakhir. Lowongan yang hilang **tidak** ditandai `stale` pada run ini. Kalau sumber memang mengurangi lowongan, status kembali normal setelah median ikut turun. Turunkan `expected_min_items` bila terlalu tinggi.

## Circuit breaker terbuka

Setelah 3 run gagal beruntun, sumber dilewati scheduler selama 120 menit. Tombol **Jalankan** tetap bisa dipakai sebagai uji coba: sukses menutup circuit, gagal membukanya lagi.

## Logo tidak tampil

- Logo diunduh oleh `DownloadScrapedCompanyLogoJob` di antrean `crawler`, jadi worker harus jalan.
- Pastikan sudah menjalankan `php artisan storage:link`, dan `APP_URL` sesuai dengan host yang dipakai di browser.
- Logo ditolak bila bukan PNG/JPEG/GIF/WebP, lebih dari 2 MB, atau host-nya IP privat. Lihat `storage/logs/laravel.log` untuk "Scraped company logo skipped".
- Untuk Greenhouse/Lever, tambahkan `job-boards.greenhouse.io` / `jobs.lever.co` ke domain yang diizinkan; dari halaman itulah logo diambil.

## Lowongan duplikat

Identitas lowongan = `(sumber, external_id)`. Lowongan yang sama di dua sumber digabung kalau `content_hash`-nya sama (judul, perusahaan, lokasi, tipe kerja, deskripsi). Kalau salah satu sumber menulis deskripsi berbeda, keduanya tersimpan terpisah. Itu disengaja: lebih aman daripada menggabungkan lowongan yang berbeda. Lowongan yang tidak diinginkan bisa **disembunyikan**.

## Menjalankan worker secara manual

```bash
cd crawler && echo '{"contract_version":1,"run_uuid":"manual","source":{"type":"lever","base_url":"https://api.lever.co/v0/postings/leverdemo","allowed_domains":["api.lever.co","jobs.lever.co"],"config":{"company":"leverdemo"}}}' | .venv/bin/python -m karir_crawler.cli | python3 -m json.tool | head -40
```

## Test

```bash
php artisan test --compact tests/Feature/Admin/Scraper
```

```bash
crawler/.venv/bin/pytest crawler/tests
```
