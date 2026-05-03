<?php

use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use App\Services\Settings\SettingService;
use Database\Seeders\SettingSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    $this->seed(SettingSeeder::class);
    Cache::flush();
});

test('non admin users cannot view settings page', function () {
    $employee = User::factory()->employee()->create();

    $this->actingAs($employee)
        ->get(route('admin.settings.edit'))
        ->assertForbidden();
});

test('admin can render every settings group', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    foreach (['general', 'branding', 'seo', 'ai', 'payment', 'email', 'feature_flags', 'legal'] as $group) {
        $this->get(route('admin.settings.group', ['group' => $group]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/settings/edit')
                ->where('currentGroup', $group)
                ->has('settings')
            );
    }
});

test('settings update writes an audit log entry with before and after', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $before = app(SettingService::class)->get('general.app_name');

    $this->post(route('admin.settings.update'), [
        'group' => 'general',
        'values' => ['app_name' => 'Audited Update'],
    ])->assertRedirect();

    $log = AuditLog::query()->where('action', 'settings.update')->latest('id')->firstOrFail();

    expect($log->user_id)->toBe($admin->id)
        ->and($log->subject_type)->toBe(Setting::class)
        ->and($log->before_values['value'] ?? null)->toBe($before)
        ->and($log->after_values['value'] ?? null)->toBe('Audited Update');
});

test('settings password update is recorded but the secret is redacted', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $this->post(route('admin.settings.update'), [
        'group' => 'payment',
        'values' => ['duitku_api_key' => 'super-secret-token'],
    ])->assertRedirect();

    $log = AuditLog::query()->where('action', 'settings.update')->latest('id')->firstOrFail();

    expect($log->after_values['value'] ?? null)->toBe('[redacted]')
        ->and($log->before_values['value'] ?? null)->toBe('[redacted]');
});

test('admin can update simple text values and they persist', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $this->post(route('admin.settings.update'), [
        'group' => 'general',
        'values' => [
            'app_name' => 'KarirConnect Updated',
            'app_tagline' => 'Karir lebih powerful',
        ],
    ])->assertRedirect();

    $service = app(SettingService::class);

    expect($service->get('general.app_name'))->toBe('KarirConnect Updated');
    expect($service->get('general.app_tagline'))->toBe('Karir lebih powerful');
});

test('password type values are encrypted at rest and not exposed publicly', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $this->post(route('admin.settings.update'), [
        'group' => 'payment',
        'values' => [
            'duitku_api_key' => 'secret-api-key',
        ],
    ])->assertRedirect();

    $service = app(SettingService::class);
    expect($service->get('payment.duitku_api_key'))->toBe('secret-api-key');

    $public = $service->publicByGroup();
    expect(data_get($public, 'payment.duitku_api_key'))->toBeNull();

    $rawValue = Setting::query()
        ->where('group', 'payment')
        ->where('key', 'duitku_api_key')
        ->value('value');

    expect($rawValue)->not->toBe('secret-api-key');
});

test('feature flags are exposed publicly via shared props', function () {
    $service = app(SettingService::class);
    $public = $service->publicByGroup();

    expect($public)->toHaveKey('feature_flags');
    expect($public['feature_flags']['ai_interview_enabled'])->toBeTrue();
});

test('flash messages are shared to inertia props', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->withSession(['success' => 'Pengaturan berhasil disimpan.'])
        ->get(route('admin.settings.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('flash.success', 'Pengaturan berhasil disimpan.')
            ->where('flash.error', null)
            ->where('flash.warning', null)
            ->where('flash.info', null)
        );
});

test('replacing a settings image deletes the previous file', function () {
    Storage::fake('public');

    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    Storage::disk('public')->put('settings/branding/old-logo.png', 'old-image');

    Setting::query()
        ->where('group', 'branding')
        ->where('key', 'logo_path')
        ->update(['value' => 'settings/branding/old-logo.png']);

    $this->post(route('admin.settings.update'), [
        'group' => 'branding',
        'files' => [
            'logo_path' => UploadedFile::fake()->image('new-logo.png', 512, 512),
        ],
    ])->assertRedirect();

    $service = app(SettingService::class);
    $newPath = $service->get('branding.logo_path');

    expect($newPath)->toBeString()
        ->not->toBe('settings/branding/old-logo.png');

    Storage::disk('public')->assertMissing('settings/branding/old-logo.png');
    Storage::disk('public')->assertExists($newPath);
});
