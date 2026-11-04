<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('scraped_job_listings', function (Blueprint $table): void {
            // An application email written in the posting itself.
            $table->string('contact_email')->nullable()->after('apply_url');
        });

        Schema::table('scraped_companies', function (Blueprint $table): void {
            // Where an automatically filled recruitment email was found.
            $table->string('recruitment_email_source', 2048)->nullable()->after('recruitment_email');
            $table->timestamp('recruitment_email_verified_at')->nullable()->after('recruitment_email_source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scraped_job_listings', function (Blueprint $table): void {
            $table->dropColumn('contact_email');
        });

        Schema::table('scraped_companies', function (Blueprint $table): void {
            $table->dropColumn(['recruitment_email_source', 'recruitment_email_verified_at']);
        });
    }
};
