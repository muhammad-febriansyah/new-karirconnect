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
        Schema::create('scraped_job_listings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('job_source_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scraped_company_id')->nullable()->constrained()->nullOnDelete();
            $table->string('external_id', 191);
            // Content fields mirror `job_posts` one to one so publishing a
            // listing to the portal later is a straight copy. Anything the
            // source does not provide stays null; nothing is guessed.
            $table->foreignId('job_category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 180);
            $table->longText('description')->nullable();
            $table->longText('responsibilities')->nullable();
            $table->longText('requirements')->nullable();
            $table->longText('benefits')->nullable();
            $table->string('employment_type', 32)->nullable();
            $table->string('work_arrangement', 32)->nullable();
            $table->string('experience_level', 32)->nullable();
            $table->string('min_education', 32)->nullable();
            $table->unsignedBigInteger('salary_min')->nullable();
            $table->unsignedBigInteger('salary_max')->nullable();
            $table->char('salary_currency', 3)->nullable();
            $table->boolean('is_salary_visible')->default(false);
            $table->foreignId('province_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->date('application_deadline')->nullable();
            $table->timestamp('published_at')->nullable();
            // Crawl-only fields.
            $table->string('location_text', 255)->nullable();
            $table->string('apply_url', 2048);
            $table->json('raw_attributes')->nullable();
            $table->char('content_hash', 64);
            $table->string('status', 16)->default('active');
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->timestamps();

            $table->unique(['job_source_id', 'external_id']);
            $table->index('content_hash');
            $table->index(['status', 'published_at']);
            $table->index(['job_source_id', 'status']);
            $table->index(['employment_type', 'work_arrangement']);
            $table->index('city_id');
            $table->index('job_category_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scraped_job_listings');
    }
};
