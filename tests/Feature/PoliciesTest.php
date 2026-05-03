<?php

use App\Enums\AiInterviewStatus;
use App\Enums\CompanyStatus;
use App\Enums\JobStatus;
use App\Models\AiInterviewSession;
use App\Models\Announcement;
use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\EmployeeProfile;
use App\Models\Interview;
use App\Models\InterviewParticipant;
use App\Models\Job;
use App\Models\Setting;
use App\Models\SubscriptionPlan;
use App\Models\User;

describe('JobPolicy', function () {
    it('lets anyone view a published job', function () {
        $job = Job::factory()->published()->create();

        expect(User::factory()->employee()->create()->can('view', $job))->toBeTrue();
        expect(User::factory()->employer()->create()->can('view', $job))->toBeTrue();
    });

    it('hides draft jobs from other users but shows them to admin and the company owner', function () {
        $owner = User::factory()->employer()->create();
        $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
        CompanyMember::factory()->owner()->create(['company_id' => $company->id, 'user_id' => $owner->id]);
        $job = Job::factory()->create(['company_id' => $company->id, 'status' => JobStatus::Draft]);

        $admin = User::factory()->admin()->create();
        $stranger = User::factory()->employer()->create();

        expect($admin->can('view', $job))->toBeTrue();
        expect($owner->can('view', $job))->toBeTrue();
        expect($stranger->can('view', $job))->toBeFalse();
    });

    it('only allows the owning company members to update or close jobs', function () {
        $owner = User::factory()->employer()->create();
        $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
        CompanyMember::factory()->owner()->create(['company_id' => $company->id, 'user_id' => $owner->id]);
        $job = Job::factory()->published()->create(['company_id' => $company->id]);

        $stranger = User::factory()->employer()->create();

        expect($owner->can('update', $job))->toBeTrue();
        expect($owner->can('close', $job))->toBeTrue();
        expect($stranger->can('update', $job))->toBeFalse();
        expect(User::factory()->admin()->create()->can('update', $job))->toBeTrue();
    });

    it('forbids employees from creating jobs', function () {
        expect(User::factory()->employee()->create()->can('create', Job::class))->toBeFalse();
        expect(User::factory()->employer()->create()->can('create', Job::class))->toBeTrue();
    });
});

describe('ApplicationPolicy', function () {
    it('lets the candidate view their own application', function () {
        $employee = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $employee->id]);
        $application = Application::factory()->create(['employee_profile_id' => $profile->id]);

        expect($employee->can('view', $application))->toBeTrue();
    });

    it('lets the hiring company members view applications to their jobs', function () {
        $owner = User::factory()->employer()->create();
        $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
        CompanyMember::factory()->owner()->create(['company_id' => $company->id, 'user_id' => $owner->id]);
        $job = Job::factory()->published()->create(['company_id' => $company->id]);
        $application = Application::factory()->create(['job_id' => $job->id]);

        expect($owner->can('view', $application))->toBeTrue();
        expect($owner->can('changeStatus', $application))->toBeTrue();
    });

    it('blocks unrelated employers and other candidates', function () {
        $application = Application::factory()->create();
        $stranger = User::factory()->employer()->create();
        $otherEmployee = User::factory()->employee()->create();

        expect($stranger->can('view', $application))->toBeFalse();
        expect($otherEmployee->can('view', $application))->toBeFalse();
    });

    it('lets the candidate withdraw their own application but not someone else\'s', function () {
        $employee = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $employee->id]);
        $own = Application::factory()->create(['employee_profile_id' => $profile->id]);
        $other = Application::factory()->create();

        expect($employee->can('withdraw', $own))->toBeTrue();
        expect($employee->can('withdraw', $other))->toBeFalse();
    });
});

