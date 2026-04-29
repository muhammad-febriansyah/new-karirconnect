<?php

namespace App\Http\Controllers\Employer;

use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\ScreeningQuestionType;
use App\Enums\WorkArrangement;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\StoreJobRequest;
use App\Http\Requests\Employer\UpdateJobRequest;
use App\Models\City;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\Province;
use App\Models\Skill;
use App\Services\Sanitizer\HtmlSanitizerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobController extends Controller
{
    public function __construct(private readonly HtmlSanitizerService $sanitizer) {}

    public function index(Request $request): Response
    {
        $company = $this->resolveOwnedCompany($request);
        $statusFilter = $request->string('status')->toString();
        $search = $request->string('search')->toString();

        $jobs = $company->jobs()
            ->with(['category:id,name', 'city:id,name', 'skills:id,name'])
            ->withCount('screeningQuestions')
            ->when($statusFilter !== '', fn ($query) => $query->where('status', $statusFilter))
            ->when($search !== '', fn ($query) => $query->where('title', 'like', "%{$search}%"))
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('employer/jobs/index', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'jobs' => $jobs,
            'filters' => [
                'status' => $statusFilter,
                'search' => $search,
            ],
            'statusOptions' => JobStatus::selectItems(),
        ]);
    }

    public function create(Request $request): Response
    {
        $company = $this->resolveOwnedCompany($request);

        return Inertia::render('employer/jobs/create', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'options' => $this->formOptions(),
        ]);
    }

    public function store(StoreJobRequest $request): RedirectResponse
    {
        $company = $this->resolveOwnedCompany($request);
        $data = $this->sanitizeJobData($request->validated());
        $skillIds = $data['skill_ids'] ?? [];
        unset($data['skill_ids']);

        $job = $company->jobs()->create([
            ...$data,
            'posted_by_user_id' => $request->user()->id,
        ]);

        $job->skills()->sync(collect($skillIds)->mapWithKeys(fn (int $skillId) => [$skillId => [
            'proficiency' => 'mid',
            'is_required' => false,
        ]])->all());

        return to_route('employer.jobs.show', $job)->with('success', 'Lowongan berhasil dibuat.');
    }

    public function show(Request $request, Job $job): Response
    {
        $company = $this->resolveOwnedCompany($request);
        abort_unless($job->company_id === $company->id, 404);

        $job->load([
            'category:id,name',
            'skills:id,name',
            'province:id,name',
            'city:id,name,province_id',
            'screeningQuestions',
        ]);

        return Inertia::render('employer/jobs/show', [
            'job' => $this->jobPayload($job),
            'screeningTypeOptions' => ScreeningQuestionType::selectItems(),
        ]);
    }

    public function edit(Request $request, Job $job): Response
    {
        $company = $this->resolveOwnedCompany($request);
        abort_unless($job->company_id === $company->id, 404);

        $job->load(['skills:id,name']);

        return Inertia::render('employer/jobs/edit', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'job' => $this->jobPayload($job),
            'options' => $this->formOptions(),
        ]);
    }

    public function update(UpdateJobRequest $request, Job $job): RedirectResponse
    {
        $company = $this->resolveOwnedCompany($request);
        abort_unless($job->company_id === $company->id, 404);

        $data = $this->sanitizeJobData($request->validated());
        $skillIds = $data['skill_ids'] ?? [];
        unset($data['skill_ids']);

        $job->fill($data)->save();
        $job->skills()->sync(collect($skillIds)->mapWithKeys(fn (int $skillId) => [$skillId => [
            'proficiency' => 'mid',
            'is_required' => false,
        ]])->all());

        return to_route('employer.jobs.show', $job)->with('success', 'Lowongan berhasil diperbarui.');
    }

    private function resolveOwnedCompany(Request $request): Company
    {
        $company = Company::query()
            ->where('owner_id', $request->user()->id)
            ->first();

        abort_unless($company !== null, 404, 'Perusahaan belum terdaftar.');

        return $company;
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'jobCategories' => JobCategory::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name'])
                ->map(fn ($item) => ['value' => (string) $item->id, 'label' => $item->name])
                ->all(),
            'skills' => Skill::query()->where('is_active', true)->orderBy('name')->get(['id', 'name'])
                ->map(fn ($item) => ['value' => (string) $item->id, 'label' => $item->name])
                ->all(),
            'provinces' => Province::query()->orderBy('name')->get(['id', 'name'])
                ->map(fn ($item) => ['value' => (string) $item->id, 'label' => $item->name])
                ->all(),
            'cities' => City::query()->orderBy('name')->get(['id', 'name', 'province_id'])
                ->map(fn ($item) => ['value' => (string) $item->id, 'label' => $item->name, 'province_id' => $item->province_id])
                ->all(),
            'employmentTypes' => EmploymentType::selectItems(),
            'workArrangements' => WorkArrangement::selectItems(),
            'experienceLevels' => ExperienceLevel::selectItems(),
            'educationLevels' => EducationLevel::selectItems(),
            'statusOptions' => JobStatus::selectItems(),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function sanitizeJobData(array $data): array
    {
        $data['description'] = $this->sanitizer->clean($data['description'] ?? null);
        $data['responsibilities'] = $this->sanitizer->clean($data['responsibilities'] ?? null);
        $data['requirements'] = $this->sanitizer->clean($data['requirements'] ?? null);
        $data['benefits'] = $this->sanitizer->clean($data['benefits'] ?? null);

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function jobPayload(Job $job): array
    {
        return [
            'id' => $job->id,
            'job_category_id' => $job->job_category_id,
            'title' => $job->title,
            'slug' => $job->slug,
            'description' => $job->description,
            'responsibilities' => $job->responsibilities,
            'requirements' => $job->requirements,
            'benefits' => $job->benefits,
            'employment_type' => $job->employment_type?->value,
            'work_arrangement' => $job->work_arrangement?->value,
            'experience_level' => $job->experience_level?->value,
            'min_education' => $job->min_education?->value,
            'salary_min' => $job->salary_min,
            'salary_max' => $job->salary_max,
            'is_salary_visible' => $job->is_salary_visible,
            'province_id' => $job->province_id,
            'city_id' => $job->city_id,
            'status' => $job->status?->value,
            'application_deadline' => optional($job->application_deadline)->toDateString(),
            'is_anonymous' => $job->is_anonymous,
            'is_featured' => $job->is_featured,
            'views_count' => $job->views_count,
            'applications_count' => $job->applications_count,
            'ai_match_threshold' => $job->ai_match_threshold,
            'auto_invite_ai_interview' => $job->auto_invite_ai_interview,
            'published_at' => optional($job->published_at)->toIso8601String(),
            'closed_at' => optional($job->closed_at)->toIso8601String(),
            'category' => $job->relationLoaded('category') && $job->category ? ['id' => $job->category->id, 'name' => $job->category->name] : null,
            'city' => $job->relationLoaded('city') && $job->city ? ['id' => $job->city->id, 'name' => $job->city->name] : null,
            'skills' => $job->relationLoaded('skills') ? $job->skills->map(fn ($skill) => [
                'id' => $skill->id,
                'name' => $skill->name,
            ])->values() : [],
            'skill_ids' => $job->relationLoaded('skills') ? $job->skills->pluck('id')->all() : [],
            'screening_questions' => $job->relationLoaded('screeningQuestions') ? $job->screeningQuestions->map(fn ($question) => [
                'id' => $question->id,
                'question' => $question->question,
                'type' => $question->type?->value,
                'options' => $question->options ?? [],
                'knockout_value' => $question->knockout_value ?? [],
                'is_required' => $question->is_required,
                'order_number' => $question->order_number,
            ])->values() : [],
        ];
    }
}
