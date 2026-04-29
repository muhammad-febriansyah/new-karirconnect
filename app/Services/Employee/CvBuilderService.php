<?php

namespace App\Services\Employee;

use App\Models\CandidateCv;
use App\Models\EmployeeProfile;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CvBuilderService
{
    private const DISK = 'public';

    /**
     * Persist the CV builder JSON snapshot on the profile and (re)generate
     * a PDF copy stored as a CandidateCv record. The CV created here is set
     * to source=builder so it's distinguishable from uploaded CVs.
     *
     * @param  array<string, mixed>  $data  builder JSON payload
     */
    public function build(EmployeeProfile $profile, array $data, string $label = 'CV Builder'): CandidateCv
    {
        $profile->forceFill(['cv_builder_json' => $data])->save();

        $pdf = Pdf::loadView('cv-builder.template', [
            'data' => $data,
            'profile' => $profile,
        ])->setPaper('a4');

        $directory = 'candidate-cvs/builder';
        Storage::disk(self::DISK)->makeDirectory($directory);

        $filename = $directory.'/'.Str::random(24).'.pdf';
        Storage::disk(self::DISK)->put($filename, $pdf->output());

        $existing = $profile->cvs()->where('source', 'builder')->first();

        if ($existing) {
            Storage::disk(self::DISK)->delete($existing->file_path ?? '');
            $existing->fill([
                'label' => $label,
                'file_path' => $filename,
                'pages_count' => null,
            ])->save();

            return $existing;
        }

        return $profile->cvs()->create([
            'label' => $label,
            'source' => 'builder',
            'file_path' => $filename,
            'is_active' => false,
        ]);
    }
}
