<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\WorkExperienceRequest;
use App\Models\EmployeeProfile;
use App\Models\WorkExperience;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkExperienceController extends Controller
{
    public function index(Request $request): Response
    {
        $profile = $this->resolveProfile($request);

        return Inertia::render('employee/profile/work-experiences', [
            'items' => $profile->workExperiences()
                ->latest('start_date')
                ->latest('id')
                ->get()
                ->map(fn (WorkExperience $experience): array => [
                    ...$experience->toArray(),
                    'employment_type' => $experience->employment_type?->value,
                ]),
        ]);
    }

    public function store(WorkExperienceRequest $request): RedirectResponse
    {
        $this->resolveProfile($request)->workExperiences()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengalaman kerja berhasil ditambahkan.']);

        return to_route('employee.work-experiences.index');
    }

    public function update(WorkExperienceRequest $request, WorkExperience $workExperience): RedirectResponse
    {
        $this->ensureOwnership($request, $workExperience->employee_profile_id);
        $workExperience->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengalaman kerja berhasil diperbarui.']);

        return to_route('employee.work-experiences.index');
    }

    public function destroy(Request $request, WorkExperience $workExperience): RedirectResponse
    {
        $this->ensureOwnership($request, $workExperience->employee_profile_id);
        $workExperience->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengalaman kerja berhasil dihapus.']);

        return to_route('employee.work-experiences.index');
    }

    private function resolveProfile(Request $request): EmployeeProfile
    {
        return $request->user()->employeeProfile()->firstOrCreate([]);
    }

    private function ensureOwnership(Request $request, int $employeeProfileId): void
    {
        abort_unless($request->user()->employeeProfile?->id === $employeeProfileId, 404);
    }
}
