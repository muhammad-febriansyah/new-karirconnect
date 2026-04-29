<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_interview_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('session_id')->constrained('ai_interview_sessions')->cascadeOnDelete();
            $table->unsignedSmallInteger('order_number');
            $table->string('category', 24)->default('technical');
            $table->text('question');
            $table->text('context')->nullable();
            $table->json('expected_keywords')->nullable();
            $table->unsignedSmallInteger('max_duration_seconds')->default(120);
            $table->timestamps();

            $table->index(['session_id', 'order_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_interview_questions');
    }
};
