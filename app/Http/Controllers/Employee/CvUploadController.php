<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\CandidateCvRequest;
use App\Http\Requests\Employee\CandidateCvUpdateRequest;
use App\Models\CandidateCv;
use App\Models\EmployeeProfile;
use App\Services\Files\FileUploadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CvUploadController extends Controller
{
    public function __construct(private readonly FileUploadService $files) {}

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
        $profile = $this->resolveProfile($request);
        $path = $this->files->store($request->file('file'), 'candidate-cvs');

        $cv = $profile->cvs()->create([
            'label' => $request->validated('label'),
            'source' => 'upload',
            'file_path' => $path,
            'is_active' => ! $profile->cvs()->exists(),
        ]);

        if ($cv->is_active) {
            $profile->forceFill(['primary_resume_id' => $cv->id])->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'CV berhasil diunggah.']);

        return to_route('employee.cvs.index');
    }

    public function update(CandidateCvUpdateRequest $request, CandidateCv $candidateCv): RedirectResponse
    {
        $profile = $this->resolveProfile($request);
        abort_unless($candidateCv->employee_profile_id === $profile->id, 404);

        $candidateCv->update([
            'label' => $request->validated('label'),
            'is_active' => $request->validated('is_active'),
        ]);

        if ($candidateCv->is_active) {
            $profile->cvs()->whereKeyNot($candidateCv->id)->update(['is_active' => false]);
            $profile->forceFill(['primary_resume_id' => $candidateCv->id])->save();
        } elseif ($profile->primary_resume_id === $candidateCv->id) {
            $profile->forceFill(['primary_resume_id' => null])->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'CV berhasil diperbarui.']);

        return to_route('employee.cvs.index');
    }

    public function destroy(Request $request, CandidateCv $candidateCv): RedirectResponse
    {
        $profile = $this->resolveProfile($request);
        abort_unless($candidateCv->employee_profile_id === $profile->id, 404);

        $this->files->delete($candidateCv->file_path);

        if ($profile->primary_resume_id === $candidateCv->id) {
            $profile->forceFill(['primary_resume_id' => null])->save();
        }

        $candidateCv->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'CV berhasil dihapus.']);

        return to_route('employee.cvs.index');
    }

    private function resolveProfile(Request $request): EmployeeProfile
    {
        return $request->user()->employeeProfile()->firstOrCreate([]);
    }
}
