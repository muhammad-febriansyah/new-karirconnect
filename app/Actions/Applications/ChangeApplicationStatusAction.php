<?php

namespace App\Actions\Applications;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\ApplicationStatusLog;
use App\Models\User;
use App\Notifications\ApplicationStatusChangedNotification;
use Illuminate\Support\Facades\DB;

class ChangeApplicationStatusAction
{
    /**
     * Transition an application to a new status. Append a row to the status log
     * (immutable history) and notify the candidate. Caller is responsible for
     * authorization — typically Employer/ApplicantController gates this.
     */
    public function execute(
        Application $application,
        ApplicationStatus $next,
        User $actor,
        ?string $note = null,
    ): Application {
        if ($application->status === $next) {
            return $application;
        }

        return DB::transaction(function () use ($application, $next, $actor, $note): Application {
            $previous = $application->status;

            $payload = ['status' => $next];
            if ($next === ApplicationStatus::Reviewed && $application->reviewed_at === null) {
                $payload['reviewed_at'] = now();
            }
            $application->forceFill($payload)->save();

            ApplicationStatusLog::query()->create([
                'application_id' => $application->id,
                'from_status' => $previous,
                'to_status' => $next,
                'changed_by_user_id' => $actor->id,
                'note' => $note,
            ]);

            $application->employeeProfile?->user?->notify(
                new ApplicationStatusChangedNotification($application->fresh(), $note),
            );

            return $application->fresh(['statusLogs']);
        });
    }
}
