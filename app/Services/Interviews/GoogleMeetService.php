<?php

namespace App\Services\Interviews;

use App\Models\GoogleCalendarToken;
use App\Models\Interview;
use App\Models\User;
use App\Services\Settings\SettingService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Google Meet provisioning. When the organizer has connected Google Calendar
 * (token row in google_calendar_tokens), we POST to the Calendar API with
 * `conferenceDataVersion=1` and `conferenceData.createRequest` to create an
 * event with a unique meet.google.com URL. If the user hasn't connected — or
 * the API call fails — we fall back to a deterministic dummy URL so the rest
 * of the scheduling pipeline still runs in dev/test environments.
 */
class GoogleMeetService
{
    public function __construct(private readonly SettingService $settings) {}

    public function isConfigured(User $user): bool
    {
        return GoogleCalendarToken::query()->where('user_id', $user->id)->exists();
    }

    /**
     * @return array{provider:string, url:string, id:string}
     */
    public function createMeeting(Interview $interview, User $organizer): array
    {
        $token = GoogleCalendarToken::query()->where('user_id', $organizer->id)->first();
        if ($token === null) {
            return $this->fallbackMeeting($interview);
        }

        try {
            $accessToken = $this->ensureFreshAccessToken($token);
        } catch (\Throwable $e) {
            Log::warning('google_meet.token_refresh_failed', [
                'user_id' => $organizer->id,
                'error' => $e->getMessage(),
            ]);

            return $this->fallbackMeeting($interview);
        }

        if ($accessToken === null) {
            return $this->fallbackMeeting($interview);
        }

        $start = $interview->scheduled_at?->copy();
        if ($start === null) {
            return $this->fallbackMeeting($interview);
        }

        $end = $start->copy()->addMinutes(max(15, (int) ($interview->duration_minutes ?? 60)));
        $tz = (string) ($interview->timezone ?: 'Asia/Jakarta');
        $requestId = 'kc-int-'.$interview->id.'-'.Str::lower(Str::random(8));

        $body = [
            'summary' => $interview->title ?: 'Interview KarirConnect',
            'description' => 'Dijadwalkan via KarirConnect.',
            'start' => ['dateTime' => $start->toIso8601String(), 'timeZone' => $tz],
            'end' => ['dateTime' => $end->toIso8601String(), 'timeZone' => $tz],
            'conferenceData' => [
                'createRequest' => [
                    'requestId' => $requestId,
                    'conferenceSolutionKey' => ['type' => 'hangoutsMeet'],
                ],
            ],
        ];

        try {
            $response = Http::withToken($accessToken)
                ->asJson()
                ->acceptJson()
                ->timeout(15)
                ->post(
                    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none',
                    $body,
                )
                ->throw()
                ->json();
        } catch (RequestException $e) {
            Log::warning('google_meet.api_failed', [
                'user_id' => $organizer->id,
                'interview_id' => $interview->id,
                'status' => $e->response?->status(),
                'body' => $e->response?->json(),
            ]);

            return $this->fallbackMeeting($interview);
        }

        $url = (string) (
            $response['hangoutLink']
            ?? $response['conferenceData']['entryPoints'][0]['uri']
            ?? ''
        );

        if ($url === '') {
            return $this->fallbackMeeting($interview);
        }

        return [
            'provider' => 'google_meet',
            'url' => $url,
            'id' => (string) ($response['id'] ?? $requestId),
        ];
    }

    /**
     * Return a usable access token, refreshing it via the refresh_token grant
     * if the cached one has expired. Returns null when no refresh is possible.
     */
    private function ensureFreshAccessToken(GoogleCalendarToken $token): ?string
    {
        $access = (string) ($token->access_token ?? '');
        $expiresAt = $token->expires_at;

        // 60-second safety margin to avoid edge-of-expiry failures.
        if ($access !== '' && $expiresAt !== null && $expiresAt->isFuture() && $expiresAt->diffInSeconds(now()) > 60) {
            return $access;
        }

        $refresh = (string) ($token->refresh_token ?? '');
        if ($refresh === '') {
            return $access !== '' ? $access : null;
        }

        [$clientId, $clientSecret] = $this->credentials();
        if ($clientId === null || $clientSecret === null) {
            return null;
        }

        $response = Http::asForm()
            ->timeout(15)
            ->post('https://oauth2.googleapis.com/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'refresh_token' => $refresh,
                'grant_type' => 'refresh_token',
            ]);

        if (! $response->ok()) {
            return null;
        }

        $payload = $response->json();
        $newAccess = (string) ($payload['access_token'] ?? '');
        $expiresIn = (int) ($payload['expires_in'] ?? 3600);

        if ($newAccess === '') {
            return null;
        }

        $token->forceFill([
            'access_token' => $newAccess,
            'expires_at' => now()->addSeconds($expiresIn),
        ])->save();

        return $newAccess;
    }

    /**
     * @return array{0: ?string, 1: ?string}
     */
    private function credentials(): array
    {
        return [
            $this->settings->get('integrations.google_client_id') ?: env('GOOGLE_CLIENT_ID'),
            $this->settings->get('integrations.google_client_secret') ?: env('GOOGLE_CLIENT_SECRET'),
        ];
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
