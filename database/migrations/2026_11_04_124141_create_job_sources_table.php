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
        Schema::create('job_sources', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 150);
            $table->string('slug', 160)->unique();
            $table->string('type', 32)->index();
            $table->string('base_url', 2048);
            $table->json('allowed_domains');
            $table->json('config')->nullable();
            $table->string('status', 32)->default('pending_permission');
            $table->text('permission_notes')->nullable();
            $table->timestamp('robots_checked_at')->nullable();
            $table->unsignedInteger('schedule_minutes')->default(1440);
            $table->unsignedSmallInteger('rate_limit_per_minute')->default(30);
            $table->unsignedSmallInteger('max_pages')->default(20);
            $table->unsignedInteger('expected_min_items')->default(0);
            $table->boolean('browser_allowed')->default(false);
            $table->unsignedSmallInteger('consecutive_failures')->default(0);
            $table->string('circuit_state', 16)->default('closed');
            $table->timestamp('circuit_open_until')->nullable();
            $table->timestamp('cooldown_until')->nullable();
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('last_success_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'cooldown_until']);
            $table->index('circuit_state');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_sources');
    }
};
