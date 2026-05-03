<?php

namespace Database\Factories;

use App\Models\Faq;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Faq>
 */
class FaqFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'question' => fake()->sentence(8).'?',
            'answer' => '<p>'.fake()->paragraph().'</p>',
            'category' => fake()->randomElement(['Umum', 'Employer', 'Employee']),
            'order_number' => fake()->numberBetween(1, 20),
            'is_published' => true,
        ];
    }
}
