<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('application_screening_answers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_screening_question_id')->constrained()->cascadeOnDelete();
            $table->json('answer')->nullable();
            $table->unsignedTinyInteger('score')->nullable();
            $table->boolean('is_knockout')->default(false);
            $table->timestamps();

            $table->unique(['application_id', 'job_screening_question_id'], 'asa_app_q_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_screening_answers');
    }
};
