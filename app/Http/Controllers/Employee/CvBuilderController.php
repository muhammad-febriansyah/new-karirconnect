<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\CvBuilderRequest;
use App\Services\Employee\CvBuilderService;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CvBuilderController extends Controller
{
    public function __construct(
        private readonly EmployeeProfileService $profiles,
        private readonly CvBuilderService $builder,
    ) {}

    public function edit(Request $request): Response
    {
        $user = $request->user();
        $profile = $this->profiles->ensureProfile($user);

        $data = $profile->cv_builder_json ?? [];

        // Prefill from profile/user when builder JSON is empty so first-time
        // users don't stare at a blank form.
        if (empty($data)) {
            $profile->loadMissing(['educations', 'workExperiences', 'certifications', 'skills', 'city']);

            $data = [
                'personal' => [
                    'full_name' => $user->name,
                    'headline' => $profile->headline,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'location' => $profile->city?->name,
                    'website' => $profile->portfolio_url,
                ],
                'summary' => $profile->about,
                'experiences' => $profile->workExperiences
                    ->map(fn ($exp) => [
                        'company' => $exp->company_name,
                        'position' => $exp->position,
                        'period' => trim(
                            optional($exp->start_date)->format('M Y').' – '
                            .($exp->is_current ? 'Sekarang' : optional($exp->end_date)->format('M Y'))
                        ),
                        'description' => $exp->description,
                    ])->values(),
                'educations' => $profile->educations
                    ->map(fn ($edu) => [
                        'institution' => $edu->institution,
                        'major' => $edu->major,
                        'period' => trim($edu->start_year.' – '.($edu->end_year ?? 'Sekarang')),
                        'gpa' => $edu->gpa,
                    ])->values(),
                'skills' => $profile->skills->pluck('name')->values(),
                'certifications' => $profile->certifications
                    ->map(fn ($cert) => [
                        'name' => $cert->name,
                        'issuer' => $cert->issuer,
                        'year' => optional($cert->issued_date)->format('Y'),
                    ])->values(),
            ];
        }

        return Inertia::render('employee/cv/builder', [
            'data' => $data,
        ]);
    }

    public function update(CvBuilderRequest $request): RedirectResponse
    {
        $profile = $this->profiles->ensureProfile($request->user());
        $payload = $request->validated();
        $label = $payload['label'] ?? 'CV Builder';
        unset($payload['label']);

        $cv = $this->builder->build($profile, $payload, $label);

        return back()->with('success', 'CV berhasil disimpan dan PDF di-generate.')
            ->with('cv_id', $cv->id);
    }
}
