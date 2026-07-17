<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ManagesProfileRecords;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\EducationRequest;
use App\Models\Education;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EducationController extends Controller
{
    use ManagesProfileRecords;

    public function __construct(private readonly EmployeeProfileService $profiles) {}

    public function index(Request $request): JsonResponse
    {
        return $this->listRecords($request);
    }

    public function store(EducationRequest $request): JsonResponse
    {
        return $this->createRecord($request, $request->validated());
    }

    public function update(EducationRequest $request, Education $education): JsonResponse
    {
        return $this->updateRecord($request, $education, $request->validated());
    }

    public function destroy(Request $request, Education $education): JsonResponse
    {
        return $this->deleteRecord($request, $education);
    }

    protected function relation(): string
    {
        return 'educations';
    }

    /**
     * @return array<int, array{0: string, 1: string}>
     */
    protected function ordering(): array
    {
        return [['start_year', 'desc'], ['id', 'desc']];
    }

    /**
     * @param  Education  $record
     * @return array<string, mixed>
     */
    protected function present(Model $record): array
    {
        return [
            'id' => $record->id,
            'level' => $record->level,
            'institution' => $record->institution,
            'major' => $record->major,
            'gpa' => $record->gpa,
            'start_year' => $record->start_year,
            'end_year' => $record->end_year,
            'description' => $record->description,
        ];
    }
}
