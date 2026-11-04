# Job Scraper — API, Kontrak Worker, dan Rute Admin

## 1. Kontrak Laravel ↔ Python worker

Laravel (`App\Services\Crawler\CrawlerClient`) menjalankan perintah ini di direktori `crawler/`:

```
<CRAWLER_PYTHON> -m karir_crawler.cli
```

Perintahnya berupa argv tetap, tanpa shell. Satu objek JSON dikirim ke stdin, dan satu objek JSON dibaca dari stdout. Batas waktu proses = `crawler.timeout_seconds` + 30 detik. Versi kontrak: **1** (`CONTRACT_VERSION` di kedua sisi; naikkan bila ada perubahan yang tidak kompatibel).

### Request

```json
{
  "contract_version": 1,
  "run_uuid": "9b1d…",
  "user_agent": "KarirConnectBot/0.1",
  "source": {
    "type": "greenhouse",
    "base_url": "https://boards-api.greenhouse.io/v1/boards/contohtek/jobs",
    "allowed_domains": ["boards-api.greenhouse.io", "job-boards.greenhouse.io"],
    "config": { "board_token": "contohtek" }
  },
  "limits": {
    "max_pages": 20,
    "max_items": 2000,
    "timeout_s": 300,
    "rate_per_minute": 30,
    "browser_allowed": false
  },
  "engines": ["api"],
  "expected_min_items": 0
}
```

Batas yang dipaksakan worker:

| Field | Rentang |
|---|---|
| `max_pages` | 1–500 |
| `max_items` | 1–20000 |
| `timeout_s` | 5–1800 |
| `rate_per_minute` | 1–600 |

Request yang tidak valid menghasilkan exit code 2 dengan respons `failed`.

### Response

```json
{
  "contract_version": 1,
  "run_uuid": "9b1d…",
  "status": "succeeded",
  "engine_used": "api",
  "engines_attempted": [{ "engine": "api", "outcome": "ok", "ms": 812, "items": 238 }],
  "company": {
    "name": "GitLab", "domain": null, "tagline": null, "about": "<p>…</p>",
    "website": null, "logo_url": "https://…/logo.png", "cover_url": null,
    "email": null, "phone": null, "address": null, "founded_year": null,
    "industry_raw": null, "size_raw": null, "profile_source_url": "https://job-boards.greenhouse.io/gitlab"
  },
  "items": [{
    "external_id": "8638232002",
    "title": "Backend Engineer",
    "apply_url": "https://…",
    "source_url": "https://…",
    "company_name": "GitLab",
    "description": "<p>…</p>",
    "responsibilities": "<ul>…</ul>",
    "requirements": "<ul>…</ul>",
    "benefits": null,
    "location_text": "Jakarta, Indonesia",
    "employment_type_raw": "Full-time",
    "workplace_type_raw": "hybrid",
    "department_raw": "Engineering",
    "country_raw": "ID",
    "salary": { "min": 15000000, "max": 25000000, "currency": "IDR", "interval": "MONTH" },
    "skills_raw": [],
    "published_at": "2026-10-01T09:00:00+07:00",
    "updated_at": "2026-10-28T12:00:00+07:00",
    "application_deadline": "2026-12-31"
  }],
  "errors": [{
    "engine": "api", "category": "rate_limited", "message": "HTTP 429 rate limited",
    "retryable": true, "http_status": 429, "url": "https://…", "retry_after_s": 900,
    "context": { "non_fatal": true }
  }],
  "stats": { "pages": 1, "requests": 3, "rejected": 0, "truncated": 0, "items": 1 }
}
```

