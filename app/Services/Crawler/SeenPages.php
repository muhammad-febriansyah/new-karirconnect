<?php

namespace App\Services\Crawler;

use App\Models\JobSource;
use Illuminate\Support\Facades\Cache;

/**
 * Pages of a source that a run read but did not store (outside the date
 * range, outside Indonesia, invalid). Stored listings are remembered through
 * their origins; these are kept here so the next run moves on to unread pages
 * instead of reading the same ones again.
 */
class SeenPages
{
    private const DAYS = 3;

    private const MAX = 10000;

    /**
     * @param  list<string>  $urls
     */
    public function remember(JobSource $source, array $urls): void
    {
        if ($urls === []) {
            return;
        }

        $now = now()->getTimestamp();
        $seen = $this->load($source);
        foreach ($urls as $url) {
            $seen[$url] = $now;
        }

        arsort($seen);
        Cache::put($this->key($source), array_slice($seen, 0, self::MAX, true), now()->addDays(self::DAYS));
    }

    /**
     * @return list<string>
     */
    public function recent(JobSource $source): array
    {
        return array_keys($this->load($source));
    }

    /**
     * @return array<string, int>
     */
    private function load(JobSource $source): array
    {
        $cutoff = now()->subDays(self::DAYS)->getTimestamp();
        $seen = Cache::get($this->key($source), []);

        return array_filter(is_array($seen) ? $seen : [], fn (mixed $at): bool => is_int($at) && $at >= $cutoff);
    }

    private function key(JobSource $source): string
    {
        return "crawler:seen-pages:{$source->id}";
    }
}
