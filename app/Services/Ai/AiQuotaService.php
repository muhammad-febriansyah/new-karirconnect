<?php

namespace App\Services\Ai;

use App\Models\AiInterviewSession;
use App\Models\EmployeeProfile;
use App\Services\Settings\SettingService;
use Illuminate\Validation\ValidationException;

class AiQuotaService
{
    public function __construct(private readonly SettingService $settings) {}

    /**
     * Enforce per-candidate monthly practice-session quota. Recruiter-invited
     * sessions (with application_id) do not count — those are paid for by the
     * employer's subscription. Quota is configurable via setting
     * `feature_flags.ai_interview_practice_monthly_limit` (default 10).
     */
    public function ensurePracticeAllowed(EmployeeProfile $profile): void
    {
        $limit = (int) ($this->settings->get('feature_flags.ai_interview_practice_monthly_limit') ?? 10);

        if ($limit <= 0) {
            return;
        }

        $used = AiInterviewSession::query()
            ->where('candidate_profile_id', $profile->id)
            ->where('is_practice', true)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        if ($used >= $limit) {
            throw ValidationException::withMessages([
                'quota' => "Anda sudah mencapai kuota {$limit} sesi AI interview gratis bulan ini. Coba lagi bulan depan atau upgrade ke paket berbayar.",
            ]);
        }
    }
}
