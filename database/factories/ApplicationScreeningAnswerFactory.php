<?php

namespace Database\Factories;

use App\Models\Application;
use App\Models\ApplicationScreeningAnswer;
use App\Models\JobScreeningQuestion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApplicationScreeningAnswer>
 */
class ApplicationScreeningAnswerFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'application_id' => Application::factory(),
            'job_screening_question_id' => JobScreeningQuestion::factory(),
            'answer' => ['text' => fake()->sentence()],
            'score' => null,
            'is_knockout' => false,
        ];
    }
}
