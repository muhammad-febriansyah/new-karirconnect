<?php

namespace Database\Seeders;

use App\Enums\JobSourceStatus;
use App\Enums\JobSourceType;
use App\Models\JobSource;
use Illuminate\Database\Seeder;

/**
 * Starter job sources. Nothing here is crawlable out of the box:
 *  - the Greenhouse/Lever entries are disabled templates until an admin puts
 *    in a real board token;
 *  - the big platforms stay `pending_permission` until their terms and
 *    robots rules have been reviewed and permission is recorded.
 *
 * Safe to run more than once (matched by slug).
 */
class JobSourceSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->sources() as $source) {
            JobSource::withTrashed()->updateOrCreate(
                ['slug' => $source['slug']],
                $source,
            );
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function sources(): array
    {
        $platform = fn (string $slug, string $name, string $url, array $domains): array => [
            'slug' => $slug,
            'name' => $name,
            'type' => JobSourceType::Platform,
            'base_url' => $url,
            'allowed_domains' => $domains,
            'config' => [],
            'status' => JobSourceStatus::PendingPermission,
            'permission_notes' => 'Belum diizinkan. Periksa syarat layanan dan robots.txt, atau gunakan kemitraan/API resmi.',
        ];

        return [
            [
                'slug' => 'contoh-greenhouse',
                'name' => 'Contoh Greenhouse Board',
                'type' => JobSourceType::Greenhouse,
                'base_url' => 'https://boards-api.greenhouse.io/v1/boards/BOARD_TOKEN/jobs',
                'allowed_domains' => ['boards-api.greenhouse.io', 'boards.greenhouse.io', 'job-boards.greenhouse.io'],
                'config' => ['board_token' => 'BOARD_TOKEN'],
                'status' => JobSourceStatus::Disabled,
                'permission_notes' => 'Greenhouse Job Board API publik. Ganti BOARD_TOKEN lalu aktifkan.',
            ],
            [
                'slug' => 'contoh-lever',
                'name' => 'Contoh Lever Postings',
                'type' => JobSourceType::Lever,
                'base_url' => 'https://api.lever.co/v0/postings/COMPANY_SLUG',
                'allowed_domains' => ['api.lever.co', 'jobs.lever.co'],
                'config' => ['company' => 'COMPANY_SLUG'],
                'status' => JobSourceStatus::Disabled,
                'permission_notes' => 'Lever Postings API publik. Ganti COMPANY_SLUG lalu aktifkan.',
            ],
            $platform('glints', 'Glints', 'https://glints.com/id/opportunities/jobs/explore', ['glints.com']),
            $platform('jobstreet', 'JobStreet', 'https://id.jobstreet.com/', ['id.jobstreet.com']),
            $platform('linkedin', 'LinkedIn Jobs', 'https://www.linkedin.com/jobs/', ['www.linkedin.com']),
            $platform('indeed', 'Indeed', 'https://id.indeed.com/', ['id.indeed.com']),
        ];
    }
}
