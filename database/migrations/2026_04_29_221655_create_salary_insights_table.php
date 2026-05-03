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
        Schema::create('salary_insights', function (Blueprint $table): void {
            $table->id();
            $table->string('job_title');
            $table->string('role_category', 120)->index();
            $table->foreignId('city_id')->nullable()->constrained('cities')->nullOnDelete();
            $table->string('experience_level', 16)->index();
            $table->unsignedBigInteger('min_salary');
            $table->unsignedBigInteger('median_salary');
            $table->unsignedBigInteger('max_salary');
            $table->unsignedInteger('sample_size')->default(0);
            $table->string('source', 120)->default('manual');
            $table->timestamp('last_updated_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salary_insights');
    }
};
