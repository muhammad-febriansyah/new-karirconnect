<?php

use Database\Seeders\AssessmentQuestionSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Without any active questions, `SkillAssessmentService::start()` refuses
     * every skill (`Belum ada soal aktif untuk skill ini.`), so "Tes Skill"
     * was unusable end to end. Seeds a starter set for the ten most-required
     * skills (by job post + candidate profile usage) so the feature works;
     * AssessmentQuestionSeeder is idempotent and skips any skill that already
     * has questions.
     */
    public function up(): void
    {
        (new AssessmentQuestionSeeder)->run();
    }

    public function down(): void
    {
        // Data migration — no structural rollback.
    }
};
