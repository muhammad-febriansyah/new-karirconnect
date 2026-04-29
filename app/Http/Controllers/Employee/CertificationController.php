<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\CertificationRequest;
use App\Models\Certification;
use App\Models\EmployeeProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CertificationController extends Controller
{
    public function index(Request $request): Response
    {
        $profile = $this->resolveProfile($request);

        return Inertia::render('employee/profile/certifications', [
            'items' => $profile->certifications()
                ->latest('issued_date')
                ->latest('id')
                ->get(),
        ]);
    }

    public function store(CertificationRequest $request): RedirectResponse
    {
        $this->resolveProfile($request)->certifications()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sertifikasi berhasil ditambahkan.']);

        return to_route('employee.certifications.index');
    }

    public function update(CertificationRequest $request, Certification $certification): RedirectResponse
    {
        $this->ensureOwnership($request, $certification->employee_profile_id);
        $certification->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sertifikasi berhasil diperbarui.']);

        return to_route('employee.certifications.index');
    }

    public function destroy(Request $request, Certification $certification): RedirectResponse
    {
        $this->ensureOwnership($request, $certification->employee_profile_id);
        $certification->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sertifikasi berhasil dihapus.']);

        return to_route('employee.certifications.index');
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
