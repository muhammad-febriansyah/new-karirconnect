<?php

namespace App\Actions\Applications;

use App\Enums\AiInterviewMode;
use App\Enums\AiInterviewStatus;
use App\Enums\ApplicationStatus;
use App\Enums\JobStatus;
use App\Models\AiInterviewSession;
use App\Models\Application;
use App\Models\ApplicationScreeningAnswer;
use App\Models\ApplicationStatusLog;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Notifications\AiInterviewInvitationNotification;
use App\Notifications\ApplicationSubmittedNotification;
use App\Services\Applications\ApplicationService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SubmitApplicationAction
{
    public function __construct(private readonly ApplicationService $applications) {}

    /**
     * Submit an application atomically: row + initial status log + screening
     * answers + match score + counter bump + notification to the employer.
     *
     * @param  array{
     *     candidate_cv_id?: int|null,
     *     cover_letter?: string|null,
     *     expected_salary?: int|null,
     *     answers?: array<int, array{question_id:int, answer:array<string, mixed>|string|null}>,
     * }  $data
     */
    public function execute(Job $job, EmployeeProfile $profile, array $data): Application
    {
        if ($job->status !== JobStatus::Published) {
            throw ValidationException::withMessages(['job' => 'Lowongan tidak menerima lamaran saat ini.']);
        }

        if (Application::query()->where('job_id', $job->id)->where('employee_profile_id', $profile->id)->exists()) {
            throw ValidationException::withMessages(['job' => 'Anda sudah melamar pekerjaan ini.']);
        }

        if ($profile->user_id === $job->company?->owner_id) {
            throw new AuthorizationException('Anda tidak dapat melamar lowongan dari perusahaan sendiri.');
        }

        if ((int) ($profile->profile_completion ?? 0) < 60) {
            throw ValidationException::withMessages([
                'profile' => 'Profil Anda belum lengkap (minimal 60%). Lengkapi profil sebelum melamar.',
            ]);
        }

        return DB::transaction(function () use ($job, $profile, $data): Application {
            $application = Application::query()->create([
                'job_id' => $job->id,
                'employee_profile_id' => $profile->id,
                'candidate_cv_id' => $data['candidate_cv_id'] ?? $profile->primary_resume_id,
                'cover_letter' => $data['cover_letter'] ?? null,
                'expected_salary' => $data['expected_salary'] ?? $profile->expected_salary_min,
                'status' => ApplicationStatus::Submitted,
                'applied_at' => now(),
            ]);

            ApplicationStatusLog::query()->create([
                'application_id' => $application->id,
                'from_status' => null,
                'to_status' => ApplicationStatus::Submitted,
                'changed_by_user_id' => $profile->user_id,
                'note' => 'Lamaran dikirim oleh kandidat.',
            ]);

            foreach ($data['answers'] ?? [] as $row) {
                if (! isset($row['question_id'])) {
                    continue;
                }
                ApplicationScreeningAnswer::query()->create([
                    'application_id' => $application->id,
                    'job_screening_question_id' => (int) $row['question_id'],
                    'answer' => is_array($row['answer'] ?? null) ? $row['answer'] : ['value' => $row['answer'] ?? null],
                ]);
            }

            $this->applications->syncMatchScore($application);
            $this->applications->incrementJobCounter($job);

            $employer = $job->postedBy ?? $job->company?->owner;
            $employer?->notify(new ApplicationSubmittedNotification($application->fresh()));

            $this->maybeAutoInviteAiInterview($application, $job, $profile);

            return $application->fresh(['statusLogs', 'screeningAnswers']);
        });
    }

    /**
     * Trigger AI Interview invite when employer set auto_invite_ai_interview
     * and the candidate's match score crosses the threshold (or none set).
     */
    private function maybeAutoInviteAiInterview(Application $application, Job $job, EmployeeProfile $profile): void
    {
        if (! $job->auto_invite_ai_interview) {
            return;
        }

        $score = $application->ai_match_score ?? 0;
        $threshold = $job->ai_match_threshold ?? 0;
        if ($threshold > 0 && $score < $threshold) {
            return;
        }

        $session = AiInterviewSession::query()->create([
            'application_id' => $application->id,
            'candidate_profile_id' => $profile->id,
            'job_id' => $job->id,
            'mode' => AiInterviewMode::Text,
            'language' => 'id',
            'status' => AiInterviewStatus::Invited,
            'invitation_token' => Str::random(40),
            'invited_at' => now(),
            'expires_at' => now()->addDays(7),
            'is_practice' => false,
        ]);

        $profile->user?->notify(new AiInterviewInvitationNotification($session->fresh(['job'])));
    }
}
