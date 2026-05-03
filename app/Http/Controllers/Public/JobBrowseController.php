<?php

namespace App\Http\Controllers\Public;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\WorkArrangement;
use App\Filters\Jobs\JobBrowseFilter;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobView;
use App\Models\Province;
use App\Models\Skill;
use App\Services\Jobs\JobMatchingService;
use App\Services\Jobs\JobService;
use App\Services\Jobs\SavedJobService;
use App\Services\Seo\SeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobBrowseController extends Controller
{
    public function __construct(
        private readonly JobBrowseFilter $filter,
        private readonly JobService $jobs,
        private readonly JobMatchingService $matcher,
        private readonly SavedJobService $savedJobs,
        private readonly SeoService $seo,
    ) {}

    public function index(Request $request): Response
    {
        $filters = $this->extractFilters($request);
        $paginator = $this->filter->apply($filters)
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Job $job) => $this->browseRow($job));

        return Inertia::render('public/jobs/index', [
            'jobs' => $paginator,
            'filters' => $filters,
            'options' => $this->browseOptions(),
        ])->withViewData([
            'meta' => $this->seo->jobIndex($request, $filters, $paginator->total()),
        ]);
    }

    public function show(Request $request, Job $job): Response
    {
        abort_unless($job->status === JobStatus::Published, 404);

        $job->load([
            'company:id,name,slug,logo_path,about,verification_status,website',
            'category:id,name,slug',
            'province:id,name',
            'city:id,name,province_id',
            'city.province:id,name',
            'skills:id,name',
            'screeningQuestions',
        ]);

        $this->jobs->incrementViews($job);
        JobView::query()->create([
            'job_id' => $job->id,
            'user_id' => $request->user()?->id,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
            'source' => $request->headers->get('referer'),
        ]);

        $matchScore = null;
        $matchBreakdown = null;
        $isSaved = false;
        if ($user = $request->user()) {
            $isSaved = $this->savedJobs->isSaved($user, $job);
            $profile = $user->employeeProfile()->with(['skills:id', 'city:id,province_id'])->first();
            if ($profile) {
                $payload = $this->matcher->breakdown($job, $profile);
                $matchScore = $payload['score'];
                $matchBreakdown = $payload['breakdown'];
            }
        }

        $similar = Job::query()
            ->with([
                'company:id,name,slug,logo_path,verification_status',
                'city:id,name',
                'category:id,name',
            ])
            ->where('id', '!=', $job->id)
            ->where('status', JobStatus::Published)
            ->where('job_category_id', $job->job_category_id)
            ->latest('published_at')
            ->limit(4)
            ->get()
            ->map(fn (Job $j) => $this->browseRow($j));

        return Inertia::render('public/jobs/show', [
            'job' => $this->detailPayload($job),
            'matchScore' => $matchScore,
            'matchBreakdown' => $matchBreakdown,
            'isSaved' => $isSaved,
            'similar' => $similar,
        ])->withViewData([
            'meta' => $this->seo->jobShow($job),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function extractFilters(Request $request): array
    {
        return [
            'search' => $request->string('search')->toString() ?: null,
            'category_id' => $request->integer('category_id') ?: null,
            'province_id' => $request->integer('province_id') ?: null,
            'city_id' => $request->integer('city_id') ?: null,
            'employment_type' => $request->input('employment_type') ?: null,
            'work_arrangement' => $request->input('work_arrangement') ?: null,
            'experience_level' => $request->input('experience_level') ?: null,
            'salary_min' => $request->integer('salary_min') ?: null,
            'skill_ids' => array_filter((array) $request->input('skill_ids', [])),
            'featured_only' => $request->boolean('featured_only') ?: null,
            'sort' => $request->string('sort')->toString() ?: 'latest',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function browseRow(Job $job): array
    {
        return [
            'id' => $job->id,
            'slug' => $job->slug,
            'title' => $job->title,
            'employment_type' => $job->employment_type?->value,
            'work_arrangement' => $job->work_arrangement?->value,
            'experience_level' => $job->experience_level?->value,
            'is_featured' => $job->is_featured,
            'is_anonymous' => $job->is_anonymous,
            'salary_min' => $job->is_salary_visible ? $job->salary_min : null,
            'salary_max' => $job->is_salary_visible ? $job->salary_max : null,
            'is_salary_visible' => $job->is_salary_visible,
            'published_at' => optional($job->published_at)->toIso8601String(),
            'application_deadline' => optional($job->application_deadline)->toDateString(),
            'company' => $job->is_anonymous
                ? ['name' => 'Confidential', 'logo_url' => null, 'verification_status' => null]
                : [
                    'id' => $job->company?->id,
                    'name' => $job->company?->name,
                    'slug' => $job->company?->slug,
                    'logo_url' => $job->company?->logo_path ? asset('storage/'.$job->company->logo_path) : null,
                    'verification_status' => $job->company?->verification_status?->value,
                ],
            'category' => $job->category?->name,
            'city' => $job->city?->name,
            'skills' => $job->relationLoaded('skills')
                ? $job->skills->take(5)->map(fn ($s) => $s->name)->all()
                : [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detailPayload(Job $job): array
    {
        $row = $this->browseRow($job);

        return $row + [
            'description' => $job->description,
            'responsibilities' => $job->responsibilities,
            'requirements' => $job->requirements,
            'benefits' => $job->benefits,
            'min_education' => $job->min_education?->value,
            'province' => $job->province?->name,
            'company_about' => $job->is_anonymous ? null : $job->company?->about,
            'screening_questions' => $job->screeningQuestions->map(fn ($q) => [
                'id' => $q->id,
                'question' => $q->question,
                'type' => $q->type?->value,
                'is_required' => $q->is_required,
            ])->values(),
            'views_count' => $job->views_count,
            'applications_count' => $job->applications_count,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function browseOptions(): array
    {
        return [
            'categories' => JobCategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'name'])
                ->map(fn ($c) => ['value' => (string) $c->id, 'label' => $c->name])->all(),
            'provinces' => Province::query()->orderBy('name')->get(['id', 'name'])
                ->map(fn ($p) => ['value' => (string) $p->id, 'label' => $p->name])->all(),
            'cities' => City::query()->orderBy('name')->limit(500)->get(['id', 'name', 'province_id'])
                ->map(fn ($c) => ['value' => (string) $c->id, 'label' => $c->name, 'province_id' => $c->province_id])->all(),
            'skills' => Skill::query()->where('is_active', true)->orderBy('name')->limit(200)->get(['id', 'name'])
                ->map(fn ($s) => ['value' => (string) $s->id, 'label' => $s->name])->all(),
            'employment_types' => EmploymentType::selectItems(),
            'work_arrangements' => WorkArrangement::selectItems(),
            'experience_levels' => ExperienceLevel::selectItems(),
        ];
    }
}
