<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_candidates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('candidate_profile_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->foreignId('saved_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('label', 64)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('saved_at')->useCurrent();
            $table->timestamps();

            $table->unique(['company_id', 'candidate_profile_id']);
            $table->index(['company_id', 'saved_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_candidates');
    }
};
