# Job Scraper — Arsitektur

Scraper lowongan mengumpulkan lowongan dari sumber eksternal yang **mengizinkan** pengambilan data: API job board resmi (Greenhouse, Lever), sitemap, dan halaman karier perusahaan. Hasilnya disimpan terpisah dari lowongan portal (`job_posts`) dan dikelola admin di menu **Scraper Lowongan**.

Dokumen terkait: [DATABASE](JOB_SCRAPER_DATABASE.md) · [API & kontrak worker](JOB_SCRAPER_API.md) · [SETUP](JOB_SCRAPER_SETUP.md) · [SECURITY](JOB_SCRAPER_SECURITY.md) · [TROUBLESHOOTING](JOB_SCRAPER_TROUBLESHOOTING.md) · [TASKLIST](JOB_SCRAPER_TASKLIST.md)

## Gambaran besar

```
Scheduler (tiap 5 menit)              Admin (tombol "Jalankan" / "Crawl ulang")
  crawler:dispatch-due                  JobSourceController@run / CrawlRunController@retry
          \                                     /
           v                                   v
        CrawlOrchestrator::queue()  ── membuat crawl_runs (queued)
                     |
                     v  queue connection "crawler"
               RunCrawlJob (tries = 1)
                     |
        CrawlOrchestrator::execute()
          - lock per sumber (Cache::lock)
          - circuit breaker: open -> half-open
          - UrlSafetyGuard: cek base_url
          - CrawlerClient: proses Python, JSON lewat stdin/stdout
                     |
                     v
        Python worker (crawler/karir_crawler)
          strategy -> fallback -> adapter -> SafeClient / Browser
                     |
                     v  JSON response (items, company, errors, status)
        ListingIngestor + ScrapedCompanyUpserter + ResultValidator
          - validasi ulang, pemetaan ke master data
          - upsert idempoten + dedup content hash
          - tandai stale (hanya setelah run lengkap)
        CircuitBreaker + cooldown  -> update job_sources
        DownloadScrapedCompanyLogoJob (queue "crawler")
```

Prinsip pembagian tugas:

- **Python hanya mengambil dan mengekstrak.** Worker tidak pernah menyentuh database.
- **Laravel memiliki semua persistensi**, pemetaan ke master data (kategori, kota, skill, enum), keputusan status akhir, cooldown, dan circuit breaker.
- Output worker diperlakukan sebagai **input tidak tepercaya**: divalidasi ulang dan HTML-nya disanitasi (`HtmlSanitizerService`) sebelum disimpan.

## Komponen Laravel

| Komponen | Lokasi | Tugas |
|---|---|---|
| `CrawlOrchestrator` | `app/Services/Crawler/` | Antre, jalankan, batalkan, ulang run; set status akhir; cooldown |
| `CrawlerClient` | `app/Services/Crawler/` | Menjalankan worker (`Process` facade, argv tetap, timeout keras) |
| `UrlSafetyGuard` + `DnsResolver` | `app/Services/Crawler/` | Cek SSRF: https, allowlist, IP publik |
| `ResultValidator` | `app/Services/Crawler/` | Validasi bisnis tiap item |
| `ListingAttributeMapper` | `app/Services/Crawler/` | Nilai mentah -> enum, kota/provinsi, kategori, skill |
| `ListingIngestor` | `app/Services/Crawler/` | Upsert lowongan, origin, skill; tandai stale/expired |
| `ScrapedCompanyUpserter` | `app/Services/Crawler/` | Profil perusahaan; antre unduh logo |
| `CompanyLogoDownloader` | `app/Services/Crawler/` | Unduh logo dengan cek SSRF dan pin DNS |
| `CircuitBreaker` | `app/Services/Crawler/` | Buka circuit setelah N kegagalan beruntun |
| `RunCrawlJob`, `DownloadScrapedCompanyLogoJob` | `app/Jobs/` | Job antrean (connection `crawler`) |
| `crawler:dispatch-due`, `crawler:run` | `app/Console/Commands/Crawler/` | Penjadwal dan crawl manual dari CLI |
| Controller admin | `app/Http/Controllers/Admin/Scraper/` | Dashboard, sumber, hasil, monitoring, log |
| Halaman admin | `resources/js/pages/admin/scraper/` | UI Inertia React |

## Komponen Python (`crawler/karir_crawler`)

