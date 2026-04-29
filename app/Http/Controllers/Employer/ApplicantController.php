<?php

namespace App\Http\Controllers\Employer;

use App\Actions\Applications\ChangeApplicationStatusAction;
use App\Enums\ApplicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Applications\ChangeApplicationStatusRequest;
use App\Models\Application;
use App\Models\Company;
use App\Models\Job;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApplicantController extends Controller
{
    public function __construct(private readonly ChangeApplicationStatusAction $changeStatus) {}

    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $jobId = $request->integer('job') ?: null;
        $statusFilter = $request->string('status')->toString();

        $applicants = Application::query()
            ->with([
                'job:id,title,slug,company_id',
                'employeeProfile.user:id,name,email,avatar_path',
                'employeeProfile.city:id,name',
                'candidateCv:id,employee_profile_id,label,file_path,source',
            ])
            ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
            ->when($jobId, fn ($q) => $q->where('job_id', $jobId))
            ->when($statusFilter !== '', fn ($q) => $q->where('status', $statusFilter))
            ->orderByDesc('applied_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Application $a) => [
                'id' => $a->id,
                'status' => $a->status?->value,
                'ai_match_score' => $a->ai_match_score,
                'expected_salary' => $a->expected_salary,
                'applied_at' => optional($a->applied_at)->toIso8601String(),
                'job' => ['id' => $a->job?->id, 'title' => $a->job?->title, 'slug' => $a->job?->slug],
                'candidate' => [
                    'id' => $a->employeeProfile?->id,
                    'name' => $a->employeeProfile?->user?->name,
                    'email' => $a->employeeProfile?->user?->email,
                    'city' => $a->employeeProfile?->city?->name,
                    'avatar_url' => $a->employeeProfile?->user?->avatar_path
                        ? asset('storage/'.$a->employeeProfile->user->avatar_path)
                        : null,
                ],
                'cv_url' => $a->candidateCv?->file_path ? asset('storage/'.$a->candidateCv->file_path) : null,
            ]);

        $jobs = Job::query()
            ->where('company_id', $company->id)
            ->orderByDesc('updated_at')
            ->get(['id', 'title'])
            ->map(fn ($j) => ['value' => (string) $j->id, 'label' => $j->title])
            ->all();

        return Inertia::render('employer/applicants/index', [
            'applicants' => $applicants,
            'filters' => ['job' => $jobId, 'status' => $statusFilter],
            'jobOptions' => $jobs,
            'statusOptions' => ApplicationStatus::selectItems(),
        ]);
    }

    public function show(Request $request, Application $application): Response
    {
        $this->authorizeApplication($request, $application);

        $application->load([
            'job:id,title,slug,company_id',
            'employeeProfile.user:id,name,email,avatar_path',
            'employeeProfile.city:id,name',
            'employeeProfile.skills:id,name',
            'employeeProfile.workExperiences',
            'employeeProfile.educations',
            'candidateCv:id,employee_profile_id,label,file_path,source',
            'screeningAnswers.question:id,question,type',
            'statusLogs.changedBy:id,name,email',
        ]);

        return Inertia::render('employer/applicants/show', [
            'application' => [
                'id' => $application->id,
                'status' => $application->status?->value,
                'ai_match_score' => $application->ai_match_score,
                'expected_salary' => $application->expected_salary,
                'cover_letter' => $application->cover_letter,
                'applied_at' => optional($application->applied_at)->toIso8601String(),
                'reviewed_at' => optional($application->reviewed_at)->toIso8601String(),
                'job' => [
                    'id' => $application->job?->id,
                    'title' => $application->job?->title,
                    'slug' => $application->job?->slug,
                ],
                'candidate' => [
                    'id' => $application->employeeProfile?->id,
                    'name' => $application->employeeProfile?->user?->name,
                    'email' => $application->employeeProfile?->user?->email,
                    'city' => $application->employeeProfile?->city?->name,
                    'skills' => $application->employeeProfile?->skills?->map(fn ($s) => $s->name) ?? [],
                ],
                'cv' => $application->candidateCv ? [
                    'id' => $application->candidateCv->id,
                    'label' => $application->candidateCv->label,
                    'url' => asset('storage/'.$application->candidateCv->file_path),
                ] : null,
                'screening_answers' => $application->screeningAnswers->map(fn ($a) => [
                    'id' => $a->id,
                    'question' => $a->question?->question,
                    'type' => $a->question?->type?->value,
                    'answer' => $a->answer,
                ])->values(),
                'status_logs' => $application->statusLogs->map(fn ($log) => [
                    'id' => $log->id,
                    'from_status' => $log->from_status?->value,
                    'to_status' => $log->to_status?->value,
                    'changed_at' => optional($log->created_at)->toIso8601String(),
                    'changed_by' => $log->changedBy ? ['id' => $log->changedBy->id, 'name' => $log->changedBy->name] : null,
                    'note' => $log->note,
                ])->values(),
            ],
            'statusOptions' => ApplicationStatus::selectItems(),
        ]);
    }

    public function changeStatus(ChangeApplicationStatusRequest $request, Application $application): RedirectResponse
    {
        $this->authorizeApplication($request, $application);

        $next = ApplicationStatus::from($request->validated('status'));
        $this->changeStatus->execute($application, $next, $request->user(), $request->validated('note'));

        return back()->with('success', 'Status lamaran diperbarui.');
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }

    private function authorizeApplication(Request $request, Application $application): void
    {
        $company = $this->resolveCompany($request);
        abort_unless(
            $company !== null && $application->job?->company_id === $company->id,
            403,
        );
    }
}
