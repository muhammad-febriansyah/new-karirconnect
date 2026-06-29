<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            // One-time trial guard: stamped when a company first redeems the
            // free trial so it can never be granted twice.
            $table->timestamp('trial_redeemed_at')->nullable()->after('onboarding_completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->dropColumn('trial_redeemed_at');
        });
    }
};
