<?php

namespace App\Services\Ai;

use App\Services\Files\CvTextExtractorService;
use Carbon\Carbon;
use Illuminate\Support\Str;

/**
 * Extracts structured profile data from an uploaded CV file using the
 * configured AI client. Falls back to an empty structure when the AI cannot
 * produce valid JSON so the caller can route the user to manual entry.
 */
class CvParserService
{
    public function __construct(
        private readonly AiClientFactory $factory,
        private readonly AiAuditService $audit,
        private readonly CvTextExtractorService $extractor,
    ) {}

    /**
     * @return array<string, mixed>|null
     */
    public function parse(string $absolutePath, string $mimeType, ?int $userId = null): ?array
    {
        $cvText = $this->extractor->extractFromPath($absolutePath, $mimeType);

        if (trim($cvText) === '') {
            return null;
        }

        $client = $this->factory->make();

        $messages = [
            [
                'role' => 'system',
                'content' => 'You are a CV/resume parser. Extract structured information and return ONLY valid JSON matching the requested fields. For dates use YYYY-MM-DD. For years use 4-digit strings. Do not invent data — leave fields empty if missing. The JSON must include: full_name, headline, summary, location_city, location_province, phone, skills (array of strings), experiences (array of {company_name, job_title, start_date, end_date, is_current, location, description}), educations (array of {institution, degree, field_of_study, start_year, end_year, gpa}).',
            ],
            [
                'role' => 'user',
                'content' => "Parse the following CV text and return JSON only:\n\n---\n{$cvText}\n---",
            ],
        ];

        $response = $this->audit->run(
            $client,
            'cv_parse',
            $messages,
            ['intent' => 'cv_parse', 'max_tokens' => 2000, 'temperature' => 0.1],
            $userId,
        );

        $parsed = $response->asArray();

        if (! is_array($parsed)) {
            return null;
        }

        return $this->normalize($parsed);
    }

    /**
     * @param  array<string, mixed>  $parsed
     * @return array<string, mixed>
     */
    private function normalize(array $parsed): array
    {
        $skills = collect($parsed['skills'] ?? [])
            ->filter(fn ($s): bool => is_string($s) && trim($s) !== '')
            ->map(fn (string $s): string => Str::lower(trim($s)))
            ->unique()
            ->take(20)
            ->values()
            ->all();

        $experiences = collect($parsed['experiences'] ?? [])
            ->filter(fn ($e): bool => is_array($e) && filled($e['company_name'] ?? null))
            ->take(10)
            ->map(fn (array $e): array => [
                'company_name' => trim((string) ($e['company_name'] ?? '')),
                'job_title' => trim((string) ($e['job_title'] ?? '')),
                'start_date' => $this->parseDate((string) ($e['start_date'] ?? '')),
                'end_date' => $this->parseDate((string) ($e['end_date'] ?? '')),
                'is_current' => (bool) ($e['is_current'] ?? false),
                'location' => trim((string) ($e['location'] ?? '')),
                'description' => trim((string) ($e['description'] ?? '')),
            ])
            ->values()
            ->all();

        $educations = collect($parsed['educations'] ?? [])
            ->filter(fn ($e): bool => is_array($e) && filled($e['institution'] ?? null))
            ->take(10)
            ->map(fn (array $e): array => [
                'institution' => trim((string) ($e['institution'] ?? '')),
                'degree' => trim((string) ($e['degree'] ?? '')),
                'field_of_study' => trim((string) ($e['field_of_study'] ?? '')),
                'start_year' => $this->parseYear((string) ($e['start_year'] ?? '')),
                'end_year' => $this->parseYear((string) ($e['end_year'] ?? '')),
                'gpa' => trim((string) ($e['gpa'] ?? '')),
            ])
            ->values()
            ->all();

        return [
            'full_name' => trim((string) ($parsed['full_name'] ?? '')),
            'headline' => trim((string) ($parsed['headline'] ?? '')),
            'about' => trim((string) ($parsed['summary'] ?? '')),
            'phone' => trim((string) ($parsed['phone'] ?? '')),
            'location_city' => trim((string) ($parsed['location_city'] ?? '')),
            'location_province' => trim((string) ($parsed['location_province'] ?? '')),
            'skills' => $skills,
            'experiences' => $experiences,
            'educations' => $educations,
        ];
    }

    private function parseDate(string $value): ?string
    {
        if ($value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function parseYear(string $value): ?int
    {
        if ($value === '') {
            return null;
        }

        if (preg_match('/(\d{4})/', $value, $m)) {
            return (int) $m[1];
        }

        return null;
    }
}
