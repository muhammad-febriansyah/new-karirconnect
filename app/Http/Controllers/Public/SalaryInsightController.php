<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\JobCategory;
use App\Services\SalaryInsight\SalaryInsightService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalaryInsightController extends Controller
{
    public function __construct(private readonly SalaryInsightService $insight) {}

    public function index(Request $request): Response
    {
        $filters = $this->extractFilters($request);

        $aggregate = $this->insight->aggregate($filters);
        $topCompanies = $this->insight->topCompanies($filters);
        $recent = $this->insight->recentSubmissions($filters);
        $categories = $this->insight->categoriesWithSamples();
        $curatedInsights = $this->insight->curatedInsights($filters);

        return Inertia::render('public/salary-insight', [
            'filters' => $filters,
            'aggregate' => $aggregate,
            'topCompanies' => $topCompanies,
            'recentSubmissions' => $recent,
            'popularCategories' => $categories,
            'curatedInsights' => $curatedInsights,
            'options' => [
                'categories' => JobCategory::query()->orderBy('name')->get(['id', 'name', 'slug']),
                'cities' => City::query()->orderBy('name')->limit(50)->get(['id', 'name']),
                'experience_levels' => [
                    ['value' => 'entry', 'label' => 'Entry'],
                    ['value' => 'junior', 'label' => 'Junior'],
                    ['value' => 'mid', 'label' => 'Mid'],
                    ['value' => 'senior', 'label' => 'Senior'],
                    ['value' => 'lead', 'label' => 'Lead'],
                    ['value' => 'executive', 'label' => 'Executive'],
                ],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function extractFilters(Request $request): array
    {
        return array_filter([
            'job_category_id' => $request->integer('job_category_id') ?: null,
            'city_id' => $request->integer('city_id') ?: null,
            'province_id' => $request->integer('province_id') ?: null,
            'experience_level' => $request->input('experience_level'),
            'employment_type' => $request->input('employment_type'),
        ], static fn ($v) => $v !== null && $v !== '');
    }
}
