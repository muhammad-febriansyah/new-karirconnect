<?php

namespace App\Http\Controllers\Employee;

use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Models\Job;
use App\Models\SavedJob;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SavedJobController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $items = $request->user()
            ->savedJobs()
            ->with(['job.company:id,name', 'job.category:id,name', 'job.city:id,name'])
            ->whereHas('job', function ($query) use ($search): void {
                if ($search === '') {
                    return;
                }

                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('title', 'like', "%{$search}%")
                        ->orWhereHas('company', fn ($companyQuery) => $companyQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('category', fn ($categoryQuery) => $categoryQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('city', fn ($cityQuery) => $cityQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (SavedJob $savedJob) => [
                'id' => $savedJob->id,
                'job' => [
                    'id' => $savedJob->job->id,
                    'slug' => $savedJob->job->slug,
                    'title' => $savedJob->job->title,
                    'status' => $savedJob->job->status?->value,
                    'employment_type' => $savedJob->job->employment_type?->value,
                    'work_arrangement' => $savedJob->job->work_arrangement?->value,
                    'company_name' => $savedJob->job->company?->name,
                    'category_name' => $savedJob->job->category?->name,
                    'city_name' => $savedJob->job->city?->name,
                    'application_deadline' => optional($savedJob->job->application_deadline)->toDateString(),
                ],
                'saved_at' => optional($savedJob->created_at)->toIso8601String(),
            ]);

        return Inertia::render('employee/saved-jobs/index', [
            'filters' => [
                'search' => $search,
            ],
            'items' => $items,
        ]);
    }

    public function store(Request $request, Job $job): RedirectResponse
    {
        abort_unless($job->status === JobStatus::Published, 422, 'Hanya lowongan aktif yang bisa disimpan.');

        $request->user()->savedJobs()->firstOrCreate([
            'job_id' => $job->id,
        ]);

        return back()->with('success', 'Lowongan berhasil disimpan.');
    }

    public function destroy(Request $request, Job $job): RedirectResponse
    {
        $request->user()->savedJobs()
            ->where('job_id', $job->id)
            ->delete();

        return back()->with('success', 'Lowongan tersimpan berhasil dihapus.');
    }
}
