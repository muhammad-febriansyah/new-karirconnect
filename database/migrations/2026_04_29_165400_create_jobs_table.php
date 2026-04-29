<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_posts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('posted_by_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('job_category_id')->constrained()->restrictOnDelete();
            $table->string('title', 180);
            $table->string('slug', 200)->unique();
            $table->longText('description')->nullable();
            $table->longText('responsibilities')->nullable();
            $table->longText('requirements')->nullable();
            $table->longText('benefits')->nullable();
            $table->string('employment_type', 32);
            $table->string('work_arrangement', 32);
            $table->string('experience_level', 32);
            $table->string('min_education', 32)->nullable();
            $table->unsignedBigInteger('salary_min')->nullable();
            $table->unsignedBigInteger('salary_max')->nullable();
            $table->boolean('is_salary_visible')->default(true);
            $table->foreignId('province_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 24)->default('draft');
            $table->date('application_deadline')->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->timestamp('featured_until')->nullable();
            $table->unsignedInteger('views_count')->default(0);
            $table->unsignedInteger('applications_count')->default(0);
            $table->unsignedTinyInteger('ai_match_threshold')->nullable();
            $table->boolean('auto_invite_ai_interview')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['status', 'published_at']);
            $table->index(['city_id', 'status']);
            $table->index(['employment_type', 'work_arrangement']);
            $table->index('is_featured');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_posts');
    }
};