describe('CompanyPolicy', function () {
    it('lets anyone view an approved company', function () {
        $company = Company::factory()->approved()->create();

        expect(User::factory()->employee()->create()->can('view', $company))->toBeTrue();
    });

    it('hides pending companies from outsiders', function () {
        $owner = User::factory()->employer()->create();
        $company = Company::factory()->create([
            'owner_id' => $owner->id,
            'status' => CompanyStatus::Pending,
        ]);

        $stranger = User::factory()->employer()->create();

        expect($stranger->can('view', $company))->toBeFalse();
        expect($owner->can('view', $company))->toBeTrue();
    });

    it('restricts manageTeam to owners and member admins only', function () {
        $owner = User::factory()->employer()->create();
        $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
        CompanyMember::factory()->owner()->create(['company_id' => $company->id, 'user_id' => $owner->id]);

        $recruiter = User::factory()->employer()->create();
        CompanyMember::factory()->create([
            'company_id' => $company->id,
            'user_id' => $recruiter->id,
            'role' => 'recruiter',
        ]);

        expect($owner->can('manageTeam', $company))->toBeTrue();
        expect($recruiter->can('manageTeam', $company))->toBeFalse();
        expect(User::factory()->admin()->create()->can('manageTeam', $company))->toBeTrue();
    });

    it('only admins can approve or verify a company', function () {
        $company = Company::factory()->create();

        expect(User::factory()->admin()->create()->can('approve', $company))->toBeTrue();
        expect(User::factory()->admin()->create()->can('verify', $company))->toBeTrue();
        expect(User::factory()->employer()->create()->can('approve', $company))->toBeFalse();
    });
});

describe('EmployeeProfilePolicy', function () {
    it('lets the owner update their profile', function () {
        $user = User::factory()->employee()->create();
        $profile = EmployeeProfile::factory()->create(['user_id' => $user->id]);

        expect($user->can('update', $profile))->toBeTrue();
    });

    it('lets employers view public and recruiter-only profiles, never private', function () {
        $employer = User::factory()->employer()->create();

        $public = EmployeeProfile::factory()->create(['visibility' => 'public']);
        $recruiter = EmployeeProfile::factory()->create(['visibility' => 'recruiter_only']);
        $private = EmployeeProfile::factory()->create(['visibility' => 'private']);

        expect($employer->can('view', $public))->toBeTrue();
        expect($employer->can('view', $recruiter))->toBeTrue();
        expect($employer->can('view', $private))->toBeFalse();
    });
});

describe('InterviewPolicy', function () {
    it('lets the candidate, scheduler, and admin view; blocks strangers', function () {
        $candidateUser = User::factory()->employee()->create();
        $candidateProfile = EmployeeProfile::factory()->create(['user_id' => $candidateUser->id]);
        $owner = User::factory()->employer()->create();
        $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
        CompanyMember::factory()->owner()->create(['company_id' => $company->id, 'user_id' => $owner->id]);
        $job = Job::factory()->published()->create(['company_id' => $company->id]);
        $application = Application::factory()->create([
            'job_id' => $job->id,
            'employee_profile_id' => $candidateProfile->id,
        ]);
        $interview = Interview::factory()->create([
            'application_id' => $application->id,
            'scheduled_by_user_id' => $owner->id,
        ]);

        expect($candidateUser->can('view', $interview))->toBeTrue();
        expect($owner->can('view', $interview))->toBeTrue();
        expect(User::factory()->employee()->create()->can('view', $interview))->toBeFalse();
    });

    it('only lets designated interviewers submit a scorecard', function () {
        $owner = User::factory()->employer()->create();
        $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
        CompanyMember::factory()->owner()->create(['company_id' => $company->id, 'user_id' => $owner->id]);
        $job = Job::factory()->published()->create(['company_id' => $company->id]);
        $application = Application::factory()->create(['job_id' => $job->id]);
        $interview = Interview::factory()->create([
            'application_id' => $application->id,
            'scheduled_by_user_id' => $owner->id,
        ]);

        $reviewer = User::factory()->employer()->create();
        InterviewParticipant::factory()->create([
            'interview_id' => $interview->id,
            'user_id' => $reviewer->id,
            'role' => 'interviewer',
        ]);

        $bystander = User::factory()->employer()->create();

        expect($reviewer->can('submitScorecard', $interview))->toBeTrue();
        expect($owner->can('submitScorecard', $interview))->toBeTrue();
        expect($bystander->can('submitScorecard', $interview))->toBeFalse();
    });
});

