<?php

use App\Actions\Interviews\RescheduleInterviewAction;
use App\Enums\ApplicationStatus;
use App\Enums\InterviewMode;
use App\Enums\InterviewStatus;
use App\Models\AiInterviewSession;
use App\Models\AiInterviewTemplate;
use App\Models\AiInterviewTemplateQuestion;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyMember;
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

test('AI interview can be scheduled with a template that has questions', function () {
    Notification::fake();
    ['owner' => $owner, 'company' => $company, 'application' => $application] = makeInterviewContext();

    $template = AiInterviewTemplate::factory()->create([
        'company_id' => $company->id,
        'mode' => 'text',
    ]);
    AiInterviewTemplateQuestion::factory()->create(['template_id' => $template->id, 'order_number' => 1]);

    $this->actingAs($owner)
        ->post(route('employer.interviews.store'), [
            'application_id' => $application->id,
            'stage' => 'screening',
            'mode' => 'ai',
            'title' => 'AI Pre-Screen',
            'scheduled_at' => now()->addDays(2)->setTime(9, 0)->toIso8601String(),
            'duration_minutes' => 30,
            'ai_template_id' => $template->id,
        ])
        ->assertRedirect();

    $interview = Interview::query()->first();
    expect($interview->mode)->toBe(InterviewMode::Ai);
    expect($interview->meeting_url)->toBeNull();
    expect($interview->location_address)->toBeNull();

    // Session juga dibuat & terhubung dengan template
    $session = AiInterviewSession::query()->where('application_id', $application->id)->first();
    expect($session)->not->toBeNull();
    expect($session->template_id)->toBe($template->id);
});

test('AI interview cannot be scheduled without a template', function () {
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
        ->assertSessionHasErrors(['ai_template_id']);

    expect(Interview::query()->count())->toBe(0);
});

test('AI interview cannot be scheduled when template has no questions', function () {
    ['owner' => $owner, 'company' => $company, 'application' => $application] = makeInterviewContext();

    $template = AiInterviewTemplate::factory()->create([
        'company_id' => $company->id,
        'mode' => 'text',
    ]);
    // No questions

    $this->actingAs($owner)
        ->post(route('employer.interviews.store'), [
            'application_id' => $application->id,
            'stage' => 'screening',
            'mode' => 'ai',
            'title' => 'AI Pre-Screen',
            'scheduled_at' => now()->addDays(2)->setTime(9, 0)->toIso8601String(),
            'duration_minutes' => 30,
            'ai_template_id' => $template->id,
        ])
        ->assertSessionHasErrors(['ai_template_id']);

    expect(Interview::query()->count())->toBe(0);
});

test('AI interview cannot use template from another company', function () {
    ['owner' => $owner, 'application' => $application] = makeInterviewContext();

    $otherCompany = Company::factory()->approved()->create([
        'owner_id' => User::factory()->employer()->create()->id,
    ]);
    $foreign = AiInterviewTemplate::factory()->create(['company_id' => $otherCompany->id, 'mode' => 'text']);
    AiInterviewTemplateQuestion::factory()->create(['template_id' => $foreign->id]);

    $this->actingAs($owner)
        ->post(route('employer.interviews.store'), [
            'application_id' => $application->id,
            'stage' => 'screening',
            'mode' => 'ai',
            'title' => 'AI Pre-Screen',
            'scheduled_at' => now()->addDays(2)->setTime(9, 0)->toIso8601String(),
            'duration_minutes' => 30,
            'ai_template_id' => $foreign->id,
        ])
        ->assertSessionHasErrors(['ai_template_id']);
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

test('employer can bulk schedule interviews in sequential mode', function () {
    Notification::fake();

    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);

    $applicationIds = collect(range(1, 3))->map(function () use ($job) {
        $candidate = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $candidate->id]);

        return Application::factory()->create([
            'job_id' => $job->id,
            'employee_profile_id' => $profile->id,
            'status' => ApplicationStatus::Reviewed,
        ])->id;
    })->all();

    $start = now()->addDays(2)->setTime(9, 0);

    $this->actingAs($owner)
        ->post(route('employer.interviews.bulk.store'), [
            'application_ids' => $applicationIds,
            'stage' => 'hr',
            'mode' => 'online',
            'title' => 'HR Screening Bulk',
            'start_at' => $start->toIso8601String(),
            'duration_minutes' => 30,
            'gap_minutes' => 5,
            'group_mode' => false,
            'requires_confirmation' => true,
        ])
        ->assertRedirect(route('employer.interviews.index'));

    expect(Interview::query()->count())->toBe(3);

    $interviews = Interview::query()->orderBy('scheduled_at')->get();
    // Slot 0, 35min, 70min apart (duration 30 + gap 5)
    expect((int) abs($interviews[1]->scheduled_at->diffInMinutes($interviews[0]->scheduled_at)))->toBe(35);
    expect((int) abs($interviews[2]->scheduled_at->diffInMinutes($interviews[1]->scheduled_at)))->toBe(35);
});

