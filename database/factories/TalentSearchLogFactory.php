<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\TalentSearchLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TalentSearchLog>
 */
class TalentSearchLogFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'user_id' => User::factory()->employer(),
            'filters' => ['keyword' => 'php'],
            'result_count' => 0,
            'searched_at' => now(),
        ];
    }
}
