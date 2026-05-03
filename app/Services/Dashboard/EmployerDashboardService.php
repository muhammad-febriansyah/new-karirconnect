<?php

namespace App\Services\Dashboard;

use App\Enums\AiInterviewStatus;
use App\Enums\ApplicationStatus;
use App\Enums\InterviewStatus;
use App\Enums\JobStatus;
use App\Enums\OrderStatus;
use App\Enums\SubscriptionStatus;
use App\Models\AiInterviewSession;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanySubscription;
use App\Models\Interview;
use App\Models\Job;
use App\Models\Order;
use App\Models\TalentSearchLog;
use App\Models\User;
use Carbon\CarbonImmutable;

class EmployerDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function snapshot(User $user): array
    {
        $company = Company::query()->where('owner_id', $user->id)->first();

        if (! $company) {
            return [
                'has_company' => false,
            ];
        }

        $jobsCount = Job::query()->where('company_id', $company->id)->count();
        $publishedJobsCount = Job::query()
            ->where('company_id', $company->id)
            ->where('status', JobStatus::Published)
            ->count();

        $applicationsTotal = Application::query()
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->count();

        $applicationsByStatus = Application::query()
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->all();

        $applicationsThisMonth = Application::query()
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        $upcomingInterviewsCount = Interview::query()
            ->whereHas('application.job', fn ($q) => $q->where('company_id', $company->id))
            ->where('status', InterviewStatus::Scheduled)
            ->where('scheduled_at', '>=', now())
            ->count();

        $aiCompleted = AiInterviewSession::query()
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->where('status', AiInterviewStatus::Completed)
            ->count();

        $subscription = CompanySubscription::query()
            ->with('plan:id,name,tier,job_post_quota,featured_credits,ai_interview_credits')
            ->where('company_id', $company->id)
            ->where('status', SubscriptionStatus::Active)
            ->latest('id')
            ->first();

        $paidThisMonth = (int) Order::query()
            ->where('company_id', $company->id)
            ->where('status', OrderStatus::Paid)
            ->where('paid_at', '>=', now()->startOfMonth())
            ->sum('amount_idr');

        $searchesThisMonth = TalentSearchLog::query()
            ->where('company_id', $company->id)
            ->where('searched_at', '>=', now()->startOfMonth())
            ->count();

        return [
            'has_company' => true,
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'slug' => $company->slug,
                'verification_status' => $company->verification_status,
            ],
            'jobs' => [
                'total' => $jobsCount,
                'published' => $publishedJobsCount,
                'draft' => $jobsCount - $publishedJobsCount,
            ],
            'applicants' => [
                'total' => $applicationsTotal,
                'this_month' => $applicationsThisMonth,
                'shortlisted' => (int) ($applicationsByStatus[ApplicationStatus::Shortlisted->value] ?? 0),
                'hired' => (int) ($applicationsByStatus[ApplicationStatus::Hired->value] ?? 0),
                'by_status' => $applicationsByStatus,
            ],
            'interviews' => [
                'upcoming' => $upcomingInterviewsCount,
                'ai_completed' => $aiCompleted,
            ],
            'billing' => [
                'plan_name' => $subscription?->plan?->name,
                'plan_tier' => $subscription?->plan?->tier?->value,
                'starts_at' => optional($subscription?->starts_at)->toIso8601String(),
                'ends_at' => optional($subscription?->ends_at)->toIso8601String(),
                'jobs_quota' => $subscription?->plan?->job_post_quota ?? 0,
                'jobs_used' => $subscription?->jobs_posted_count ?? $publishedJobsCount,
                'featured_remaining' => $subscription?->featured_credits_remaining ?? 0,
                'ai_remaining' => $subscription?->ai_credits_remaining ?? 0,
                'paid_this_month' => $paidThisMonth,
            ],
            'talent_search' => [
                'searches_this_month' => $searchesThisMonth,
            ],
            'recent_applicants' => $this->recentApplicants($company->id),
            'trend_applicants' => $this->applicantsTrend($company->id),
            'trend_interviews' => $this->interviewsTrend($company->id),
        ];
    }

    /**
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function applicantsTrend(int $companyId, int $days = 14): array
    {
        $from = CarbonImmutable::now()->subDays($days - 1)->startOfDay();

        $rows = Application::query()
            ->whereHas('job', fn ($q) => $q->where('company_id', $companyId))
            ->where('created_at', '>=', $from)
            ->selectRaw('DATE(created_at) as d, count(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd')
            ->all();

        return $this->fillSeries($from, $days, fn (string $key) => (int) ($rows[$key] ?? 0));
    }

    /**
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function interviewsTrend(int $companyId, int $days = 14): array
    {
        $from = CarbonImmutable::now()->subDays($days - 1)->startOfDay();

        $rows = Interview::query()
            ->whereHas('application.job', fn ($q) => $q->where('company_id', $companyId))
            ->where('scheduled_at', '>=', $from)
            ->selectRaw('DATE(scheduled_at) as d, count(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd')
            ->all();

        return $this->fillSeries($from, $days, fn (string $key) => (int) ($rows[$key] ?? 0));
    }

    /**
     * @param  callable(string): int  $resolver
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function fillSeries(CarbonImmutable $from, int $days, callable $resolver): array
    {
        $out = [];
        for ($i = 0; $i < $days; $i++) {
            $d = $from->addDays($i);
            $key = $d->format('Y-m-d');
            $out[] = [
                'date' => $key,
                'label' => $d->isoFormat('DD MMM'),
                'count' => $resolver($key),
            ];
        }

        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentApplicants(int $companyId): array
    {
        return Application::query()
            ->with(['employeeProfile.user:id,name,avatar_path', 'job:id,title,slug'])
            ->whereHas('job', fn ($q) => $q->where('company_id', $companyId))
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(fn (Application $a) => [
                'id' => $a->id,
                'candidate_name' => $a->employeeProfile?->user?->name,
                'job_title' => $a->job?->title,
                'job_slug' => $a->job?->slug,
                'status' => $a->status?->value,
                'created_at' => optional($a->created_at)->toIso8601String(),
            ])
            ->all();
    }
}
