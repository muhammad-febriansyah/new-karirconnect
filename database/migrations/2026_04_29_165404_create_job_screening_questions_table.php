<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_screening_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('job_id')->constrained('job_posts')->cascadeOnDelete();
            $table->string('question', 500);
            $table->string('type', 32);
            $table->json('options')->nullable();
            $table->boolean('is_required')->default(true);
            $table->json('knockout_value')->nullable();
            $table->unsignedInteger('order_number')->default(0);
            $table->timestamps();

            $table->index(['job_id', 'order_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_screening_questions');
    }
};
