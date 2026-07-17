<?php

use App\Filters\Jobs\JobBrowseFilter;
use App\Filters\Talent\TalentSearchFilter;

/**
 * These assert the generated SQL rather than the returned rows on purpose.
 *
 * The bug is a non-deterministic sort: with ties on the sort column and no
 * unique tiebreaker, each page is a separate LIMIT/OFFSET execution and the
 * engine may order tied rows differently per page, so a row shows up twice
 * while another never shows up at all. MySQL's filesort does this; SQLite --
 * which the suite runs on -- happens to return a stable order, so a behavioural
 * test would pass with or without the fix and prove nothing. Asserting the
 * ORDER BY is the only honest check available here.
 */
it('ends every job sort with a unique tiebreaker', function (?string $sort): void {
    $sql = app(JobBrowseFilter::class)->apply(['sort' => $sort])->toSql();

    expect($sql)->toContain('order by')
        ->and(str_ends_with($sql, '"id" desc') || str_ends_with($sql, '`id` desc'))->toBeTrue();
})->with(['salary_desc', 'salary_asc', 'oldest', 'newest', null]);

it('ends every talent sort with a unique tiebreaker', function (string $sort): void {
    $sql = app(TalentSearchFilter::class)->apply(['sort' => $sort])->toSql();

    expect($sql)->toContain('order by')
        ->and(str_ends_with($sql, '"id" desc') || str_ends_with($sql, '`id` desc'))->toBeTrue();
})->with(['recent', 'completion', 'unknown-falls-to-default']);
