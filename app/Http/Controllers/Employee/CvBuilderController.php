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

            // Every field is cast to a string: the builder treats these as text
            // inputs and runs string methods over them, so a null from a
            // nullable column (an experience without a description, an
            // education without a major) would break the page on render.
            $data = [
                'personal' => [
                    'full_name' => (string) $user->name,
                    'headline' => (string) $profile->headline,
                    'email' => (string) $user->email,
                    'phone' => (string) $user->phone,
                    'location' => (string) $profile->city?->name,
                    'website' => (string) $profile->portfolio_url,
                ],
                'summary' => (string) $profile->about,
                'experiences' => $profile->workExperiences
                    ->map(fn ($exp) => [
                        'company' => (string) $exp->company_name,
                        'position' => (string) $exp->position,
                        'period' => trim(
                            optional($exp->start_date)->format('M Y').' – '
                            .($exp->is_current ? 'Sekarang' : optional($exp->end_date)->format('M Y'))
                        ),
                        'description' => (string) $exp->description,
                    ])->values(),
                'educations' => $profile->educations
                    ->map(fn ($edu) => [
                        'institution' => (string) $edu->institution,
                        'major' => (string) $edu->major,
                        'period' => trim($edu->start_year.' – '.($edu->end_year ?? 'Sekarang')),
                        'gpa' => (string) $edu->gpa,
                    ])->values(),
                'skills' => $profile->skills->pluck('name')->map(fn ($name) => (string) $name)->values(),
                'certifications' => $profile->certifications
                    ->map(fn ($cert) => [
                        'name' => (string) $cert->name,
                        'issuer' => (string) $cert->issuer,
                        'year' => (string) optional($cert->issued_date)->format('Y'),
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
