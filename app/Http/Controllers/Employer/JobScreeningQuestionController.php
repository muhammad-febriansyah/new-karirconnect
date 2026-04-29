<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\JobScreeningQuestionRequest;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobScreeningQuestion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class JobScreeningQuestionController extends Controller
{
    public function store(JobScreeningQuestionRequest $request, Job $job): RedirectResponse
    {
        $this->authorizeJob($request, $job);

        $job->screeningQuestions()->create($request->validated());

        return to_route('employer.jobs.show', $job)->with('success', 'Pertanyaan screening berhasil ditambahkan.');
    }

    public function update(JobScreeningQuestionRequest $request, Job $job, JobScreeningQuestion $screeningQuestion): RedirectResponse
    {
        $this->authorizeJob($request, $job);
        abort_unless($screeningQuestion->job_id === $job->id, 404);

        $screeningQuestion->update($request->validated());

        return to_route('employer.jobs.show', $job)->with('success', 'Pertanyaan screening berhasil diperbarui.');
    }

    public function destroy(Request $request, Job $job, JobScreeningQuestion $screeningQuestion): RedirectResponse
    {
        $this->authorizeJob($request, $job);
        abort_unless($screeningQuestion->job_id === $job->id, 404);

        $screeningQuestion->delete();

        return to_route('employer.jobs.show', $job)->with('success', 'Pertanyaan screening berhasil dihapus.');
    }

    private function authorizeJob(Request $request, Job $job): void
    {
        $company = Company::query()->where('owner_id', $request->user()->id)->first();

        abort_unless($company !== null && $job->company_id === $company->id, 404);
    }
}
