<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReviewVerificationRequest;
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
        $statusFilter = $request->string('status', 'pending')->toString();

        $rows = CompanyVerification::query()
            ->with(['company:id,name,slug,owner_id', 'company.owner:id,name,email', 'uploadedBy:id,name'])
            ->when($statusFilter !== '', fn ($q) => $q->where('status', $statusFilter))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (CompanyVerification $v) => [
                'id' => $v->id,
                'company' => [
                    'id' => $v->company->id,
                    'name' => $v->company->name,
                ],
                'document_type' => $v->document_type,
                'original_name' => $v->original_name,
                'status' => $v->status?->value,
                'uploaded_at' => optional($v->created_at)->toIso8601String(),
                'uploader_name' => $v->uploadedBy?->name,
                'file_url' => $v->file_path ? asset('storage/'.$v->file_path) : null,
            ]);

        return Inertia::render('admin/company-verifications/index', [
            'items' => $rows,
            'filters' => [
                'status' => $statusFilter,
            ],
            'statusOptions' => ReviewStatus::selectItems(),
        ]);
    }

    public function review(ReviewVerificationRequest $request, CompanyVerification $verification): RedirectResponse
    {
        $data = $request->validated();

        if ($data['decision'] === 'approve') {
            $this->verifications->approve($verification, $request->user(), $data['note'] ?? null);

            return back()->with('success', 'Dokumen verifikasi disetujui.');
        }

        $this->verifications->reject($verification, $request->user(), $data['note'] ?? null);

        return back()->with('success', 'Dokumen verifikasi ditolak.');
    }
}
