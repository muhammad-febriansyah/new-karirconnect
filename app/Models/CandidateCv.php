<?php

namespace App\Models;

use Database\Factories\CandidateCvFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'employee_profile_id',
    'label',
    'source',
    'file_path',
    'pages_count',
    'analyzed_json',
    'is_active',
])]
class CandidateCv extends Model
{
    /** @use HasFactory<CandidateCvFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'pages_count' => 'integer',
            'analyzed_json' => 'array',
            'is_active' => 'boolean',
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
