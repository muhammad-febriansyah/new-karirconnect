<?php

use App\Actions\Interviews\RescheduleInterviewAction;
use App\Enums\ApplicationStatus;
use App\Enums\InterviewMode;
use App\Enums\InterviewStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Interview;
use App\Models\InterviewParticipant;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use App\Notifications\InterviewRescheduledNotification;
use App\Notifications\InterviewScheduledNotification;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

function makeInterviewContext(): array
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    $candidate = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidate->id]);
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Reviewed,
    ]);

    return compact('owner', 'company', 'job', 'candidate', 'profile', 'application');
}

test('employer can schedule online interview and candidate is notified', function () {
    Notification::fake();
    ['owner' => $owner, 'application' => $application, 'candidate' => $candidate] = makeInterviewContext();

    $this->actingAs($owner)
        ->post(route('employer.interviews.store'), [
            'application_id' => $application->id,
            'stage' => 'hr',
            'mode' => 'online',
            'title' => 'HR Screening Round',
            'scheduled_at' => now()->addDays(3)->setTime(10, 0)->toIso8601String(),
            'duration_minutes' => 45,
            'requires_confirmation' => true,
        ])
        ->assertRedirect();

    $interview = Interview::query()->first();
    expect($interview)->not->toBeNull();
    expect($interview->mode)->toBe(InterviewMode::Online);
    expect($interview->meeting_url)->not->toBeNull();
    expect($interview->participants()->count())->toBe(1); // candidate only
    expect($application->fresh()->status)->toBe(ApplicationStatus::Interview);

    Notification::assertSentTo($candidate, InterviewScheduledNotification::class);
});

test('onsite interview requires location fields', function () {
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();

    $this->actingAs($owner)
        ->post(route('employer.interviews.store'), [
            'application_id' => $application->id,
            'stage' => 'user',
            'mode' => 'onsite',
            'title' => 'Onsite Interview',
            'scheduled_at' => now()->addDays(5)->setTime(14, 0)->toIso8601String(),
        ])
        ->assertSessionHasErrors(['location_name', 'location_address']);
});

test('AI interview can be scheduled without meeting or location', function () {
    Notification::fake();
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();

    $this->actingAs($owner)
        ->post(route('employer.interviews.store'), [
            'application_id' => $application->id,
            'stage' => 'screening',
            'mode' => 'ai',
            'title' => 'AI Pre-Screen',
            'scheduled_at' => now()->addDays(2)->setTime(9, 0)->toIso8601String(),
            'duration_minutes' => 30,
        ])
        ->assertRedirect();

    $interview = Interview::query()->first();
    expect($interview->mode)->toBe(InterviewMode::Ai);
    expect($interview->meeting_url)->toBeNull();
    expect($interview->location_address)->toBeNull();
});

test('cannot schedule conflicting slot for the same candidate', function () {
    ['owner' => $owner, 'application' => $application, 'candidate' => $candidate] = makeInterviewContext();

    $existing = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_at' => now()->addDays(3)->setTime(10, 0),
        'ends_at' => now()->addDays(3)->setTime(11, 0),
        'duration_minutes' => 60,
        'scheduled_by_user_id' => $owner->id,
    ]);
    InterviewParticipant::factory()->create([
        'interview_id' => $existing->id,
        'user_id' => $candidate->id,
        'role' => 'candidate',
    ]);

    $this->actingAs($owner)
        ->post(route('employer.interviews.store'), [
            'application_id' => $application->id,
            'stage' => 'hr',
            'mode' => 'online',
            'title' => 'Conflict Attempt',
            'scheduled_at' => now()->addDays(3)->setTime(10, 30)->toIso8601String(),
            'duration_minutes' => 60,
        ])
        ->assertSessionHasErrors('scheduled_at');
});

test('non-owner employer cannot schedule on another company application', function () {
    $otherOwner = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $otherOwner->id]);
    ['application' => $application] = makeInterviewContext();

    $this->actingAs($otherOwner)
        ->post(route('employer.interviews.store'), [
            'application_id' => $application->id,
            'stage' => 'hr',
            'mode' => 'online',
            'title' => 'Sneaky',
            'scheduled_at' => now()->addDays(2)->toIso8601String(),
        ])
        ->assertNotFound();
});

test('candidate can confirm interview attendance', function () {
    ['owner' => $owner, 'application' => $application, 'candidate' => $candidate] = makeInterviewContext();

    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
    ]);
    $interview->participants()->create([
        'user_id' => $candidate->id,
        'role' => 'candidate',
        'invitation_response' => 'pending',
    ]);

    $this->actingAs($candidate)
        ->post(route('employee.interviews.respond', ['interview' => $interview->id]), ['response' => 'accepted'])
        ->assertRedirect();

    $participant = InterviewParticipant::query()->where('interview_id', $interview->id)->first();
    expect($participant->invitation_response)->toBe('accepted');
    expect($interview->fresh()->confirmed_at)->not->toBeNull();
});

