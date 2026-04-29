<?php

namespace App\Services\Company;

use App\Enums\CompanyVerificationStatus;
use App\Enums\ReviewStatus;
use App\Models\Company;
use App\Models\CompanyBadge;
use App\Models\CompanyVerification;
use App\Models\User;
use App\Notifications\CompanyVerified;
use App\Services\Files\FileUploadService;
use Illuminate\Http\UploadedFile;

class CompanyVerificationService
{
    public function __construct(private readonly FileUploadService $files) {}

    /**
     * Upload a verification document. Resets the company verification status
     * to pending so admins re-review the new submission.
     */
    public function upload(Company $company, User $uploader, string $documentType, UploadedFile $file): CompanyVerification
    {
        $path = $this->files->store($file, "company-verifications/{$company->id}");

        $verification = $company->verifications()->create([
            'uploaded_by_user_id' => $uploader->id,
            'document_type' => $documentType,
            'file_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'status' => ReviewStatus::Pending,
        ]);

        $company->forceFill([
            'verification_status' => CompanyVerificationStatus::Pending,
        ])->save();

        return $verification;
    }

    public function approve(CompanyVerification $verification, User $reviewer, ?string $note = null): CompanyVerification
    {
        $verification->forceFill([
            'status' => ReviewStatus::Approved,
            'reviewed_by_user_id' => $reviewer->id,
            'reviewed_at' => now(),
            'review_note' => $note,
        ])->save();

        $company = $verification->company;
        $company->forceFill([
            'verification_status' => CompanyVerificationStatus::Verified,
            'verified_at' => now(),
        ])->save();

        CompanyBadge::query()->firstOrCreate(
            ['company_id' => $company->id, 'code' => 'verified-employer'],
            [
                'name' => 'Verified Employer',
                'description' => 'Dokumen perusahaan sudah diverifikasi admin.',
                'tone' => 'success',
                'awarded_at' => now(),
                'is_active' => true,
            ],
        );

        $company->owner?->notify(new CompanyVerified($company));

        return $verification;
    }

    public function reject(CompanyVerification $verification, User $reviewer, ?string $note = null): CompanyVerification
    {
        $verification->forceFill([
            'status' => ReviewStatus::Rejected,
            'reviewed_by_user_id' => $reviewer->id,
            'reviewed_at' => now(),
            'review_note' => $note,
        ])->save();

        $company = $verification->company;
        if ($company->verifications()->where('status', ReviewStatus::Approved)->doesntExist()) {
            $company->forceFill([
                'verification_status' => CompanyVerificationStatus::Rejected,
            ])->save();
        }

        return $verification;
    }
}
