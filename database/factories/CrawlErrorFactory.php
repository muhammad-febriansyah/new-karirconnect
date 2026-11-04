<?php

namespace Database\Factories;

use App\Enums\CrawlErrorCategory;
use App\Models\CrawlError;
use App\Models\CrawlRun;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CrawlError>
 */
class CrawlErrorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'crawl_run_id' => CrawlRun::factory(),
            'job_source_id' => fn (array $attributes) => CrawlRun::query()->find($attributes['crawl_run_id'])?->job_source_id,
            'engine' => 'api',
            'category' => CrawlErrorCategory::Network,
            'http_status' => null,
            'url' => fake()->url(),
            'message' => fake()->sentence(),
            'retryable' => true,
            'occurred_at' => now(),
        ];
    }
}
