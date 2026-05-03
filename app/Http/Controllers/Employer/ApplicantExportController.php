<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\Exports\ApplicantCsvExporter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ApplicantExportController extends Controller
{
    public function __construct(private readonly ApplicantCsvExporter $exporter) {}

    public function download(Request $request): StreamedResponse
    {
        $company = Company::query()->where('owner_id', $request->user()->id)->first();
        abort_unless($company !== null, 404);

        $filters = [
            'job_slug' => $request->string('job_slug')->toString() ?: null,
            'job_id' => $request->integer('job') ?: null,
            'status' => $request->string('status')->toString() ?: null,
        ];

        return $this->exporter->stream($company, array_filter($filters));
    }
}
