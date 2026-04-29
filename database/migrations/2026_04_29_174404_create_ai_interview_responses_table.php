<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_interview_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('session_id')->constrained('ai_interview_sessions')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('ai_interview_questions')->cascadeOnDelete();
            $table->longText('answer_text')->nullable();
            $table->string('audio_url', 500)->nullable();
            $table->longText('transcript')->nullable();
            $table->unsignedSmallInteger('duration_seconds')->nullable();
            $table->unsignedTinyInteger('ai_score')->nullable();
            $table->json('sub_scores')->nullable();
            $table->text('ai_feedback')->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();

            $table->unique(['session_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_interview_responses');
    }
};
