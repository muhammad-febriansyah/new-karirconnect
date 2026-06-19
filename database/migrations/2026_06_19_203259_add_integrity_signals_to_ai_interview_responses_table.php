<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_interview_responses', function (Blueprint $table): void {
            // Soft integrity signals captured client-side during text answers.
            // Surfaced to recruiters as flags, never used to auto-reject.
            $table->unsignedSmallInteger('paste_count')->nullable()->after('duration_seconds');
            $table->unsignedSmallInteger('focus_loss_count')->nullable()->after('paste_count');
        });
    }

    public function down(): void
    {
        Schema::table('ai_interview_responses', function (Blueprint $table): void {
            $table->dropColumn(['paste_count', 'focus_loss_count']);
        });
    }
};
