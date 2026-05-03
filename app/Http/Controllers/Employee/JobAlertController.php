<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\JobAlert;
use App\Models\JobCategory;
use App\Services\JobAlerts\JobAlertDispatcher;
use App\Services\JobAlerts\JobAlertMatcherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobAlertController extends Controller
{
    public function __construct(
        private readonly JobAlertMatcherService $matcher,
        private readonly JobAlertDispatcher $dispatcher,
    ) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $alerts = JobAlert::query()
            ->with('category:id,name', 'city:id,name')
            ->where('user_id', $request->user()->id)
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('keyword', 'like', "%{$search}%")
                        ->orWhereHas('category', fn ($categoryQuery) => $categoryQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('city', fn ($cityQuery) => $cityQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('employee/job-alerts/index', [
            'filters' => [
                'search' => $search,
            ],
            'alerts' => $alerts->through(fn (JobAlert $a) => [
                'id' => $a->id,
                'name' => $a->name,
                'keyword' => $a->keyword,
                'category' => $a->category?->name,
                'city' => $a->city?->name,
                'experience_level' => $a->experience_level?->value,
                'employment_type' => $a->employment_type,
                'work_arrangement' => $a->work_arrangement,
                'salary_min' => $a->salary_min,
                'frequency' => $a->frequency,
                'is_active' => $a->is_active,
                'last_sent_at' => optional($a->last_sent_at)->toIso8601String(),
                'total_matches_sent' => $a->total_matches_sent,
            ]),
            'options' => $this->options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['user_id'] = $request->user()->id;
        $data['is_active'] ??= true;

        JobAlert::query()->create($data);

        return redirect()->route('employee.job-alerts.index')
            ->with('success', 'Alert disimpan.');
    }

    public function update(Request $request, JobAlert $alert): RedirectResponse
    {
        abort_unless($alert->user_id === $request->user()->id, 403);

        $alert->update($this->validated($request));

        return back()->with('success', 'Alert diperbarui.');
    }

    public function destroy(Request $request, JobAlert $alert): RedirectResponse
    {
        abort_unless($alert->user_id === $request->user()->id, 403);

        $alert->delete();

        return back()->with('success', 'Alert dihapus.');
    }

    public function preview(Request $request, JobAlert $alert): JsonResponse
    {
        abort_unless($alert->user_id === $request->user()->id, 403);

        $matches = $this->matcher->match($alert);

        return response()->json([
            'count' => $matches->count(),
            'jobs' => $matches->take(10)->map(fn ($j) => [
                'id' => $j->id,
                'slug' => $j->slug,
                'title' => $j->title,
                'company' => $j->company?->name,
                'category' => $j->category?->name,
                'city' => $j->city?->name,
            ])->values(),
        ]);
    }

    public function dispatchNow(Request $request, JobAlert $alert): RedirectResponse
    {
        abort_unless($alert->user_id === $request->user()->id, 403);

        $count = $this->dispatcher->dispatchOne($alert);

        return back()->with('success', $count > 0
            ? "Digest terkirim dengan {$count} lowongan baru."
            : 'Belum ada lowongan baru sejak alert terakhir terkirim.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $request->merge([
            'job_category_id' => $request->filled('job_category_id') ? (int) $request->input('job_category_id') : null,
            'city_id' => $request->filled('city_id') ? (int) $request->input('city_id') : null,
            'province_id' => $request->filled('province_id') ? (int) $request->input('province_id') : null,
            'salary_min' => $this->normalizeRupiah($request->input('salary_min')),
            'is_active' => $request->boolean('is_active'),
        ]);

        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'keyword' => ['nullable', 'string', 'max:200'],
            'job_category_id' => ['nullable', 'integer', 'exists:job_categories,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'experience_level' => ['nullable', 'in:entry,junior,mid,senior,lead,executive'],
            'employment_type' => ['nullable', 'string', 'max:24'],
            'work_arrangement' => ['nullable', 'string', 'max:24'],
            'salary_min' => ['nullable', 'integer', 'min:0', 'max:1000000000'],
            'frequency' => ['required', 'in:instant,daily,weekly'],
            'is_active' => ['boolean'],
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
            'categories' => JobCategory::query()->orderBy('name')->get(['id', 'name']),
            'cities' => City::query()->orderBy('name')->limit(100)->get(['id', 'name']),
            'experience_levels' => [
                ['value' => 'entry', 'label' => 'Entry'],
                ['value' => 'junior', 'label' => 'Junior'],
                ['value' => 'mid', 'label' => 'Mid'],
                ['value' => 'senior', 'label' => 'Senior'],
                ['value' => 'lead', 'label' => 'Lead'],
                ['value' => 'executive', 'label' => 'Executive'],
            ],
            'frequencies' => [
                ['value' => 'instant', 'label' => 'Setiap kali jadi'],
                ['value' => 'daily', 'label' => 'Harian'],
                ['value' => 'weekly', 'label' => 'Mingguan'],
            ],
        ];
    }
}
