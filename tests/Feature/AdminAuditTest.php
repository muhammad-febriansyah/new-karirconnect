<?php

use App\Models\AiAuditLog;
use App\Models\Company;
use App\Models\TalentSearchLog;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Carbon;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

test('admin can view ai audit log index', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get('/admin/ai-audit-logs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/ai-audit-logs/index'));
});

test('non-admin cannot view ai audit logs', function () {
    $user = User::factory()->employee()->create();

    $this->actingAs($user)
        ->get('/admin/ai-audit-logs')
        ->assertForbidden();
});

test('ai audit index totals reflect status counts', function () {
    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();

    AiAuditLog::query()->create([
        'user_id' => $owner->id,
        'feature' => 'ai_interview',
        'provider' => 'fake',
        'model' => 'fake-model-1',
        'status' => 'success',
        'prompt_tokens' => 100,
        'completion_tokens' => 200,
        'total_cost_usd' => 0.0005,
        'latency_ms' => 50,
    ]);
    AiAuditLog::query()->create([
        'user_id' => $owner->id,
        'feature' => 'coach',
        'provider' => 'fake',
        'model' => 'fake-model-1',
        'status' => 'failed',
        'error_message' => 'boom',
    ]);

    $this->actingAs($admin)
        ->get('/admin/ai-audit-logs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('totals.total', 2)
            ->where('totals.success', 1)
            ->where('totals.failed', 1)
            ->where('totals.total_tokens', 300)
        );
});

test('ai audit feature filter narrows results', function () {
    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();

    AiAuditLog::query()->create([
        'user_id' => $owner->id, 'feature' => 'ai_interview', 'provider' => 'fake', 'model' => 'm', 'status' => 'success',
    ]);
    AiAuditLog::query()->create([
        'user_id' => $owner->id, 'feature' => 'coach', 'provider' => 'fake', 'model' => 'm', 'status' => 'success',
    ]);

    $this->actingAs($admin)
        ->get('/admin/ai-audit-logs?feature=coach')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('logs.total', 1));
});

test('admin can view ai audit log detail', function () {
    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();

    $log = AiAuditLog::query()->create([
        'user_id' => $owner->id,
        'feature' => 'ai_interview',
        'provider' => 'fake',
        'model' => 'fake-model-1',
        'status' => 'success',
        'input_json' => ['messages' => [['role' => 'user', 'content' => 'hi']]],
        'output_json' => ['content' => 'hello'],
    ]);

    $this->actingAs($admin)
        ->get("/admin/ai-audit-logs/{$log->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/ai-audit-logs/show')
            ->where('log.id', $log->id)
        );
});

test('admin can view talent search log index', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get('/admin/talent-search-logs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/talent-search-logs/index'));
});

test('non-admin cannot view talent search logs', function () {
    $employer = User::factory()->employer()->create();
    $this->actingAs($employer)
        ->get('/admin/talent-search-logs')
        ->assertForbidden();
});

test('talent search totals split by time window', function () {
    // Freeze time to mid-day so subHour() and startOfDay() comparisons are stable
    // regardless of when the suite runs (avoids midnight flakiness).
    Carbon::setTestNow('2026-05-04 12:00:00');

    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    TalentSearchLog::factory()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'searched_at' => now()->subHour(),
    ]);
    TalentSearchLog::factory()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'searched_at' => now()->subDays(10),
    ]);

    $this->actingAs($admin)
        ->get('/admin/talent-search-logs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('totals.total', 2)
            ->where('totals.today', 1)
        );

    Carbon::setTestNow();
});

test('talent search range filter applies cutoff', function () {
    Carbon::setTestNow('2026-05-04 12:00:00');

    $admin = User::factory()->admin()->create();
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    TalentSearchLog::factory()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'searched_at' => now()->subHour(),
    ]);
    TalentSearchLog::factory()->create([
        'company_id' => $company->id,
        'user_id' => $owner->id,
        'searched_at' => now()->subDays(10),
    ]);

    $this->actingAs($admin)
        ->get('/admin/talent-search-logs?range=today')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('logs.total', 1));

    Carbon::setTestNow();
});
