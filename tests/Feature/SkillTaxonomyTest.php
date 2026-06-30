<?php

use App\Enums\SkillType;
use App\Models\Company;
use App\Models\Skill;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    $this->seed([ProvinceCitySeeder::class, LookupSeeder::class]);
});

test('the skill taxonomy seeds both soft and hard skills with a category', function () {
    expect(Skill::query()->where('type', SkillType::Soft)->count())->toBeGreaterThan(0);
    expect(Skill::query()->where('type', SkillType::Hard)->count())->toBeGreaterThan(0);
    expect(Skill::query()->whereNull('category')->count())->toBe(0);

    // Old flat tech skills are pruned by the replace-total reseed.
    expect(Skill::query()->where('name', 'Laravel')->exists())->toBeFalse();
    expect(Skill::query()->where('name', 'Figma')->where('type', SkillType::Hard)->exists())->toBeTrue();
});

test('the job create form exposes skills grouped by type and category', function () {
    $employer = User::factory()->employer()->create();
    Company::factory()->for($employer, 'owner')->approved()->create();

    $this->actingAs($employer)
        ->get(route('employer.jobs.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('employer/jobs/create')
            ->has('options.skillGroups', 2)
            ->where('options.skillGroups.0.type', 'soft')
            ->where('options.skillGroups.1.type', 'hard')
            ->has('options.skillGroups.0.categories.0.skills')
            ->missing('options.skills'),
        );
});
