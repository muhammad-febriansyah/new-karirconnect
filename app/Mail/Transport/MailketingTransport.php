<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\MessageConverter;

class MailketingTransport extends AbstractTransport
{
    private const ENDPOINT = 'https://api.mailketing.co.id/api/v1/send';

    public function __construct(private readonly string $apiToken, private readonly int $timeoutSeconds = 15)
    {
        parent::__construct();
    }

    public function __toString(): string
    {
        return 'mailketing';
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());

        $from = $this->resolveFrom($email);
        $recipient = $this->resolveRecipient($email);

        $response = Http::asForm()
            ->timeout($this->timeoutSeconds)
            ->acceptJson()
            ->post(self::ENDPOINT, [
                'api_token' => $this->apiToken,
                'from_name' => $from['name'],
                'from_email' => $from['email'],
                'recipient' => $recipient,
                'subject' => (string) $email->getSubject(),
                'content' => $email->getHtmlBody() ?? $email->getTextBody() ?? '',
            ]);

        $payload = $response->json();
        $status = is_array($payload) ? ($payload['status'] ?? null) : null;

        if (! $response->successful() || $status !== 'success') {
            $reason = is_array($payload) ? (string) ($payload['response'] ?? 'Unknown error') : $response->body();
            throw new \RuntimeException("Mailketing API error: {$reason}");
        }
    }

    /**
     * @return array{name: string, email: string}
     */
    private function resolveFrom(Email $email): array
    {
        $first = $email->getFrom()[0] ?? null;

        if ($first instanceof Address) {
            return [
                'name' => $first->getName() !== '' ? $first->getName() : (string) config('mail.from.name'),
                'email' => $first->getAddress(),
            ];
        }

        return [
            'name' => (string) config('mail.from.name', 'KarirConnect'),
            'email' => (string) config('mail.from.address', 'noreply@karirconnect.test'),
        ];
    }

    private function resolveRecipient(Email $email): string
    {
        $to = $email->getTo();

        if (count($to) === 0) {
            throw new \RuntimeException('Mailketing transport requires at least one recipient.');
        }

        return $to[0]->getAddress();
    }
}
