<?php

namespace Database\Factories;

use App\Models\ScrapedCompany;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScrapedCompany>
 */
class ScrapedCompanyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();
        $domain = fake()->unique()->domainName();

        return [
            'name' => $name,
            'normalized_name' => ScrapedCompany::normalizeName($name),
            'domain' => $domain,
            'tagline' => fake()->catchPhrase(),
            'logo_url' => "https://{$domain}/logo.png",
            'website' => "https://{$domain}",
            'about' => fake()->paragraph(),
        ];
    }
}
