<?php

namespace Database\Factories;

use App\Models\CandidateCv;
use App\Models\EmployeeProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CandidateCv>
 */
class CandidateCvFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'employee_profile_id' => EmployeeProfile::factory(),
            'label' => 'CV Backend 2026',
            'source' => 'upload',
            'file_path' => 'candidate-cvs/sample.pdf',
            'pages_count' => 2,
            'analyzed_json' => null,
            'is_active' => false,
        ];
    }
}
