<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('job_id')->constrained('job_posts')->cascadeOnDelete();
            $table->foreignId('employee_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('candidate_cv_id')->nullable()->constrained()->nullOnDelete();
            $table->longText('cover_letter')->nullable();
            $table->unsignedBigInteger('expected_salary')->nullable();
            $table->string('status', 32)->default('submitted');
            $table->unsignedTinyInteger('ai_match_score')->nullable();
            $table->unsignedTinyInteger('screening_score')->nullable();
            $table->string('current_stage', 32)->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['job_id', 'employee_profile_id']);
            $table->index(['job_id', 'status']);
            $table->index(['employee_profile_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
