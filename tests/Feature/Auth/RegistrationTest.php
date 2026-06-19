<?php

use App\Enums\UserRole;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->where('mode', 'chooser')
        );
});

test('jobseeker registration screen can be rendered', function () {
    $this->get(route('register.jobseeker'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->where('mode', 'form')
            ->where('role', UserRole::Employee->value)
        );
});

test('company registration screen can be rendered', function () {
    $this->get(route('register.company'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->where('mode', 'form')
            ->where('role', UserRole::Employer->value)
        );
});

test('new jobseekers can register', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => UserRole::Employee->value,
        'locale' => 'id',
    ]);

    $this->assertAuthenticated();
    expect(User::query()->where('email', 'test@example.com')->value('role'))->toBe(UserRole::Employee);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('new companies can register', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'PT Maju Jaya',
        'email' => 'hr@majujaya.test',
        'password' => 'password',
        'password_confirmation' => 'password',
        'role' => UserRole::Employer->value,
        'company_name' => 'PT Maju Jaya',
        'locale' => 'id',
    ]);

    $this->assertAuthenticated();
    expect(User::query()->where('email', 'hr@majujaya.test')->value('role'))->toBe(UserRole::Employer);
    $response->assertRedirect(route('dashboard', absolute: false));
});
