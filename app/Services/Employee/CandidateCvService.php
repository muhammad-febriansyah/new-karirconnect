<?php

namespace App\Services\Employee;

use App\Models\CandidateCv;
use App\Models\EmployeeProfile;
use App\Services\Files\FileUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * CV uploads and the primary-resume bookkeeping that goes with them.
 *
 * Extracted from Employee\CvUploadController so the web and the mobile API
 * share one implementation. The rules here are easy to get subtly wrong --
 * exactly one CV may be active, primary_resume_id has to follow it, and it must
 * be cleared when the active CV goes away -- and SubmitApplicationAction falls
 * back to primary_resume_id when an application names no CV, so drift between
 * two copies would attach the wrong resume to real applications.
 *
 * primary_resume_id is not fillable, hence forceFill throughout.
 */
class CandidateCvService
{
    public function __construct(private readonly FileUploadService $files) {}

    /**
     * Store an uploaded CV. The first CV a candidate uploads becomes their
     * active/primary one; later uploads do not steal that slot.
     */
    public function store(EmployeeProfile $profile, UploadedFile $file, string $label): CandidateCv
    {
        return DB::transaction(function () use ($profile, $file, $label): CandidateCv {
            $isFirst = ! $profile->cvs()->exists();

            $cv = $profile->cvs()->create([
                'label' => $label,
                'source' => 'upload',
                'file_path' => $this->files->store($file, 'candidate-cvs'),
                'is_active' => $isFirst,
            ]);

            if ($cv->is_active) {
                $profile->forceFill(['primary_resume_id' => $cv->id])->save();
            }

            return $cv;
        });
    }

    /**
     * Rename a CV and/or make it the active one.
     */
    public function update(EmployeeProfile $profile, CandidateCv $cv, string $label, bool $isActive): CandidateCv
    {
        return DB::transaction(function () use ($profile, $cv, $label, $isActive): CandidateCv {
            $cv->update(['label' => $label, 'is_active' => $isActive]);

            if ($isActive) {
                // Exactly one active CV per profile.
                $profile->cvs()->whereKeyNot($cv->id)->update(['is_active' => false]);
                $profile->forceFill(['primary_resume_id' => $cv->id])->save();
            } elseif ($profile->primary_resume_id === $cv->id) {
                // It was the primary and just got deactivated.
                $profile->forceFill(['primary_resume_id' => null])->save();
            }

            return $cv->fresh();
        });
    }

    /**
     * Delete a CV and its file.
     */
    public function delete(EmployeeProfile $profile, CandidateCv $cv): void
    {
        DB::transaction(function () use ($profile, $cv): void {
            if ($profile->primary_resume_id === $cv->id) {
                $profile->forceFill(['primary_resume_id' => null])->save();
            }

            $this->files->delete($cv->file_path);

            $cv->delete();
        });
    }
}
