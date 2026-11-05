<?php

namespace App\Services\Crawler;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\WorkArrangement;
use App\Models\City;
use App\Models\CompanySize;
use App\Models\Industry;
use App\Models\JobCategory;
use App\Models\Province;
use App\Models\Skill;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Maps the worker's raw values onto this app's enums and master data.
 *
 * Every mapping only uses what the source stated: an unknown or ambiguous
 * value maps to null rather than to a best guess.
 */
class ListingAttributeMapper
{
    /** @var array<string, array{city_id: int|null, province_id: int}>|null */
    private ?array $cities = null;

    /** @var array<string, int>|null */
    private ?array $provinces = null;

    /** @var Collection<int, JobCategory>|null */
    private ?Collection $categories = null;

    /** @var Collection<int, Skill>|null */
    private ?Collection $skills = null;

    public function employmentType(?string $raw): ?EmploymentType
    {
        $value = Str::lower((string) $raw);

        return match (true) {
            $value === '' => null,
            str_contains($value, 'intern') || str_contains($value, 'magang') => EmploymentType::Internship,
            str_contains($value, 'part') => EmploymentType::PartTime,
            str_contains($value, 'freelance') => EmploymentType::Freelance,
            str_contains($value, 'contract') || str_contains($value, 'kontrak') || str_contains($value, 'temporary') => EmploymentType::Contract,
            str_contains($value, 'full') || str_contains($value, 'permanent') || str_contains($value, 'tetap') || str_contains($value, 'regular') => EmploymentType::FullTime,
            default => null,
        };
    }

    public function workArrangement(?string $raw, ?string $locationText): ?WorkArrangement
    {
        $value = Str::lower((string) $raw);

        $fromRaw = match (true) {
            $value === '' => null,
            str_contains($value, 'hybrid') => WorkArrangement::Hybrid,
            str_contains($value, 'remote') => WorkArrangement::Remote,
            str_contains($value, 'site') || str_contains($value, 'office') || str_contains($value, 'kantor') => WorkArrangement::Onsite,
            default => null,
        };

        if ($fromRaw !== null) {
            return $fromRaw;
        }

        // Only when the location itself says so ("Remote", "Remote, Indonesia").
        $location = Str::lower((string) $locationText);

        return match (true) {
            str_contains($location, 'hybrid') => WorkArrangement::Hybrid,
            str_contains($location, 'remote') => WorkArrangement::Remote,
            default => null,
        };
    }

    /**
     * Read from explicit seniority words in the title ("Senior", "Intern"...).
     */
    public function experienceLevel(string $title): ?ExperienceLevel
    {
        $value = ' '.Str::lower($title).' ';

        return match (true) {
            (bool) preg_match('/\b(intern|internship|magang|trainee|graduate)\b/', $value) => ExperienceLevel::Entry,
            (bool) preg_match('/\b(head of|director|vp|vice president|chief|c[teo]o)\b/', $value) => ExperienceLevel::Executive,
            // "Staff" is left out on purpose: "Staff Engineer" is senior, but
            // "Staff Accountant" is an ordinary position.
            (bool) preg_match('/\b(lead|principal)\b/', $value) => ExperienceLevel::Lead,
            (bool) preg_match('/\b(senior|sr\.?)\b/', $value) => ExperienceLevel::Senior,
            (bool) preg_match('/\b(junior|jr\.?)\b/', $value) => ExperienceLevel::Junior,
            (bool) preg_match('/\b(mid|middle|intermediate)\b/', $value) => ExperienceLevel::Mid,
            default => null,
        };
    }

    /**
     * Exact (case-insensitive) match of a department name on a job category.
     */
    public function categoryId(?string $department): ?int
    {
        if (blank($department)) {
            return null;
        }

        $this->categories ??= JobCategory::query()->where('is_active', true)->get(['id', 'name']);

        foreach (preg_split('/\s*[\/,|]\s*/', $department) ?: [] as $part) {
            $match = $this->categories->first(
                fn (JobCategory $category): bool => Str::lower($category->name) === Str::lower(trim($part)),
            );
            if ($match !== null) {
                return $match->id;
            }
        }

        return null;
    }

