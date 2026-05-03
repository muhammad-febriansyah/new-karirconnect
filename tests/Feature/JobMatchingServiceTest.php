<?php

use App\Enums\ExperienceLevel;
use App\Enums\WorkArrangement;
use App\Models\AiMatchScore;
use App\Models\City;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\Province;
use App\Models\Skill;
use App\Services\Jobs\JobMatchingService;

describe('JobMatchingService::breakdown', function () {
    it('returns score plus per-component breakdown shape', function () {
        $job = Job::factory()->published()->create();
        $profile = EmployeeProfile::factory()->create();

        $result = app(JobMatchingService::class)->breakdown($job, $profile);

        expect($result)->toBeArray()
            ->toHaveKey('score')
            ->toHaveKey('breakdown');

        expect($result['score'])->toBeInt()
            ->toBeGreaterThanOrEqual(0)
            ->toBeLessThanOrEqual(100);

        expect($result['breakdown'])
            ->toHaveKey('skills')
            ->toHaveKey('experience')
            ->toHaveKey('location')
            ->toHaveKey('salary');
    });

    it('rewards full skill overlap with the maximum skills component', function () {
        $skills = Skill::factory()->count(3)->create();

        $job = Job::factory()->published()->create();
        $job->skills()->attach($skills->pluck('id')->all());

        $profile = EmployeeProfile::factory()->create();
        $profile->skills()->attach($skills->pluck('id')->all());

        $result = app(JobMatchingService::class)->breakdown($job->fresh(['skills']), $profile->fresh(['skills']));

        // Skill component is weighted up to 50 — full overlap should hit it.
        expect($result['breakdown']['skills'])->toBe(50);
    });

    it('gives zero skills when there is no overlap', function () {
        $jobSkills = Skill::factory()->count(2)->create();
        $candSkills = Skill::factory()->count(2)->create();

        $job = Job::factory()->published()->create();
        $job->skills()->attach($jobSkills->pluck('id')->all());

        $profile = EmployeeProfile::factory()->create();
        $profile->skills()->attach($candSkills->pluck('id')->all());

        $result = app(JobMatchingService::class)->breakdown($job->fresh(['skills']), $profile->fresh(['skills']));

        expect($result['breakdown']['skills'])->toBe(0);
    });

    it('rewards remote-friendly jobs with full location score regardless of city', function () {
        $job = Job::factory()->published()->create([
            'work_arrangement' => WorkArrangement::Remote,
            'city_id' => null,
        ]);
        $profile = EmployeeProfile::factory()->create(['city_id' => null]);

        $result = app(JobMatchingService::class)->breakdown($job, $profile);

        expect($result['breakdown']['location'])->toBe(15);
    });

    it('rewards same-city candidates over same-province ones', function () {
        $province = Province::factory()->create();
        $cityA = City::factory()->create(['province_id' => $province->id]);
        $cityB = City::factory()->create(['province_id' => $province->id]);

        $job = Job::factory()->published()->create([
            'work_arrangement' => WorkArrangement::Onsite,
            'city_id' => $cityA->id,
            'province_id' => $province->id,
        ]);

        $sameCityProfile = EmployeeProfile::factory()->create(['city_id' => $cityA->id]);
        $sameProvinceProfile = EmployeeProfile::factory()->create(['city_id' => $cityB->id]);

        $service = app(JobMatchingService::class);

        expect($service->breakdown($job, $sameCityProfile)['breakdown']['location'])->toBe(15);
        expect($service->breakdown($job, $sameProvinceProfile)['breakdown']['location'])->toBe(10);
    });

    it('matches experience level exactly with the highest experience score', function () {
        $job = Job::factory()->published()->create(['experience_level' => ExperienceLevel::Senior]);
        $profile = EmployeeProfile::factory()->create(['experience_level' => ExperienceLevel::Senior]);

        $result = app(JobMatchingService::class)->breakdown($job, $profile);

        expect($result['breakdown']['experience'])->toBe(20);
    });

    it('drops experience score to zero for distant levels', function () {
        $job = Job::factory()->published()->create(['experience_level' => ExperienceLevel::Entry]);
        $profile = EmployeeProfile::factory()->create(['experience_level' => ExperienceLevel::Lead]);

        $result = app(JobMatchingService::class)->breakdown($job, $profile);

        expect($result['breakdown']['experience'])->toBe(0);
    });
});

describe('JobMatchingService::cache', function () {
    it('persists the score and breakdown to ai_match_scores', function () {
        $job = Job::factory()->published()->create();
        $profile = EmployeeProfile::factory()->create();

        $cached = app(JobMatchingService::class)->cache($job, $profile);

        expect($cached)->toBeInstanceOf(AiMatchScore::class);
        expect($cached->job_id)->toBe($job->id);
        expect($cached->candidate_profile_id)->toBe($profile->id);
        expect($cached->score)->toBeInt();
        expect($cached->breakdown)->toBeArray()->toHaveKeys(['skills', 'experience', 'location', 'salary']);
        expect($cached->computed_at)->not->toBeNull();
    });

    it('updates the existing row on a second call (upsert)', function () {
        $job = Job::factory()->published()->create();
        $profile = EmployeeProfile::factory()->create();

        $service = app(JobMatchingService::class);
        $first = $service->cache($job, $profile);

        // Mutate something that affects the score so the second call computes
        // a different value, then verify the row id is unchanged.
        $profile->skills()->attach(Skill::factory()->create()->id);
        $job->skills()->attach(Skill::factory()->create()->id);

        $second = $service->cache($job->fresh(['skills']), $profile->fresh(['skills']));

        expect($second->id)->toBe($first->id);
        expect(AiMatchScore::query()
            ->where('job_id', $job->id)
            ->where('candidate_profile_id', $profile->id)
            ->count())->toBe(1);
    });
});
