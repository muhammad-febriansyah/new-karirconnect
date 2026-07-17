<?php

use App\Enums\InterviewStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Interview;
use App\Models\InterviewParticipant;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
    Notification::fake();
});

function ivToken(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

/**
 * A scheduled interview plus everyone attached to it.
 *
 * @return array{employer: User, candidate: User, interview: Interview, application: Application}
 */
function scheduledInterview(): array
{
    $employer = User::factory()->employer()->create(['password' => 'password']);
    $company = Company::factory()->approved()->create([
        'owner_id' => $employer->id,
        'onboarding_completed_at' => now(),
    ]);

    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $employer->id,
        'job_category_id' => JobCategory::query()->value('id'),
    ]);

    $candidate = User::factory()->employee()->create(['password' => 'password']);
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidate->id]);

    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
    ]);

    // ends_at must be set alongside scheduled_at. The factory derives ends_at
    // from its own random start, so overriding only scheduled_at would leave
    // the two unrelated -- a row that cannot occur in production, where every
    // writer sets ends_at to start + duration. Conflict detection keys on that
    // relationship.
    $start = now()->addWeek();
    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $employer->id,
        'scheduled_at' => $start,
        'ends_at' => $start->copy()->addMinutes(60),
        'duration_minutes' => 60,
        'status' => InterviewStatus::Scheduled,
    ]);

    InterviewParticipant::factory()->create([
        'interview_id' => $interview->id,
        'user_id' => $candidate->id,
        'role' => 'candidate',
    ]);

    return compact('employer', 'candidate', 'interview', 'application');
}

