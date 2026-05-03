<?php

use App\Enums\AiInterviewStatus;
use App\Enums\ExperienceLevel;
use App\Jobs\AnalyzeAiInterviewJob;
use App\Jobs\RecomputeMatchScoresForJobJob;
use App\Jobs\RecomputeMatchScoresForProfileJob;
use App\Jobs\SyncApplicationMatchScoreJob;
use App\Models\AiInterviewSession;
use App\Models\AiMatchScore;
use App\Models\Application;
use App\Models\City;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Notifications\AiInterviewCompletedNotification;
use App\Services\Ai\AiInterviewAnalysisService;
use App\Services\Applications\ApplicationService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

describe('JobObserver → RecomputeMatchScoresForJobJob', function () {
    it('dispatches recompute when salary_min changes on a job with applicants', function () {
        Bus::fake();

        $job = Job::factory()->published()->create([
            'salary_min' => 5_000_000,
            'applications_count' => 0,
        ]);
        Application::factory()->create(['job_id' => $job->id]);
        // Refresh applications_count via increment, mirroring the production path.
        $job->newQuery()->whereKey($job->id)->increment('applications_count');
        $job->refresh();

        $job->forceFill(['salary_min' => 9_000_000])->save();

        Bus::assertDispatched(RecomputeMatchScoresForJobJob::class, function ($dispatched) use ($job) {
            return $dispatched->jobId === $job->id;
        });
    });

    it('skips dispatch when no applicants exist', function () {
        Bus::fake();

        $job = Job::factory()->published()->create(['applications_count' => 0]);

        $job->forceFill(['salary_min' => 7_500_000])->save();

        Bus::assertNotDispatched(RecomputeMatchScoresForJobJob::class);
    });

    it('skips dispatch when an irrelevant field changes', function () {
        Bus::fake();

        $job = Job::factory()->published()->create(['applications_count' => 1]);

        // is_featured isn't part of MATCH_RELEVANT_FIELDS.
        $job->forceFill(['is_featured' => true])->save();

        Bus::assertNotDispatched(RecomputeMatchScoresForJobJob::class);
    });

    it('also dispatches on city_id change because location is part of the match', function () {
        Bus::fake();

        $city = City::factory()->create();
        $job = Job::factory()->published()->create([
            'city_id' => null,
            'applications_count' => 1,
        ]);

        $job->forceFill(['city_id' => null])->save(); // no-op
        Bus::assertNotDispatched(RecomputeMatchScoresForJobJob::class);

        $job->forceFill(['city_id' => $city->id])->save(); // actually changes
        Bus::assertDispatched(RecomputeMatchScoresForJobJob::class);
    });
});

describe('EmployeeProfileObserver → RecomputeMatchScoresForProfileJob', function () {
    it('dispatches recompute when experience_level changes on a profile with applications', function () {
        Bus::fake();

        $profile = EmployeeProfile::factory()->create(['experience_level' => ExperienceLevel::Junior]);
        Application::factory()->create(['employee_profile_id' => $profile->id]);

        $profile->forceFill(['experience_level' => ExperienceLevel::Senior])->save();

        Bus::assertDispatched(RecomputeMatchScoresForProfileJob::class, function ($dispatched) use ($profile) {
            return $dispatched->employeeProfileId === $profile->id;
        });
    });

    it('skips dispatch when the profile has no open applications', function () {
        Bus::fake();

        $profile = EmployeeProfile::factory()->create(['experience_level' => ExperienceLevel::Junior]);

        $profile->forceFill(['experience_level' => ExperienceLevel::Mid])->save();

        Bus::assertNotDispatched(RecomputeMatchScoresForProfileJob::class);
    });

    it('skips dispatch on irrelevant profile field changes', function () {
        Bus::fake();

        $profile = EmployeeProfile::factory()->create(['headline' => 'before']);
        Application::factory()->create(['employee_profile_id' => $profile->id]);

        $profile->forceFill(['headline' => 'after'])->save();

        Bus::assertNotDispatched(RecomputeMatchScoresForProfileJob::class);
    });
});

