<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\SavedCandidate;
use App\Models\Skill;
use App\Services\Talent\TalentSearchService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TalentSearchController extends Controller
{
    public function __construct(private readonly TalentSearchService $service) {}

    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $filters = $this->extractFilters($request);
        $results = $this->service->search($company, $request->user(), $filters);

        $savedIds = SavedCandidate::query()
            ->where('company_id', $company->id)
            ->pluck('candidate_profile_id')
            ->all();

        return Inertia::render('employer/talent-search/index', [
            'filters' => $filters,
            'results' => $results->through(fn (EmployeeProfile $p) => [
                'id' => $p->id,
                'name' => $p->user?->name,
                'avatar_url' => $p->user?->avatar_path ? asset('storage/'.$p->user->avatar_path) : null,
                'headline' => $p->headline,
                'current_position' => $p->current_position,
                'experience_level' => $p->experience_level?->value,
                'expected_salary_min' => $p->expected_salary_min,
                'expected_salary_max' => $p->expected_salary_max,
                'is_open_to_work' => $p->is_open_to_work,
                'profile_completion' => $p->profile_completion,
                'province' => $p->province?->name,
                'city' => $p->city?->name,
                'skills' => $p->skills->take(6)->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->values(),
                'is_saved' => in_array($p->id, $savedIds, true),
            ]),
            'skills' => Skill::query()->orderBy('name')->limit(50)->get(['id', 'name', 'slug']),
        ]);
    }

    public function show(Request $request, EmployeeProfile $profile): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);
        abort_unless(in_array($profile->visibility, ['public', 'employers'], true), 403);

        $profile->load([
            'user:id,name,email,avatar_path,phone',
            'province:id,name',
            'city:id,name',
            'skills:id,name,slug',
            'educations',
            'workExperiences',
            'certifications',
        ]);

        $isSaved = SavedCandidate::query()
            ->where('company_id', $company->id)
            ->where('candidate_profile_id', $profile->id)
            ->exists();

        return Inertia::render('employer/talent-search/show', [
            'profile' => [
                'id' => $profile->id,
                'name' => $profile->user?->name,
                'email' => $profile->user?->email,
                'phone' => $profile->user?->phone,
                'avatar_url' => $profile->user?->avatar_path ? asset('storage/'.$profile->user->avatar_path) : null,
                'headline' => $profile->headline,
                'about' => $profile->about,
                'current_position' => $profile->current_position,
                'experience_level' => $profile->experience_level?->value,
                'expected_salary_min' => $profile->expected_salary_min,
                'expected_salary_max' => $profile->expected_salary_max,
                'is_open_to_work' => $profile->is_open_to_work,
                'province' => $profile->province?->name,
                'city' => $profile->city?->name,
                'linkedin_url' => $profile->linkedin_url,
                'github_url' => $profile->github_url,
                'portfolio_url' => $profile->portfolio_url,
                'skills' => $profile->skills->map(fn ($s) => ['id' => $s->id, 'name' => $s->name])->values(),
                'educations' => $profile->educations->map(fn ($e) => $e->only(['id', 'institution', 'level', 'major', 'start_year', 'end_year']))->values(),
                'work_experiences' => $profile->workExperiences->map(fn ($w) => $w->only(['id', 'company_name', 'position', 'start_date', 'end_date', 'description']))->values(),
                'certifications' => $profile->certifications->map(fn ($c) => $c->only(['id', 'name', 'issuer', 'issued_date']))->values(),
            ],
            'isSaved' => $isSaved,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function extractFilters(Request $request): array
    {
        $skillIds = $request->input('skill_ids', []);
        if (! is_array($skillIds)) {
            $skillIds = [];
        }

        return array_filter([
            'keyword' => $request->input('keyword'),
            'province_id' => $request->integer('province_id') ?: null,
            'city_id' => $request->integer('city_id') ?: null,
            'experience_level' => $request->input('experience_level'),
            'skill_ids' => array_values(array_filter(array_map('intval', $skillIds))) ?: null,
            'salary_max' => $request->integer('salary_max') ?: null,
            'open_to_work' => $request->boolean('open_to_work', false) ?: null,
            'sort' => $request->input('sort'),
        ], static fn ($v) => $v !== null && $v !== '' && $v !== []);
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }
}
