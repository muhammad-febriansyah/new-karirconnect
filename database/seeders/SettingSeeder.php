<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

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
                'logo_path' => ['label' => 'Logo (Light)', 'type' => 'file', 'is_public' => true],
                'logo_dark_path' => ['label' => 'Logo (Dark)', 'type' => 'file', 'is_public' => true],
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
                'provider' => ['label' => 'Penyedia AI', 'value' => 'openai'],
                'api_key' => ['label' => 'API Key', 'type' => 'password'],
                'model_chat' => ['label' => 'Model Chat (Career Coach)', 'value' => 'gpt-4o-mini'],
                'model_interview' => ['label' => 'Model AI Interview', 'value' => 'gpt-4o'],
                'model_embed' => ['label' => 'Model Embedding', 'value' => 'text-embedding-3-small'],
                'max_tokens' => ['label' => 'Max Tokens', 'type' => 'int', 'value' => '2048'],
            ],
            'payment' => [
                'duitku_merchant_code' => ['label' => 'Duitku Merchant Code'],
                'duitku_api_key' => ['label' => 'Duitku API Key', 'type' => 'password'],
                'duitku_environment' => ['label' => 'Mode (sandbox/production)', 'value' => 'sandbox'],
                'duitku_callback_url' => ['label' => 'URL Callback'],
                'duitku_return_url' => ['label' => 'URL Return'],
            ],
            'email' => [
                'mail_driver' => ['label' => 'Mail Driver', 'value' => 'log'],
                'mail_from_address' => ['label' => 'From Address', 'value' => 'noreply@karirconnect.test'],
                'mail_from_name' => ['label' => 'From Name', 'value' => 'KarirConnect'],
                'smtp_host' => ['label' => 'SMTP Host'],
                'smtp_port' => ['label' => 'SMTP Port', 'type' => 'int', 'value' => '587'],
                'smtp_username' => ['label' => 'SMTP Username'],
                'smtp_password' => ['label' => 'SMTP Password', 'type' => 'password'],
                'smtp_encryption' => ['label' => 'SMTP Encryption', 'value' => 'tls'],
            ],
            'feature_flags' => [
                'ai_interview_enabled' => ['label' => 'AI Interview', 'type' => 'bool', 'value' => '1', 'is_public' => true],
                'ai_coach_enabled' => ['label' => 'AI Career Coach', 'type' => 'bool', 'value' => '1', 'is_public' => true],
                'talent_search_enabled' => ['label' => 'Talent Search', 'type' => 'bool', 'value' => '1', 'is_public' => true],
                'company_reviews_enabled' => ['label' => 'Company Reviews', 'type' => 'bool', 'value' => '1', 'is_public' => true],
                'salary_insight_enabled' => ['label' => 'Salary Insight', 'type' => 'bool', 'value' => '1', 'is_public' => true],
                'cv_builder_enabled' => ['label' => 'CV Builder', 'type' => 'bool', 'value' => '1', 'is_public' => true],
                'registration_enabled' => ['label' => 'Pendaftaran Terbuka', 'type' => 'bool', 'value' => '1', 'is_public' => true],
            ],
            'legal' => [
                'terms_body' => ['label' => 'Syarat & Ketentuan', 'type' => 'text', 'is_public' => true],
                'privacy_body' => ['label' => 'Kebijakan Privasi', 'type' => 'text', 'is_public' => true],
                'cookie_body' => ['label' => 'Kebijakan Cookie', 'type' => 'text', 'is_public' => true],
            ],
        ];
    }
}