test('employer can bulk schedule interviews in group mode (same slot)', function () {
    Notification::fake();

    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);

    $applicationIds = collect(range(1, 3))->map(function () use ($job) {
        $candidate = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $candidate->id]);

        return Application::factory()->create([
            'job_id' => $job->id,
            'employee_profile_id' => $profile->id,
            'status' => ApplicationStatus::Reviewed,
        ])->id;
    })->all();

    $start = now()->addDays(3)->setTime(14, 0);

    $this->actingAs($owner)
        ->post(route('employer.interviews.bulk.store'), [
            'application_ids' => $applicationIds,
            'stage' => 'final',
            'mode' => 'online',
            'title' => 'Final Group Panel',
            'start_at' => $start->toIso8601String(),
            'duration_minutes' => 60,
            'gap_minutes' => 0,
            'group_mode' => true,
        ])
        ->assertRedirect(route('employer.interviews.index'));

    $interviews = Interview::query()->get();
    expect($interviews)->toHaveCount(3);

    // All three at the same slot
    $first = $interviews->first()->scheduled_at;
    $interviews->each(function ($i) use ($first) {
        expect($i->scheduled_at->equalTo($first))->toBeTrue();
    });
});

test('bulk schedule rejects applications from another company', function () {
    Notification::fake();

    $owner = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $owner->id]);

    // Application owned by a different company
    $otherOwner = User::factory()->employer()->create();
    $otherCompany = Company::factory()->approved()->create(['owner_id' => $otherOwner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $otherJob = Job::factory()->published()->create([
        'company_id' => $otherCompany->id,
        'posted_by_user_id' => $otherOwner->id,
        'job_category_id' => $cat->id,
    ]);
    $candidate = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidate->id]);
    $foreignApp = Application::factory()->create([
        'job_id' => $otherJob->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Reviewed,
    ]);

    $this->actingAs($owner)
        ->post(route('employer.interviews.bulk.store'), [
            'application_ids' => [$foreignApp->id],
            'stage' => 'hr',
            'mode' => 'online',
            'title' => 'Sneaky Bulk',
            'start_at' => now()->addDay()->toIso8601String(),
            'duration_minutes' => 30,
            'gap_minutes' => 5,
            'group_mode' => false,
        ])
        ->assertSessionHasErrors('application_ids');

    expect(Interview::query()->count())->toBe(0);
});

test('bulk schedule validates required fields', function () {
    $owner = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->post(route('employer.interviews.bulk.store'), [
            'application_ids' => [],
            'mode' => 'online',
        ])
        ->assertSessionHasErrors(['application_ids', 'stage', 'title', 'start_at']);
});

