<?php

namespace App\Services\Talent;

use App\Filters\Talent\TalentSearchFilter;
use App\Models\Company;
use App\Models\TalentSearchLog;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TalentSearchService
{
    public function __construct(private readonly TalentSearchFilter $filter) {}

    /**
     * Run the search and persist a log entry for analytics. Pagination size is
     * fixed (20) so cost-per-search is predictable for billing/audit.
     *
     * @param  array<string, mixed>  $filters
     */
    public function search(Company $company, User $actor, array $filters): LengthAwarePaginator
    {
        $page = $this->filter->apply($filters)
            ->paginate(20)
            ->withQueryString();

        TalentSearchLog::query()->create([
            'company_id' => $company->id,
            'user_id' => $actor->id,
            'filters' => $filters,
            'result_count' => $page->total(),
            'searched_at' => now(),
        ]);

        return $page;
    }
}
