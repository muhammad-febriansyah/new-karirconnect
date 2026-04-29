<?php

namespace App\Services\Jobs;

use App\Enums\JobStatus;
use App\Models\Job;
use App\Models\User;
use App\Services\Sanitizer\HtmlSanitizerService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class JobService
{
    public function __construct(private readonly HtmlSanitizerService $sanitizer) {}

    /**
     * Create a new job for a company. Status defaults to draft so employers can
     * iterate on copy/screening before publishing.
     *
     * @param  array<string, mixed>  $data
     * @param  array<int, array{id:int, proficiency?:string, is_required?:bool}>  $skills
     */
    public function create(int $companyId, User $author, array $data, array $skills = []): Job
    {
        return DB::transaction(function () use ($companyId, $author, $data, $skills) {
            $job = Job::query()->create([
                ...$this->sanitizeRichText($data),
                'company_id' => $companyId,
                'posted_by_user_id' => $author->id,
                'slug' => $this->uniqueSlug($data['title']),
                'status' => JobStatus::Draft,
            ]);

            $this->syncSkills($job, $skills);

            return $job;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, array{id:int, proficiency?:string, is_required?:bool}>  $skills
     */
    public function update(Job $job, array $data, array $skills = []): Job
    {
        return DB::transaction(function () use ($job, $data, $skills): Job {
            $job->fill($this->sanitizeRichText($data))->save();
            $this->syncSkills($job, $skills);

            return $job;
        });
    }

    public function publish(Job $job): Job
    {
        $job->forceFill([
            'status' => JobStatus::Published,
            'published_at' => $job->published_at ?? now(),
            'closed_at' => null,
        ])->save();

        return $job;
    }

    public function close(Job $job): Job
    {
        $job->forceFill([
            'status' => JobStatus::Closed,
            'closed_at' => now(),
        ])->save();

        return $job;
    }

    public function archive(Job $job): Job
    {
        $job->forceFill(['status' => JobStatus::Archived])->save();

        return $job;
    }

    public function incrementViews(Job $job): void
    {
        $job->newQuery()->whereKey($job->id)->increment('views_count');
    }

    /**
     * @param  array<int, array{id:int, proficiency?:string, is_required?:bool}>  $skills
     */
    private function syncSkills(Job $job, array $skills): void
    {
        $payload = [];
        foreach ($skills as $row) {
            if (! isset($row['id'])) {
                continue;
            }
            $payload[(int) $row['id']] = [
                'proficiency' => $row['proficiency'] ?? 'mid',
                'is_required' => (bool) ($row['is_required'] ?? false),
            ];
        }

        $job->skills()->sync($payload);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function sanitizeRichText(array $data): array
    {
        foreach (['description', 'responsibilities', 'requirements', 'benefits'] as $field) {
            if (isset($data[$field]) && is_string($data[$field])) {
                $data[$field] = $this->sanitizer->clean($data[$field]);
            }
        }

        return $data;
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $i = 1;

        while (Job::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.++$i;
        }

        return $slug;
    }
}
