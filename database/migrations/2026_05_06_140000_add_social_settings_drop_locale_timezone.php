<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')
            ->where('group', 'general')
            ->whereIn('key', ['timezone', 'default_locale'])
            ->delete();

        $now = now();
        $maxSort = (int) DB::table('settings')->max('sort_order');

        $rows = [
            [
                'key' => 'linkedin_url',
                'label' => 'LinkedIn',
                'value' => 'https://www.linkedin.com/company/karirconnect',
                'description' => 'URL profil LinkedIn perusahaan. Kosongkan untuk menyembunyikan ikon.',
            ],
            [
                'key' => 'instagram_url',
                'label' => 'Instagram',
                'value' => 'https://www.instagram.com/karirconnect.id',
                'description' => null,
            ],
            [
                'key' => 'twitter_url',
                'label' => 'Twitter / X',
                'value' => 'https://twitter.com/karirconnect',
                'description' => null,
            ],
            [
                'key' => 'facebook_url',
                'label' => 'Facebook',
                'value' => 'https://www.facebook.com/karirconnect',
                'description' => null,
            ],
            [
                'key' => 'youtube_url',
                'label' => 'YouTube',
                'value' => 'https://www.youtube.com/@karirconnect',
                'description' => null,
            ],
            [
                'key' => 'tiktok_url',
                'label' => 'TikTok',
                'value' => 'https://www.tiktok.com/@karirconnect',
                'description' => null,
            ],
        ];

        foreach ($rows as $i => $row) {
            DB::table('settings')->updateOrInsert(
                ['group' => 'social', 'key' => $row['key']],
                [
                    'group' => 'social',
                    'key' => $row['key'],
                    'value' => $row['value'],
                    'type' => 'string',
                    'label' => $row['label'],
                    'description' => $row['description'],
                    'is_public' => true,
                    'sort_order' => $maxSort + 1 + $i,
                    'updated_at' => $now,
                    'created_at' => $now,
                ],
            );
        }

        Cache::forget('settings.all');
    }

    public function down(): void
    {
        DB::table('settings')->where('group', 'social')->delete();
        Cache::forget('settings.all');
    }
};
