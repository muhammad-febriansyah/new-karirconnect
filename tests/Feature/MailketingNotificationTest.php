<?php

use App\Mail\Transport\MailketingTransport;
use App\Models\AiInterviewSession;
use App\Models\User;
use App\Notifications\AiInterviewInvitationNotification;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

/**
 * Verify notif yang via 'mail' channel benar-benar lewat MailketingTransport
 * dan POST ke endpoint Mailketing API v2 dengan payload sesuai dokumentasi:
 * https://api.mailketing.co.id/docs/
 */
it('sends mail notification through Mailketing API endpoint', function (): void {
    Mail::extend('mailketing', fn () => new MailketingTransport('test-token-12345'));
    config([
        'mail.default' => 'mailketing',
        'mail.mailers.mailketing.transport' => 'mailketing',
        'mail.mailers.mailketing.api_token' => 'test-token-12345',
        'mail.mailers.mailketing.base_url' => 'https://api.mailketing.co.id/api/v2',
        'mail.from.address' => 'noreply@karirconnect.test',
        'mail.from.name' => 'KarirConnect',
    ]);

    Http::fake([
        'api.mailketing.co.id/*' => Http::response([
            'success' => true,
            'data' => ['message_id' => 'test-message-id'],
            'message' => 'Email queued successfully',
        ], 200),
    ]);

    $user = User::factory()->create(['name' => 'Budi', 'email' => 'budi@example.test']);

    $notification = new class extends Notification
    {
        /**
         * @return array<int, string>
         */
        public function via(object $notifiable): array
        {
            return ['mail'];
        }

        public function toMail(object $notifiable): MailMessage
        {
            return (new MailMessage)
                ->subject('Test Mailketing')
                ->greeting('Halo Budi')
                ->line('Ini test integrasi Mailketing.');
        }
    };

    $user->notify($notification);

    $captured = collect(Http::recorded())->first();
    expect($captured)->not->toBeNull();
    [$request] = $captured;

    expect($request->url())->toBe('https://api.mailketing.co.id/api/v2/send');
    expect($request->method())->toBe('POST');
    expect($request->header('X-Api-Token'))->toBe(['test-token-12345']);

    $payload = $request->data();
    expect($payload)->toHaveKeys(['from_name', 'from_email', 'recipient', 'subject', 'content']);
    expect($payload['recipient'])->toBe('budi@example.test');
    expect($payload['from_email'])->toBe('noreply@karirconnect.test');
    expect($payload['from_name'])->toBe('KarirConnect');
    expect($payload['subject'])->toBe('Test Mailketing');
    expect($payload['content'])->toContain('Ini test integrasi Mailketing');
});

it('throws TransportException when Mailketing API responds with failure', function (): void {
    Mail::extend('mailketing', fn () => new MailketingTransport('bad-token'));
    config([
        'mail.default' => 'mailketing',
        'mail.mailers.mailketing.transport' => 'mailketing',
        'mail.mailers.mailketing.api_token' => 'bad-token',
        'mail.mailers.mailketing.base_url' => 'https://api.mailketing.co.id/api/v2',
        'mail.from.address' => 'noreply@karirconnect.test',
        'mail.from.name' => 'KarirConnect',
    ]);

    Http::fake([
        'api.mailketing.co.id/*' => Http::response([
            'success' => false,
            'data' => null,
            'message' => 'API token tidak valid',
        ], 401),
    ]);

    $user = User::factory()->create();

    expect(fn () => Mail::raw('payload', fn ($m) => $m->to($user->email)->subject('Boom')))
        ->toThrow(RuntimeException::class, 'Mailketing API error');
});

it('AiInterviewInvitationNotification builds a valid mail payload via Mailketing', function (): void {
    Mail::extend('mailketing', fn () => new MailketingTransport('aitoken'));
    config([
        'mail.default' => 'mailketing',
        'mail.mailers.mailketing.transport' => 'mailketing',
        'mail.mailers.mailketing.api_token' => 'aitoken',
        'mail.mailers.mailketing.base_url' => 'https://api.mailketing.co.id/api/v2',
        'mail.from.address' => 'noreply@karirconnect.test',
        'mail.from.name' => 'KarirConnect',
    ]);

    Http::fake([
        'api.mailketing.co.id/*' => Http::response([
            'success' => true,
            'data' => ['message_id' => 'test-message-id'],
            'message' => 'Email queued successfully',
        ], 200),
    ]);

    $user = User::factory()->create();
    $session = AiInterviewSession::factory()->create([
        'mode' => 'text',
        'language' => 'id',
        'expires_at' => now()->addDays(7),
    ]);

    $user->notify(new AiInterviewInvitationNotification($session));

    $captured = collect(Http::recorded())->first();
    expect($captured)->not->toBeNull();
    [$request] = $captured;
    $payload = $request->data();

    expect($payload['recipient'])->toBe($user->email);
    expect($payload['subject'])->toContain('Undangan AI Interview');
});
