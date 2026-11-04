<?php

namespace Database\Factories;

use App\Enums\EmploymentType;
use App\Enums\ScrapedJobListingStatus;
use App\Enums\WorkArrangement;
use App\Models\JobSource;
use App\Models\ScrapedCompany;
use App\Models\ScrapedJobListing;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScrapedJobListing>
 */
class ScrapedJobListingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->jobTitle();
        $location = fake()->city();
        $description = '<p>'.fake()->paragraph().'</p>';

        return [
            'job_source_id' => JobSource::factory(),
            'scraped_company_id' => ScrapedCompany::factory(),
            'external_id' => (string) fake()->unique()->numberBetween(100000, 9999999),
            'title' => $title,
            'description' => $description,
            'employment_type' => EmploymentType::FullTime,
            'work_arrangement' => WorkArrangement::Onsite,
            'location_text' => $location,
            'apply_url' => fake()->url(),
            'content_hash' => ScrapedJobListing::computeContentHash([
                'title' => $title,
                'location_text' => $location,
                'employment_type' => EmploymentType::FullTime->value,
                'description' => $description,
            ]),
            'status' => ScrapedJobListingStatus::Active,
            'published_at' => now()->subDays(2),
            'first_seen_at' => now(),
            'last_seen_at' => now(),
        ];
    }
}
