<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->string('stage', 32);
            $table->string('mode', 16);
            $table->string('title', 200);
            $table->timestamp('scheduled_at');
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->timestamp('ends_at')->nullable();
            $table->string('timezone', 64)->default('Asia/Jakarta');
            $table->string('status', 24)->default('scheduled');

            // online fields
            $table->string('meeting_provider', 32)->nullable();
            $table->string('meeting_url', 500)->nullable();
            $table->string('meeting_id', 200)->nullable();
            $table->string('meeting_passcode', 64)->nullable();

            // onsite fields
            $table->string('location_name', 200)->nullable();
            $table->text('location_address')->nullable();
            $table->string('location_map_url', 500)->nullable();

            // ai fields (FK to ai_interview_sessions added in Sprint 7)
            $table->unsignedBigInteger('ai_session_id')->nullable();

            // shared
            $table->longText('candidate_instructions')->nullable();
            $table->text('internal_notes')->nullable();
            $table->boolean('requires_confirmation')->default(true);
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('reminder_sent_at')->nullable();
            $table->string('recording_url', 500)->nullable();
            $table->boolean('recording_consent')->default(false);
            $table->foreignId('scheduled_by_user_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index('application_id');
            $table->index(['scheduled_at', 'status']);
            $table->index(['stage', 'status']);
            $table->index('scheduled_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interviews');
    }
};
