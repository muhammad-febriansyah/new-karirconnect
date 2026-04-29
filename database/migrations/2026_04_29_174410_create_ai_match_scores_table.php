<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_match_scores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('job_id')->constrained('job_posts')->cascadeOnDelete();
            $table->foreignId('candidate_profile_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->unsignedTinyInteger('score');
            $table->json('breakdown')->nullable();
            $table->text('explanation')->nullable();
            $table->timestamp('computed_at');
            $table->timestamps();

            $table->unique(['job_id', 'candidate_profile_id']);
            $table->index('score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_match_scores');
    }
};
