<?php

namespace App\Mail;

use App\Enums\EducationLevel;
use App\Models\Application;
use App\Models\Education;
use App\Models\WorkExperience;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * An application to an external job, forwarded to the company's recruitment
 * email. It reads as a letter from the candidate, and replies go to them.
 */
class ExternalApplicationRelayed extends Mailable
{
    private const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

    private const MAX_EXPERIENCES = 3;

    private const MAX_SKILLS = 12;

    public function __construct(public readonly Application $application) {}

    public function envelope(): Envelope
    {
        $candidate = $this->application->employeeProfile?->user;
        $fromAddress = (string) (config('external_jobs.relay_from_address') ?: config('mail.from.address'));

        return new Envelope(
            from: new Address($fromAddress, $candidate?->name ?? (string) config('mail.from.name')),
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
            with: ['letter' => $this->letter()],
        );
    }

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        $path = $this->cvPath();

        if ($path === null) {
            return [];
        }

        return [Attachment::fromStorageDisk('public', $path)->as($this->cvFileName($path))];
    }

    /**
     * Everything the templates show, prepared once so both stay in sync.
     *
     * @return array{
     *     job_title: ?string,
     *     company: ?string,
     *     name: ?string,
     *     headline: ?string,
     *     email: ?string,
     *     phone: ?string,
     *     current_role: ?string,
     *     facts: list<array{label: string, value: string}>,
     *     experiences: list<array{position: string, company: ?string, period: string}>,
     *     skills: list<string>,
     *     links: list<array{label: string, url: string}>,
     *     cover_letter: ?string,
     *     cv_file: ?string,
     * }
     */
    private function letter(): array
    {
        $application = $this->application;
        $profile = $application->employeeProfile;
        $user = $profile?->user;
        $cvPath = $this->cvPath();

        $experiences = $profile?->workExperiences()
            ->orderByDesc('is_current')
            ->orderByDesc('start_date')
            ->limit(self::MAX_EXPERIENCES)
            ->get() ?? collect();

        $current = $experiences->first(fn (WorkExperience $experience): bool => (bool) $experience->is_current);
        $currentRole = $current
            ? trim($current->position.($current->company_name ? ' di '.$current->company_name : ''))
            : $profile?->current_position;

        $salary = $application->expected_salary
            ? 'Rp '.number_format($application->expected_salary, 0, ',', '.').' per bulan'
            : null;

        $facts = collect([
            ['label' => 'Domisili', 'value' => collect([$profile?->city?->name, $profile?->province?->name])->filter()->implode(', ')],
            ['label' => 'Pengalaman', 'value' => $profile?->experience_level?->label()],
            ['label' => 'Pendidikan', 'value' => $this->latestEducation($profile?->educations()->orderByDesc('end_year')->first())],
            ['label' => 'Ekspektasi gaji', 'value' => $salary],
        ])->filter(fn (array $row): bool => filled($row['value']))->values()->all();

        $links = collect([
            ['label' => 'LinkedIn', 'url' => $profile?->linkedin_url],
            ['label' => 'Portofolio', 'url' => $profile?->portfolio_url],
            ['label' => 'GitHub', 'url' => $profile?->github_url],
        ])->filter(fn (array $link): bool => filled($link['url']) && Str::startsWith($link['url'], ['https://', 'http://']))
            ->values()->all();

        return [
            'job_title' => $application->job?->title,
            'company' => $application->job?->company?->name,
            'name' => $user?->name,
            'headline' => $profile?->headline,
            'email' => $user?->email,
            'phone' => $user?->phone,
            'current_role' => filled($currentRole) ? $currentRole : null,
            'facts' => $facts,
            'experiences' => $experiences->map(fn (WorkExperience $experience): array => [
                'position' => (string) $experience->position,
                'company' => $experience->company_name,
                'period' => $this->period($experience),
            ])->all(),
            'skills' => $profile?->skills()->orderBy('name')->limit(self::MAX_SKILLS)->pluck('name')->all() ?? [],
            'links' => $links,
            'cover_letter' => $this->plainCoverLetter(),
            'cv_file' => $cvPath ? $this->cvFileName($cvPath) : null,
        ];
    }

    private function period(WorkExperience $experience): string
    {
        $start = $experience->start_date?->translatedFormat('M Y');
        $end = $experience->is_current ? 'sekarang' : $experience->end_date?->translatedFormat('M Y');

        return collect([$start, $end])->filter()->implode(' – ');
    }

    private function latestEducation(?Education $education): ?string
    {
        if ($education === null) {
            return null;
        }

        $level = EducationLevel::tryFrom((string) $education->level)?->label();
        $study = collect([$level, $education->major])->filter()->implode(' ');

        $text = collect([$study, $education->institution])->filter()->implode(', ');

        if ($text === '') {
            return null;
        }

        return $education->end_year ? $text.' ('.$education->end_year.')' : $text;
    }

    private function plainCoverLetter(): ?string
    {
        $html = $this->application->cover_letter;

        if (blank($html)) {
            return null;
        }

        $text = html_entity_decode(strip_tags(preg_replace('#<(br|/p|/li|/h[1-6])[^>]*>#i', "\n", $html)), ENT_QUOTES | ENT_HTML5);

        return trim(preg_replace("/\n{3,}/", "\n\n", $text)) ?: null;
    }

    private function cvPath(): ?string
    {
        $path = $this->application->candidateCv?->file_path;
        $disk = Storage::disk('public');

        if (blank($path) || ! $disk->exists($path) || $disk->size($path) > self::MAX_ATTACHMENT_BYTES) {
            return null;
        }

        return $path;
    }

    private function cvFileName(string $path): string
    {
        return 'CV-'.Str::slug($this->application->employeeProfile?->user?->name ?? 'kandidat').'.'.pathinfo($path, PATHINFO_EXTENSION);
    }
}
