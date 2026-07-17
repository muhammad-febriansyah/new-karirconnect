<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\WorkArrangement;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\CompanySize;
use App\Models\Industry;
use App\Models\JobCategory;
use App\Models\Province;
use App\Models\Skill;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * Taxonomy the client needs to render filter pickers.
 *
 * One endpoint rather than six: the app needs the whole set before it can draw
 * a filter sheet, and six round trips on a mobile connection is the wrong
 * trade. The data is effectively static, so it is cached and served whole.
 */
class MetaController extends Controller
{
    private const CACHE_KEY = 'api:v1:meta';

    private const CACHE_TTL_SECONDS = 3600;

    public function index(): JsonResponse
    {
        $data = Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, fn () => [
            'job_categories' => JobCategory::query()
                ->where('is_active', true)
                ->orderBy('sort_order')->orderBy('name')
                ->get(['id', 'name', 'slug']),

            'industries' => Industry::query()
                ->where('is_active', true)
                ->orderBy('sort_order')->orderBy('name')
                ->get(['id', 'name', 'slug']),

            'company_sizes' => CompanySize::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'slug', 'employee_range']),

            'provinces' => Province::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),

            // Sent whole: the picker filters cities by province offline, and
            // the full Indonesian city list is small enough to ship once.
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'name', 'province_id']),

            // The web listing caps this at 200. Kept identical here so the two
            // filter sheets cannot offer different skills.
            'skills' => Skill::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->limit(200)
                ->get(['id', 'name', 'slug', 'type']),

            'employment_types' => EmploymentType::selectItems(),
            'work_arrangements' => WorkArrangement::selectItems(),
            'experience_levels' => ExperienceLevel::selectItems(),
            'education_levels' => EducationLevel::selectItems(),
        ]);

        return response()->json(['data' => $data]);
    }
}
