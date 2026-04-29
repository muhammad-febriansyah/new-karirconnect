<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 200);
            $table->unsignedTinyInteger('rating')->default(0);
            $table->unsignedTinyInteger('rating_management')->nullable();
            $table->unsignedTinyInteger('rating_culture')->nullable();
            $table->unsignedTinyInteger('rating_compensation')->nullable();
            $table->unsignedTinyInteger('rating_growth')->nullable();
            $table->unsignedTinyInteger('rating_balance')->nullable();
            $table->text('pros')->nullable();
            $table->text('cons')->nullable();
            $table->text('advice_to_management')->nullable();
            $table->string('employment_status', 16)->default('current')->index();
            $table->string('employment_type', 24)->nullable();
            $table->string('job_title', 120)->nullable();
            $table->boolean('would_recommend')->default(false);
            $table->boolean('is_anonymous')->default(true);
            $table->string('status', 16)->default('pending')->index();
            $table->foreignId('moderated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->text('moderation_note')->nullable();
            $table->foreignId('responded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('response_body')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->unsignedInteger('helpful_count')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'user_id']);
            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_reviews');
    }
};
