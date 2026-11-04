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
            subject: 'Lamaran: '.$this->application->job?->title.' — '.($candidate?->name ?? 'Kandidat').' (via KarirConnect)',
            replyTo: $candidate?->email ? [new Address($candidate->email, $candidate->name)] : [],
        );
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.external-application');
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
