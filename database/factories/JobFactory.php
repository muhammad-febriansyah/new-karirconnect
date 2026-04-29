<?php

namespace Database\Factories;

use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\WorkArrangement;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Job>
 */
class JobFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->jobTitle();

        return [
            'company_id' => Company::factory(),
            'posted_by_user_id' => User::factory()->employer(),
            'job_category_id' => JobCategory::factory(),
            'title' => $title,
            'slug' => str($title)->slug()->append('-'.fake()->unique()->numberBetween(10, 999))->value(),
            'description' => fake()->paragraphs(3, true),
            'responsibilities' => fake()->paragraphs(2, true),
            'requirements' => fake()->paragraphs(2, true),
            'benefits' => fake()->paragraphs(2, true),
            'employment_type' => EmploymentType::FullTime,
            'work_arrangement' => WorkArrangement::Hybrid,
            'experience_level' => ExperienceLevel::Mid,
            'min_education' => null,
            'salary_min' => 8000000,
            'salary_max' => 12000000,
            'is_salary_visible' => true,
            'province_id' => null,
            'city_id' => null,
            'status' => JobStatus::Draft,
            'application_deadline' => now()->addDays(30)->toDateString(),
            'is_anonymous' => false,
            'is_featured' => false,
            'featured_until' => null,
            'views_count' => 0,
            'applications_count' => 0,
            'ai_match_threshold' => null,
            'auto_invite_ai_interview' => false,
            'published_at' => null,
            'closed_at' => null,
        ];
    }

    public function published(): self
    {
        return $this->state(fn () => [
            'status' => JobStatus::Published,
            'published_at' => now(),
        ]);
    }

    public function closed(): self
    {
        return $this->state(fn () => [
            'status' => JobStatus::Closed,
            'closed_at' => now(),
        ]);
    }

    public function featured(): self
    {
        return $this->state(fn () => [
            'is_featured' => true,
            'featured_until' => now()->addDays(30),
        ]);
    }
}
