<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_interview_analyses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('session_id')->unique()->constrained('ai_interview_sessions')->cascadeOnDelete();
            $table->unsignedTinyInteger('overall_score');
            $table->unsignedTinyInteger('fit_score');
            $table->string('recommendation', 24);
            $table->longText('summary');
            $table->json('strengths')->nullable();
            $table->json('weaknesses')->nullable();
            $table->json('skill_assessment')->nullable();
            $table->unsignedTinyInteger('communication_score')->nullable();
            $table->unsignedTinyInteger('technical_score')->nullable();
            $table->unsignedTinyInteger('problem_solving_score')->nullable();
            $table->unsignedTinyInteger('culture_fit_score')->nullable();
            $table->json('red_flags')->nullable();
            $table->timestamp('generated_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_interview_analyses');
    }
};
