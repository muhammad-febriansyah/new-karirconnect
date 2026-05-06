<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')
            ->where('group', 'payment')
            ->whereIn('key', [
                'duitku_merchant_code',
                'duitku_api_key',
                'duitku_environment',
                'duitku_callback_url',
                'duitku_return_url',
            ])
            ->delete();

        $now = now();
        $maxSort = (int) DB::table('settings')->max('sort_order');

        $rows = [
            [
                'key' => 'midtrans_merchant_id',
                'type' => 'string',
                'label' => 'Midtrans Merchant ID',
                'value' => '',
                'description' => 'Isi dari dashboard Midtrans (Settings → General).',
            ],
            [
                'key' => 'midtrans_client_key',
                'type' => 'string',
                'label' => 'Midtrans Client Key',
                'value' => '',
                'description' => 'Isi dari dashboard Midtrans (Settings → Access Keys).',
            ],
            [
                'key' => 'midtrans_server_key',
                'type' => 'password',
                'label' => 'Midtrans Server Key',
                'value' => '',
                'description' => 'Disimpan terenkripsi. Isi dari dashboard Midtrans (Settings → Access Keys). Dipakai untuk auth Snap API dan verifikasi signature notifikasi.',
            ],
            [
                'key' => 'midtrans_environment',
                'type' => 'string',
                'label' => 'Mode (sandbox/production)',
                'value' => 'production',
                'description' => 'Pilih: sandbox atau production.',
            ],
        ];

        foreach ($rows as $i => $row) {
            DB::table('settings')->updateOrInsert(
                ['group' => 'payment', 'key' => $row['key']],
                [
                    'group' => 'payment',
                    'key' => $row['key'],
                    'value' => $row['value'],
                    'type' => $row['type'],
                    'label' => $row['label'],
                    'description' => $row['description'],
                    'is_public' => false,
                    'sort_order' => $maxSort + 1 + $i,
                    'updated_at' => $now,
                    'created_at' => $now,
                ],
            );
        }

        DB::table('orders')
            ->where('payment_provider', 'duitku')
            ->update(['payment_provider' => 'midtrans']);

        DB::table('payment_transactions')
            ->where('provider', 'duitku')
            ->update(['provider' => 'midtrans']);

        Cache::forget('settings.all');
    }

    public function down(): void
    {
        DB::table('settings')
            ->where('group', 'payment')
            ->whereIn('key', [
                'midtrans_merchant_id',
                'midtrans_client_key',
                'midtrans_server_key',
                'midtrans_environment',
            ])
            ->delete();

        Cache::forget('settings.all');
    }
};
