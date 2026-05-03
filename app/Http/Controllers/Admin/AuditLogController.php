<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $action = $request->string('action')->toString();
        $userId = $request->integer('user_id') ?: null;
        $from = $request->date('from');
        $to = $request->date('to');

        $logs = AuditLog::query()
            ->with('user:id,name,email,role')
            ->when($action !== '', fn ($q) => $q->where('action', $action))
            ->when($userId !== null, fn ($q) => $q->where('user_id', $userId))
            ->when($from !== null, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to !== null, fn ($q) => $q->where('created_at', '<=', $to->endOfDay()))
            ->latest('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'subject_type' => $log->subject_type ? class_basename($log->subject_type) : null,
                'subject_id' => $log->subject_id,
                'before_values' => $log->before_values,
                'after_values' => $log->after_values,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'created_at' => optional($log->created_at)->toIso8601String(),
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                    'role' => $log->user->role?->value,
                ] : null,
            ]);

        $actionOptions = AuditLog::query()
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action')
            ->map(fn (string $a) => ['value' => $a, 'label' => $a])
            ->all();

        return Inertia::render('admin/audit-logs/index', [
            'logs' => $logs,
            'filters' => [
                'action' => $action,
                'user_id' => $userId,
                'from' => $from?->toDateString(),
                'to' => $to?->toDateString(),
            ],
            'actionOptions' => $actionOptions,
            'totals' => [
                'total' => AuditLog::query()->count(),
                'today' => AuditLog::query()->whereDate('created_at', today())->count(),
                'this_week' => AuditLog::query()->where('created_at', '>=', now()->startOfWeek())->count(),
            ],
        ]);
    }
}