describe('SyncApplicationMatchScoreJob handle()', function () {
    it('actually recomputes and persists the match score for the application', function () {
        Queue::fake();

        $application = Application::factory()->create();

        // Dispatch goes to the fake queue.
        SyncApplicationMatchScoreJob::dispatch($application->id);
        Queue::assertPushed(SyncApplicationMatchScoreJob::class);

        // Now run the job's handle() directly to exercise the service it depends on.
        $job = new SyncApplicationMatchScoreJob($application->id);
        $job->handle(app(ApplicationService::class));

        $application->refresh();
        expect($application->ai_match_score)->not->toBeNull()
            ->and($application->ai_match_score)->toBeInt()
            ->toBeGreaterThanOrEqual(0)
            ->toBeLessThanOrEqual(100);

        // ApplicationService::syncMatchScore writes to ai_match_scores too via cache().
        expect(AiMatchScore::query()
            ->where('job_id', $application->job_id)
            ->where('candidate_profile_id', $application->employee_profile_id)
            ->exists())->toBeTrue();
    });

    it('is a no-op when the application id no longer exists', function () {
        $job = new SyncApplicationMatchScoreJob(999_999);

        // Should not throw.
        $job->handle(app(ApplicationService::class));

        expect(true)->toBeTrue();
    });
});

describe('RecomputeMatchScoresForJobJob handle()', function () {
    it('fans out a SyncApplicationMatchScoreJob for every application on the job', function () {
        Bus::fake();

        $job = Job::factory()->published()->create();
        $appA = Application::factory()->create(['job_id' => $job->id]);
        $appB = Application::factory()->create(['job_id' => $job->id]);
        Application::factory()->create(); // unrelated, must NOT be touched

        (new RecomputeMatchScoresForJobJob($job->id))->handle();

        Bus::assertDispatchedTimes(SyncApplicationMatchScoreJob::class, 2);
        Bus::assertDispatched(SyncApplicationMatchScoreJob::class, fn ($d) => $d->applicationId === $appA->id);
        Bus::assertDispatched(SyncApplicationMatchScoreJob::class, fn ($d) => $d->applicationId === $appB->id);
    });

    it('dispatches nothing when the job has no applicants', function () {
        Bus::fake();

        $job = Job::factory()->published()->create();

        (new RecomputeMatchScoresForJobJob($job->id))->handle();

        Bus::assertNotDispatched(SyncApplicationMatchScoreJob::class);
    });
});

describe('RecomputeMatchScoresForProfileJob handle()', function () {
    it('fans out a SyncApplicationMatchScoreJob for every application the profile owns', function () {
        Bus::fake();

        $profile = EmployeeProfile::factory()->create();
        $appA = Application::factory()->create(['employee_profile_id' => $profile->id]);
        $appB = Application::factory()->create(['employee_profile_id' => $profile->id]);
        Application::factory()->create(); // unrelated

        (new RecomputeMatchScoresForProfileJob($profile->id))->handle();

        Bus::assertDispatchedTimes(SyncApplicationMatchScoreJob::class, 2);
        Bus::assertDispatched(SyncApplicationMatchScoreJob::class, fn ($d) => $d->applicationId === $appA->id);
        Bus::assertDispatched(SyncApplicationMatchScoreJob::class, fn ($d) => $d->applicationId === $appB->id);
    });
});

describe('AnalyzeAiInterviewJob handle()', function () {
    it('runs the analyzer and notifies the company owner on a real (non-practice) session', function () {
        Notification::fake();

        $application = Application::factory()->create();
        $session = AiInterviewSession::factory()->create([
            'application_id' => $application->id,
            'candidate_profile_id' => $application->employee_profile_id,
            'job_id' => $application->job_id,
            'status' => AiInterviewStatus::Completed,
            'is_practice' => false,
        ]);

        (new AnalyzeAiInterviewJob($session->id))->handle(app(AiInterviewAnalysisService::class));

        $owner = $session->fresh(['job.company.owner'])->job->company->owner;
        Notification::assertSentTo($owner, AiInterviewCompletedNotification::class);
    });

    it('skips the notification on a practice session', function () {
        Notification::fake();

        $session = AiInterviewSession::factory()->create([
            'is_practice' => true,
            'status' => AiInterviewStatus::Completed,
        ]);

        (new AnalyzeAiInterviewJob($session->id))->handle(app(AiInterviewAnalysisService::class));

        Notification::assertNothingSent();
    });

    it('is a no-op when the session id no longer exists', function () {
        Notification::fake();

        (new AnalyzeAiInterviewJob(999_999))->handle(app(AiInterviewAnalysisService::class));

        Notification::assertNothingSent();
        expect(true)->toBeTrue();
    });
});
