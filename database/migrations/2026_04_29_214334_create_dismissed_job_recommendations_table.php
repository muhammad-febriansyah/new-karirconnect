<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dismissed_job_recommendations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_profile_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->foreignId('job_id')->constrained('job_posts')->cascadeOnDelete();
            $table->timestamp('dismissed_at');
            $table->timestamps();

            $table->unique(['employee_profile_id', 'job_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dismissed_job_recommendations');
    }
};
