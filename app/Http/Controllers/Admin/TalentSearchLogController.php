<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TalentSearchLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TalentSearchLogController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TalentSearchLog::query()
            ->with(['company:id,name,slug', 'user:id,name,email'])
            ->latest('searched_at');

        if ($companyId = $request->integer('company_id')) {
            $query->where('company_id', $companyId);
        }
        if ($range = $request->input('range')) {
            $cutoff = match ($range) {
                'today' => now()->startOfDay(),
                'week' => now()->subWeek(),
                'month' => now()->startOfMonth(),
                default => null,
            };
            if ($cutoff) {
                $query->where('searched_at', '>=', $cutoff);
            }
        }

        $logs = $query->paginate(25)->withQueryString();

        $totals = [
            'total' => TalentSearchLog::query()->count(),
            'today' => TalentSearchLog::query()->where('searched_at', '>=', now()->startOfDay())->count(),
            'this_week' => TalentSearchLog::query()->where('searched_at', '>=', now()->subWeek())->count(),
            'this_month' => TalentSearchLog::query()->where('searched_at', '>=', now()->startOfMonth())->count(),
        ];

        $topCompanies = TalentSearchLog::query()
            ->with('company:id,name,slug')
            ->selectRaw('company_id, count(*) as c, coalesce(sum(result_count),0) as r')
            ->groupBy('company_id')
            ->orderByDesc('c')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'company_name' => $row->company?->name ?? '-',
                'company_slug' => $row->company?->slug ?? '',
                'searches' => (int) $row->c,
                'total_results' => (int) $row->r,
            ])
            ->all();

        return Inertia::render('admin/talent-search-logs/index', [
            'filters' => [
                'company_id' => $companyId,
                'range' => $range,
            ],
            'totals' => $totals,
            'top_companies' => $topCompanies,
            'logs' => $logs->through(fn (TalentSearchLog $l) => [
                'id' => $l->id,
                'company_name' => $l->company?->name,
                'company_slug' => $l->company?->slug,
                'user_name' => $l->user?->name,
                'user_email' => $l->user?->email,
                'filters_json' => $l->filters,
                'result_count' => $l->result_count,
                'searched_at' => optional($l->searched_at)->toIso8601String(),
            ]),
        ]);
    }
}
