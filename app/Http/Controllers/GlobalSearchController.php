<?php

namespace App\Http\Controllers;

use App\Enums\JobStatus;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Company;
use App\Models\Job;
use App\Models\User;
use App\Services\Sanitizer\LikeEscaper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Backs the navbar command palette. Every result set is scoped to what the
 * current role can already reach through its own pages — an employer only ever
 * sees rows belonging to the company they own.
 */
class GlobalSearchController extends Controller
{
    private const LIMIT_PER_GROUP = 5;

    private const MIN_QUERY_LENGTH = 2;

    public function __invoke(Request $request): JsonResponse
    {
        $term = trim($request->string('q')->toString());

        if (mb_strlen($term) < self::MIN_QUERY_LENGTH) {
            return response()->json(['groups' => []]);
        }

        $user = $request->user();

        $groups = match ($user->role) {
            UserRole::Admin => $this->adminGroups($term),
            UserRole::Employer => $this->employerGroups($term, $user->id),
            default => $this->employeeGroups($term),
        };

        return response()->json([
            'groups' => array_values(array_filter($groups, fn (array $group): bool => $group['items'] !== [])),
        ]);
    }

    /**
     * @return array<int, array{label: string, items: array<int, array<string, string>>}>
     */
    private function adminGroups(string $term): array
    {
        $jobs = Job::query()
            ->with('company:id,name')
            ->whereRaw(LikeEscaper::sql('title'), [$this->like($term)])
            ->limit(self::LIMIT_PER_GROUP)
            ->get()
            ->map(fn (Job $job): array => [
                'title' => $job->title,
                'subtitle' => $job->company?->name ?? 'Tanpa perusahaan',
                'url' => '/admin/jobs?search='.urlencode($job->title),
            ])
            ->all();

        $companies = Company::query()
            ->whereRaw(LikeEscaper::sql('name'), [$this->like($term)])
            ->limit(self::LIMIT_PER_GROUP)
            ->get()
            ->map(fn (Company $company): array => [
                'title' => $company->name,
                'subtitle' => 'Perusahaan',
                'url' => "/admin/companies/{$company->id}",
            ])
            ->all();

        $users = User::query()
            ->where(fn ($query) => $query
                ->whereRaw(LikeEscaper::sql('name'), [$this->like($term)])
                ->orWhereRaw(LikeEscaper::sql('email'), [$this->like($term)]))
            ->limit(self::LIMIT_PER_GROUP)
            ->get()
            ->map(fn (User $user): array => [
                'title' => $user->name,
                'subtitle' => $user->email,
                'url' => '/admin/users?search='.urlencode($user->email),
            ])
            ->all();

        return [
            ['label' => 'Lowongan', 'items' => $jobs],
            ['label' => 'Perusahaan', 'items' => $companies],
            ['label' => 'Pengguna', 'items' => $users],
        ];
    }

    /**
     * @return array<int, array{label: string, items: array<int, array<string, string>>}>
     */
    private function employerGroups(string $term, int $userId): array
    {
        $company = Company::query()->where('owner_id', $userId)->first();

        if ($company === null) {
            return [];
        }

        $jobs = $company->jobs()
            ->whereRaw(LikeEscaper::sql('title'), [$this->like($term)])
            ->limit(self::LIMIT_PER_GROUP)
            ->get()
            ->map(fn (Job $job): array => [
                'title' => $job->title,
                'subtitle' => 'Lowongan Anda',
                'url' => "/employer/jobs/{$job->slug}",
            ])
            ->all();

        $applicants = Application::query()
            ->whereHas('job', fn ($query) => $query->where('company_id', $company->id))
            ->whereHas('employeeProfile.user', fn ($query) => $query->whereRaw(LikeEscaper::sql('name'), [$this->like($term)]))
            ->with(['employeeProfile.user:id,name', 'job:id,title'])
            ->limit(self::LIMIT_PER_GROUP)
            ->get()
            ->map(fn (Application $application): array => [
                'title' => $application->employeeProfile?->user?->name ?? 'Kandidat',
                'subtitle' => $application->job?->title ?? 'Lamaran',
                'url' => "/employer/applicants/{$application->id}",
            ])
            ->all();

        return [
            ['label' => 'Lowongan', 'items' => $jobs],
            ['label' => 'Pelamar', 'items' => $applicants],
        ];
    }

    /**
     * @return array<int, array{label: string, items: array<int, array<string, string>>}>
     */
    private function employeeGroups(string $term): array
    {
        $jobs = Job::query()
            ->with('company:id,name')
            ->where('status', JobStatus::Published)
            ->whereRaw(LikeEscaper::sql('title'), [$this->like($term)])
            ->limit(self::LIMIT_PER_GROUP)
            ->get()
            ->map(fn (Job $job): array => [
                'title' => $job->title,
                'subtitle' => $job->company?->name ?? 'Perusahaan konfidensial',
                'url' => "/jobs/{$job->slug}",
            ])
            ->all();

        $companies = Company::query()
            ->recruiterActive()
            ->whereRaw(LikeEscaper::sql('name'), [$this->like($term)])
            ->limit(self::LIMIT_PER_GROUP)
            ->get()
            ->map(fn (Company $company): array => [
                'title' => $company->name,
                'subtitle' => 'Perusahaan',
                'url' => "/companies/{$company->slug}",
            ])
            ->all();

        return [
            ['label' => 'Lowongan', 'items' => $jobs],
            ['label' => 'Perusahaan', 'items' => $companies],
        ];
    }

    /**
     * Escape LIKE wildcards a user may type, so "%" cannot widen the match.
     */
    private function like(string $term): string
    {
        return LikeEscaper::contains($term);
    }
}
