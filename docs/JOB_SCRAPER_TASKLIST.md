# Job Scraper — Tasklist

Status per 4 November 2026.

## Selesai

### Phase 1 — Data layer
- [x] Tabel `job_sources`, `crawl_runs`, `crawl_errors`, `scraped_companies`, `scraped_job_listings`, `scraped_job_origins`, `scraped_job_listing_skill`
- [x] Kolom lowongan disamakan dengan `job_posts`, profil perusahaan dengan `companies`; dijaga oleh test
- [x] Enum, model, factory, `JobSourceSeeder` (template nonaktif + platform `pending_permission`)

### Phase 2 — Worker Python
- [x] Kontrak JSON v1, CLI, SSRF guard, classifier, retry, robots.txt + Crawl-delay, throttle per host
- [x] Adapter Greenhouse Job Board API dan Lever Postings API (global/EU, paginasi)
- [x] Pemecah seksi deskripsi (ID/EN) dan profil perusahaan + logo

### Phase 3 — Orkestrasi Laravel
- [x] `CrawlerClient`, `CrawlOrchestrator`, `RunCrawlJob`, queue connection `crawler`
- [x] Validasi ulang, pemetaan master data, upsert idempoten, dedup content hash, stale/expired
- [x] Circuit breaker, cooldown (403/CAPTCHA, Retry-After), deteksi `suspected_partial`
- [x] Unduh logo aman (`DownloadScrapedCompanyLogoJob`)
- [x] `crawler:dispatch-due` (tiap 5 menit), `crawler:run [--sync]`

### Phase 4 — Admin UI
- [x] Ringkasan, Sumber Lowongan (CRUD, Jalankan), Hasil Scrape (filter, detail, sembunyikan), Monitoring Crawl (retry/cancel, polling), Log Crawl
- [x] Toast sukses/peringatan/error, audit log, loading/empty/error state

### Phase 5 — Sitemap dan halaman karier
- [x] JSON-LD `JobPosting` dan selector CSS
- [x] Adapter sitemap (index, gzip, pola URL) dan halaman karier (link, paginasi)
- [x] Engine browser Playwright (opsional) dengan route guard dan lock per mesin

### Phase 6 — Ops dan dokumentasi
- [x] Dockerfile (`api` dan `browser`) + `bin/docker-worker`
- [x] Dokumen `docs/JOB_SCRAPER_*.md`

### Test (tanpa scraping live)
- [x] Pest: `tests/Feature/Admin/Scraper/*`
- [x] pytest: `crawler/tests/*`

Skenario yang tercakup:

| # | Skenario | Test |
|---|---|---|
| 1 | Greenhouse/Lever fixture menjadi item valid | `test_adapters.py` |
| 2 | Crawl ulang idempoten | `CrawlOrchestrationTest` — idempotency |
| 3 | Dedup lintas sumber (1 lowongan, 2 origin) | `CrawlOrchestrationTest` — dedup |
| 4 | 429 + Retry-After | `test_http_client.py`, `test_runner.py`, `CrawlOrchestrationTest` |
| 5 | 403/CAPTCHA/login wall -> `access_restricted` tanpa fallback | `test_classifier.py`, `test_runner.py` |
| 6 | Parse error -> fallback terbatas | `test_runner.py`, `test_html_sources.py` |
| 7 | Penurunan abnormal -> `suspected_partial` | `CrawlOrchestrationTest` |
| 8 | Item tidak valid ditolak | `test_adapters.py`, `CrawlOrchestrationTest` |
| 9 | SSRF: IP privat, redirect, allowlist | `test_safety.py`, `test_http_client.py`, `CompanyLogoDownloaderTest`, `ScraperAdminPagesTest` |
| 10 | Circuit breaker buka dan tutup | `CrawlOrchestrationTest` |
| 11 | Tanpa overlap; sumber tanpa izin tidak pernah jalan | `CrawlOrchestrationTest` |
| 12 | Hanya admin; retry/cancel; audit log | `ScraperAdminPagesTest` |

### Jobs Eksternal
- [x] Menu sidebar "Jobs Eksternal", tombol Scrap dengan dialog besar (progres + DataTable hasil)
- [x] Publish semua atau pilih dengan checkbox; unik per listing
- [x] Perusahaan dan logo otomatis di `companies`, kategori default di dialog
- [x] Lamaran diteruskan lewat SMTP ke email rekrutmen, atau ke situs perusahaan
- [x] Job portal ditutup otomatis bila listing sumber hilang/kedaluwarsa

### Keamanan dan deploy
- [x] Header keamanan (CSP nonce + strict-dynamic, HSTS, dll.) untuk A+ securityheaders.com
- [x] Docker Compose produksi (`docker-compose.prod.yml`, `docs/DEPLOY_DOCKER.md`)

## Belum dikerjakan (perlu keputusan)

- [ ] **Sinkronisasi isi.** Kalau sumber mengubah deskripsi setelah dipublish, job portal belum ikut diperbarui; yang sudah otomatis hanya penutupan.
- [ ] **Token board nyata.** Pilih perusahaan (sebaiknya yang merekrut di Indonesia) dan isi sumber pertama.
- [ ] **Produksi:** worker `crawler` di Supervisor, Playwright + Chromium (atau image Docker), dan `CRAWLER_USER_AGENT` dengan URL info bot.
- [ ] **Image Docker belum dibangun dan diuji** (daemon Docker lokal mati). Build pertama mengunduh sekitar 3 GB base image.
- [ ] **Pembersihan data lama**, mis. hapus `crawl_errors` > 90 hari. Belum ada command prune.

## Masalah yang diketahui di luar scraper

Empat test lama gagal sebelum dan sesudah pekerjaan ini, tidak terkait scraper:
- `PublicHomeTest` (sitemap).
- `JobBrowseTest` (SEO structured data).
- `CareerResourceSchedulingTest` ×2.
