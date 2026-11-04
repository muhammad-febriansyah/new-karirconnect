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
        Schema::create('scraped_job_origins', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('scraped_job_listing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_source_id')->constrained()->cascadeOnDelete();
            $table->string('external_id', 191);
            $table->string('source_url', 2048);
            $table->foreignId('last_crawl_run_id')->nullable()->constrained('crawl_runs')->nullOnDelete();
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->timestamps();

            $table->unique(['job_source_id', 'external_id']);
            $table->index('scraped_job_listing_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scraped_job_origins');
    }
};
