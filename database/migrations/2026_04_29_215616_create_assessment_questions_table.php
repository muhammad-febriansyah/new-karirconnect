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
        Schema::create('assessment_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('skill_id')->constrained('skills')->cascadeOnDelete();
            $table->string('type', 32)->default('multiple_choice');
            $table->longText('question');
            $table->json('options')->nullable();
            $table->json('correct_answer');
            $table->string('difficulty', 16)->default('medium')->index();
            $table->unsignedSmallInteger('time_limit_seconds')->default(300);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['skill_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_questions');
    }
};
