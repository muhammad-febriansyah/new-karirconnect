<?php

namespace App\Services\Interviews;

use App\Enums\InterviewMode;
use App\Models\Interview;

/**
 * Generate an RFC-5545 calendar invite (.ics). Allows candidates to add the
 * interview to their personal calendar regardless of the meeting platform.
 */
class InterviewIcsExporter
{
    public function export(Interview $interview): string
    {
        $start = $interview->scheduled_at?->copy()->setTimezone('UTC');
        $end = $interview->ends_at?->copy()->setTimezone('UTC')
            ?? $start?->copy()->addMinutes($interview->duration_minutes ?? 60);
        $now = now()->setTimezone('UTC');

        $summary = $this->escape($interview->title);
        $description = $this->buildDescription($interview);
        $location = $this->buildLocation($interview);
        $uid = "interview-{$interview->id}@karirconnect";

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//KarirConnect//Interview//ID',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            "UID:{$uid}",
            'DTSTAMP:'.$now->format('Ymd\THis\Z'),
            'DTSTART:'.$start?->format('Ymd\THis\Z'),
            'DTEND:'.$end?->format('Ymd\THis\Z'),
            "SUMMARY:{$summary}",
            "DESCRIPTION:{$description}",
            "LOCATION:{$location}",
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR',
        ];

        return implode("\r\n", $lines);
    }

    private function buildDescription(Interview $interview): string
    {
        $parts = [];
        if ($interview->candidate_instructions) {
            $parts[] = strip_tags($interview->candidate_instructions);
        }
        if ($interview->mode === InterviewMode::Online && $interview->meeting_url) {
            $parts[] = 'Meeting link: '.$interview->meeting_url;
        }

        return $this->escape(implode('\n\n', $parts));
    }

    private function buildLocation(Interview $interview): string
    {
        return match ($interview->mode) {
            InterviewMode::Online => $interview->meeting_url ?? '',
            InterviewMode::Onsite => $this->escape(trim(($interview->location_name ?? '').' '.($interview->location_address ?? ''))),
            InterviewMode::Ai => 'AI Interview Session',
        };
    }

    private function escape(?string $value): string
    {
        return str_replace(["\r\n", "\n", ',', ';'], ['\\n', '\\n', '\\,', '\\;'], (string) $value);
    }
}
