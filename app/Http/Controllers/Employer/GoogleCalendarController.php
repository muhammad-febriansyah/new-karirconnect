<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Models\GoogleCalendarToken;
use App\Services\Settings\SettingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Google Calendar OAuth handshake. Stores per-user calendar tokens so
 * GoogleMeetService can later exchange them for a real Meet URL via the
 * Calendar API. Token exchange is done with the HTTP client directly to
 * avoid a hard dependency on google/apiclient — once that package is
 * approved, swap the createMeeting() implementation, not this flow.
 */
class GoogleCalendarController extends Controller
{
    private const SCOPES = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid',
    ];

    public function __construct(private readonly SettingService $settings) {}

    public function redirect(Request $request): RedirectResponse
    {
        [$clientId] = $this->credentials();
        if ($clientId === null) {
            return back()->withErrors(['google' => 'Google OAuth belum dikonfigurasi. Hubungi admin.']);
        }

        $state = Str::random(40);
        $request->session()->put('google_oauth_state', $state);

        $params = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => route('employer.google-calendar.callback'),
            'response_type' => 'code',
            'scope' => implode(' ', self::SCOPES),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
        ]);

        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.$params);
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->filled('error')) {
            return redirect()->route('employer.interviews.index')
                ->withErrors(['google' => 'Koneksi Google Calendar dibatalkan.']);
        }

        $state = (string) $request->query('state', '');
        $expected = (string) $request->session()->pull('google_oauth_state', '');
        if ($state === '' || ! hash_equals($expected, $state)) {
            return redirect()->route('employer.interviews.index')
                ->withErrors(['google' => 'State tidak valid. Silakan coba lagi.']);
        }

        $code = (string) $request->query('code', '');
        if ($code === '') {
            return redirect()->route('employer.interviews.index')
                ->withErrors(['google' => 'Tidak ada kode otorisasi.']);
        }

        [$clientId, $clientSecret] = $this->credentials();
        if ($clientId === null || $clientSecret === null) {
            return redirect()->route('employer.interviews.index')
                ->withErrors(['google' => 'Google OAuth belum dikonfigurasi.']);
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => route('employer.google-calendar.callback'),
        ]);

        if (! $response->ok()) {
            return redirect()->route('employer.interviews.index')
                ->withErrors(['google' => 'Gagal menukar kode dengan token: '.$response->json('error_description', 'unknown error')]);
        }

        $payload = $response->json();
        $accessToken = (string) ($payload['access_token'] ?? '');
        $refreshToken = $payload['refresh_token'] ?? null;
        $expiresIn = (int) ($payload['expires_in'] ?? 3600);

        if ($accessToken === '') {
            return redirect()->route('employer.interviews.index')
                ->withErrors(['google' => 'Token tidak diterima dari Google.']);
        }

        $email = $this->resolveEmail($accessToken) ?? $request->user()->email;

        GoogleCalendarToken::query()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'calendar_email' => $email,
                'access_token' => Crypt::encryptString($accessToken),
                'refresh_token' => $refreshToken !== null ? Crypt::encryptString((string) $refreshToken) : null,
                'expires_at' => now()->addSeconds($expiresIn),
                'scopes' => self::SCOPES,
            ],
        );

        return redirect()->route('employer.interviews.index')
            ->with('success', "Google Calendar terhubung sebagai {$email}.");
    }

    public function disconnect(Request $request): RedirectResponse
    {
        GoogleCalendarToken::query()->where('user_id', $request->user()->id)->delete();

        return redirect()->route('employer.interviews.index')
            ->with('success', 'Koneksi Google Calendar telah diputus.');
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

    private function resolveEmail(string $accessToken): ?string
    {
        $response = Http::withToken($accessToken)
            ->get('https://www.googleapis.com/oauth2/v2/userinfo');

        return $response->ok() ? (string) ($response->json('email') ?? '') ?: null : null;
    }
}
