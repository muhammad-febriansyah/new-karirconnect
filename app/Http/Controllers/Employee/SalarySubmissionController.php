<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\JobCategory;
use App\Models\SalarySubmission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalarySubmissionController extends Controller
{
    public function index(Request $request): Response
    {
        $rows = SalarySubmission::query()
            ->with('category:id,name', 'company:id,name,slug', 'city:id,name')
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('employee/salary-submissions/index', [
            'submissions' => $rows->through(fn (SalarySubmission $s) => [
                'id' => $s->id,
                'job_title' => $s->job_title,
                'salary_idr' => $s->salary_idr,
                'bonus_idr' => $s->bonus_idr,
                'experience_level' => $s->experience_level?->value,
                'experience_years' => $s->experience_years,
                'employment_type' => $s->employment_type,
                'category' => $s->category?->name,
                'company' => $s->company?->name,
                'city' => $s->city?->name,
                'is_anonymous' => $s->is_anonymous,
                'status' => $s->status,
                'created_at' => optional($s->created_at)->toIso8601String(),
            ]),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('employee/salary-submissions/form', [
            'submission' => null,
            'options' => $this->options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['user_id'] = $request->user()->id;
        $data['status'] = 'pending';

        SalarySubmission::query()->create($data);

        return redirect()->route('employee.salary-submissions.index')
            ->with('success', 'Data gaji terkirim. Akan ditinjau sebelum dipublikasikan agregat.');
    }

    public function destroy(Request $request, SalarySubmission $submission): RedirectResponse
    {
        abort_unless($submission->user_id === $request->user()->id, 403);
        $submission->delete();

        return back()->with('success', 'Data dihapus.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $request->merge([
            'job_category_id' => $request->filled('job_category_id') ? (int) $request->input('job_category_id') : null,
            'company_id' => $request->filled('company_id') ? (int) $request->input('company_id') : null,
            'city_id' => $request->filled('city_id') ? (int) $request->input('city_id') : null,
            'province_id' => $request->filled('province_id') ? (int) $request->input('province_id') : null,
            'experience_years' => $request->filled('experience_years') ? (int) $request->input('experience_years') : null,
            'salary_idr' => $this->normalizeRupiah($request->input('salary_idr')),
            'bonus_idr' => $this->normalizeRupiah($request->input('bonus_idr')),
            'is_anonymous' => $request->boolean('is_anonymous'),
        ]);

        return $request->validate([
            'job_title' => ['required', 'string', 'max:200'],
            'job_category_id' => ['nullable', 'integer', 'exists:job_categories,id'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'experience_level' => ['required', 'in:entry,junior,mid,senior,lead,executive'],
            'experience_years' => ['required', 'integer', 'between:0,40'],
            'employment_type' => ['required', 'in:full_time,part_time,contract,freelance,internship'],
            'salary_idr' => ['required', 'integer', 'min:1000000', 'max:1000000000'],
            'bonus_idr' => ['nullable', 'integer', 'min:0', 'max:1000000000'],
            'is_anonymous' => ['boolean'],
        ]);
    }

    private function normalizeRupiah(mixed $value): ?int
    {
        if (! filled($value)) {
            return null;
        }

        $digits = preg_replace('/[^\d]/', '', (string) $value);

        return $digits === '' ? null : (int) $digits;
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'categories' => JobCategory::query()->orderBy('name')->get(['id', 'name', 'slug']),
            'cities' => City::query()->orderBy('name')->limit(100)->get(['id', 'name']),
            'experience_levels' => [
                ['value' => 'entry', 'label' => 'Entry'],
                ['value' => 'junior', 'label' => 'Junior'],
                ['value' => 'mid', 'label' => 'Mid'],
                ['value' => 'senior', 'label' => 'Senior'],
                ['value' => 'lead', 'label' => 'Lead'],
                ['value' => 'executive', 'label' => 'Executive'],
            ],
        ];
    }
}
