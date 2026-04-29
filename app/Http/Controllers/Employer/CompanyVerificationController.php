<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\UploadVerificationDocumentRequest;
use App\Models\Company;
use App\Models\CompanyVerification;
use App\Services\Company\CompanyVerificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompanyVerificationController extends Controller
{
    public function __construct(private readonly CompanyVerificationService $verifications) {}

    public function index(Request $request): Response
    {
        $company = Company::query()->where('owner_id', $request->user()->id)->first();

        $documents = $company
            ? $company->verifications()->latest('id')->get()
                ->map(fn (CompanyVerification $v) => [
                    'id' => $v->id,
                    'document_type' => $v->document_type,
                    'original_name' => $v->original_name,
                    'status' => $v->status?->value,
                    'review_note' => $v->review_note,
                    'uploaded_at' => optional($v->created_at)->toIso8601String(),
                    'reviewed_at' => optional($v->reviewed_at)->toIso8601String(),
                    'file_url' => $v->file_path ? asset('storage/'.$v->file_path) : null,
                ])->values()
            : collect();

        return Inertia::render('employer/company/verification', [
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'verification_status' => $company->verification_status?->value,
            ] : null,
            'documents' => $documents,
        ]);
    }

    public function store(UploadVerificationDocumentRequest $request): RedirectResponse
    {
        $company = Company::query()->where('owner_id', $request->user()->id)->first();
        abort_unless($company !== null, 404, 'Perusahaan belum terdaftar.');

        $this->verifications->upload(
            $company,
            $request->user(),
            $request->validated('document_type'),
            $request->file('file'),
        );

        return back()->with('success', 'Dokumen verifikasi berhasil diunggah dan menunggu review admin.');
    }
}
