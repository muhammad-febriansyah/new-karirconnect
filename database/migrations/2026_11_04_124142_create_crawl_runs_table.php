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
        Schema::create('crawl_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('job_source_id')->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique();
            $table->string('status', 32)->default('queued');
            $table->string('trigger', 16)->default('schedule');
            $table->foreignId('triggered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('retry_of_crawl_run_id')->nullable()->constrained('crawl_runs')->nullOnDelete();
            $table->string('engine_used', 32)->nullable();
            $table->json('engines_attempted')->nullable();
            $table->unsignedInteger('items_found')->default(0);
            $table->unsignedInteger('items_created')->default(0);
            $table->unsignedInteger('items_updated')->default(0);
            $table->unsignedInteger('items_unchanged')->default(0);
            $table->unsignedInteger('items_rejected')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->json('summary')->nullable();
            $table->timestamps();

            $table->index(['job_source_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crawl_runs');
    }
};
