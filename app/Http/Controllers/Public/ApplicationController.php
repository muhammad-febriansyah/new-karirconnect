<?php

namespace App\Http\Controllers\Public;

use App\Actions\Applications\SubmitApplicationAction;
use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Applications\SubmitApplicationRequest;
use App\Models\Application;
use App\Models\Job;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationController extends Controller
{
    public function __construct(
        private readonly SubmitApplicationAction $submit,
        private readonly EmployeeProfileService $profiles,
    ) {}

    public function create(Request $request, Job $job): Response
    {
        abort_unless($job->status === JobStatus::Published, 404);

        $user = $request->user();
        abort_unless($user !== null && $user->role->value === 'employee', 403);

        $profile = $this->profiles->ensureProfile($user);
        $profile->load(['cvs:id,employee_profile_id,label,source,file_path']);

        $existing = Application::query()
            ->where('job_id', $job->id)
            ->where('employee_profile_id', $profile->id)
            ->exists();

        $job->load(['company:id,name,slug', 'screeningQuestions']);

        return Inertia::render('public/jobs/apply', [
            'job' => [
                'id' => $job->id,
                'slug' => $job->slug,
                'title' => $job->title,
                'company' => ['id' => $job->company?->id, 'name' => $job->company?->name],
                'screening_questions' => $job->screeningQuestions->map(fn ($q) => [
                    'id' => $q->id,
                    'question' => $q->question,
                    'type' => $q->type?->value,
                    'options' => $q->options ?? [],
                    'is_required' => $q->is_required,
                ])->values(),
            ],
            'profile' => [
                'id' => $profile->id,
                'expected_salary' => $profile->expected_salary_min,
                'cvs' => $profile->cvs->map(fn ($c) => [
                    'id' => $c->id,
                    'label' => $c->label,
                    'source' => $c->source,
                ])->values(),
                'primary_cv_id' => $profile->primary_resume_id,
            ],
            'alreadyApplied' => $existing,
        ]);
    }

    public function store(SubmitApplicationRequest $request, Job $job): RedirectResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $this->submit->execute($job, $profile, $request->validated());

        return redirect()->route('employee.applications.index')
            ->with('success', "Lamaran untuk {$job->title} berhasil dikirim.");
    }
}
