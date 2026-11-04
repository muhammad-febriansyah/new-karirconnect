# Job Scraper — Database

MySQL (pengujian memakai SQLite in-memory). Migrasi: `database/migrations/2026_11_04_1241*_create_*`.

## Pemetaan terhadap tabel yang sudah ada

| Kebutuhan | Keputusan | Tabel |
|---|---|---|
| Sumber lowongan | Baru | `job_sources` |
| Riwayat crawl | Baru | `crawl_runs` |
| Log error crawl | Baru | `crawl_errors` |
| Perusahaan | **`companies` tidak diduplikasi.** Tabel baru untuk pemberi kerja eksternal, dengan tautan opsional ke `companies` | `scraped_companies` |
| Lowongan | Baru. Kolom konten **sama dengan `job_posts`** | `scraped_job_listings` |
| Asal lowongan | Baru | `scraped_job_origins` |
| Kategori | **Pakai ulang `job_categories`** lewat kolom `job_category_id` (sama seperti `job_posts`) | — |
| Skill | **Pakai ulang `skills`** lewat pivot baru | `scraped_job_listing_skill` |

> Tabel `jobs` milik antrean Laravel; lowongan portal ada di `job_posts` (model `App\Models\Job`).

## `job_sources`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `name`, `slug` (unique) | string | Slug dibuat unik, termasuk terhadap sumber yang sudah dihapus |
| `type` | string | `greenhouse`, `lever`, `sitemap`, `generic_html`, `platform` (`JobSourceType`) |
| `base_url` | string(2048) | Wajib https dan ada di `allowed_domains` |
| `allowed_domains` | json | Daftar host; subdomain ikut diizinkan |
| `config` | json | Lihat [API](JOB_SCRAPER_API.md#config-per-tipe-sumber) |
| `status` | string | `active`, `disabled`, `pending_permission` (`JobSourceStatus`) |
| `permission_notes` | text | Wajib bila `active` |
| `robots_checked_at` | timestamp | Wajib terisi bila `active` |
| `schedule_minutes` | int | 60–10080 |
| `rate_limit_per_minute` | smallint | 1–120 |
| `max_pages` | smallint | Batas halaman per run |
| `expected_min_items` | int | Di bawah angka ini run menjadi `suspected_partial` |
| `browser_allowed` | bool | Hanya untuk `generic_html` |
| `consecutive_failures`, `circuit_state`, `circuit_open_until` | — | Circuit breaker (`CircuitState`: `closed`, `open`, `half_open`) |
| `cooldown_until` | timestamp | Jeda setelah 403/CAPTCHA/429 |
| `last_run_at`, `last_success_at` | timestamp | Jadwal |
| `deleted_at` | timestamp | Soft delete: data hasil tetap tersimpan |

Index: `(status, cooldown_until)`, `circuit_state`, `type`.

## `crawl_runs`

`job_source_id`, `uuid` (unique, dikirim ke worker), `status` (`CrawlRunStatus`), `trigger` (`schedule`/`manual`/`retry`), `triggered_by_user_id`, `retry_of_crawl_run_id`, `engine_used`, `engines_attempted` (json), `items_found/created/updated/unchanged/rejected`, `started_at`, `finished_at`, `duration_ms`, `summary` (json: nama perusahaan, statistik worker, `cancel_requested`, `listings_marked_unseen`, `errors_not_stored`).

Index: `(job_source_id, status)`, `(status, created_at)`, `created_at`.

## `crawl_errors`

`crawl_run_id`, `job_source_id`, `engine`, `category` (`CrawlErrorCategory`: `network`, `timeout`, `rate_limited`, `access_restricted`, `captcha`, `parse_error`, `validation_error`, `ssrf_blocked`, `unknown`), `http_status`, `url`, `message`, `retryable`, `context` (json; `non_fatal`, `retry_after_s`, `external_id`, `checked_by`), `occurred_at`. Maksimal 200 baris per run (`crawler.max_errors_per_run`).

Index: `(job_source_id, category)`, `(category, occurred_at)`.

## `scraped_companies`

Kolom profil disamakan dengan `companies`: `name`, `tagline`, `logo_path`, `cover_path`, `website`, `email`, `phone`, `industry_id`, `company_size_id`, `founded_year`, `province_id`, `city_id`, `address`, `about`, `culture`, `benefits`.

Kolom tambahan:
- `normalized_name`: huruf kecil, tanpa tanda baca dan akhiran badan hukum (PT, Tbk, Inc, …).
- `domain`.
- `logo_url`, `cover_url`: URL asli di sumber.
- `profile_source_url`, `profile_fetched_at`, `logo_fetched_at`.
- `company_id`: tautan opsional ke `companies`.

Unique: `(normalized_name, domain)`. Nilai yang tidak dikirim sumber tidak pernah menghapus nilai yang sudah ada.

## `scraped_job_listings`

| Grup | Kolom |
|---|---|
| Identitas | `job_source_id` (sumber pemilik), `external_id`, `scraped_company_id` |
| **Sama dengan `job_posts`** | `job_category_id`, `title` (180), `description`, `responsibilities`, `requirements`, `benefits`, `employment_type`, `work_arrangement`, `experience_level`, `min_education`, `salary_min`, `salary_max`, `is_salary_visible`, `province_id`, `city_id`, `application_deadline`, `published_at` |
| Khusus crawl | `salary_currency`, `location_text`, `apply_url`, `raw_attributes` (json nilai asli), `content_hash` (sha256), `status` (`active`/`stale`/`expired`/`hidden`), `first_seen_at`, `last_seen_at` |

Unique: `(job_source_id, external_id)`. Index: `content_hash`, `(status, published_at)`, `(job_source_id, status)`, `(employment_type, work_arrangement)`, `city_id`, `job_category_id`.

Test `ScraperDataLayerTest` memastikan setiap kolom konten `job_posts` dan setiap kolom profil `companies` ada di tabel scrape. Kalau tabel portal mendapat kolom baru, test itu gagal sebagai pengingat.

## `scraped_job_origins`

`scraped_job_listing_id`, `job_source_id`, `external_id`, `source_url`, `last_crawl_run_id`, `first_seen_at`, `last_seen_at`. **Unique `(job_source_id, external_id)`**: ini identitas yang membuat crawl ulang idempoten.

## `scraped_job_listing_skill`

`scraped_job_listing_id`, `skill_id`, `proficiency`, `is_required`. Unique `(scraped_job_listing_id, skill_id)`.

## Alur upsert dan dedup (`ListingIngestor`)

1. Cari origin `(job_source_id, external_id)`. Kalau ada, itu lowongannya.
2. Kalau tidak ada, cari lowongan lain dengan `content_hash` yang sama (status bukan `hidden`). Kalau ketemu, lowongan yang sama dari sumber lain cukup ditambah satu origin.
3. Kalau tidak ada juga, buat lowongan baru.

`content_hash` = sha256 dari judul, nama perusahaan (dinormalisasi), lokasi, tipe kerja, dan deskripsi. Tag HTML, spasi, dan huruf besar/kecil diabaikan.

Penghitungan per run:
- `created`: lowongan baru.
- `updated`: hash berubah pada lowongan milik sumber ini.
- `unchanged`: hash sama, atau digabung ke lowongan sumber lain.

Setiap item berjalan dalam transaksi sendiri. Bentrok unique karena run paralel dianggap `unchanged`.

Setelah run `succeeded`:
- Lowongan milik sumber yang `last_seen_at`-nya lebih lama dari awal run -> `stale`.
- Lowongan dengan `application_deadline` yang sudah lewat -> `expired`.
- Lowongan `stale` yang terlihat lagi -> kembali `active`.

## Pemetaan ke master data (`ListingAttributeMapper`)

Semua pemetaan hanya memakai apa yang tertulis di sumber. Nilai yang tidak dikenal atau ambigu menjadi `NULL`, bukan tebakan.

| Field | Aturan |
|---|---|
| `employment_type` | Dari nilai mentah: full/permanent/tetap/regular, part, contract/kontrak/temporary, intern/magang, freelance |
| `work_arrangement` | Dari nilai mentah (remote/hybrid/onsite), atau kalau lokasi sendiri menyebut "Remote"/"Hybrid" |
| `experience_level` | Dari kata eksplisit di judul: Intern/Graduate, Junior, Mid, Senior, Lead/Principal, Head/Director/VP/Chief |
| `job_category_id` | Nama departemen sama persis (abaikan huruf besar/kecil) dengan kategori aktif |
| `city_id`/`province_id` | "Jakarta Selatan" -> "Kota Jakarta Selatan". Nama yang ada sebagai Kota dan Kabupaten -> Kota. Nama provinsi saja -> provinsi saja |
| Skill | Nama skill aktif (≥ 3 huruf) muncul sebagai kata utuh di kualifikasi/tanggung jawab; `is_required` bila muncul di kualifikasi |
| `min_education` | Selalu `NULL`; sumber tidak menyediakan nilai terstruktur |
| Industri / ukuran perusahaan | Nama industri sama persis; ukuran dari rentang karyawan, mis. "51-200" |
