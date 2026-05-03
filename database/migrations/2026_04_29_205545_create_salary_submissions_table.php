<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_submissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->foreignId('job_category_id')->nullable()->constrained('job_categories')->nullOnDelete();
            $table->foreignId('city_id')->nullable()->constrained('cities')->nullOnDelete();
            $table->foreignId('province_id')->nullable()->constrained('provinces')->nullOnDelete();
            $table->string('job_title', 200);
            $table->string('experience_level', 16)->index();
            $table->unsignedInteger('experience_years')->default(0);
            $table->string('employment_type', 24)->default('full_time');
            $table->unsignedInteger('salary_idr');
            $table->unsignedInteger('bonus_idr')->default(0);
            $table->boolean('is_anonymous')->default(true);
            $table->boolean('is_verified')->default(false);
            $table->string('status', 16)->default('pending')->index();
            $table->foreignId('moderated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();

            $table->index(['job_category_id', 'experience_level', 'status']);
            $table->index(['city_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_submissions');
    }
};
