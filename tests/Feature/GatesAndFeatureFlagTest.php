<?php

use App\Models\User;
use App\Services\Settings\SettingService;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class]);
});

test('access-admin gate only allows admins', function () {
    $admin = User::factory()->admin()->create();
    $employer = User::factory()->employer()->create();
    $employee = User::factory()->employee()->create();

    expect(Gate::forUser($admin)->allows('access-admin'))->toBeTrue()
        ->and(Gate::forUser($employer)->allows('access-admin'))->toBeFalse()
        ->and(Gate::forUser($employee)->allows('access-admin'))->toBeFalse();
});

test('access-employer gate allows employers and admins', function () {
    $admin = User::factory()->admin()->create();
    $employer = User::factory()->employer()->create();
    $employee = User::factory()->employee()->create();

    expect(Gate::forUser($admin)->allows('access-employer'))->toBeTrue()
        ->and(Gate::forUser($employer)->allows('access-employer'))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('access-employer'))->toBeFalse();
});

test('access-employee gate allows employees and admins', function () {
    $admin = User::factory()->admin()->create();
    $employer = User::factory()->employer()->create();
    $employee = User::factory()->employee()->create();

    expect(Gate::forUser($admin)->allows('access-employee'))->toBeTrue()
        ->and(Gate::forUser($employer)->allows('access-employee'))->toBeFalse()
        ->and(Gate::forUser($employee)->allows('access-employee'))->toBeTrue();
});

test('feature gate reads from settings.feature_flags', function () {
    expect(Gate::allows('feature', 'ai_interview_enabled'))->toBeTrue();

    app(SettingService::class)->set('feature_flags', 'ai_interview_enabled', false);

    expect(Gate::allows('feature', 'ai_interview_enabled'))->toBeFalse();
});

test('feature middleware blocks request when flag is off', function () {
    app(SettingService::class)->set('feature_flags', 'ai_coach_enabled', false);

    Route::middleware(['web', 'feature:ai_coach_enabled'])
        ->get('/_test_feature_off', fn () => response('ok'));

    $this->get('/_test_feature_off')->assertNotFound();
});

test('feature middleware allows request when flag is on', function () {
    app(SettingService::class)->set('feature_flags', 'ai_coach_enabled', true);

    Route::middleware(['web', 'feature:ai_coach_enabled'])
        ->get('/_test_feature_on', fn () => response('ok'));

    $this->get('/_test_feature_on')->assertOk();
});
