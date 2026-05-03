<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiAuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiAuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $query = AiAuditLog::query()
            ->with('user:id,name,email')
            ->latest('id');

        if ($feature = $request->input('feature')) {
            $query->where('feature', $feature);
        }
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($provider = $request->input('provider')) {
            $query->where('provider', $provider);
        }
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search): void {
                $q->where('model', 'like', '%'.$search.'%')
                    ->orWhereHas('user', fn ($u) => $u->where('email', 'like', '%'.$search.'%')->orWhere('name', 'like', '%'.$search.'%'));
            });
        }

        $logs = $query->paginate(25)->withQueryString();

        $totals = [
            'total' => AiAuditLog::query()->count(),
            'this_month' => AiAuditLog::query()->where('created_at', '>=', now()->startOfMonth())->count(),
            'success' => AiAuditLog::query()->where('status', 'success')->count(),
            'failed' => AiAuditLog::query()->where('status', 'failed')->count(),
            'total_cost_usd' => round((float) AiAuditLog::query()->sum('total_cost_usd'), 4),
            'total_tokens' => (int) AiAuditLog::query()->selectRaw('coalesce(sum(prompt_tokens),0) + coalesce(sum(completion_tokens),0) as t')->value('t'),
        ];

        $byFeature = AiAuditLog::query()
            ->selectRaw('feature, count(*) as c, coalesce(sum(total_cost_usd),0) as cost')
            ->groupBy('feature')
            ->get()
            ->map(fn ($r) => ['feature' => $r->feature, 'count' => (int) $r->c, 'cost' => round((float) $r->cost, 4)])
            ->all();

        return Inertia::render('admin/ai-audit-logs/index', [
            'filters' => [
                'feature' => $feature,
                'status' => $status,
                'provider' => $provider,
                'search' => $search,
            ],
            'totals' => $totals,
            'by_feature' => $byFeature,
            'logs' => $logs->through(fn (AiAuditLog $l) => [
                'id' => $l->id,
                'user_name' => $l->user?->name,
                'user_email' => $l->user?->email,
                'feature' => $l->feature,
                'provider' => $l->provider,
                'model' => $l->model,
                'status' => $l->status,
                'prompt_tokens' => $l->prompt_tokens,
                'completion_tokens' => $l->completion_tokens,
                'total_cost_usd' => $l->total_cost_usd,
                'latency_ms' => $l->latency_ms,
                'error_message' => $l->error_message,
                'created_at' => optional($l->created_at)->toIso8601String(),
            ]),
        ]);
    }

    public function show(Request $request, AiAuditLog $log): Response
    {
        $log->loadMissing('user:id,name,email');

        return Inertia::render('admin/ai-audit-logs/show', [
            'log' => [
                'id' => $log->id,
                'user_name' => $log->user?->name,
                'user_email' => $log->user?->email,
                'feature' => $log->feature,
                'provider' => $log->provider,
                'model' => $log->model,
                'status' => $log->status,
                'prompt_tokens' => $log->prompt_tokens,
                'completion_tokens' => $log->completion_tokens,
                'total_cost_usd' => $log->total_cost_usd,
                'latency_ms' => $log->latency_ms,
                'error_message' => $log->error_message,
                'input_json' => $log->input_json,
                'output_json' => $log->output_json,
                'created_at' => optional($log->created_at)->toIso8601String(),
            ],
        ]);
    }
}
