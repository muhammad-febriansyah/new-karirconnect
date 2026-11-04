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
        Schema::create('scraped_job_listing_skill', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('scraped_job_listing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->string('proficiency', 24)->nullable();
            $table->boolean('is_required')->default(false);
            $table->timestamps();

            $table->unique(['scraped_job_listing_id', 'skill_id'], 'scraped_listing_skill_unique');
            $table->index('skill_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scraped_job_listing_skill');
    }
};
