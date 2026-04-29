<?php

namespace App\Actions\Interviews;

use App\Enums\ApplicationStatus;
use App\Enums\InterviewMode;
use App\Enums\InterviewStage;
use App\Enums\InterviewStatus;
use App\Models\Application;
use App\Models\Interview;
use App\Models\User;
use App\Notifications\InterviewScheduledNotification;
use App\Services\Applications\ApplicationService;
use App\Services\Interviews\GoogleMeetService;
use App\Services\Interviews\InterviewSchedulingService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ScheduleInterviewAction
{
    public function __construct(
        private readonly GoogleMeetService $meet,
        private readonly InterviewSchedulingService $scheduler,
        private readonly ApplicationService $applications,
    ) {}

    /**
     * Schedule a new interview. Atomically: create the interview row +
     * candidate participant + interviewer participants + meet payload (online)
     * + advance the parent application stage + notify the candidate.
     *
     * @param  array{
     *     stage: string,
     *     mode: string,
     *     title: string,
     *     scheduled_at: string,
     *     duration_minutes?: int,
     *     timezone?: string,
     *     candidate_instructions?: string|null,
     *     internal_notes?: string|null,
     *     requires_confirmation?: bool,
     *     meeting_url?: string|null,
     *     meeting_passcode?: string|null,
     *     location_name?: string|null,
     *     location_address?: string|null,
     *     location_map_url?: string|null,
     *     interviewer_ids?: array<int, int>,
     * }  $data
     */
    public function execute(Application $application, User $organizer, array $data): Interview
    {
        $start = Carbon::parse($data['scheduled_at'], $data['timezone'] ?? 'Asia/Jakarta');
        $duration = (int) ($data['duration_minutes'] ?? 60);

        $interviewerIds = array_values(array_unique(array_map('intval', $data['interviewer_ids'] ?? [])));
        $candidateUserId = $application->employeeProfile?->user_id;
        if ($candidateUserId === null) {
            throw ValidationException::withMessages(['application' => 'Aplikasi tidak memiliki kandidat valid.']);
        }

        $userIdsForConflict = array_values(array_unique([...$interviewerIds, $candidateUserId]));
        $conflicts = $this->scheduler->findConflicts($start, $duration, $userIdsForConflict);
        if ($conflicts->isNotEmpty()) {
            throw ValidationException::withMessages([
                'scheduled_at' => 'Slot bentrok dengan interview lain dari kandidat atau interviewer.',
            ]);
        }

        $mode = InterviewMode::from($data['mode']);

        return DB::transaction(function () use ($application, $organizer, $start, $duration, $mode, $data, $interviewerIds, $candidateUserId): Interview {
            $payload = [
                'application_id' => $application->id,
                'stage' => InterviewStage::from($data['stage']),
                'mode' => $mode,
                'title' => $data['title'],
                'scheduled_at' => $start,
                'duration_minutes' => $duration,
                'ends_at' => $start->copy()->addMinutes($duration),
                'timezone' => $data['timezone'] ?? 'Asia/Jakarta',
                'status' => InterviewStatus::Scheduled,
                'candidate_instructions' => $data['candidate_instructions'] ?? null,
                'internal_notes' => $data['internal_notes'] ?? null,
                'requires_confirmation' => $data['requires_confirmation'] ?? true,
                'scheduled_by_user_id' => $organizer->id,
            ];

            if ($mode === InterviewMode::Onsite) {
                $payload['location_name'] = $data['location_name'] ?? null;
                $payload['location_address'] = $data['location_address'] ?? null;
                $payload['location_map_url'] = $data['location_map_url'] ?? null;
            }

            $interview = Interview::query()->create($payload);

            if ($mode === InterviewMode::Online) {
                $meeting = $this->meet->createMeeting($interview, $organizer);
                $interview->forceFill([
                    'meeting_provider' => $meeting['provider'],
                    'meeting_url' => $data['meeting_url'] ?? $meeting['url'],
                    'meeting_id' => $meeting['id'],
                    'meeting_passcode' => $data['meeting_passcode'] ?? null,
                ])->save();
            }

            $interview->participants()->create([
                'user_id' => $candidateUserId,
                'role' => 'candidate',
                'invitation_response' => 'pending',
            ]);

            foreach ($interviewerIds as $userId) {
                if ($userId === $candidateUserId) {
                    continue;
                }
                $interview->participants()->create([
                    'user_id' => $userId,
                    'role' => 'interviewer',
                    'invitation_response' => 'pending',
                ]);
            }

            // Bump the parent application into the Interview status if still upstream.
            if (in_array($application->status, [
                ApplicationStatus::Submitted,
                ApplicationStatus::Reviewed,
                ApplicationStatus::Shortlisted,
            ], true)) {
                $application->forceFill([
                    'status' => ApplicationStatus::Interview,
                    'current_stage' => InterviewStage::from($data['stage']),
                ])->save();
            }

            $this->applications->markReviewed($application);

            $candidate = $application->employeeProfile?->user;
            $candidate?->notify(new InterviewScheduledNotification($interview->fresh(['scheduledBy'])));

            return $interview->fresh(['participants.user', 'scheduledBy']);
        });
    }
}
