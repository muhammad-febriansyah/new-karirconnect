<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_interview_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('candidate_profile_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->foreignId('job_id')->nullable()->constrained('job_posts')->restrictOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('ai_interview_templates')->restrictOnDelete();
            $table->string('mode', 16)->default('text');
            $table->string('language', 8)->default('id');
            $table->string('status', 24)->default('pending');
            $table->string('invitation_token', 64)->unique()->nullable();
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->string('recording_url', 500)->nullable();
            $table->longText('live_transcript')->nullable();
            $table->string('ai_provider', 32)->nullable();
            $table->string('ai_model', 64)->nullable();
            $table->longText('system_prompt_snapshot')->nullable();
            $table->unsignedTinyInteger('reschedule_count')->default(0);
            $table->boolean('is_practice')->default(false);
            $table->timestamps();

            $table->index(['candidate_profile_id', 'status']);
            $table->index(['application_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_interview_sessions');
    }
};
