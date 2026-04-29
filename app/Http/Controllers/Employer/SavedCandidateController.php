<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\SavedCandidate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SavedCandidateController extends Controller
{
    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $rows = SavedCandidate::query()
            ->with(['candidateProfile.user:id,name,email,avatar_path', 'candidateProfile.skills:id,name', 'savedBy:id,name'])
            ->where('company_id', $company->id)
            ->latest('saved_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('employer/talent-search/saved', [
            'saved' => $rows->through(fn (SavedCandidate $s) => [
                'id' => $s->id,
                'profile_id' => $s->candidate_profile_id,
                'name' => $s->candidateProfile?->user?->name,
                'avatar_url' => $s->candidateProfile?->user?->avatar_path
                    ? asset('storage/'.$s->candidateProfile->user->avatar_path)
                    : null,
                'headline' => $s->candidateProfile?->headline,
                'label' => $s->label,
                'note' => $s->note,
                'saved_at' => optional($s->saved_at)->toIso8601String(),
                'saved_by' => $s->savedBy?->name,
                'skills' => $s->candidateProfile?->skills->take(5)->map(fn ($k) => ['id' => $k->id, 'name' => $k->name])->values() ?? [],
            ]),
        ]);
    }

    public function store(Request $request, EmployeeProfile $profile): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);
        abort_unless(in_array($profile->visibility, ['public', 'employers'], true), 403);

        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:64'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        SavedCandidate::query()->updateOrCreate(
            ['company_id' => $company->id, 'candidate_profile_id' => $profile->id],
            [
                'saved_by_user_id' => $request->user()->id,
                'label' => $data['label'] ?? null,
                'note' => $data['note'] ?? null,
                'saved_at' => now(),
            ],
        );

        return back()->with('success', 'Kandidat disimpan.');
    }

    public function destroy(Request $request, EmployeeProfile $profile): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        SavedCandidate::query()
            ->where('company_id', $company->id)
            ->where('candidate_profile_id', $profile->id)
            ->delete();

        return back()->with('success', 'Kandidat dihapus dari simpanan.');
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }
}
