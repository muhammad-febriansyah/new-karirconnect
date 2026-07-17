<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\ManagesProfileRecords;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\CertificationRequest;
use App\Models\Certification;
use App\Services\Employee\EmployeeProfileService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CertificationController extends Controller
{
    use ManagesProfileRecords;

    public function __construct(private readonly EmployeeProfileService $profiles) {}

    public function index(Request $request): JsonResponse
    {
        return $this->listRecords($request);
    }

    public function store(CertificationRequest $request): JsonResponse
    {
        return $this->createRecord($request, $request->validated());
    }

    public function update(CertificationRequest $request, Certification $certification): JsonResponse
    {
        return $this->updateRecord($request, $certification, $request->validated());
    }

    public function destroy(Request $request, Certification $certification): JsonResponse
    {
        return $this->deleteRecord($request, $certification);
    }

    protected function relation(): string
    {
        return 'certifications';
    }

    /**
     * @return array<int, array{0: string, 1: string}>
     */
    protected function ordering(): array
    {
        return [['issued_date', 'desc'], ['id', 'desc']];
    }

    /**
     * @param  Certification  $record
     * @return array<string, mixed>
     */
    protected function present(Model $record): array
    {
        return [
            'id' => $record->id,
            'name' => $record->name,
            'issuer' => $record->issuer,
            'credential_id' => $record->credential_id,
            'credential_url' => $record->credential_url,
            'issued_date' => $record->issued_date?->toDateString(),
            'expires_date' => $record->expires_date?->toDateString(),
        ];
    }
}
