<?php

namespace App\Jobs;

use App\Mail\ExternalApplicationRelayed;
use App\Models\Application;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

/**
 * Forwards an application for an external job to the company's recruitment
 * email over SMTP. Sent once: `relayed_at` stops a retry from sending again.
 */
class RelayExternalApplicationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300, 900];

    public function __construct(public readonly int $applicationId) {}

    public function handle(): void
    {
        $application = Application::query()
            ->with(['job.company', 'job.scrapedListing.company', 'employeeProfile.user', 'candidateCv'])
            ->find($this->applicationId);

        if ($application === null || $application->relayed_at !== null || $application->job === null) {
            return;
        }

        $email = $application->job->relayEmail();
        if ($email === null) {
            $application->forceFill(['relay_error' => 'Perusahaan belum punya email untuk menerima lamaran.'])->save();

            return;
        }

        Mail::mailer((string) config('external_jobs.relay_mailer'))
            ->to($email)
            ->send(new ExternalApplicationRelayed($application));

        $application->forceFill(['relayed_at' => now(), 'relay_error' => null])->save();
    }

    public function failed(?Throwable $exception): void
    {
        Application::query()->whereKey($this->applicationId)->update([
            'relay_error' => Str::limit('Gagal mengirim email: '.($exception?->getMessage() ?? 'tanpa pesan'), 490),
        ]);
    }
}
