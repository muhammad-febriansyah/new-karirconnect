# Job Scraper — Keamanan dan Kepatuhan

## Prinsip

1. **Hanya sumber yang mengizinkan.** API job board resmi, feed, sitemap, atau halaman dengan izin tertulis. Platform besar (Glints, JobStreet, LinkedIn, Indeed) disimpan sebagai `pending_permission` dan **tidak bisa diaktifkan** dari form. Mengaktifkannya butuh kemitraan atau API resmi.
2. **Tidak pernah mengakali penolakan.** 401/403, CAPTCHA, login wall, dan larangan robots.txt menghentikan run (`access_restricted`) tanpa mencoba engine lain, lalu sumber dijeda 24 jam. Tidak ada CAPTCHA solver, proxy berbayar, rotasi IP, maupun penyamaran user agent.
3. **Tidak mengarang data.** Nilai yang tidak dinyatakan sumber disimpan `NULL`.
4. **Output worker tidak tepercaya.** Laravel memvalidasi ulang setiap item dan menyanitasi HTML dengan `HtmlSanitizerService` (HTMLPurifier).

## Syarat mengaktifkan sumber

`JobSourceRequest` menolak status **Aktif** kecuali:

- **Dasar izin** (`permission_notes`) diisi.
- Kotak "robots.txt dan syarat layanan sudah diperiksa" dicentang. Waktunya tersimpan di `robots_checked_at`.
- Tipenya bukan `platform`.
- `base_url` dan `company_website` lolos SSRF guard.

## Kepatuhan robots.txt dan rate limit

- robots.txt dibaca per origin dan dipatuhi (`urllib.robotparser`, sesuai RFC 9309):
  - 4xx berarti tidak ada aturan.
  - 5xx berarti jangan crawl.
- `Crawl-delay` dipatuhi kalau lebih lambat dari `rate_limit_per_minute`.
- **429:** Retry-After ≤ 60 detik ditunggu dalam run. Kalau lebih lama, run berhenti dan sumber dijeda sepanjang Retry-After (maks. 24 jam).
- Retry hanya untuk error teknis (5xx, timeout, jaringan): maks. 3 percobaan dengan backoff eksponensial.
- `config.robots_override_permission` hanya bisa diset langsung di database, dan hanya bila ada izin tertulis.

## Proteksi SSRF

Berlaku di dua lapis:

| Lapis | Di mana | Cek |
|---|---|---|
| Laravel | `UrlSafetyGuard` saat sumber disimpan dan sebelum setiap run; saat unduh logo | https saja, port 443, tanpa kredensial di URL, bukan IP literal, host di allowlist (kecuali logo), semua hasil DNS harus IP publik |
| Python | `safety.UrlGuard` di **setiap** request dan **setiap** hop redirect (maks. 5) | Sama, plus redirect ke host di luar allowlist ditolak |

Alamat yang ditolak:
- Privat: 10/8, 172.16/12, 192.168/16.
- Loopback dan link-local, termasuk metadata cloud `169.254.169.254`.
- CGNAT 100.64/10, alamat reserved/benchmark.
- IPv6 ULA/link-local, dan IPv4-mapped IPv6.

**DNS rebinding:**
- Pengunduh logo mengunci koneksi ke IP yang sudah dicek (`CURLOPT_RESOLVE`).
- Worker HTTP memeriksa DNS tepat sebelum setiap request.
- **Sisa risiko:** Chromium me-resolve DNS sendiri. Mitigasinya: browser hanya untuk `generic_html` dengan `browser_allowed`, dan navigasi frame utama wajib di allowlist.

## Engine browser

- **Navigasi frame utama:** wajib ada di allowlist.
- **Subresource (script, CSS, XHR):** boleh ke host lain, asal https dan IP publik.
- **Iframe pihak ketiga** (mis. reCAPTCHA invisible di form lamaran): diblokir tanpa menggagalkan halaman.
- **Tidak dimuat:** gambar, video, dan font.
- **Dimatikan:** unduhan, service worker, dan popup.
- **Satu browser per mesin** (file lock).

## Input berbahaya

| Ancaman | Penanganan |
|---|---|
| XML entity expansion | Sitemap dengan `<!DOCTYPE`/`<!ENTITY` ditolak; ukuran maks. 20 MB setelah dekompresi |
| Respons sangat besar | Body > 10 MB ditolak; logo > 2 MB ditolak |
| XSS lewat deskripsi | HTMLPurifier dengan tag yang diizinkan saja; UI memakai `SafeHtml` |
| XSS lewat logo SVG | Hanya PNG/JPEG/GIF/WebP, dicek dari isi file (bukan header); dimensi ≤ 4096 px |
| Wildcard LIKE di pencarian | `LikeEscaper` + klausa `ESCAPE` |
| Shell injection | Worker dijalankan dengan argv array, tanpa shell |
| Regex pola URL | Maks. 200 karakter dan divalidasi; hanya admin yang bisa mengisi |

## Akses

- Semua rute di bawah `auth`, `verified`, `role:admin`, plus `JobSourcePolicy` per aksi.
- Aksi yang mengubah state memakai POST/PUT/PATCH/DELETE dengan CSRF.
- Audit log untuk create, update, delete, run, retry, cancel, dan visibility.

## Data pribadi

Yang disimpan hanya data lowongan dan profil perusahaan yang dipublikasikan sumber. Email dan telepon perusahaan diambil hanya bila dinyatakan di data terstruktur halaman perusahaan. Tidak ada data kandidat atau perekrut perorangan yang dikumpulkan.

## Docker

`bin/docker-worker`: container per run, root filesystem read-only, tanpa capability, `no-new-privileges`, user non-root (uid 10001), dengan batas memori, CPU, dan jumlah proses.
