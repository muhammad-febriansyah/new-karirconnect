<?php

namespace Database\Factories;

use App\Models\Skill;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Skill>
 */
class SkillFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->randomElement([
            'PHP',
            'Laravel',
            'React',
            'TypeScript',
            'MySQL',
            'Docker',
        ]);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'category' => fake()->randomElement(['Programming', 'Frontend', 'Backend', 'Database', 'DevOps']),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
