<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Links a portal job to the scraped listing it was published from. The
     * unique key is what guarantees one listing is never published twice.
     */
    public function up(): void
    {
        Schema::table('job_posts', function (Blueprint $table): void {
            $table->foreignId('scraped_job_listing_id')->nullable()->after('company_id')->unique()
                ->constrained('scraped_job_listings')->nullOnDelete();
            $table->string('external_apply_url', 2048)->nullable()->after('application_deadline');
        });

        Schema::table('scraped_companies', function (Blueprint $table): void {
            // Entered by an admin. Applications to this company's external
            // jobs are relayed here; never filled automatically.
            $table->string('recruitment_email')->nullable()->after('email');
        });

        Schema::table('applications', function (Blueprint $table): void {
            $table->timestamp('relayed_at')->nullable();
            $table->string('relay_error', 500)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_posts', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('scraped_job_listing_id');
            $table->dropColumn('external_apply_url');
        });

        Schema::table('scraped_companies', function (Blueprint $table): void {
            $table->dropColumn('recruitment_email');
        });

        Schema::table('applications', function (Blueprint $table): void {
            $table->dropColumn(['relayed_at', 'relay_error']);
        });
    }
};
