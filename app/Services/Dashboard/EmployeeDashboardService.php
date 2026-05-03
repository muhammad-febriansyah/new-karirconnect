<?php

namespace App\Services\Dashboard;

use App\Enums\AiInterviewStatus;
use App\Enums\ApplicationStatus;
use App\Enums\InterviewStatus;
use App\Models\AiInterviewSession;
use App\Models\Application;
use App\Models\CandidateOutreachMessage;
use App\Models\EmployeeProfile;
use App\Models\Interview;
use App\Models\InterviewParticipant;
use App\Models\SavedJob;
use App\Models\User;
use App\Services\Employee\EmployeeProfileService;
use App\Services\Recommendations\JobRecommendationService;
use Carbon\CarbonImmutable;

/**
 * Read-only aggregator for the employee dashboard. Pulls counts and recent
 * items needed to render the landing card grid in one query batch so the
 * controller stays thin.
 */
class EmployeeDashboardService
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly JobRecommendationService $recommendations,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function snapshot(User $user): array
    {
        $profile = $this->profiles->ensureProfile($user);

        $applicationStats = $this->applicationStats($profile);
        $upcomingInterviews = $this->upcomingInterviews($user);
        $aiStats = $this->aiInterviewStats($profile);

        return [
            'profile' => [
                'completion' => $profile->profile_completion ?? 0,
                'is_open_to_work' => $profile->is_open_to_work,
                'headline' => $profile->headline,
            ],
            'applications' => $applicationStats,
            'interviews' => [
                'upcoming_count' => count($upcomingInterviews),
                'upcoming' => $upcomingInterviews,
            ],
            'ai_interviews' => $aiStats,
            'saved_jobs_count' => SavedJob::query()->where('user_id', $user->id)->count(),
            'unread_messages' => CandidateOutreachMessage::query()
                ->where('candidate_user_id', $user->id)
                ->where('status', 'sent')
                ->count(),
            'recommended_jobs' => $this->recommendedJobs($profile),
            'trend_applications' => $this->applicationsTrend($profile),
        ];
    }

    /**
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function applicationsTrend(EmployeeProfile $profile, int $days = 14): array
    {
        $from = CarbonImmutable::now()->subDays($days - 1)->startOfDay();

        $rows = Application::query()
            ->where('employee_profile_id', $profile->id)
            ->where('created_at', '>=', $from)
            ->selectRaw('DATE(created_at) as d, count(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd')
            ->all();

        $out = [];
        for ($i = 0; $i < $days; $i++) {
            $d = $from->addDays($i);
            $key = $d->format('Y-m-d');
            $out[] = [
                'date' => $key,
                'label' => $d->isoFormat('DD MMM'),
                'count' => (int) ($rows[$key] ?? 0),
            ];
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function applicationStats(EmployeeProfile $profile): array
    {
        $rows = Application::query()
            ->where('employee_profile_id', $profile->id)
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->all();

        $byStatus = [];
        foreach (ApplicationStatus::cases() as $case) {
            $byStatus[$case->value] = (int) ($rows[$case->value] ?? 0);
        }

        return [
            'total' => array_sum($byStatus),
            'in_progress' => $byStatus[ApplicationStatus::Submitted->value]
                + $byStatus[ApplicationStatus::Reviewed->value]
                + $byStatus[ApplicationStatus::Shortlisted->value]
                + $byStatus[ApplicationStatus::Interview->value]
                + $byStatus[ApplicationStatus::Offered->value],
            'hired' => $byStatus[ApplicationStatus::Hired->value],
            'rejected' => $byStatus[ApplicationStatus::Rejected->value],
            'by_status' => $byStatus,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function upcomingInterviews(User $user): array
    {
        $rows = InterviewParticipant::query()
            ->with(['interview:id,title,mode,scheduled_at,status,timezone'])
            ->where('user_id', $user->id)
            ->whereHas('interview', fn ($q) => $q
                ->where('scheduled_at', '>=', now())
                ->where('status', InterviewStatus::Scheduled),
            )
            ->limit(5)
            ->get()
            ->map(fn (InterviewParticipant $p) => $p->interview)
            ->filter()
            ->sortBy('scheduled_at')
            ->values();

        return $rows->map(fn (Interview $i) => [
            'id' => $i->id,
            'title' => $i->title,
            'mode' => $i->mode?->value,
            'status' => $i->status?->value,
            'scheduled_at' => optional($i->scheduled_at)->toIso8601String(),
            'timezone' => $i->timezone,
        ])->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function aiInterviewStats(EmployeeProfile $profile): array
    {
        $sessions = AiInterviewSession::query()
            ->where('candidate_profile_id', $profile->id)
            ->get(['id', 'status']);

        $completed = $sessions->where('status', AiInterviewStatus::Completed)->count();

        return [
            'total' => $sessions->count(),
            'completed' => $completed,
            'in_progress' => $sessions->where('status', AiInterviewStatus::InProgress)->count(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recommendedJobs(EmployeeProfile $profile): array
    {
        return $this->recommendations->recommend($profile, 3)
            ->map(fn (array $row) => [
                'id' => $row['job']->id,
                'slug' => $row['job']->slug,
                'title' => $row['job']->title,
                'company_name' => $row['job']->company?->name,
                'company_slug' => $row['job']->company?->slug,
                'category' => $row['job']->category?->name,
                'salary_min' => $row['job']->salary_min,
                'salary_max' => $row['job']->salary_max,
                'experience_level' => $row['job']->experience_level?->value,
                'score' => $row['score'],
                'explanation' => $row['explanation'],
            ])
            ->all();
    }
}
