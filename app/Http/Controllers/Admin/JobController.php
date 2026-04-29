<?php

namespace App\Http\Controllers\Admin;

use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Models\Job;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class JobController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = $request->string('status')->toString();
        $search = $request->string('search')->toString();

        $jobs = Job::query()
            ->with(['company:id,name', 'category:id,name', 'postedBy:id,name,email'])
            ->when($statusFilter !== '', fn ($query) => $query->where('status', $statusFilter))
            ->when($search !== '', fn ($query) => $query->where('title', 'like', "%{$search}%"))
            ->latest('published_at')
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/jobs/index', [
            'jobs' => $jobs,
            'filters' => [
                'status' => $statusFilter,
                'search' => $search,
            ],
            'statusOptions' => JobStatus::selectItems(),
        ]);
    }

    public function show(Job $job): Response
    {
        $job->load([
            'company:id,name',
            'postedBy:id,name,email',
            'category:id,name',
            'city:id,name',
            'skills:id,name',
            'screeningQuestions',
        ]);

        return Inertia::render('admin/jobs/show', [
            'job' => [
                'id' => $job->id,
                'title' => $job->title,
                'slug' => $job->slug,
                'status' => $job->status?->value,
                'employment_type' => $job->employment_type?->value,
                'work_arrangement' => $job->work_arrangement?->value,
                'experience_level' => $job->experience_level?->value,
                'salary_min' => $job->salary_min,
                'salary_max' => $job->salary_max,
                'is_salary_visible' => $job->is_salary_visible,
                'is_anonymous' => $job->is_anonymous,
                'is_featured' => $job->is_featured,
                'application_deadline' => optional($job->application_deadline)->toDateString(),
                'views_count' => $job->views_count,
                'applications_count' => $job->applications_count,
                'company' => $job->company ? ['id' => $job->company->id, 'name' => $job->company->name] : null,
                'posted_by' => $job->postedBy ? ['id' => $job->postedBy->id, 'name' => $job->postedBy->name, 'email' => $job->postedBy->email] : null,
                'category' => $job->category ? ['id' => $job->category->id, 'name' => $job->category->name] : null,
                'city' => $job->city ? ['id' => $job->city->id, 'name' => $job->city->name] : null,
                'skills' => $job->skills->map(fn ($skill) => ['id' => $skill->id, 'name' => $skill->name])->values(),
                'description' => $job->description,
                'responsibilities' => $job->responsibilities,
                'requirements' => $job->requirements,
                'benefits' => $job->benefits,
                'screening_questions' => $job->screeningQuestions->map(fn ($question) => [
                    'id' => $question->id,
                    'question' => $question->question,
                    'type' => $question->type?->value,
                    'is_required' => $question->is_required,
                    'order_number' => $question->order_number,
                ])->values(),
            ],
            'statusOptions' => JobStatus::selectItems(),
        ]);
    }

    public function update(Request $request, Job $job): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(JobStatus::values())],
            'is_featured' => ['required', 'boolean'],
        ]);

        $job->fill([
            'status' => $data['status'],
            'is_featured' => $data['is_featured'],
            'featured_until' => $data['is_featured'] ? now()->addDays(30) : null,
        ])->save();

        return back()->with('success', 'Lowongan berhasil diperbarui.');
    }
}
