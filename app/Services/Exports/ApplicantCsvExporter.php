<?php

namespace App\Services\Exports;

use App\Models\Application;
use App\Models\Company;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams an applicant list as CSV. Streamed (not buffered) so large companies
 * don't blow memory; the writer flushes after each row. Filename embeds the
 * job slug + timestamp so multiple exports stay distinguishable.
 */
class ApplicantCsvExporter
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function stream(Company $company, array $filters = []): StreamedResponse
    {
        $jobLabel = $filters['job_slug'] ?? (isset($filters['job_id']) ? 'job-'.$filters['job_id'] : 'all');
        $filename = sprintf('applicants-%s-%s-%s.csv', $company->slug, $jobLabel, now()->format('Ymd-His'));

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
        ];

        return response()->streamDownload(function () use ($company, $filters): void {
            $out = fopen('php://output', 'w');

            // BOM so Excel recognises UTF-8.
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Applied At',
                'Status',
                'Job Title',
                'Job Slug',
                'Candidate Name',
                'Candidate Email',
                'Candidate Phone',
                'Expected Salary IDR',
                'Match Score',
                'Resume',
                'Cover Letter',
            ]);

            $query = Application::query()
                ->with([
                    'job:id,title,slug,company_id',
                    'employeeProfile.user:id,name,email,phone',
                    'candidateCv:id,file_path',
                ])
                ->whereHas('job', fn ($q) => $q->where('company_id', $company->id))
                ->latest('id');

            if (! empty($filters['job_slug'])) {
                $query->whereHas('job', fn ($q) => $q->where('slug', $filters['job_slug']));
            }
            if (! empty($filters['job_id'])) {
                $query->where('job_id', $filters['job_id']);
            }
            if (! empty($filters['status'])) {
                $query->where('status', $filters['status']);
            }

            $query->chunkById(200, function ($chunk) use ($out): void {
                foreach ($chunk as $app) {
                    fputcsv($out, [
                        optional($app->applied_at ?? $app->created_at)->toIso8601String(),
                        $app->status?->value,
                        $app->job?->title,
                        $app->job?->slug,
                        $app->employeeProfile?->user?->name,
                        $app->employeeProfile?->user?->email,
                        $app->employeeProfile?->user?->phone,
                        $app->expected_salary,
                        $app->ai_match_score,
                        $app->candidateCv?->file_path,
                        str_replace(["\r", "\n"], ' ', (string) $app->cover_letter),
                    ]);
                }
            });

            fclose($out);
        }, $filename, $headers);
    }
}
