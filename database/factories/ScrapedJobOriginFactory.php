<?php

namespace Database\Factories;

use App\Models\ScrapedJobListing;
use App\Models\ScrapedJobOrigin;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScrapedJobOrigin>
 */
class ScrapedJobOriginFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'scraped_job_listing_id' => ScrapedJobListing::factory(),
            'job_source_id' => fn (array $attributes) => ScrapedJobListing::query()->find($attributes['scraped_job_listing_id'])?->job_source_id,
            'external_id' => fn (array $attributes) => ScrapedJobListing::query()->find($attributes['scraped_job_listing_id'])?->external_id,
            'source_url' => fake()->url(),
            'first_seen_at' => now(),
            'last_seen_at' => now(),
        ];
    }
}
