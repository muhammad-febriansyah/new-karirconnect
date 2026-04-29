<?php

namespace App\Models;

use Database\Factories\EducationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'employee_profile_id',
    'level',
    'institution',
    'major',
    'gpa',
    'start_year',
    'end_year',
    'description',
])]
class Education extends Model
{
    /** @use HasFactory<EducationFactory> */
    use HasFactory;

    protected $table = 'educations';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'gpa' => 'float',
            'start_year' => 'integer',
            'end_year' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<EmployeeProfile, $this>
     */
    public function employeeProfile(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class);
    }
}
