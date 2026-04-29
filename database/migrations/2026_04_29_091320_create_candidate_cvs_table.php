<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidate_cvs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_profile_id')->constrained()->cascadeOnDelete();
            $table->string('label', 120);
            $table->string('source', 16)->default('upload');
            $table->string('file_path')->nullable();
            $table->unsignedSmallInteger('pages_count')->nullable();
            $table->json('analyzed_json')->nullable();
            $table->boolean('is_active')->default(false)->index();
            $table->timestamps();

            $table->index(['employee_profile_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_cvs');
    }
};
