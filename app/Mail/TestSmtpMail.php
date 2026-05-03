<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent from /admin/settings/email "Test Email" button. Uses the same branded
 * Markdown template as notifications so admins see exactly how customer-facing
 * emails will look (logo from DB, branded footer, Indonesian salutation).
 */
class TestSmtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly string $sentBy = 'Admin') {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'KarirConnect - Test Email SMTP',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.test-smtp',
            with: [
                'sentBy' => $this->sentBy,
                'sentAt' => now()->setTimezone('Asia/Jakarta')->format('d M Y, H:i').' WIB',
            ],
        );
    }
}
