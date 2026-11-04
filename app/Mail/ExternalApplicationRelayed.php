<?php

namespace App\Mail;

use App\Models\Application;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Storage;

/**
 * An application to an external job, forwarded to the company's recruitment
 * email. Replies go straight to the candidate.
 */
class ExternalApplicationRelayed extends Mailable
{
    private const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

    public function __construct(public readonly Application $application) {}

    public function envelope(): Envelope
    {
        $candidate = $this->application->employeeProfile?->user;

        return new Envelope(
            // Sent from the app's own address, under the candidate's name.
            from: new Address((string) config('mail.from.address'), $candidate?->name ?? (string) config('mail.from.name')),
            subject: 'Lamaran '.$this->application->job?->title.' - '.($candidate?->name ?? 'Kandidat'),
            replyTo: $candidate?->email ? [new Address($candidate->email, $candidate->name)] : [],
        );
    }

    /**
     * A plain letter from the candidate, without the app's mail layout.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.external-application',
            text: 'emails.external-application-text',
            with: ['coverLetter' => $this->plainCoverLetter()],
        );
    }

    private function plainCoverLetter(): ?string
    {
        $html = $this->application->cover_letter;

        if (blank($html)) {
            return null;
        }

        $text = html_entity_decode(strip_tags(preg_replace('#<(br|/p|/li|/h[1-6])[^>]*>#i', "\n", $html)), ENT_QUOTES | ENT_HTML5);

        return trim(preg_replace("/\n{3,}/", "\n\n", $text));
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        $path = $this->application->candidateCv?->file_path;
        $disk = Storage::disk('public');

        if (blank($path) || ! $disk->exists($path) || $disk->size($path) > self::MAX_ATTACHMENT_BYTES) {
            return [];
        }

        $name = str($this->application->employeeProfile?->user?->name ?? 'kandidat')->slug().'-cv.'.pathinfo($path, PATHINFO_EXTENSION);

        return [Attachment::fromStorageDisk('public', $path)->as($name)];
    }
}