- `status`: `succeeded`, `partial`, `suspected_partial`, `failed`, `access_restricted`. Lihat [ARCHITECTURE](JOB_SCRAPER_ARCHITECTURE.md#status-run).
- `engines_attempted[].outcome`:
  - `ok`
  - `failed` (lanjut ke engine berikutnya)
  - `stopped` (berhenti, tanpa fallback)
  - `skipped` (engine tidak cocok untuk tipe sumber, atau browser tidak diizinkan)
  - `unavailable` (belum diimplementasikan, atau Playwright tidak terpasang)
- `errors[].context.non_fatal = true`: masalah yang tidak menggagalkan run, misalnya halaman profil perusahaan atau satu halaman lowongan.
- Semua field `*_raw` dikirim apa adanya; Laravel yang memetakannya.
- Kode keluar:
  - `0`: respons dihasilkan, walaupun crawl-nya gagal.
  - `2`: request tidak valid.
  - `1`: worker crash. Respons JSON tetap dikirim.

## 2. Config per tipe sumber

Disimpan di `job_sources.config` dan divalidasi oleh `App\Http\Requests\Admin\JobSourceRequest`.

| Kunci | Tipe | Keterangan |
|---|---|---|
| `board_token` | greenhouse (wajib) | `job-boards.greenhouse.io/<token>` |
| `company` | lever (wajib) | `jobs.lever.co/<slug>` |
| `company_name` | lever, sitemap, generic_html | Nama perusahaan bila sumber tidak menyebutnya |
| `company_website` | semua | Halaman yang dibaca untuk melengkapi profil; host-nya harus ada di `allowed_domains` |
| `url_pattern` | sitemap (wajib), generic_html | Regular expression URL halaman lowongan, maks. 200 karakter |
| `job_link_selector` | generic_html | CSS selector link ke detail lowongan (atau gunakan `url_pattern`) |
| `next_page_selector` | generic_html | CSS selector halaman berikutnya; tanpa ini dipakai `<link rel="next">` |
| `selectors.{title, description, responsibilities, requirements, benefits, location, employment_type, department, apply_url, posted_at}` | sitemap, generic_html | Hanya dipakai bila halaman tidak punya JSON-LD `JobPosting` |
| `robots_override_permission` | semua (hanya lewat database) | `true` hanya bila ada izin tertulis yang mengesampingkan robots.txt |

Endpoint yang dipanggil worker:

- **Greenhouse:**
  - `GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`
  - `GET …/boards/{token}` (nama dan deskripsi board)
  - Halaman `https://job-boards.greenhouse.io/{token}` (logo)
- **Lever:**
  - `GET https://api.lever.co/v0/postings/{company}?mode=json&skip=N&limit=100` (EU: `api.eu.lever.co`)
  - Halaman `https://jobs.lever.co/{company}` (logo)

## 3. Rute admin

Semua rute berada di grup `auth`, `verified`, `role:admin` dengan prefix `/admin/scraper`, dan setiap aksi juga dicek oleh `JobSourcePolicy`. Wayfinder: `@/actions/App/Http/Controllers/Admin/Scraper/*`.

| Method | URI | Nama | Fungsi |
|---|---|---|---|
| GET | `/admin/scraper` | `admin.scraper.dashboard` | Ringkasan; `activity` dan `attention` berupa deferred props |
| GET | `/admin/scraper/sources` | `admin.scraper.sources.index` | Filter: `status`, `type`, `search` |
| GET | `/admin/scraper/sources/create` | `admin.scraper.sources.create` | Form tambah |
| POST | `/admin/scraper/sources` | `admin.scraper.sources.store` | Simpan |
| GET | `/admin/scraper/sources/{jobSource}/edit` | `admin.scraper.sources.edit` | Form ubah |
| PUT/PATCH | `/admin/scraper/sources/{jobSource}` | `admin.scraper.sources.update` | Perbarui |
| DELETE | `/admin/scraper/sources/{jobSource}` | `admin.scraper.sources.destroy` | Soft delete; ditolak bila ada run yang belum selesai |
| POST | `/admin/scraper/sources/{jobSource}/run` | `admin.scraper.sources.run` | Antre crawl manual, lalu ke halaman run |
| GET | `/admin/scraper/listings` | `admin.scraper.listings.index` | Filter: `status`, `source`, `category`, `search` |
| GET | `/admin/scraper/listings/{listing}` | `admin.scraper.listings.show` | Detail, profil perusahaan, origin |
| PATCH | `/admin/scraper/listings/{listing}/visibility` | `admin.scraper.listings.visibility` | Sembunyikan / tampilkan |
| GET | `/admin/scraper/runs` | `admin.scraper.runs.index` | Filter: `status`, `source`; polling 5 detik selama ada run aktif |
| GET | `/admin/scraper/runs/{run}` | `admin.scraper.runs.show` | Detail, engine, log; polling 4 detik sampai selesai |
| POST | `/admin/scraper/runs/{run}/retry` | `admin.scraper.runs.retry` | Run baru (`trigger=retry`) |
| POST | `/admin/scraper/runs/{run}/cancel` | `admin.scraper.runs.cancel` | Run `queued` langsung batal; `running` ditandai dan hasilnya dibuang |
| GET | `/admin/scraper/logs` | `admin.scraper.logs.index` | Filter: `category`, `source`, `run` |

Setiap aksi memberi toast lewat `Inertia::flash('toast', …)` (`success`, `warning`, `info`, `error`) dan mencatat audit log:
`job_source.create|update|delete|run`, `crawl_run.retry|cancel`, `scraped_listing.visibility`.

## 4. Command Artisan

```bash
php artisan crawler:dispatch-due          # dijadwalkan tiap 5 menit (withoutOverlapping, onOneServer)
php artisan crawler:run {slug|id}         # antre crawl manual
php artisan crawler:run {slug|id} --sync  # jalankan langsung di proses ini dan tampilkan ringkasan
```

## 5. Jobs Eksternal (scrape dari dialog dan publish)

| Method | URI | Nama | Fungsi |
|---|---|---|---|
| POST | `/admin/scraper/scrape` | `admin.scraper.scrape.start` | JSON `{source_ids: []}` -> antre crawl per sumber. Sumber yang masih berjalan diikuti, tidak dibuat ganda |
| GET | `/admin/scraper/scrape/status?runs=1,2` | `admin.scraper.scrape.status` | Status run; `finished` bila semua selesai |
| GET | `/admin/scraper/scrape/results?runs=1,2` | `admin.scraper.scrape.results` | Lowongan yang terlihat oleh run tersebut (maks. 500), dengan `is_new` dan `published_job` |
| POST | `/admin/scraper/listings/publish` | `admin.scraper.listings.publish` | `listing_ids[]` atau `all_matching` + `filters`, plus default `job_category_id`, `employment_type`, `work_arrangement`, `experience_level` |
| PATCH | `/admin/scraper/companies/{company}/recruitment-email` | `admin.scraper.companies.recruitment-email` | Email tujuan relay lamaran |

Aturan publish (`App\Services\ExternalJobs\ExternalJobPublisher`):
- **Satu listing, satu job.** Ditegakkan lewat kolom unik `job_posts.scraped_job_listing_id`.
- **Yang dilewati:** listing yang sudah dipublish, tidak `active`, batas lamarannya lewat, tanpa kategori (dan tanpa kategori default), atau judulnya sudah tayang untuk perusahaan yang sama.
- **Perusahaan:** setiap perusahaan scrape mendapat baris `companies` sendiri (status approved, logo disalin), dimiliki user sistem `EXTERNAL_JOBS_OWNER_EMAIL` yang tidak aktif. Perusahaan scrape tidak pernah ditempelkan ke akun perusahaan yang mendaftar sendiri.
- **Nilai default dari dialog** hanya dipakai bila sumber tidak menyebut nilainya. Gaji selain IDR tidak ditampilkan.
- **Penutupan otomatis:** job portal ditutup sendiri ketika listing sumbernya menjadi `stale`/`expired`.

Lamaran untuk job eksternal:
- **Ada email rekrutmen** (diisi admin): kandidat melamar di KarirConnect. Lamaran diteruskan lewat SMTP (`EXTERNAL_JOBS_RELAY_MAILER`, default `smtp`) dengan Reply-To ke kandidat dan CV terlampir. Status tercatat di `applications.relayed_at` / `relay_error`. Notifikasi ke "employer" tidak dikirim, karena tidak ada akun pemberi kerja.
- **Tanpa email rekrutmen**: tombol menjadi "Lamar di situs perusahaan" (apply URL asli), dan endpoint lamaran menolak.

## 6. Katalog bawaan dan tempel URL (tanpa form sumber)

Dialog Scrap mengirim `POST /admin/scraper/scrape` dengan:
- `catalog[]` — kunci dari `config/job_catalog.php`,
- `urls[]` — maks. 5 URL https yang ditempel,
- `source_ids[]` — sumber yang pernah ditambahkan lewat URL.

Sumbernya dibuat otomatis (`katalog-*` / `url-*`) oleh `App\Services\ExternalJobs\ExternalSourceCatalog`.

| Katalog | Tipe | Aturan dari pemilik feed |
|---|---|---|
| Xendit, Ninja Van, Binance, OKX | Greenhouse/Lever resmi, `location_keywords` Indonesia | Relay email boleh bila email rekrutmen diisi |
| Jobicy (APAC) | `job_feed` | Atribusi + link; lamar di URL asli |
| Remote OK | `job_feed` | Link balik dofollow + sebut "Remote OK"; logo Remote OK tidak dipakai |
| Himalayas | `job_feed` | Atribusi; lamar di URL asli |
| Remotive | `job_feed` | Atribusi + link; **tanpa JSON-LD** (tidak boleh ke Google Jobs) |

Aturan disimpan di `job_sources.config.rules` dan diterapkan oleh `Job::externalRules()`:
- tautan "Sumber: …" di halaman lowongan,
- relay email dimatikan,
- schema `JobPosting` tidak dikirim (khusus Remotive).

Deteksi URL yang ditempel:
- `job-boards.greenhouse.io/<token>` -> Greenhouse.
- `jobs.lever.co/<slug>` -> Lever.
- `*.xml` -> sitemap.
- Selain itu -> halaman karier. Engine browser diizinkan, dan link yang tampak seperti lowongan (`/jobs/`, `/karir/`, `/lowongan/`, …) diikuti.

Domain di `blocked_domains` langsung ditolak dengan alasannya: Glints, Kalibrr, JobStreet, Indeed, LinkedIn, Jora, KitaLulus, Loker.id. Untuk situs lain, robots.txt dan CAPTCHA dicek di setiap crawl.
