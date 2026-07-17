<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Services\Recommendations\JobRecommendationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobRecommendationController extends Controller
{
    public function __construct(private readonly JobRecommendationService $service) {}

    public function index(Request $request): Response
    {
        $profile = $this->resolveProfile($request);
        abort_unless($profile !== null, 404, 'Lengkapi profil terlebih dahulu.');

        $recommendations = $this->service->recommend($profile, 12)
            ->map(function (array $row): array {
                /** @var Job $job */
                $job = $row['job'];

                // The same two rules the job listing enforces. This page used to
                // emit salary and the employer's name unconditionally, which
                // published the identity behind an anonymous posting and the
                // salary of a job whose employer had hidden it.
                $salaryVisible = (bool) $job->is_salary_visible;
                $anonymous = (bool) $job->is_anonymous;

                return [
                    'job' => [
                        'id' => $job->id,
                        'title' => $job->title,
                        'slug' => $job->slug,
                        'employment_type' => $job->employment_type?->value,
                        'work_arrangement' => $job->work_arrangement?->value,
                        'salary_min' => $salaryVisible ? $job->salary_min : null,
                        'salary_max' => $salaryVisible ? $job->salary_max : null,
                        'is_salary_visible' => $salaryVisible,
                        'is_anonymous' => $anonymous,
                        'company_name' => $anonymous ? 'Confidential' : $job->company?->name,
                        'company_logo' => $anonymous || ! $job->company?->logo_path
                            ? null
                            : asset('storage/'.$job->company->logo_path),
                        'category_name' => $job->category?->name,
                        'city_name' => $job->city?->name,
                        'published_at' => optional($job->published_at)->toIso8601String(),
                    ],
                    'score' => $row['score'],
                    'breakdown' => $row['breakdown'],
                    'explanation' => $row['explanation'],
                ];
            })
            ->values();

        return Inertia::render('employee/recommendations/index', [
            'recommendations' => $recommendations,
            'profile_completion' => $profile->profile_completion,
        ]);
    }

    public function dismiss(Request $request, Job $job): RedirectResponse
    {
        $profile = $this->resolveProfile($request);
        abort_unless($profile !== null, 404);

        $this->service->dismiss($profile, $job);

        return back()->with('success', 'Rekomendasi disembunyikan.');
    }

    private function resolveProfile(Request $request): ?EmployeeProfile
    {
        return EmployeeProfile::query()->where('user_id', $request->user()->id)->first();
    }
}
