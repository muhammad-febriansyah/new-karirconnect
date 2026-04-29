<?php

use App\Models\Setting;
use App\Models\User;
use App\Services\Settings\SettingService;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Cache;

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
