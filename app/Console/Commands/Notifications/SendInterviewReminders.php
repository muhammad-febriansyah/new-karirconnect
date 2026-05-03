<?php

namespace App\Console\Commands\Notifications;

use App\Enums\InterviewStatus;
use App\Models\Interview;
use App\Notifications\InterviewReminderNotification;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

#[Signature('notifications:send-interview-reminders')]
#[Description('Kirim pengingat email/in-app ke peserta interview untuk window 24 jam dan 1 jam sebelum scheduled_at.')]
class SendInterviewReminders extends Command
{
    public function handle(): int
    {
        $count = 0;

        foreach ([24, 1] as $hoursAhead) {
            $count += $this->dispatchWindow($hoursAhead);
        }

        $this->info("Total reminder dispatched: {$count}");

        return self::SUCCESS;
    }

    private function dispatchWindow(int $hoursAhead): int
    {
        $window = $hoursAhead === 1 ? '1h' : '24h';
        $start = now()->copy()->addHours($hoursAhead);
        $end = $start->copy()->addMinutes(59);

        $interviews = Interview::query()
            ->with(['participants.user'])
            ->whereBetween('scheduled_at', [$start, $end])
            ->where('status', InterviewStatus::Scheduled)
            ->get();

        $count = 0;
        foreach ($interviews as $interview) {
            $recipients = $interview->participants
                ->pluck('user')
                ->filter()
                ->unique('id');

            if ($recipients->isEmpty()) {
                continue;
            }

            Notification::send($recipients, new InterviewReminderNotification($interview, $window));
            $count += $recipients->count();
        }

        return $count;
    }
}
