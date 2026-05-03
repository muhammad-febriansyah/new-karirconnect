<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Models\AiInterviewSession;
use App\Models\Company;
use App\Services\Exports\AiInterviewReportPdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AiInterviewReportExportController extends Controller
{
    public function __construct(private readonly AiInterviewReportPdf $pdf) {}

    public function download(Request $request, AiInterviewSession $session): Response
    {
        $company = Company::query()->where('owner_id', $request->user()->id)->first();
        $session->loadMissing('job:id,company_id');

        abort_unless(
            $company !== null && $session->job?->company_id === $company->id,
            403,
        );

        return $this->pdf->download($session);
    }
}
