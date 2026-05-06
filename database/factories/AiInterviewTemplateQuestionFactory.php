<?php

namespace Database\Factories;

use App\Models\AiInterviewTemplate;
use App\Models\AiInterviewTemplateQuestion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiInterviewTemplateQuestion>
 */
class AiInterviewTemplateQuestionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'template_id' => AiInterviewTemplate::factory(),
            'order_number' => 1,
            'category' => $this->faker->randomElement(['opening', 'technical', 'behavioral', 'situational', 'culture', 'closing']),
            'question' => $this->faker->sentence().'?',
            'context' => null,
            'expected_keywords' => null,
            'max_duration_seconds' => 120,
        ];
    }
}
