<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Announcement>
 */
class AnnouncementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->sentence(4);

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(10, 9999),
            'body' => '<p>'.fake()->paragraph().'</p>',
            'audience' => fake()->randomElement(['all', 'employee', 'employer']),
            'is_published' => true,
            'published_at' => now(),
            'author_id' => User::factory()->admin(),
        ];
    }
}
