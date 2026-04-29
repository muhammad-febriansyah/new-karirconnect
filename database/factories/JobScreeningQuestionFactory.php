<?php

namespace Database\Factories;

use App\Enums\ScreeningQuestionType;
use App\Models\Job;
use App\Models\JobScreeningQuestion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobScreeningQuestion>
 */
class JobScreeningQuestionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_id' => Job::factory(),
            'question' => fake()->sentence().'?',
            'type' => ScreeningQuestionType::Text,
            'options' => null,
            'is_required' => true,
            'knockout_value' => null,
            'order_number' => 1,
        ];
    }
}
