<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Settings\SettingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    private const SCOPES = [
        'openid',
        'email',
        'profile',
    ];

    public function __construct(private readonly SettingService $settings) {}

    public function login(Request $request): RedirectResponse
    {
        return $this->redirectToGoogle($request, 'login');
    }

    public function register(Request $request, string $audience): RedirectResponse
    {
        $role = $this->roleFromAudience($audience);

        if ($role === null) {
            abort(404);
        }

        return $this->redirectToGoogle($request, 'register', $role);
    }

    public function callback(Request $request): RedirectResponse
    {
        $context = $request->session()->pull('google_auth', []);
        $intent = $context['intent'] ?? 'login';
        $role = UserRole::tryFrom((string) ($context['role'] ?? ''));
        $redirectTo = $this->redirectToFor($intent, $role);

        if ($request->filled('error')) {
            return redirect()->to($redirectTo)
                ->withErrors(['google' => 'Login Google dibatalkan.']);
        }

        $state = (string) $request->query('state', '');
        $expected = (string) ($context['state'] ?? '');

        if ($state === '' || $expected === '' || ! hash_equals($expected, $state)) {
            return redirect()->to($redirectTo)
                ->withErrors(['google' => 'State Google OAuth tidak valid. Silakan coba lagi.']);
        }

        $code = (string) $request->query('code', '');
        if ($code === '') {
            return redirect()->to($redirectTo)
                ->withErrors(['google' => 'Kode otorisasi Google tidak ditemukan.']);
        }

        [$clientId, $clientSecret] = $this->credentials();
        if ($clientId === null || $clientSecret === null) {
            return redirect()->to($redirectTo)
                ->withErrors(['google' => 'Google OAuth belum dikonfigurasi.']);
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => route('auth.google.callback'),
        ]);

        if (! $response->ok()) {
            return redirect()->to($redirectTo)
                ->withErrors(['google' => 'Gagal menyelesaikan login Google.']);
        }

        $accessToken = (string) ($response->json('access_token') ?? '');
        if ($accessToken === '') {
            return redirect()->to($redirectTo)
                ->withErrors(['google' => 'Token Google tidak diterima.']);
        }

        $profile = $this->resolveProfile($accessToken);
        $email = $profile['email'] ?? '';

        if ($email === '') {
            return redirect()->to($redirectTo)
                ->withErrors(['google' => 'Email akun Google tidak tersedia.']);
        }

        $user = User::query()->where('email', $email)->first();

        if ($user === null && $intent === 'login') {
            return redirect()->route('login')
                ->withErrors(['google' => 'Akun ini belum terdaftar. Silakan daftar terlebih dahulu.']);
        }

        if ($user === null) {
            if ($role === null) {
                return redirect()->route('register')
                    ->withErrors(['google' => 'Jenis akun tidak valid. Silakan pilih ulang.']);
            }

            $user = User::query()->create([
                'name' => $profile['name'] ?? Str::before($email, '@'),
                'email' => $email,
                'password' => Str::password(32),
                'role' => $role,
            ]);

            $user->forceFill([
                'email_verified_at' => now(),
            ])->save();
        } elseif ($user->email_verified_at === null) {
            $user->forceFill([
                'email_verified_at' => now(),
            ])->save();
        }

        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'))
            ->with('success', 'Berhasil masuk dengan akun Google.');
    }

    private function redirectToGoogle(Request $request, string $intent, ?UserRole $role = null): RedirectResponse
    {
        [$clientId] = $this->credentials();

        if ($clientId === null) {
            return redirect()->to($this->redirectToFor($intent, $role))
                ->withErrors(['google' => 'Google OAuth belum dikonfigurasi. Hubungi admin.']);
        }

        $state = Str::random(40);

        $request->session()->put('google_auth', [
            'state' => $state,
            'intent' => $intent,
            'role' => $role?->value,
        ]);

        $params = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => route('auth.google.callback'),
            'response_type' => 'code',
            'scope' => implode(' ', self::SCOPES),
            'access_type' => 'offline',
            'prompt' => 'select_account',
            'state' => $state,
        ]);

        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.$params);
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
     * @return array{name?: string, email?: string}
     */
    private function resolveProfile(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->get('https://www.googleapis.com/oauth2/v2/userinfo');

        if (! $response->ok()) {
            return [];
        }

        return [
            'name' => (string) ($response->json('name') ?? ''),
            'email' => (string) ($response->json('email') ?? ''),
        ];
    }

    private function redirectToFor(string $intent, ?UserRole $role): string
    {
        if ($intent === 'register') {
            return match ($role) {
                UserRole::Employer => route('register.company'),
                UserRole::Employee => route('register.jobseeker'),
                default => route('register'),
            };
        }

        return route('login');
    }

    private function roleFromAudience(string $audience): ?UserRole
    {
        return match ($audience) {
            'jobseeker' => UserRole::Employee,
            'perusahaan' => UserRole::Employer,
            default => null,
        };
    }
}