describe('AiInterviewSessionPolicy', function () {
    it('only lets the owning candidate start their own session', function () {
        $candidateUser = User::factory()->employee()->create();
        $candidateProfile = EmployeeProfile::factory()->create(['user_id' => $candidateUser->id]);
        $session = AiInterviewSession::factory()->create([
            'candidate_profile_id' => $candidateProfile->id,
            'status' => AiInterviewStatus::Invited,
        ]);

        expect($candidateUser->can('start', $session))->toBeTrue();
        expect(User::factory()->employee()->create()->can('start', $session))->toBeFalse();
        expect(User::factory()->employer()->create()->can('start', $session))->toBeFalse();
    });

    it('blocks starting a completed or expired session', function () {
        $candidateUser = User::factory()->employee()->create();
        $candidateProfile = EmployeeProfile::factory()->create(['user_id' => $candidateUser->id]);
        $session = AiInterviewSession::factory()->create([
            'candidate_profile_id' => $candidateProfile->id,
            'status' => AiInterviewStatus::Completed,
        ]);

        expect($candidateUser->can('start', $session))->toBeFalse();
    });

    it('lets the hiring company view results once completed', function () {
        $candidateProfile = EmployeeProfile::factory()->create();
        $owner = User::factory()->employer()->create();
        $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
        CompanyMember::factory()->owner()->create(['company_id' => $company->id, 'user_id' => $owner->id]);
        $job = Job::factory()->published()->create(['company_id' => $company->id]);
        $session = AiInterviewSession::factory()->create([
            'candidate_profile_id' => $candidateProfile->id,
            'job_id' => $job->id,
            'status' => AiInterviewStatus::Completed,
        ]);

        expect($owner->can('viewResult', $session))->toBeTrue();
        expect(User::factory()->employer()->create()->can('viewResult', $session))->toBeFalse();
    });
});

describe('AnnouncementPolicy', function () {
    it('shows published announcements to everyone but draft only to admin', function () {
        $published = Announcement::factory()->create(['is_published' => true]);
        $draft = Announcement::factory()->create(['is_published' => false]);

        $admin = User::factory()->admin()->create();
        $employee = User::factory()->employee()->create();

        expect($employee->can('view', $published))->toBeTrue();
        expect($employee->can('view', $draft))->toBeFalse();
        expect($admin->can('view', $draft))->toBeTrue();
    });

    it('only admins can write announcements', function () {
        $admin = User::factory()->admin()->create();
        $employer = User::factory()->employer()->create();

        expect($admin->can('create', Announcement::class))->toBeTrue();
        expect($employer->can('create', Announcement::class))->toBeFalse();
    });
});

describe('SubscriptionPlanPolicy', function () {
    it('lets anyone view active plans but hides inactive ones', function () {
        $active = SubscriptionPlan::factory()->create(['is_active' => true]);
        $inactive = SubscriptionPlan::factory()->create(['is_active' => false]);

        $employer = User::factory()->employer()->create();

        expect($employer->can('view', $active))->toBeTrue();
        expect($employer->can('view', $inactive))->toBeFalse();
        expect(User::factory()->admin()->create()->can('view', $inactive))->toBeTrue();
    });

    it('only admins can write plans', function () {
        expect(User::factory()->admin()->create()->can('create', SubscriptionPlan::class))->toBeTrue();
        expect(User::factory()->employer()->create()->can('create', SubscriptionPlan::class))->toBeFalse();
    });
});

describe('SettingPolicy', function () {
    it('only admins can read or write settings', function () {
        $setting = Setting::query()->create([
            'group' => 'general',
            'key' => 'app_name',
            'value' => 'KarirConnect',
            'type' => 'string',
            'label' => 'App Name',
            'is_public' => true,
        ]);

        expect(User::factory()->admin()->create()->can('view', $setting))->toBeTrue();
        expect(User::factory()->employer()->create()->can('view', $setting))->toBeFalse();
        expect(User::factory()->employee()->create()->can('view', $setting))->toBeFalse();
    });
});
