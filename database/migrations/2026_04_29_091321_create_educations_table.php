<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_profile_id')->constrained()->cascadeOnDelete();
            $table->string('level', 16);
            $table->string('institution');
            $table->string('major')->nullable();
            $table->decimal('gpa', 3, 2)->nullable();
            $table->unsignedSmallInteger('start_year');
            $table->unsignedSmallInteger('end_year')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['employee_profile_id', 'start_year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educations');
    }
};
