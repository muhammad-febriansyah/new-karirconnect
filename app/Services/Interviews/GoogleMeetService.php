<?php

namespace App\Services\Interviews;

use App\Models\GoogleCalendarToken;
use App\Models\Interview;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Google Meet provisioning. In production this calls the Calendar API to
 * create an event with conferenceData.createRequest set, which produces a
 * unique meet.google.com URL. For dev/test environments — and during Sprint 6
 * before the OAuth flow is wired — we synthesize a deterministic URL so the
 * rest of the scheduling pipeline can be exercised end-to-end.
 *
 * Sprint 7 wires the real `Google_Service_Calendar` call; the public contract
 * here (input → array{meeting_url, meeting_id, provider}) stays stable.
 */
class GoogleMeetService
{
    public function isConfigured(User $user): bool
    {
        return GoogleCalendarToken::query()->where('user_id', $user->id)->exists();
    }

    /**
     * @return array{provider:string, url:string, id:string}
     */
    public function createMeeting(Interview $interview, User $organizer): array
    {
        if (! $this->isConfigured($organizer)) {
            return $this->fallbackMeeting($interview);
        }

        // Real Google Calendar API call goes here in Sprint 7. The API returns
        // an event with conferenceData.entryPoints[0].uri — we'd extract that.
        // For now treat configured as same as fallback so behavior is stable.
        return $this->fallbackMeeting($interview);
    }

    /**
     * @return array{provider:string, url:string, id:string}
     */
    private function fallbackMeeting(Interview $interview): array
    {
        $code = strtolower(Str::random(3).'-'.Str::random(4).'-'.Str::random(3));

        return [
            'provider' => 'google_meet',
            'url' => "https://meet.google.com/{$code}",
            'id' => 'kc-'.$interview->id.'-'.Str::random(8),
        ];
    }
}
