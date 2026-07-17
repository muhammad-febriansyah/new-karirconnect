<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\CompanyOfficeRequest;
use App\Models\CompanyOffice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyOfficeController extends Controller
{
    use ResolvesEmployerCompany;

    public function index(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $offices = $company->offices()
            ->with(['province:id,name', 'city:id,name'])
            ->orderByDesc('is_headquarter')
            ->orderBy('label')
            ->get()
            ->map(fn (CompanyOffice $office) => $this->present($office));

        return response()->json(['data' => $offices]);
    }

    public function store(CompanyOfficeRequest $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $office = $company->offices()->create($request->validated());

        $this->enforceSingleHeadquarter($company->id, $office);

        return response()->json(['data' => $this->present($office->fresh(['province', 'city']))], 201);
    }

    public function update(CompanyOfficeRequest $request, CompanyOffice $office): JsonResponse
    {
        $company = $this->requireCompany($request);

        abort_unless($office->company_id === $company->id, 404);

        $office->update($request->validated());

        $this->enforceSingleHeadquarter($company->id, $office);

        return response()->json(['data' => $this->present($office->fresh(['province', 'city']))]);
    }

    public function destroy(Request $request, CompanyOffice $office): JsonResponse
    {
        $company = $this->requireCompany($request);

        abort_unless($office->company_id === $company->id, 404);

        $office->delete();

        return response()->json(['message' => 'Kantor dihapus.']);
    }

    /**
     * A company has one headquarters. Promoting an office demotes the others,
     * rather than leaving two rows both claiming to be it.
     */
    private function enforceSingleHeadquarter(int $companyId, CompanyOffice $office): void
    {
        if (! $office->is_headquarter) {
            return;
        }

        CompanyOffice::query()
            ->where('company_id', $companyId)
            ->whereKeyNot($office->id)
            ->update(['is_headquarter' => false]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(CompanyOffice $office): array
    {
        return [
            'id' => $office->id,
            'label' => $office->label,
            'address' => $office->address,
            'province' => $office->province?->name,
            'city' => $office->city?->name,
            'contact_phone' => $office->contact_phone,
            'map_url' => $office->map_url,
            'is_headquarter' => (bool) $office->is_headquarter,
        ];
    }
}
