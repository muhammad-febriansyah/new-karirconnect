<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Actions\Applications\ChangeApplicationStatusAction;
use App\Enums\ApplicationStatus;
use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Applications\ChangeApplicationStatusRequest;
use App\Http\Resources\Api\V1\ApplicationDetailResource;
use App\Models\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Employer view of the candidates who applied.
 */
class ApplicantController extends Controller
{
    use ResolvesEmployerCompany;

    public function __construct(private readonly ChangeApplicationStatusAction $changeStatus) {}

    public function index(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $applicants = Application::query()
            ->with([
                'job:id,title,slug,company_id,is_anonymous',
                'employeeProfile.user:id,name,email,avatar_path',
                'employeeProfile.city:id,name',
                'candidateCv:id,employee_profile_id,label,file_path,source',
            ])
            ->whereHas('job', fn ($query) => $query->where('company_id', $company->id))
            ->when($request->filled('job'), fn ($query) => $query->where('job_id', $request->integer('job')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->orderByDesc('applied_at')
            ->paginate(min($request->integer('per_page') ?: 20, 50))
            ->withQueryString();

        return response()->json([
            'data' => collect($applicants->items())->map(fn (Application $a) => $this->present($a))->values(),
            'meta' => [
                'current_page' => $applicants->currentPage(),
                'last_page' => $applicants->lastPage(),
                'total' => $applicants->total(),
            ],
        ]);
    }

    public function show(Request $request, Application $application): JsonResponse
    {
        $this->authorizeApplication($request, $application);

        $application->load([
            'job:id,title,slug,company_id,is_anonymous',
            'employeeProfile.user:id,name,email,avatar_path',
            'employeeProfile.skills:id,name',
            'candidateCv:id,label,file_path',
            'statusLogs.changedBy:id,name',
            'screeningAnswers',
        ]);

        return response()->json([
            'data' => new ApplicationDetailResource($application),
            'meta' => ['candidate' => $this->candidate($application)],
        ]);
    }

    /**
     * Move a candidate through the pipeline. ChangeApplicationStatusAction
     * writes the status log and notifies the candidate.
     */
    public function changeStatus(ChangeApplicationStatusRequest $request, Application $application): JsonResponse
    {
        $this->authorizeApplication($request, $application);

        $this->changeStatus->execute(
            $application,
            ApplicationStatus::from($request->validated('status')),
            $request->user(),
            $request->validated('note'),
        );

        return response()->json([
            'data' => new ApplicationDetailResource($application->fresh(['job', 'statusLogs.changedBy'])),
        ]);
    }

    private function authorizeApplication(Request $request, Application $application): void
    {
        $company = $this->resolveCompany($request);

        abort_unless(
            $company !== null && $application->job?->company_id === $company->id,
            403,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Application $application): array
    {
        return [
            'id' => $application->id,
            'status' => $application->status?->value,
            'status_label' => $application->status?->label(),
            'ai_match_score' => $application->ai_match_score,
            'screening_score' => $application->screening_score,
            'current_stage' => $application->current_stage?->value,
            'applied_at' => $application->applied_at?->toIso8601String(),
            'job' => [
                'id' => $application->job?->id,
                'title' => $application->job?->title,
                'slug' => $application->job?->slug,
            ],
            'candidate' => $this->candidate($application),
        ];
    }

    /**
     * The candidate behind an application.
     *
     * Not masked: this employer owns the job, so they are entitled to see who
     * applied. is_anonymous hides the *employer* from candidates, not the other
     * way round.
     *
     * @return array<string, mixed>
     */
    private function candidate(Application $application): array
    {
        $profile = $application->employeeProfile;
        $user = $profile?->user;

        return [
            'profile_id' => $profile?->id,
            'name' => $user?->name,
            'email' => $user?->email,
            'avatar_url' => $user?->avatar_path ? asset('storage/'.$user->avatar_path) : null,
            'headline' => $profile?->headline,
            'city' => $profile?->city?->name,
            'cv_url' => $application->candidateCv?->file_path
                ? asset('storage/'.$application->candidateCv->file_path)
                : null,
        ];
    }
}
