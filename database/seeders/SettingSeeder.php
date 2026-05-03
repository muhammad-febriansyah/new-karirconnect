<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        Setting::query()
            ->where('group', 'branding')
            ->where('key', 'logo_dark_path')
            ->delete();

        Setting::query()
            ->where('group', 'email')
            ->whereIn('key', [
                'smtp_host',
                'smtp_port',
                'smtp_username',
                'smtp_password',
                'smtp_encryption',
            ])
            ->delete();

        $rows = [];
        $sort = 0;

        foreach ($this->definitions() as $group => $items) {
            foreach ($items as $key => $meta) {
                $rows[] = [
                    'group' => $group,
                    'key' => $key,
                    'value' => $meta['value'] ?? null,
                    'type' => $meta['type'] ?? 'string',
                    'label' => $meta['label'],
                    'description' => $meta['description'] ?? null,
                    'is_public' => $meta['is_public'] ?? false,
                    'sort_order' => $sort++,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        Setting::query()->upsert(
            $rows,
            uniqueBy: ['group', 'key'],
            update: ['type', 'label', 'description', 'is_public', 'sort_order', 'updated_at'],
        );
    }

    /**
     * Default platform settings. Edit via /admin/settings later.
     *
     * @return array<string, array<string, array<string, mixed>>>
     */
    private function definitions(): array
    {
        return [
            'general' => [
                'app_name' => ['label' => 'Nama Aplikasi', 'value' => 'KarirConnect', 'is_public' => true],
                'app_tagline' => ['label' => 'Tagline', 'value' => 'Temukan karir impianmu', 'is_public' => true],
                'contact_email' => ['label' => 'Email Kontak', 'value' => 'support@karirconnect.test', 'is_public' => true],
                'contact_phone' => ['label' => 'Nomor Kontak', 'value' => '', 'is_public' => true],
                'timezone' => ['label' => 'Zona Waktu', 'value' => 'Asia/Jakarta'],
                'default_locale' => ['label' => 'Bahasa Default', 'value' => 'id', 'is_public' => true],
            ],
            'branding' => [
                'logo_path' => ['label' => 'Logo', 'type' => 'file', 'is_public' => true],
                'favicon_path' => ['label' => 'Favicon', 'type' => 'file', 'is_public' => true],
                'primary_color' => ['label' => 'Warna Utama (HEX)', 'value' => '#0F172A', 'is_public' => true],
                'login_background_path' => ['label' => 'Background Login', 'type' => 'file', 'is_public' => true],
            ],
            'seo' => [
                'meta_title' => ['label' => 'Meta Title', 'value' => 'KarirConnect — Job Portal Indonesia', 'is_public' => true],
                'meta_description' => [
                    'label' => 'Meta Description',
                    'type' => 'text',
                    'value' => 'Platform pencarian kerja terbaik dengan AI Interview, Career Coach, dan ribuan lowongan dari perusahaan terverifikasi.',
                    'is_public' => true,
                ],
                'meta_keywords' => [
                    'label' => 'Meta Keywords',
                    'type' => 'text',
                    'value' => 'lowongan kerja, karir, job portal, ai interview, recruitment, hr',
                    'is_public' => true,
                ],
                'og_image_path' => ['label' => 'OG Image', 'type' => 'file', 'is_public' => true],
                'google_analytics_id' => ['label' => 'Google Analytics ID', 'value' => '', 'is_public' => true],
                'google_tag_manager_id' => ['label' => 'Google Tag Manager ID', 'value' => '', 'is_public' => true],
            ],
            'ai' => [
                'provider' => ['label' => 'Penyedia AI', 'value' => 'openai', 'description' => 'Pilih: openai (default) atau fake untuk debugging.'],
                'api_key' => ['label' => 'API Key', 'type' => 'password', 'description' => 'API key dari penyedia (mis. OpenAI). Disimpan terenkripsi.'],
                'base_url' => ['label' => 'Base URL', 'value' => 'https://api.openai.com/v1', 'description' => 'Override jika pakai OpenAI-compatible endpoint (Azure / proxy).'],
                'model_chat' => ['label' => 'Model Chat (Career Coach)', 'value' => 'gpt-4o-mini'],
                'model_interview' => ['label' => 'Model AI Interview', 'value' => 'gpt-4o-mini'],
                'model_embed' => ['label' => 'Model Embedding', 'value' => 'text-embedding-3-small'],
                'max_tokens' => ['label' => 'Max Tokens per Request', 'type' => 'int', 'value' => '2048', 'description' => 'Batas token output. Set 0 untuk membiarkan provider menentukan.'],
                'cost_input_per_1k' => ['label' => 'Cost Input / 1K token (USD)', 'type' => 'float', 'value' => '0.00015', 'description' => 'Untuk audit biaya. Update jika provider mengubah harga.'],
                'cost_output_per_1k' => ['label' => 'Cost Output / 1K token (USD)', 'type' => 'float', 'value' => '0.0006'],
            ],
            'payment' => [
                'duitku_merchant_code' => ['label' => 'Duitku Merchant Code'],
                'duitku_api_key' => ['label' => 'Duitku API Key', 'type' => 'password'],
                'duitku_environment' => ['label' => 'Mode (sandbox/production)', 'value' => 'sandbox'],
                'duitku_callback_url' => ['label' => 'URL Callback'],
                'duitku_return_url' => ['label' => 'URL Return'],
            ],
            'email' => [
                'mail_driver' => ['label' => 'Mail Driver', 'value' => 'mailketing', 'description' => 'Pilih: mailketing (default) atau log untuk debugging.'],
                'mail_from_address' => ['label' => 'From Address', 'value' => 'noreply@karirconnect.test'],
                'mail_from_name' => ['label' => 'From Name', 'value' => 'KarirConnect'],
                'mailketing_api_token' => ['label' => 'Mailketing API Token', 'type' => 'password', 'description' => 'Diambil dari menu Integration di dashboard Mailketing.'],
            ],
            'security' => [
                'recaptcha_enabled' => ['label' => 'Aktifkan reCAPTCHA v3', 'type' => 'bool', 'value' => '0', 'is_public' => true],
                'recaptcha_site_key' => ['label' => 'reCAPTCHA Site Key', 'is_public' => true, 'description' => 'Dipakai di frontend untuk render token v3.'],
                'recaptcha_secret_key' => ['label' => 'reCAPTCHA Secret Key', 'type' => 'password', 'description' => 'Dipakai backend untuk verifikasi token ke Google.'],
            ],
            'integrations' => [
                'google_client_id' => ['label' => 'Google OAuth Client ID', 'description' => 'Untuk integrasi Google Calendar / Meet di interview employer.'],
                'google_client_secret' => ['label' => 'Google OAuth Client Secret', 'type' => 'password'],
            ],
            'feature_flags' => [
                'ai_interview_enabled' => [
                    'label' => 'AI Interview',
                    'type' => 'bool',
                    'value' => '1',
                    'is_public' => true,
                    'description' => 'Mengizinkan kandidat menjalani sesi wawancara berbasis AI untuk lowongan tertentu.',
                ],
                'ai_coach_enabled' => [
                    'label' => 'AI Career Coach',
                    'type' => 'bool',
                    'value' => '1',
                    'is_public' => true,
                    'description' => 'Membuka chatbot karir berbasis AI di dashboard kandidat.',
                ],
                'talent_search_enabled' => [
                    'label' => 'Talent Search',
                    'type' => 'bool',
                    'value' => '1',
                    'is_public' => true,
                    'description' => 'Mengaktifkan pencarian kandidat oleh perusahaan dari database CV publik.',
                ],
                'company_reviews_enabled' => [
                    'label' => 'Ulasan Perusahaan',
                    'type' => 'bool',
                    'value' => '1',
                    'is_public' => true,
                    'description' => 'Mengizinkan kandidat memberi ulasan & rating ke perusahaan.',
                ],
                'salary_insight_enabled' => [
                    'label' => 'Insight Gaji',
                    'type' => 'bool',
                    'value' => '1',
                    'is_public' => true,
                    'description' => 'Menampilkan halaman insight gaji publik dan menerima submission dari kandidat.',
                ],
                'cv_builder_enabled' => [
                    'label' => 'CV Builder',
                    'type' => 'bool',
                    'value' => '1',
                    'is_public' => true,
                    'description' => 'Mengaktifkan tool pembuat CV otomatis untuk kandidat.',
                ],
                'registration_enabled' => [
                    'label' => 'Pendaftaran Terbuka',
                    'type' => 'bool',
                    'value' => '1',
                    'is_public' => true,
                    'description' => 'Jika dimatikan, registrasi user baru akan ditutup sementara.',
                ],
                'ai_interview_practice_monthly_limit' => [
                    'label' => 'Kuota AI Interview Praktik / Bulan (Free)',
                    'type' => 'int',
                    'value' => '10',
                    'is_public' => false,
                    'description' => 'Jumlah maksimum sesi AI interview praktik yang bisa dijalankan kandidat free per bulan. 0 = tanpa batas.',
                ],
            ],
            'legal' => [
                'terms_body' => ['label' => 'Syarat & Ketentuan', 'type' => 'text', 'is_public' => true],
                'privacy_body' => ['label' => 'Kebijakan Privasi', 'type' => 'text', 'is_public' => true],
                'cookie_body' => ['label' => 'Kebijakan Cookie', 'type' => 'text', 'is_public' => true],
            ],
        ];
    }
}