| Modul | Tugas |
|---|---|
| `cli.py` | Entry point: baca 1 JSON dari stdin, tulis 1 JSON ke stdout |
| `contract.py` | Bentuk request/response, validasi request |
| `strategy.py` | Engine apa yang boleh dipakai tiap tipe sumber, dan urutannya |
| `runner.py` | Fallback manager: tiap engine paling banyak sekali, aturan berhenti |
| `http.py` | `SafeClient`: deadline, SSRF guard per hop redirect, robots.txt, throttle, retry |
| `safety.py` | SSRF guard (DNS, IP privat, allowlist) |
| `classifier.py` | Klasifikasi respons: 429, 403, CAPTCHA, login wall, 5xx |
| `retry.py` | Backoff eksponensial, Retry-After |
| `sections.py` | Memecah deskripsi menjadi description/responsibilities/requirements/benefits |
| `company.py` | Profil perusahaan dan logo dari JSON-LD / tag halaman |
| `extract.py` | JSON-LD `JobPosting` dan ekstraksi selector CSS |
| `validate.py` | Validasi teknis item |
| `adapters/` | `greenhouse`, `lever`, `sitemap`, `generic_html` |
| `engines/pages.py`, `engines/browser.py` | Pengambil halaman HTTP dan Playwright |

## Strategi engine dan fallback

| Tipe sumber | Urutan engine | Catatan |
|---|---|---|
| `greenhouse` | `api` | Greenhouse Job Board API |
| `lever` | `api` | Lever Postings API (global dan EU) |
| `sitemap` | `http` | Sitemap index/gzip -> halaman lowongan |
| `generic_html` | `http` -> `browser` | `browser` hanya bila `browser_allowed` dan Playwright terpasang |
| `platform` | — | Tidak pernah di-crawl; butuh kemitraan/API resmi |

Aturan fallback (`runner.py`):

- Tiap engine dicoba **paling banyak sekali** per run, jadi tidak ada loop.
- Lanjut ke engine berikutnya **hanya** untuk kegagalan teknis: `parse_error`, `network`, atau halaman tanpa lowongan.
- **Berhenti tanpa fallback** untuk `access_restricted` (403/401, login wall, robots.txt), `captcha`, dan `ssrf_blocked`. Mencoba engine lain sama dengan mengakali penolakan sumber.
- **Berhenti** untuk `rate_limited` dan `timeout`. Engine lain menghantam host yang sama.

## Status run

| Status | Arti | Efek ke data |
|---|---|---|
| `succeeded` | Lengkap | Lowongan yang tidak terlihat -> `stale`; deadline lewat -> `expired` |
| `partial` | Batas halaman/item tercapai, atau gangguan di tengah jalan | Tidak ada yang ditandai stale |
| `suspected_partial` | Item < `expected_min_items`, atau < 50% median 5 run sukses terakhir | Tidak ada yang ditandai stale |
| `access_restricted` | Sumber menolak (403, CAPTCHA, login, robots) | Item yang sudah terbaca tetap disimpan; sumber jeda 24 jam |
| `failed` | Gagal teknis | Dihitung oleh circuit breaker |
| `cancelled` | Dibatalkan admin, sumber nonaktif, atau sumber sudah berjalan | Hasil worker dibuang |

## Konkurensi

- **Satu run per sumber.** `queue()` menolak bila ada run `queued`/`running`, dan `execute()` memegang `Cache::lock("crawler:source:{id}")`.
- **Jumlah crawl paralel** = jumlah worker antrean `crawler`. Rekomendasi: 1–2.
- **Satu browser per mesin** lewat file lock (`KARIR_CRAWLER_LOCK_DIR`). Wrapper Docker berbagi direktori lock antar container.
- **Throttle per host** di worker: `rate_limit_per_minute` sumber, atau `Crawl-delay` di robots.txt kalau lebih lambat.

## Kegagalan dan pemulihan

- **Circuit breaker:** 3 run gagal beruntun -> circuit `open` selama 120 menit (sumber dilewati scheduler). Run berikutnya `half_open`: sukses menutup circuit, gagal membukanya lagi.
- **Cooldown:**
  - `access_restricted` -> 24 jam.
  - `rate_limited` -> sesuai Retry-After terbesar (maks. 24 jam).
- **Crash job:** `RunCrawlJob::failed()` menandai run `failed`.
- **Queue:** connection `crawler` memakai `retry_after` 600 detik supaya crawl yang lama tidak diambil worker kedua.

## Mengapa tabel staging, bukan `job_posts`

`job_posts` mewajibkan `company_id` (perusahaan terdaftar yang disetujui), `posted_by_user_id`, dan `job_category_id`. Selain itu `JobObserver` memicu perhitungan ulang match score. Lowongan hasil scrape belum dimoderasi dan tidak punya pemilik, jadi disimpan di `scraped_job_listings`. Kolom kontennya disamakan dengan `job_posts`, sehingga fitur "terbitkan ke portal" nanti cukup menyalin datanya. Lihat [TASKLIST](JOB_SCRAPER_TASKLIST.md).
