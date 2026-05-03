<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ExperienceLevel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SalaryInsightRequest;
use App\Models\City;
use App\Models\SalaryInsight;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SalaryInsightController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/salary-insights/index', [
            'items' => SalaryInsight::query()
                ->with('city:id,name')
                ->latest('last_updated_at')
                ->latest('id')
                ->get()
                ->map(fn (SalaryInsight $insight): array => [
                    'id' => $insight->id,
                    'job_title' => $insight->job_title,
                    'role_category' => $insight->role_category,
                    'city_id' => $insight->city_id,
                    'city_name' => $insight->city?->name,
                    'experience_level' => $insight->experience_level?->value,
                    'min_salary' => $insight->min_salary,
                    'median_salary' => $insight->median_salary,
                    'max_salary' => $insight->max_salary,
                    'sample_size' => $insight->sample_size,
                    'source' => $insight->source,
                    'last_updated_at' => optional($insight->last_updated_at)->toIso8601String(),
                ]),
            'cities' => City::query()->orderBy('name')->limit(100)->get(['id', 'name']),
            'experienceLevels' => collect(ExperienceLevel::cases())
                ->map(fn (ExperienceLevel $level): array => [
                    'value' => $level->value,
                    'label' => $level->label(),
                ]),
        ]);
    }

    public function store(SalaryInsightRequest $request): RedirectResponse
    {
        SalaryInsight::query()->create([
            ...$request->validated(),
            'last_updated_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Salary insight berhasil ditambahkan.']);

        return to_route('admin.salary-insights.index');
    }

    public function update(SalaryInsightRequest $request, SalaryInsight $salaryInsight): RedirectResponse
    {
        $salaryInsight->update([
            ...$request->validated(),
            'last_updated_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Salary insight berhasil diperbarui.']);

        return to_route('admin.salary-insights.index');
    }

    public function destroy(SalaryInsight $salaryInsight): RedirectResponse
    {
        $salaryInsight->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Salary insight berhasil dihapus.']);

        return to_route('admin.salary-insights.index');
    }
}
