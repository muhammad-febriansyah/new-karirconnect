<?php

namespace App\Services\Crawler;

use App\Enums\JobSourceType;
use App\Exceptions\Crawler\CrawlerWorkerException;
use App\Models\CrawlRun;
use App\Models\JobSource;
use Illuminate\Process\Exceptions\ProcessTimedOutException;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use JsonException;

/**
 * Runs the Python worker as a child process with a fixed argv (no shell),
 * a hard timeout and the request JSON on stdin. See crawler/karir_crawler/
 * contract.py for the other side of the contract.
 */
class CrawlerClient
{
    public const CONTRACT_VERSION = 1;

    /**
     * @return array<string, mixed>
     */
    public function buildRequest(JobSource $source, CrawlRun $run): array
    {
        return [
            'contract_version' => self::CONTRACT_VERSION,
            'run_uuid' => $run->uuid,
            'user_agent' => (string) config('crawler.user_agent'),
            'source' => [
                'type' => $source->type->value,
                'base_url' => $source->base_url,
                'allowed_domains' => array_values($source->allowed_domains ?? []),
                'config' => (object) ($source->config ?? []),
            ],
            'limits' => [
                'max_pages' => $source->max_pages,
                'max_items' => (int) config('crawler.max_items_per_run'),
                'timeout_s' => (int) config('crawler.timeout_seconds'),
                'rate_per_minute' => $source->rate_limit_per_minute,
                'browser_allowed' => $source->browser_allowed,
            ],
            'engines' => $this->enginesFor($source),
            'expected_min_items' => $source->expected_min_items,
            'recently_seen' => $this->recentlySeen($source),
        ];
    }

    /**
     * Pages of this source read in the last few days. HTML sources visit
     * unread pages first, so a page budget smaller than the site still covers
     * all of it over several runs.
     *
     * @return list<string>
     */
    private function recentlySeen(JobSource $source): array
    {
        if (! in_array($source->type, [JobSourceType::Sitemap, JobSourceType::GenericHtml], true)) {
            return [];
        }

        $stored = $source->origins()
            ->where('last_seen_at', '>=', now()->subDays(3))
            ->latest('last_seen_at')
            ->limit(10000)
            ->pluck('source_url')
            ->all();

        return array_values(array_unique([...$stored, ...app(SeenPages::class)->recent($source)]));
    }

    /**
     * Engine order: official API/feed first, then plain HTTP, then a browser
     * only when the source explicitly allows it.
     *
     * @return list<string>
     */
    public function enginesFor(JobSource $source): array
    {
        if ($source->type->isOfficialApi()) {
            return ['api'];
        }

        return match ($source->type) {
            JobSourceType::Sitemap => ['http'],
            JobSourceType::GenericHtml => $source->browser_allowed ? ['http', 'browser'] : ['http'],
            default => [],
        };
    }

    /**
     * @param  array<string, mixed>  $request
     * @return array<string, mixed>
     *
     * @throws CrawlerWorkerException
     */
    public function run(array $request): array
    {
        $timeout = (int) config('crawler.timeout_seconds') + 30;

        try {
            $result = Process::path($this->absolute((string) config('crawler.worker_path')))
                ->timeout($timeout)
                ->env([
                    'PYTHONDONTWRITEBYTECODE' => '1',
                    'PYTHONUNBUFFERED' => '1',
                    'CRAWLER_IMAGE' => (string) config('crawler.docker.image'),
                    'CRAWLER_LOCK_DIR' => (string) config('crawler.docker.lock_dir'),
                    'CRAWLER_MEMORY' => (string) config('crawler.docker.memory'),
                    'CRAWLER_CPUS' => (string) config('crawler.docker.cpus'),
                ])
                ->input(json_encode($request, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES))
                ->run([$this->absolute((string) config('crawler.python')), '-m', 'karir_crawler.cli']);
        } catch (ProcessTimedOutException) {
            throw new CrawlerWorkerException("Worker tidak selesai dalam {$timeout} detik.", 'timeout');
        } catch (JsonException $exception) {
            throw new CrawlerWorkerException('Request worker tidak dapat dibuat: '.$exception->getMessage());
        }

        $output = trim($result->output());

        try {
            $response = json_decode($output, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $stderr = Str::limit(trim($result->errorOutput()), 1000);

            throw new CrawlerWorkerException(
                "Output worker bukan JSON (exit {$result->exitCode()}). {$stderr}",
            );
        }

        if (! is_array($response) || ($response['contract_version'] ?? null) !== self::CONTRACT_VERSION) {
            throw new CrawlerWorkerException('Versi kontrak worker tidak cocok.');
        }

        if (($response['run_uuid'] ?? null) !== ($request['run_uuid'] ?? null)) {
            throw new CrawlerWorkerException('Respons worker untuk run yang berbeda.');
        }

        return $response;
    }

    private function absolute(string $path): string
    {
        return str_starts_with($path, '/') ? $path : base_path($path);
    }
}
