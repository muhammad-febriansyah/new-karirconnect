<?php

namespace App\Services\Dashboard;

use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Enums\UserRole;
use App\Models\AiAuditLog;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\CompanyVerification;
use App\Models\Job;
use App\Models\Order;
use App\Models\TalentSearchLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class AdminDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function snapshot(): array
    {
        $userCounts = User::query()
            ->selectRaw('role, count(*) as c')
            ->groupBy('role')
            ->pluck('c', 'role')
            ->all();

        $companies = [
            'total' => Company::query()->count(),
            'verified' => Company::query()->where('verification_status', 'verified')->count(),
            'pending_verification' => CompanyVerification::query()->where('status', 'pending')->count(),
        ];

        $jobs = [
            'total' => Job::query()->count(),
            'published' => Job::query()->where('status', 'published')->count(),
        ];

        $applications = [
            'total' => Application::query()->count(),
            'this_month' => Application::query()->where('created_at', '>=', now()->startOfMonth())->count(),
        ];

        $reviews = [
            'pending' => CompanyReview::query()->where('status', ReviewStatus::Pending)->count(),
            'approved' => CompanyReview::query()->where('status', ReviewStatus::Approved)->count(),
        ];

        $revenue = (int) Order::query()
            ->where('status', OrderStatus::Paid)
            ->where('paid_at', '>=', now()->startOfMonth())
            ->sum('amount_idr');

        $orders = [
            'paid_count' => Order::query()->where('status', OrderStatus::Paid)->count(),
            'awaiting_count' => Order::query()->where('status', OrderStatus::AwaitingPayment)->count(),
            'paid_this_month' => $revenue,
        ];

        $aiUsage = [
            'total_calls' => AiAuditLog::query()->count(),
            'this_month' => AiAuditLog::query()->where('created_at', '>=', now()->startOfMonth())->count(),
            'total_cost_usd' => round((float) AiAuditLog::query()->sum('total_cost_usd'), 4),
        ];

        $talentSearches = [
            'total' => TalentSearchLog::query()->count(),
            'this_month' => TalentSearchLog::query()->where('searched_at', '>=', now()->startOfMonth())->count(),
        ];

        return [
            'users' => [
                'total' => array_sum($userCounts),
                'admin' => (int) ($userCounts[UserRole::Admin->value] ?? 0),
                'employer' => (int) ($userCounts[UserRole::Employer->value] ?? 0),
                'employee' => (int) ($userCounts[UserRole::Employee->value] ?? 0),
            ],
            'companies' => $companies,
            'jobs' => $jobs,
            'applications' => $applications,
            'reviews' => $reviews,
            'orders' => $orders,
            'ai_usage' => $aiUsage,
            'talent_searches' => $talentSearches,
            'recent_orders' => $this->recentOrders(),
            'recent_companies' => $this->recentCompanies(),
            'trend_applications' => $this->dailyTrend(Application::query(), 'created_at'),
            'trend_revenue' => $this->dailyRevenueTrend(),
            'trend_ai_calls' => $this->dailyTrend(AiAuditLog::query(), 'created_at'),
        ];
    }

    /**
     * Last 14 days daily count for any model+timestamp column. Returns an
     * array shaped [{date: 'YYYY-MM-DD', label: 'DD MMM', count: int}].
     *
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function dailyTrend(Builder $base, string $column, int $days = 14): array
    {
        $from = CarbonImmutable::now()->subDays($days - 1)->startOfDay();

        $rows = (clone $base)
            ->where($column, '>=', $from)
            ->selectRaw("DATE($column) as d, count(*) as c")
            ->groupBy('d')
            ->pluck('c', 'd')
            ->all();

        return $this->fillSeries($from, $days, fn (string $key) => (int) ($rows[$key] ?? 0));
    }

    /**
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function dailyRevenueTrend(int $days = 14): array
    {
        $from = CarbonImmutable::now()->subDays($days - 1)->startOfDay();

        $rows = Order::query()
            ->where('status', OrderStatus::Paid)
            ->where('paid_at', '>=', $from)
            ->selectRaw('DATE(paid_at) as d, SUM(amount_idr) as total')
            ->groupBy('d')
            ->pluck('total', 'd')
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
    private function recentOrders(): array
    {
        return Order::query()
            ->with(['company:id,name,slug'])
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(fn (Order $o) => [
                'reference' => $o->reference,
                'company_name' => $o->company?->name,
                'amount_idr' => $o->amount_idr,
                'status' => $o->status->value,
                'created_at' => optional($o->created_at)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentCompanies(): array
    {
        return Company::query()
            ->latest('id')
            ->limit(5)
            ->get(['id', 'name', 'slug', 'verification_status', 'created_at'])
            ->map(fn (Company $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'verification_status' => $c->verification_status,
                'created_at' => optional($c->created_at)->toIso8601String(),
            ])
            ->all();
    }
}