test('employer can view bulk schedule page', function () {
    $owner = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->get(route('employer.interviews.bulk.create'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('employer/interviews/bulk'));
});

describe('interviewer scoping', function (): void {
    test('rejects an interviewer who is not a member of the acting company', function () {
        // Regression: interviewer_ids only had exists:users,id. Any real user id
        // passed, and the scheduler then searched that user's interviews across
        // every company -- so a 422 "Slot bentrok" vs a 201 told the caller
        // whether a stranger was busy at that moment. Sweep the clock and their
        // whole calendar falls out.
        ['owner' => $owner, 'application' => $application] = makeInterviewContext();

        $victim = User::factory()->employer()->create();
        Company::factory()->approved()->create(['owner_id' => $victim->id]);

        $this->actingAs($owner)
            ->post(route('employer.interviews.store'), [
                'application_id' => $application->id,
                'stage' => 'hr',
                'mode' => 'online',
                'title' => 'Probe',
                'scheduled_at' => now()->addDays(3)->setTime(10, 0)->toIso8601String(),
                'duration_minutes' => 30,
                'interviewer_ids' => [$victim->id],
            ])
            ->assertSessionHasErrors(['interviewer_ids.0']);

        expect(Interview::query()->count())->toBe(0)
            ->and(InterviewParticipant::query()->where('user_id', $victim->id)->count())->toBe(0);
    });

    test('accepts an interviewer who is a member of the acting company', function () {
        // The mirror of the test above: the guard must not lock the employer out
        // of scheduling their own team, which is the whole point of the field.
        ['owner' => $owner, 'company' => $company, 'application' => $application] = makeInterviewContext();

        $recruiter = User::factory()->employer()->create();
        CompanyMember::factory()->create([
            'company_id' => $company->id,
            'user_id' => $recruiter->id,
            'role' => 'recruiter',
            'joined_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post(route('employer.interviews.store'), [
                'application_id' => $application->id,
                'stage' => 'hr',
                'mode' => 'online',
                'title' => 'Panel Round',
                'scheduled_at' => now()->addDays(3)->setTime(10, 0)->toIso8601String(),
                'duration_minutes' => 30,
                'interviewer_ids' => [$recruiter->id],
            ])
            ->assertSessionHasNoErrors();

        expect(InterviewParticipant::query()
            ->where('user_id', $recruiter->id)
            ->where('role', 'interviewer')
            ->count())->toBe(1);
    });

    test('rejects a foreign interviewer on the bulk route too', function () {
        ['owner' => $owner, 'application' => $application] = makeInterviewContext();

        $victim = User::factory()->employee()->create();

        $this->actingAs($owner)
            ->post(route('employer.interviews.bulk.store'), [
                'application_ids' => [$application->id],
                'stage' => 'hr',
                'mode' => 'online',
                'title' => 'Bulk Probe',
                'start_at' => now()->addDays(3)->setTime(10, 0)->toIso8601String(),
                'duration_minutes' => 30,
                'gap_minutes' => 5,
                'group_mode' => false,
                'interviewer_ids' => [$victim->id],
            ])
            ->assertSessionHasErrors(['interviewer_ids.0']);

        expect(Interview::query()->count())->toBe(0);
    });
});

describe('interview slot boundaries', function (): void {
    /**
     * Existing interview 10:00-11:00 for the candidate.
     *
     * @return array{owner: User, application: Application}
     */
    function candidateBookedTenToEleven(): array
    {
        ['owner' => $owner, 'application' => $application, 'candidate' => $candidate] = makeInterviewContext();

        $existing = Interview::factory()->create([
            'application_id' => $application->id,
            'scheduled_at' => now()->addDays(3)->setTime(10, 0),
            'ends_at' => now()->addDays(3)->setTime(11, 0),
            'duration_minutes' => 60,
            'scheduled_by_user_id' => $owner->id,
            'status' => InterviewStatus::Scheduled,
        ]);
        InterviewParticipant::factory()->create([
            'interview_id' => $existing->id,
            'user_id' => $candidate->id,
            'role' => 'candidate',
        ]);

        return compact('owner', 'application');
    }

    test('allows an interview starting exactly when the previous one ends', function () {
        // Regression: conflict detection used whereBetween, inclusive on both
        // ends, while ends_at is exactly start + duration. The 10:00-11:00
        // interview's ends_at of 11:00 fell inside the closed range [11:00,
        // 12:00] and was reported as a conflict, so an employer could not run
        // back-to-back rounds -- the ordinary shape of an interview day.
        ['owner' => $owner, 'application' => $application] = candidateBookedTenToEleven();

        $this->actingAs($owner)
            ->post(route('employer.interviews.store'), [
                'application_id' => $application->id,
                'stage' => 'user',
                'mode' => 'online',
                'title' => 'Back To Back',
                'scheduled_at' => now()->addDays(3)->setTime(11, 0)->toIso8601String(),
                'duration_minutes' => 60,
            ])
            ->assertSessionHasNoErrors();

        expect(Interview::query()->count())->toBe(2);
    });

    test('allows an interview ending exactly when the next one starts', function () {
        // The mirror boundary: 09:00-10:00 butts up against 10:00-11:00.
        ['owner' => $owner, 'application' => $application] = candidateBookedTenToEleven();

        $this->actingAs($owner)
            ->post(route('employer.interviews.store'), [
                'application_id' => $application->id,
                'stage' => 'screening',
                'mode' => 'online',
                'title' => 'Earlier Round',
                'scheduled_at' => now()->addDays(3)->setTime(9, 0)->toIso8601String(),
                'duration_minutes' => 60,
            ])
            ->assertSessionHasNoErrors();

        expect(Interview::query()->count())->toBe(2);
    });

    test('still rejects a genuinely overlapping slot', function () {
        // The fix must not swing the other way: real overlap stays a conflict.
        ['owner' => $owner, 'application' => $application] = candidateBookedTenToEleven();

        $this->actingAs($owner)
            ->post(route('employer.interviews.store'), [
                'application_id' => $application->id,
                'stage' => 'user',
                'mode' => 'online',
                'title' => 'Overlap',
                'scheduled_at' => now()->addDays(3)->setTime(10, 30)->toIso8601String(),
                'duration_minutes' => 60,
            ])
            ->assertSessionHasErrors(['scheduled_at']);

        expect(Interview::query()->count())->toBe(1);
    });

    test('still rejects a slot fully swallowing an existing one', function () {
        // Containment: 09:00-12:00 wraps the existing 10:00-11:00 entirely.
        ['owner' => $owner, 'application' => $application] = candidateBookedTenToEleven();

        $this->actingAs($owner)
            ->post(route('employer.interviews.store'), [
                'application_id' => $application->id,
                'stage' => 'user',
                'mode' => 'online',
                'title' => 'Swallow',
                'scheduled_at' => now()->addDays(3)->setTime(9, 0)->toIso8601String(),
                'duration_minutes' => 180,
            ])
            ->assertSessionHasErrors(['scheduled_at']);

        expect(Interview::query()->count())->toBe(1);
    });

    test('still rejects a slot nested inside an existing one', function () {
        // The inverse containment: 10:15-10:45 sits wholly inside 10:00-11:00.
        ['owner' => $owner, 'application' => $application] = candidateBookedTenToEleven();

        $this->actingAs($owner)
            ->post(route('employer.interviews.store'), [
                'application_id' => $application->id,
                'stage' => 'user',
                'mode' => 'online',
                'title' => 'Nested',
                'scheduled_at' => now()->addDays(3)->setTime(10, 15)->toIso8601String(),
                'duration_minutes' => 30,
            ])
            ->assertSessionHasErrors(['scheduled_at']);

        expect(Interview::query()->count())->toBe(1);
    });
});
