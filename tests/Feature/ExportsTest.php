<?php

use App\Enums\OrderItemType;
use App\Enums\OrderStatus;
use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewSession;
use App\Models\Application;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\Order;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

test('employer can download applicant csv with correct headers', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $job = Job::factory()->published()->create(['company_id' => $company->id]);

    $candidate = User::factory()->employee()->create(['name' => 'Citra Wibowo', 'email' => 'citra@example.test']);
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidate->id]);
    Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'cover_letter' => "Halo,\nsaya tertarik dengan posisi ini.",
    ]);

    $response = $this->actingAs($owner)->get('/employer/applicants/export');

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('text/csv');
    expect($response->headers->get('content-disposition'))->toContain('attachment')
        ->toContain('applicants-')
        ->toContain('.csv');

    $body = $response->streamedContent();
    expect($body)->toContain('Applied At')
        ->toContain('Candidate Email')
        ->toContain('citra@example.test')
        ->toContain('Citra Wibowo');
    // newline characters in cover letter must be flattened to keep CSV well-formed
    expect($body)->not->toMatch('/Citra.*\nsaya tertarik/');
});

test('employer applicant export filters by job_id', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $job1 = Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Backend Wanted']);
    $job2 = Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Frontend Wanted']);

    $alice = User::factory()->employee()->create(['name' => 'Alice', 'email' => 'alice@example.test']);
    $bob = User::factory()->employee()->create(['name' => 'Bob', 'email' => 'bob@example.test']);
    Application::factory()->create([
        'job_id' => $job1->id,
        'employee_profile_id' => EmployeeProfile::factory()->create(['user_id' => $alice->id])->id,
    ]);
    Application::factory()->create([
        'job_id' => $job2->id,
        'employee_profile_id' => EmployeeProfile::factory()->create(['user_id' => $bob->id])->id,
    ]);

    $response = $this->actingAs($owner)->get('/employer/applicants/export?job='.$job1->id);

    $body = $response->streamedContent();
    expect($body)->toContain('alice@example.test')
        ->not->toContain('bob@example.test');
});

test('employer applicant export does not leak other companies applicants', function () {
    $ownerA = User::factory()->employer()->create();
    $companyA = Company::factory()->approved()->create(['owner_id' => $ownerA->id]);
    $jobA = Job::factory()->published()->create(['company_id' => $companyA->id]);

    $ownerB = User::factory()->employer()->create();
    $companyB = Company::factory()->approved()->create(['owner_id' => $ownerB->id]);
    $jobB = Job::factory()->published()->create(['company_id' => $companyB->id]);

    $secret = User::factory()->employee()->create(['email' => 'secret@example.test']);
    Application::factory()->create([
        'job_id' => $jobB->id,
        'employee_profile_id' => EmployeeProfile::factory()->create(['user_id' => $secret->id])->id,
    ]);

    $response = $this->actingAs($ownerA)->get('/employer/applicants/export');

    $body = $response->streamedContent();
    expect($body)->not->toContain('secret@example.test');
});

test('non-employer cannot download applicant csv', function () {
    $employee = User::factory()->employee()->create();
    $this->actingAs($employee)
        ->get('/employer/applicants/export')
        ->assertForbidden();
});

test('employer can download ai interview pdf for own session', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $job = Job::factory()->published()->create(['company_id' => $company->id]);

    $candidate = User::factory()->employee()->create(['name' => 'Diah Pratama']);
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidate->id]);

    $session = AiInterviewSession::factory()->completed()->create([
        'job_id' => $job->id,
        'candidate_profile_id' => $profile->id,
    ]);

    AiInterviewQuestion::query()->create([
        'session_id' => $session->id,
        'order_number' => 1,
        'category' => 'technical',
        'question' => 'Apa pengalaman Anda dengan Laravel?',
        'max_duration_seconds' => 120,
    ]);

    $response = $this->actingAs($owner)->get("/employer/ai-interviews/{$session->id}/report");

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('application/pdf');
    expect($response->headers->get('content-disposition'))->toContain('attachment')
        ->toContain("ai-interview-{$session->id}");
});

test('employer cannot download ai interview pdf from another company', function () {
    $ownerA = User::factory()->employer()->create();
    Company::factory()->approved()->create(['owner_id' => $ownerA->id]);

    $ownerB = User::factory()->employer()->create();
    $companyB = Company::factory()->approved()->create(['owner_id' => $ownerB->id]);
    $jobB = Job::factory()->published()->create(['company_id' => $companyB->id]);

    $session = AiInterviewSession::factory()->completed()->create([
        'job_id' => $jobB->id,
    ]);

    $this->actingAs($ownerA)
        ->get("/employer/ai-interviews/{$session->id}/report")
        ->assertForbidden();
});

test('admin can download orders csv', function () {
    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id, 'name' => 'Acme Corp']);

    Order::query()->create([
        'reference' => 'ORD-EXPORT-1',
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'item_type' => OrderItemType::SubscriptionPlan,
        'item_ref_id' => 1,
        'description' => 'Starter Plan',
        'amount_idr' => 500000,
        'quantity' => 1,
        'currency' => 'IDR',
        'status' => OrderStatus::Paid,
        'payment_provider' => 'fake',
        'paid_at' => now(),
    ]);

    $response = $this->actingAs($admin)->get('/admin/orders/export');

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('text/csv');

    $body = $response->streamedContent();
    expect($body)->toContain('Reference')
        ->toContain('ORD-EXPORT-1')
        ->toContain('Acme Corp')
        ->toContain('Starter Plan');
});

test('admin order export filters by status', function () {
    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    Order::query()->create([
        'reference' => 'ORD-PAID',
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'item_type' => OrderItemType::SubscriptionPlan,
        'item_ref_id' => 1,
        'description' => 'Paid',
        'amount_idr' => 100000,
        'quantity' => 1,
        'currency' => 'IDR',
        'status' => OrderStatus::Paid,
        'payment_provider' => 'fake',
    ]);
    Order::query()->create([
        'reference' => 'ORD-PENDING',
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'item_type' => OrderItemType::SubscriptionPlan,
        'item_ref_id' => 1,
        'description' => 'Pending',
        'amount_idr' => 100000,
        'quantity' => 1,
        'currency' => 'IDR',
        'status' => OrderStatus::AwaitingPayment,
        'payment_provider' => 'fake',
    ]);

    $response = $this->actingAs($admin)->get('/admin/orders/export?status=paid');

    $body = $response->streamedContent();
    expect($body)->toContain('ORD-PAID')
        ->not->toContain('ORD-PENDING');
});

test('non-admin cannot export orders', function () {
    $employer = User::factory()->employer()->create();
    $this->actingAs($employer)
        ->get('/admin/orders/export')
        ->assertForbidden();
});
