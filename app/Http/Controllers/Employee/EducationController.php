<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\EducationRequest;
use App\Models\Education;
use App\Models\EmployeeProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EducationController extends Controller
{
    public function index(Request $request): Response
    {
        $profile = $this->resolveProfile($request);

        return Inertia::render('employee/profile/educations', [
            'items' => $profile->educations()
                ->latest('start_year')
                ->latest('id')
                ->get(),
        ]);
    }

    public function store(EducationRequest $request): RedirectResponse
    {
        $this->resolveProfile($request)->educations()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Riwayat pendidikan berhasil ditambahkan.']);

        return to_route('employee.educations.index');
    }

    public function update(EducationRequest $request, Education $education): RedirectResponse
    {
        $this->ensureOwnership($request, $education->employee_profile_id);
        $education->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Riwayat pendidikan berhasil diperbarui.']);

        return to_route('employee.educations.index');
    }

    public function destroy(Request $request, Education $education): RedirectResponse
    {
        $this->ensureOwnership($request, $education->employee_profile_id);
        $education->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Riwayat pendidikan berhasil dihapus.']);

        return to_route('employee.educations.index');
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
