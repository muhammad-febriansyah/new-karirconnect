<?php

namespace Database\Factories;

use App\Models\CareerResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CareerResource>
 */
class CareerResourceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->sentence(5);

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(10, 9999),
            'excerpt' => fake()->sentence(12),
            'body' => '<p>'.fake()->paragraphs(3, true).'</p>',
            'thumbnail_path' => null,
            'category' => fake()->randomElement(['Karier', 'Wawancara', 'CV']),
            'tags' => ['karier', 'tips'],
            'author_id' => User::factory()->admin(),
            'is_published' => true,
            'published_at' => now(),
            'views_count' => fake()->numberBetween(0, 250),
            'reading_minutes' => fake()->numberBetween(3, 12),
        ];
    }
}
