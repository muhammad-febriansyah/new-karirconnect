<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ManagesProfileRecords;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\WorkExperienceRequest;
use App\Models\WorkExperience;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkExperienceController extends Controller
{
    use ManagesProfileRecords;

    public function __construct(private readonly EmployeeProfileService $profiles) {}

    public function index(Request $request): JsonResponse
    {
        return $this->listRecords($request);
    }

    public function store(WorkExperienceRequest $request): JsonResponse
    {
        return $this->createRecord($request, $request->validated());
    }

    public function update(WorkExperienceRequest $request, WorkExperience $workExperience): JsonResponse
    {
        return $this->updateRecord($request, $workExperience, $request->validated());
    }

    public function destroy(Request $request, WorkExperience $workExperience): JsonResponse
    {
        return $this->deleteRecord($request, $workExperience);
    }

    protected function relation(): string
    {
        return 'workExperiences';
    }

    /**
     * @return array<int, array{0: string, 1: string}>
     */
    protected function ordering(): array
    {
        return [['start_date', 'desc'], ['id', 'desc']];
    }

    /**
     * @param  WorkExperience  $record
     * @return array<string, mixed>
     */
    protected function present(Model $record): array
    {
        return [
            'id' => $record->id,
            'company_name' => $record->company_name,
            'position' => $record->position,
            'employment_type' => $record->employment_type?->value ?? $record->employment_type,
            'start_date' => $record->start_date?->toDateString(),
            'end_date' => $record->end_date?->toDateString(),
            'is_current' => (bool) $record->is_current,
            'description' => $record->description,
        ];
    }
}
