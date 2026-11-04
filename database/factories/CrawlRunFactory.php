<?php

namespace Database\Factories;

use App\Enums\CrawlRunStatus;
use App\Enums\CrawlRunTrigger;
use App\Models\CrawlRun;
use App\Models\JobSource;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CrawlRun>
 */
class CrawlRunFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_source_id' => JobSource::factory(),
            'uuid' => (string) Str::uuid(),
            'status' => CrawlRunStatus::Queued,
            'trigger' => CrawlRunTrigger::Schedule,
        ];
    }

    public function succeeded(int $itemsFound = 10): static
    {
        return $this->state(fn (): array => [
            'status' => CrawlRunStatus::Succeeded,
            'engine_used' => 'api',
            'engines_attempted' => [['engine' => 'api', 'outcome' => 'ok', 'ms' => 500]],
            'items_found' => $itemsFound,
            'items_created' => $itemsFound,
            'started_at' => now()->subMinute(),
            'finished_at' => now(),
            'duration_ms' => 60_000,
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (): array => [
            'status' => CrawlRunStatus::Failed,
            'started_at' => now()->subMinute(),
            'finished_at' => now(),
            'duration_ms' => 60_000,
        ]);
    }
}
