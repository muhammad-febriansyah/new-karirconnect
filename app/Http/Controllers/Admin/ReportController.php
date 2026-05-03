<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReportReviewRequest;
use App\Models\Report;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/reports/index', [
            'items' => Report::query()
                ->with(['reporter:id,name,email', 'reviewer:id,name', 'reportable'])
                ->latest('id')
                ->get()
                ->map(fn (Report $report): array => [
                    'id' => $report->id,
                    'reporter_name' => $report->reporter?->name,
                    'reporter_email' => $report->reporter?->email,
                    'reportable_type' => class_basename((string) $report->reportable_type),
                    'reportable_label' => $this->reportableLabel($report),
                    'reason' => $report->reason,
                    'description' => $report->description,
                    'status' => $report->status,
                    'reviewed_by' => $report->reviewer?->name,
                    'reviewed_at' => optional($report->reviewed_at)->toIso8601String(),
                    'created_at' => optional($report->created_at)->toIso8601String(),
                ]),
        ]);
    }

    public function review(ReportReviewRequest $request, Report $report): RedirectResponse
    {
        $report->update([
            'status' => $request->validated('status'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Laporan berhasil diperbarui.']);

        return to_route('admin.reports.index');
    }

    private function reportableLabel(Report $report): string
    {
        $reportable = $report->reportable;

        if ($reportable === null) {
            return 'Data tidak ditemukan';
        }

        if (property_exists($reportable, 'title') || isset($reportable->title)) {
            return (string) $reportable->title;
        }

        if (property_exists($reportable, 'name') || isset($reportable->name)) {
            return (string) $reportable->name;
        }

        return '#'.$reportable->getKey();
    }
}