describe('candidate interviews', function (): void {
    it('lists my interviews', function (): void {
        ['candidate' => $candidate] = scheduledInterview();

        $this->withHeaders(ivToken($candidate))
            ->getJson('/api/v1/interviews')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure(['data' => [['id', 'stage', 'mode', 'status', 'scheduled_at', 'job']]]);
    });

    it('does not leak another candidate interviews', function (): void {
        scheduledInterview();
        $outsider = User::factory()->employee()->create(['password' => 'password']);
        EmployeeProfile::factory()->create(['user_id' => $outsider->id]);

        $response = $this->withHeaders(ivToken($outsider))->getJson('/api/v1/interviews')->assertOk();

        expect($response->json('data'))->toHaveCount(0);
    });

    it('403s on another candidate interview detail', function (): void {
        ['interview' => $interview] = scheduledInterview();
        $outsider = User::factory()->employee()->create(['password' => 'password']);
        EmployeeProfile::factory()->create(['user_id' => $outsider->id]);

        $this->withHeaders(ivToken($outsider))
            ->getJson('/api/v1/interviews/'.$interview->id)
            ->assertStatus(403);
    });

    it('accepts an invitation and confirms the interview', function (): void {
        ['candidate' => $candidate, 'interview' => $interview] = scheduledInterview();

        $this->withHeaders(ivToken($candidate))
            ->postJson('/api/v1/interviews/'.$interview->id.'/respond', ['response' => 'accepted'])
            ->assertOk();

        expect($interview->fresh()->confirmed_at)->not->toBeNull();

        $this->assertDatabaseHas('interview_participants', [
            'interview_id' => $interview->id,
            'user_id' => $candidate->id,
            'invitation_response' => 'accepted',
        ]);
    });

    it('does not move confirmed_at when accepting twice', function (): void {
        ['candidate' => $candidate, 'interview' => $interview] = scheduledInterview();
        $headers = ivToken($candidate);

        $this->withHeaders($headers)
            ->postJson('/api/v1/interviews/'.$interview->id.'/respond', ['response' => 'accepted'])->assertOk();

        $first = $interview->fresh()->confirmed_at;

        $this->withHeaders($headers)
            ->postJson('/api/v1/interviews/'.$interview->id.'/respond', ['response' => 'accepted'])->assertOk();

        expect($interview->fresh()->confirmed_at->toIso8601String())->toBe($first->toIso8601String());
    });

    it('rejects an unknown response value', function (): void {
        ['candidate' => $candidate, 'interview' => $interview] = scheduledInterview();

        $this->withHeaders(ivToken($candidate))
            ->postJson('/api/v1/interviews/'.$interview->id.'/respond', ['response' => 'maybe-later'])
            ->assertStatus(422);
    });

    it('requests a reschedule', function (): void {
        ['candidate' => $candidate, 'interview' => $interview] = scheduledInterview();

        $this->withHeaders(ivToken($candidate))
            ->postJson('/api/v1/interviews/'.$interview->id.'/reschedule', [
                'reason' => 'Bentrok dengan jadwal lain.',
                'proposed_slots' => [now()->addWeeks(2)->toIso8601String()],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('interview_reschedule_requests', ['interview_id' => $interview->id]);
    });

    it('rejects a reschedule slot in the past', function (): void {
        ['candidate' => $candidate, 'interview' => $interview] = scheduledInterview();

        $this->withHeaders(ivToken($candidate))
            ->postJson('/api/v1/interviews/'.$interview->id.'/reschedule', [
                'reason' => 'Bentrok.',
                'proposed_slots' => [now()->subDay()->toIso8601String()],
            ])
            ->assertStatus(422);
    });
});

describe('employer interviews', function (): void {
    it('lists interviews for this company', function (): void {
        ['employer' => $employer] = scheduledInterview();

        $this->withHeaders(ivToken($employer))
            ->getJson('/api/v1/employer/interviews')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    });

    it('schedules an interview for its own applicant', function (): void {
        ['employer' => $employer, 'application' => $application] = scheduledInterview();

        $this->withHeaders(ivToken($employer))
            ->postJson('/api/v1/employer/interviews', [
                'application_id' => $application->id,
                'stage' => 'hr',
                'mode' => 'online',
                'title' => 'HR Interview',
                // Clear of the fixture's existing slot at +1 week: the
                // scheduler rejects overlapping interviews for the same
                // candidate, which the next test pins down.
                'scheduled_at' => now()->addWeeks(3)->toIso8601String(),
                'meeting_url' => 'https://meet.example.test/abc',
            ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'HR Interview');
    });

    it('refuses a slot that clashes with the candidate existing interview', function (): void {
        ['employer' => $employer, 'application' => $application, 'interview' => $existing] = scheduledInterview();

        $this->withHeaders(ivToken($employer))
            ->postJson('/api/v1/employer/interviews', [
                'application_id' => $application->id,
                'stage' => 'technical',
                'mode' => 'online',
                'title' => 'Clashing',
                'scheduled_at' => $existing->scheduled_at->toIso8601String(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('scheduled_at');
    });

    it('cannot schedule against another company application', function (): void {
        // ScheduleInterviewRequest validates application_id with a bare exists
        // rule; the ownership scope has to hold this line.
        ['application' => $victimApplication] = scheduledInterview();

        $outsider = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $outsider->id,
            'onboarding_completed_at' => now(),
        ]);

        $this->withHeaders(ivToken($outsider))
            ->postJson('/api/v1/employer/interviews', [
                'application_id' => $victimApplication->id,
                'stage' => 'hr',
                'mode' => 'online',
                'title' => 'Hijacked',
                'scheduled_at' => now()->addWeek()->toIso8601String(),
            ])
            ->assertStatus(404);

        $this->assertDatabaseMissing('interviews', ['title' => 'Hijacked']);
    });

    it('marks an interview completed', function (): void {
        ['employer' => $employer, 'interview' => $interview] = scheduledInterview();

        $this->withHeaders(ivToken($employer))
            ->postJson('/api/v1/employer/interviews/'.$interview->id.'/status', ['status' => 'completed'])
            ->assertOk();

        expect($interview->fresh()->status)->toBe(InterviewStatus::Completed);
    });

    it('cancels an interview with a note', function (): void {
        ['employer' => $employer, 'interview' => $interview] = scheduledInterview();

        $this->withHeaders(ivToken($employer))
            ->postJson('/api/v1/employer/interviews/'.$interview->id.'/status', [
                'status' => 'cancelled',
                'note' => 'Posisi ditutup.',
            ])
            ->assertOk();

        expect($interview->fresh()->status)->toBe(InterviewStatus::Cancelled);
    });

    it('403s changing status on another company interview', function (): void {
        ['interview' => $interview] = scheduledInterview();

        $outsider = User::factory()->employer()->create(['password' => 'password']);
        Company::factory()->approved()->create([
            'owner_id' => $outsider->id,
            'onboarding_completed_at' => now(),
        ]);

        $this->withHeaders(ivToken($outsider))
            ->postJson('/api/v1/employer/interviews/'.$interview->id.'/status', ['status' => 'cancelled'])
            ->assertStatus(403);

        expect($interview->fresh()->status)->toBe(InterviewStatus::Scheduled);
    });
});

it('lists interviews across several jobs without lazy loading the company', function (): void {
    // Regression: InterviewResource renders job.company->name, but the employer
    // list only eager-loaded as far as application.job -- so the company was
    // fetched once per row. The candidate-side controller loaded it correctly,
    // which is what marked this as an oversight rather than a choice.
    //
    // preventLazyLoading is on outside production, so the old code raises
    // LazyLoadingViolationException here and this test fails. In production the
    // same code silently issued one extra query per interview instead.
    ['employer' => $employer] = scheduledInterview();
    $company = Company::query()->where('owner_id', $employer->id)->first();

    foreach (range(1, 3) as $i) {
        $job = Job::factory()->published()->create([
            'company_id' => $company->id,
            'posted_by_user_id' => $employer->id,
            'job_category_id' => JobCategory::query()->value('id'),
        ]);
        $profile = EmployeeProfile::factory()->create([
            'user_id' => User::factory()->employee()->create()->id,
        ]);
        Interview::factory()->create([
            'application_id' => Application::factory()->create([
                'job_id' => $job->id,
                'employee_profile_id' => $profile->id,
            ])->id,
            'scheduled_by_user_id' => $employer->id,
            'scheduled_at' => now()->addWeeks(1 + $i),
            'status' => InterviewStatus::Scheduled,
        ]);
    }

    $this->withHeaders(ivToken($employer))
        ->getJson('/api/v1/employer/interviews')
        ->assertOk()
        ->assertJsonCount(4, 'data')
        ->assertJsonPath('data.0.job.company', $company->name);
});
