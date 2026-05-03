<?php

use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class]);
});

test('non admin cannot access audit log viewer', function () {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->get(route('admin.audit-logs.index'))
        ->assertForbidden();
});

test('admin sees audit log entries with filtering by action', function () {
    $admin = User::factory()->admin()->create();
    $setting = Setting::query()->where('group', 'general')->where('key', 'app_name')->firstOrFail();

    AuditLog::query()->create([
        'user_id' => $admin->id,
        'action' => 'settings.update',
        'subject_type' => Setting::class,
        'subject_id' => $setting->id,
        'before_values' => ['value' => 'Old'],
        'after_values' => ['value' => 'New'],
        'ip_address' => '127.0.0.1',
    ]);
    AuditLog::query()->create([
        'user_id' => $admin->id,
        'action' => 'company.approve',
        'before_values' => null,
        'after_values' => null,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.audit-logs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/audit-logs/index')
            ->where('totals.total', 2)
            ->has('logs.data', 2));

    $this->actingAs($admin)
        ->get(route('admin.audit-logs.index', ['action' => 'settings.update']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('logs.data', 1));
});
