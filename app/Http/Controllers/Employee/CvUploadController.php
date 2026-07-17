<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\CandidateCvRequest;
use App\Http\Requests\Employee\CandidateCvUpdateRequest;
use App\Models\CandidateCv;
use App\Models\EmployeeProfile;
use App\Services\Employee\CandidateCvService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CvUploadController extends Controller
{
    public function __construct(private readonly CandidateCvService $cvs) {}

    public function index(Request $request): Response
    {
        $profile = $this->resolveProfile($request);

        return Inertia::render('employee/cv/index', [
            'items' => $profile->cvs()
                ->latest('id')
                ->get()
                ->map(fn (CandidateCv $cv): array => [
                    ...$cv->toArray(),
                    'file_url' => $cv->file_path ? asset('storage/'.$cv->file_path) : null,
                ]),
            'primaryResumeId' => $profile->primary_resume_id,
        ]);
    }

    public function store(CandidateCvRequest $request): RedirectResponse
    {
        $this->cvs->store(
            $this->resolveProfile($request),
            $request->file('file'),
            $request->validated('label'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'CV berhasil diunggah.']);

        return to_route('employee.cvs.index');
    }

    public function update(CandidateCvUpdateRequest $request, CandidateCv $candidateCv): RedirectResponse
    {
        $profile = $this->resolveProfile($request);
        abort_unless($candidateCv->employee_profile_id === $profile->id, 404);

        $this->cvs->update(
            $profile,
            $candidateCv,
            $request->validated('label'),
            $request->validated('is_active'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'CV berhasil diperbarui.']);

        return to_route('employee.cvs.index');
    }

    public function destroy(Request $request, CandidateCv $candidateCv): RedirectResponse
    {
        $profile = $this->resolveProfile($request);
        abort_unless($candidateCv->employee_profile_id === $profile->id, 404);

        $this->cvs->delete($profile, $candidateCv);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'CV berhasil dihapus.']);

        return to_route('employee.cvs.index');
    }

    private function resolveProfile(Request $request): EmployeeProfile
    {
        return $request->user()->employeeProfile()->firstOrCreate([]);
    }
}
