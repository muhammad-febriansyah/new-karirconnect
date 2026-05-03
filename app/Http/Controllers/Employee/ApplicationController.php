<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationController extends Controller
{
    public function __construct(private readonly EmployeeProfileService $profiles) {}

    public function index(Request $request): Response
    {
        $profile = $this->profiles->ensureProfile($request->user());

        $applications = Application::query()
            ->with(['job:id,title,slug,company_id', 'job.company:id,name,slug,logo_path'])
            ->where('employee_profile_id', $profile->id)
            ->orderByDesc('applied_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Application $a) => [
                'id' => $a->id,
                'status' => $a->status?->value,
                'ai_match_score' => $a->ai_match_score,
                'applied_at' => optional($a->applied_at)->toIso8601String(),
                'job' => [
                    'id' => $a->job?->id,
                    'title' => $a->job?->title,
                    'slug' => $a->job?->slug,
                ],
                'company' => [
                    'name' => $a->job?->company?->name,
                    'slug' => $a->job?->company?->slug,
                    'logo_url' => $a->job?->company?->logo_path
                        ? asset('storage/'.$a->job->company->logo_path)
                        : null,
                ],
            ]);

        return Inertia::render('employee/applications/index', [
            'applications' => $applications,
        ]);
    }

    public function show(Request $request, Application $application): Response
    {
        $profile = $this->profiles->ensureProfile($request->user());
        abort_unless($application->employee_profile_id === $profile->id, 403);

        $application->load([
            'job:id,title,slug,company_id,city_id,employment_type,work_arrangement,salary_min,salary_max,is_salary_visible,application_deadline',
            'job.city:id,name',
            'job.company:id,name,slug,logo_path',
            'candidateCv:id,label,file_path',
            'statusLogs.changedBy:id,name',
        ]);

        return Inertia::render('employee/applications/show', [
            'application' => [
                'id' => $application->id,
                'status' => $application->status?->value,
                'ai_match_score' => $application->ai_match_score,
                'cover_letter' => $application->cover_letter,
                'expected_salary' => $application->expected_salary,
                'applied_at' => optional($application->applied_at)->toIso8601String(),
                'reviewed_at' => optional($application->reviewed_at)->toIso8601String(),
                'job' => [
                    'id' => $application->job?->id,
                    'title' => $application->job?->title,
                    'slug' => $application->job?->slug,
                    'city' => $application->job?->city?->name,
                    'employment_type' => $application->job?->employment_type?->value,
                    'work_arrangement' => $application->job?->work_arrangement?->value,
                    'salary_min' => $application->job?->salary_min,
                    'salary_max' => $application->job?->salary_max,
                    'is_salary_visible' => (bool) $application->job?->is_salary_visible,
                    'application_deadline' => optional($application->job?->application_deadline)->toIso8601String(),
                ],
                'company' => [
                    'name' => $application->job?->company?->name,
                    'slug' => $application->job?->company?->slug,
                    'logo_url' => $application->job?->company?->logo_path
                        ? asset('storage/'.$application->job->company->logo_path)
                        : null,
                ],
                'cv' => $application->candidateCv ? [
                    'id' => $application->candidateCv->id,
                    'label' => $application->candidateCv->label,
                    'url' => asset('storage/'.$application->candidateCv->file_path),
                ] : null,
                'status_logs' => $application->statusLogs->map(fn ($log) => [
                    'id' => $log->id,
                    'from_status' => $log->from_status?->value,
                    'to_status' => $log->to_status?->value,
                    'changed_at' => optional($log->created_at)->toIso8601String(),
                    'changed_by' => $log->changedBy?->name,
                    'note' => $log->note,
                ])->values(),
            ],
        ]);
    }
}
