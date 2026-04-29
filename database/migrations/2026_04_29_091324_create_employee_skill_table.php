<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_skill', function (Blueprint $table): void {
            $table->foreignId('employee_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->string('level', 16)->nullable();
            $table->unsignedTinyInteger('years_experience')->nullable();
            $table->boolean('is_endorsed_by_assessment')->default(false);
            $table->timestamps();

            $table->primary(['employee_profile_id', 'skill_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_skill');
    }
};
