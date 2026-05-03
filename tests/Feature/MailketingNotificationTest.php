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
 * dan POST ke endpoint Mailketing dengan payload sesuai dokumentasi:
 * https://mailketing.co.id/docs/send-email-via-api/
 */
it('sends mail notification through Mailketing API endpoint', function (): void {
    Mail::extend('mailketing', fn () => new MailketingTransport('test-token-12345'));
    config([
        'mail.default' => 'mailketing',
        'mail.mailers.mailketing.transport' => 'mailketing',
        'mail.mailers.mailketing.api_token' => 'test-token-12345',
        'mail.from.address' => 'noreply@karirconnect.test',
        'mail.from.name' => 'KarirConnect',
    ]);

    Http::fake([
        'api.mailketing.co.id/*' => Http::response(['status' => 'success', 'response' => 'Mail Sent'], 200),
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

    expect($request->url())->toBe('https://api.mailketing.co.id/api/v1/send');
    expect($request->method())->toBe('POST');

    parse_str($request->body(), $payload);
    expect($payload)->toHaveKeys(['api_token', 'from_name', 'from_email', 'recipient', 'subject', 'content']);
    expect($payload['api_token'])->toBe('test-token-12345');
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
        'mail.from.address' => 'noreply@karirconnect.test',
        'mail.from.name' => 'KarirConnect',
    ]);

    Http::fake([
        'api.mailketing.co.id/*' => Http::response(['status' => 'failed', 'response' => 'User Not Found or Wrong API Token'], 200),
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
        'mail.from.address' => 'noreply@karirconnect.test',
        'mail.from.name' => 'KarirConnect',
    ]);

    Http::fake([
        'api.mailketing.co.id/*' => Http::response(['status' => 'success', 'response' => 'Mail Sent'], 200),
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
    parse_str($request->body(), $payload);

    expect($payload['recipient'])->toBe($user->email);
    expect($payload['subject'])->toContain('Undangan AI Interview');
});
