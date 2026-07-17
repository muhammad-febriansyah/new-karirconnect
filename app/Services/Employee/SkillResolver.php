<?php

namespace App\Services\Employee;

use App\Models\Skill;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Turns a mixed list of skill names and ids into skill ids, creating any that
 * do not exist yet.
 *
 * Onboarding and CV parsing both hand over whatever the user typed or the
 * parser guessed, so the input is untrusted and heterogeneous: ids as strings,
 * names in any case, blanks, duplicates. One implementation, because the
 * matching rules here are subtle enough that two would diverge.
 */
class SkillResolver
{
    /**
     * How many previously unknown skills a single call may create. Beyond this
     * the extras are dropped rather than letting one request bulk-insert into
     * the shared taxonomy.
     */
    private const MAX_NEW_SKILLS = 10;

    /**
     * @param  array<int, mixed>  $names
     * @return array<int, int>
     */
    public function resolve(array $names): array
    {
        $clean = collect($names)
            ->filter(fn ($value): bool => is_string($value) || is_numeric($value))
            ->map(fn ($value): string => trim((string) $value))
            ->filter(fn (string $value): bool => $value !== '')
            ->unique()
            ->values();

        if ($clean->isEmpty()) {
            return [];
        }

        $numericIds = $clean
            ->filter(fn (string $value) => ctype_digit($value))
            ->map(fn (string $value) => (int) $value)
            ->all();

        $existing = Skill::query()
            ->where(function ($query) use ($clean, $numericIds): void {
                $query->whereIn(DB::raw('LOWER(name)'), $clean->map(fn (string $n) => Str::lower($n))->all());

                if ($numericIds !== []) {
                    $query->orWhereIn('id', $numericIds);
                }
            })
            ->pluck('id', DB::raw('LOWER(name)'));

        $resolvedIds = $existing->values()->all();

        $missing = $clean
            ->filter(fn (string $name) => ! ctype_digit($name) && ! $existing->has(Str::lower($name)))
            ->take(self::MAX_NEW_SKILLS);

        foreach ($missing as $name) {
            $skill = Skill::query()->firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => Str::title($name), 'is_active' => true],
            );

            $resolvedIds[] = $skill->id;
        }

        return array_values(array_unique(array_merge($resolvedIds, $numericIds)));
    }
}
