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
            ->map(fn (array $row) => [
                'job' => [
                    'id' => $row['job']->id,
                    'title' => $row['job']->title,
                    'slug' => $row['job']->slug,
                    'employment_type' => $row['job']->employment_type?->value,
                    'work_arrangement' => $row['job']->work_arrangement?->value,
                    'salary_min' => $row['job']->salary_min,
                    'salary_max' => $row['job']->salary_max,
                    'company_name' => $row['job']->company?->name,
                    'company_logo' => $row['job']->company?->logo_path
                        ? asset('storage/'.$row['job']->company->logo_path) : null,
                    'category_name' => $row['job']->category?->name,
                    'city_name' => $row['job']->city?->name,
                    'published_at' => optional($row['job']->published_at)->toIso8601String(),
                ],
                'score' => $row['score'],
                'breakdown' => $row['breakdown'],
                'explanation' => $row['explanation'],
            ])
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
