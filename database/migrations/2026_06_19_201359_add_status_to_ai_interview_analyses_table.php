<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_interview_analyses', function (Blueprint $table): void {
            // 'completed' = AI produced a valid scorecard. 'needs_review' = the
            // model failed or returned invalid output after retries, so a human
            // must judge the transcript instead of trusting a fabricated score.
            $table->string('status', 24)->default('completed')->after('session_id');
        });

        // Allow null scores so a failed analysis is not misread as a real "0".
        Schema::table('ai_interview_analyses', function (Blueprint $table): void {
            $table->unsignedTinyInteger('overall_score')->nullable()->change();
            $table->unsignedTinyInteger('fit_score')->nullable()->change();
            $table->string('recommendation', 24)->nullable()->change();
            $table->longText('summary')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('ai_interview_analyses', function (Blueprint $table): void {
            $table->dropColumn('status');
        });
    }
};