    /**
     * Category from keywords in the job title (config crawler.category_keywords),
     * for sources without a department. The first listed category whose
     * keyword appears as a whole word wins; nothing matching maps to null.
     */
    public function categoryFromTitle(?string $title): ?int
    {
        if (blank($title)) {
            return null;
        }

        $this->categories ??= JobCategory::query()->where('is_active', true)->get(['id', 'name']);
        $haystack = ' '.Str::lower((string) $title).' ';

        foreach ((array) config('crawler.category_keywords', []) as $categoryName => $keywords) {
            foreach ((array) $keywords as $keyword) {
                if (preg_match('/(?<![\p{L}\p{N}])'.preg_quote(Str::lower($keyword), '/').'(?![\p{L}\p{N}])/u', $haystack) !== 1) {
                    continue;
                }

                $category = $this->categories->first(
                    fn (JobCategory $category): bool => Str::lower(trim($category->name, " '")) === Str::lower($categoryName),
                );
                if ($category !== null) {
                    return $category->id;
                }
            }
        }

        return null;
    }

    /**
     * Match "Jakarta Selatan, Indonesia" / "Kota Bandung" / "DKI Jakarta" to
     * a city and province. A city name that exists both as Kota and Kabupaten
     * resolves to the Kota.
     *
     * @return array{city_id: int|null, province_id: int|null}
     */
    public function location(?string $text): array
    {
        $none = ['city_id' => null, 'province_id' => null];
        if (blank($text)) {
            return $none;
        }

        $this->loadLocations();

        $parts = preg_split('/\s*[,;\/|]\s*|\s+-\s+/', (string) $text) ?: [];
        $province = null;

        foreach ($parts as $part) {
            $key = self::placeKey($part);
            if ($key === '') {
                continue;
            }
            if (isset($this->cities[$key])) {
                return $this->cities[$key];
            }
            $province ??= $this->provinces[$key] ?? null;
        }

        return ['city_id' => null, 'province_id' => $province];
    }

    /**
     * Known skills named in the text as whole words. Names under three
     * characters are skipped: "Go" or "R" would match ordinary words.
     *
     * @return list<int>
     */
    public function skillIds(?string ...$texts): array
    {
        $haystack = ' '.Str::lower(strip_tags(implode(' ', array_filter($texts)))).' ';
        if (trim($haystack) === '') {
            return [];
        }

        $this->skills ??= Skill::query()->where('is_active', true)->get(['id', 'name']);

        return $this->skills
            ->filter(function (Skill $skill) use ($haystack): bool {
                $name = Str::lower(trim($skill->name));

                return mb_strlen($name) >= 3
                    && preg_match('/(?<![\p{L}\p{N}])'.preg_quote($name, '/').'(?![\p{L}\p{N}])/u', $haystack) === 1;
            })
            ->pluck('id')
            ->values()
            ->all();
    }

    public function industryId(?string $raw): ?int
    {
        if (blank($raw)) {
            return null;
        }

        return Industry::query()->whereRaw('LOWER(name) = ?', [Str::lower(trim((string) $raw))])->value('id');
    }

    public function companySizeId(?string $raw): ?int
    {
        if (blank($raw)) {
            return null;
        }

        $range = preg_replace('/\s+/', '', (string) $raw);

        return CompanySize::query()
            ->get(['id', 'name', 'employee_range'])
            ->first(fn (CompanySize $size): bool => preg_replace('/\s+/', '', (string) $size->employee_range) === $range
                || Str::startsWith(preg_replace('/\s+/', '', $size->name), $range.'Karyawan'))
            ?->id;
    }

    public static function placeKey(string $name): string
    {
        $key = Str::of($name)
            ->ascii()
            ->lower()
            ->replaceMatches('/^(kota administrasi|kabupaten administrasi|kota|kabupaten|kab\.?|provinsi|daerah khusus ibukota|daerah istimewa|dki|di)\s+/', '')
            ->replaceMatches('/[^a-z0-9 ]+/', ' ')
            ->squish()
            ->toString();

        return $key;
    }

    private function loadLocations(): void
    {
        if ($this->cities !== null) {
            return;
        }

        $this->provinces = Province::query()->get(['id', 'name'])
            ->mapWithKeys(fn (Province $province): array => [self::placeKey($province->name) => $province->id])
            ->all();

        $this->cities = [];
        // Kabupaten first so a Kota with the same name overwrites it.
        $cities = City::query()->get(['id', 'name', 'province_id'])
            ->sortBy(fn (City $city): int => Str::startsWith(Str::lower($city->name), 'kota') ? 1 : 0);

        foreach ($cities as $city) {
            $this->cities[self::placeKey($city->name)] = ['city_id' => $city->id, 'province_id' => $city->province_id];
        }
    }
}
