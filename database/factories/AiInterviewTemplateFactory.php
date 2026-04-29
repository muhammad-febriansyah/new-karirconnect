<?php

namespace Database\Factories;

use App\Models\AiInterviewTemplate;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiInterviewTemplate>
 */
class AiInterviewTemplateFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'job_id' => null,
            'name' => 'Default '.fake()->word().' Template',
            'description' => fake()->sentence(),
            'mode' => 'text',
            'language' => 'id',
            'duration_minutes' => 30,
            'question_count' => 8,
            'system_prompt' => null,
            'is_default' => false,
        ];
    }
}
