<?php

namespace App\Services\Crawler;

use Carbon\CarbonImmutable;
use Throwable;

/**
 * Business checks on one item from the worker. The worker already did the
 * technical checks; this re-checks what Laravel stores, because the worker's
 * output is treated as untrusted input like any other.
 */
class ResultValidator
{
    private const MAX_TITLE = 180;

    private const MAX_EXTERNAL_ID = 191;

    /**
     * Problems with the item; an empty list means it may be stored.
     *
     * @param  array<string, mixed>  $item
     * @return list<string>
     */
    public function problems(array $item): array
    {
        $problems = [];

        $externalId = $item['external_id'] ?? null;
        if (! is_string($externalId) || trim($externalId) === '' || mb_strlen($externalId) > self::MAX_EXTERNAL_ID) {
            $problems[] = 'external_id kosong atau terlalu panjang';
        }

        $title = $this->title($item);
        if ($title === '') {
            $problems[] = 'judul kosong';
        } elseif (mb_strlen($title) > self::MAX_TITLE) {
            $problems[] = 'judul lebih dari '.self::MAX_TITLE.' karakter';
        }

        if (! self::isHttpUrl($item['apply_url'] ?? null)) {
            $problems[] = 'apply_url bukan URL http(s) yang valid';
        }

        foreach (['published_at', 'application_deadline'] as $field) {
            if (isset($item[$field]) && self::date($item[$field]) === null) {
                $problems[] = "{$field} bukan tanggal yang valid";
            }
        }

        $salary = $item['salary'] ?? null;
        if (is_array($salary)) {
            $min = $salary['min'] ?? null;
            $max = $salary['max'] ?? null;
            if (($min !== null && (! is_int($min) || $min < 0)) || ($max !== null && (! is_int($max) || $max < 0))) {
                $problems[] = 'gaji tidak valid';
            } elseif ($min !== null && $max !== null && $min > $max) {
                $problems[] = 'gaji minimum lebih besar dari maksimum';
            }
        }

        return $problems;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    public function title(array $item): string
    {
        $title = $item['title'] ?? '';

        return is_string($title) ? trim(html_entity_decode(strip_tags($title), ENT_QUOTES | ENT_HTML5)) : '';
    }

    public static function isHttpUrl(mixed $value): bool
    {
        if (! is_string($value) || mb_strlen($value) > 2048) {
            return false;
        }

        $parts = parse_url($value);

        return $parts !== false
            && in_array($parts['scheme'] ?? null, ['http', 'https'], true)
            && filled($parts['host'] ?? null);
    }

    public static function date(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            $date = CarbonImmutable::parse($value);
        } catch (Throwable) {
            return null;
        }

        // Guard against parse accidents like year 0001 or 9999.
        return $date->year >= 2000 && $date->year <= 2100 ? $date : null;
    }
}
