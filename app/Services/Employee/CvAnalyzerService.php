<?php

namespace App\Services\Employee;

use App\Models\CandidateCv;

/**
 * Skeleton for CV analysis. The full implementation lands in Sprint 7 once
 * the AI provider abstraction is wired up — for now this just performs a
 * lightweight metadata extraction (page count) so the builder UI can show
 * something useful without blocking on AI.
 */
class CvAnalyzerService
{
    /**
     * Run analysis on a CV. Returns the analyzed_json payload that has been
     * persisted on the model.
     *
     * @return array<string, mixed>
     */
    public function analyze(CandidateCv $cv): array
    {
        $payload = [
            'analyzed_at' => now()->toIso8601String(),
            'analyzer_version' => 'stub-v0',
            'extracted' => [
                'pages_count' => $cv->pages_count,
            ],
            // AI-generated fields populated in Sprint 7:
            //   "summary", "skills", "experience_years", "education_level",
            //   "fit_signals", "improvement_suggestions"
            'pending_ai_analysis' => true,
        ];

        $cv->forceFill(['analyzed_json' => $payload])->save();

        return $payload;
    }
}