test('candidate can request reschedule with proposed slots', function () {
    ['owner' => $owner, 'application' => $application, 'candidate' => $candidate] = makeInterviewContext();

    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
    ]);
    $interview->participants()->create([
        'user_id' => $candidate->id,
        'role' => 'candidate',
        'invitation_response' => 'pending',
    ]);

    $this->actingAs($candidate)
        ->post(route('employee.interviews.reschedule', ['interview' => $interview->id]), [
            'reason' => 'Bentrok dengan ujian akhir.',
            'proposed_slots' => [
                now()->addDays(7)->setTime(13, 0)->toIso8601String(),
                now()->addDays(8)->setTime(15, 0)->toIso8601String(),
            ],
        ])
        ->assertRedirect();

    expect($interview->rescheduleRequests()->count())->toBe(1);
    $request = $interview->rescheduleRequests()->first();
    expect($request->status)->toBe('pending');
    expect($request->proposed_slots)->toHaveCount(2);
});

test('candidate can view interview detail with company relation loaded', function () {
    ['owner' => $owner, 'application' => $application, 'candidate' => $candidate, 'company' => $company, 'job' => $job] = makeInterviewContext();

    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
        'title' => 'Final Interview',
    ]);

    $this->actingAs($candidate)
        ->get(route('employee.interviews.show', ['interview' => $interview->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('employee/interviews/show')
            ->where('interview.title', 'Final Interview')
            ->where('interview.job.title', $job->title)
            ->where('interview.company.name', $company->name)
        );
});

test('candidate cannot view interview belonging to someone else', function () {
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();
    $otherEmployee = User::factory()->employee()->create();

    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
    ]);

    $this->actingAs($otherEmployee)
        ->get(route('employee.interviews.show', ['interview' => $interview->id]))
        ->assertForbidden();
});

test('employer can cancel interview', function () {
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();
    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
    ]);

    $this->actingAs($owner)
        ->post(route('employer.interviews.cancel', ['interview' => $interview->id]))
        ->assertRedirect();

    expect($interview->fresh()->status)->toBe(InterviewStatus::Cancelled);
});

test('employer can submit scorecard', function () {
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();
    $interview = Interview::factory()->completed()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
    ]);

    $this->actingAs($owner)
        ->post(route('employer.interviews.scorecard', ['interview' => $interview->id]), [
            'overall_score' => 4,
            'recommendation' => 'yes',
            'criteria_scores' => ['technical' => 4, 'communication' => 5],
            'comments' => 'Strong communicator.',
        ])
        ->assertRedirect();

    expect($interview->scorecards()->count())->toBe(1);
    $sc = $interview->scorecards()->first();
    expect($sc->overall_score)->toBe(4);
    expect($sc->reviewer_id)->toBe($owner->id);
});

test('ics download returns calendar file', function () {
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();
    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
    ]);

    $response = $this->actingAs($owner)->get(route('employer.interviews.ics', ['interview' => $interview->id]));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'text/calendar; charset=UTF-8');
    expect($response->getContent())->toContain('BEGIN:VCALENDAR');
    expect($response->getContent())->toContain('SUMMARY:');
});

test('employer kanban groups interviews by status', function () {
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();
    Interview::factory()->create(['application_id' => $application->id, 'scheduled_by_user_id' => $owner->id]);
    Interview::factory()->completed()->create(['application_id' => $application->id, 'scheduled_by_user_id' => $owner->id]);

    $this->actingAs($owner)
        ->get(route('employer.interviews.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('employer/interviews/index'));
});

test('reschedule approval moves interview and notifies candidate', function () {
    Notification::fake();
    ['owner' => $owner, 'application' => $application, 'candidate' => $candidate] = makeInterviewContext();

    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
        'scheduled_at' => now()->addDays(2)->setTime(10, 0),
        'ends_at' => now()->addDays(2)->setTime(11, 0),
    ]);
    $interview->participants()->create(['user_id' => $candidate->id, 'role' => 'candidate']);

    $request = $interview->rescheduleRequests()->create([
        'requested_by_user_id' => $candidate->id,
        'reason' => 'Bentrok',
        'proposed_slots' => [now()->addDays(5)->setTime(13, 0)->toIso8601String()],
        'status' => 'pending',
    ]);

    $newSlot = now()->addDays(5)->setTime(13, 0)->toIso8601String();
    app(RescheduleInterviewAction::class)
        ->approve($request, $owner, $newSlot, 'OK');

    $interview->refresh();
    expect($interview->status)->toBe(InterviewStatus::Rescheduled);
    expect($interview->scheduled_at->format('Y-m-d H:i'))->toBe(now()->addDays(5)->setTime(13, 0)->format('Y-m-d H:i'));

    Notification::assertSentTo($candidate, InterviewRescheduledNotification::class);
});

test('employer can move interview between stages via the kanban endpoint', function () {
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();

    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
        'stage' => 'screening',
    ]);

    $this->actingAs($owner)
        ->post(route('employer.interviews.stage', ['interview' => $interview->id]), ['stage' => 'final'])
        ->assertRedirect();

    expect($interview->fresh()->stage->value)->toBe('final');
});

test('changeStage rejects an unknown stage value', function () {
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();
    $interview = Interview::factory()->create([
        'application_id' => $application->id,
        'scheduled_by_user_id' => $owner->id,
        'stage' => 'hr',
    ]);

    $this->actingAs($owner)
        ->post(route('employer.interviews.stage', ['interview' => $interview->id]), ['stage' => 'not-real-stage'])
        ->assertSessionHasErrors('stage');
});
