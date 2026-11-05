<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * When the company website was last searched for a recruitment email.
     */
    public function up(): void
    {
        Schema::table('scraped_companies', function (Blueprint $table) {
            $table->timestamp('contact_checked_at')->nullable()->after('recruitment_email_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('scraped_companies', function (Blueprint $table) {
            $table->dropColumn('contact_checked_at');
        });
    }
};
