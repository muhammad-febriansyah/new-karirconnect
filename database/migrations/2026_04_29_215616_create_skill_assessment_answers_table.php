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
        Schema::create('skill_assessment_answers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('assessment_id')->constrained('skill_assessments')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('assessment_questions')->cascadeOnDelete();
            $table->json('answer')->nullable();
            $table->boolean('is_correct')->default(false);
            $table->unsignedSmallInteger('time_spent_seconds')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->unique(['assessment_id', 'question_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('skill_assessment_answers');
    }
};
