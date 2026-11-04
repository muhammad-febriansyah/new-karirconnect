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
        Schema::create('crawl_errors', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('crawl_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_source_id')->constrained()->cascadeOnDelete();
            $table->string('engine', 32)->nullable();
            $table->string('category', 32);
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->string('url', 2048)->nullable();
            $table->text('message');
            $table->boolean('retryable')->default(false);
            $table->json('context')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['job_source_id', 'category']);
            $table->index(['category', 'occurred_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crawl_errors');
    }
};
