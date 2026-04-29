<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tier', 32)->index();
            $table->unsignedInteger('price_idr');
            $table->unsignedSmallInteger('billing_period_days')->default(30);
            $table->unsignedSmallInteger('job_post_quota')->default(0);
            $table->unsignedSmallInteger('featured_credits')->default(0);
            $table->unsignedSmallInteger('ai_interview_credits')->default(0);
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
