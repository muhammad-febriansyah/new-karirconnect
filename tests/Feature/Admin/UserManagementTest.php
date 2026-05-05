<?php

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\User;

test('non admin cannot access user management', function (): void {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->get(route('admin.users.index'))
        ->assertForbidden();
});

test('admin sees paginated user list with totals', function (): void {
    $admin = User::factory()->admin()->create();
    User::factory()->employee()->count(3)->create();
    User::factory()->employer()->count(2)->create();
    User::factory()->employee()->state(['is_active' => false])->create();

    $this->actingAs($admin)
        ->get(route('admin.users.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/users/index')
            ->has('users.data')
            ->where('totals.suspended', 1)
            ->where('totals.employer', 2)
            ->where('totals.admin', 1));
});

test('admin can filter users by role and status', function (): void {
    $admin = User::factory()->admin()->create();
    User::factory()->employer()->count(3)->create();
    User::factory()->employee()->count(5)->create();
    User::factory()->employee()->state(['is_active' => false])->create();

    $this->actingAs($admin)
        ->get(route('admin.users.index', ['role' => 'employer']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('users.data', 3));

    $this->actingAs($admin)
        ->get(route('admin.users.index', ['status' => 'suspended']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('users.data', 1));
});

test('admin can search users by name and email', function (): void {
    $admin = User::factory()->admin()->create();
    User::factory()->employee()->state(['name' => 'Budi Santoso', 'email' => 'budi@test.dev'])->create();
    User::factory()->employee()->count(4)->create();

    $this->actingAs($admin)
        ->get(route('admin.users.index', ['search' => 'budi']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('users.data', 1));
});

test('admin sees full user detail with stats', function (): void {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->employee()->create();

    $this->actingAs($admin)
        ->get(route('admin.users.show', $user))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/users/show')
            ->where('user.id', $user->id)
            ->has('stats')
            ->has('roleOptions'));
});

test('admin can update user profile and role', function (): void {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->employee()->create();

    $this->actingAs($admin)
        ->put(route('admin.users.update', $user), [
            'name' => 'Updated Name',
            'email' => 'updated@test.dev',
            'role' => UserRole::Employer->value,
            'phone' => '+62 812 0000 0000',
            'address' => 'Jakarta',
            'is_active' => true,
        ])
        ->assertRedirect();

    $user->refresh();
    expect($user->name)->toBe('Updated Name');
    expect($user->email)->toBe('updated@test.dev');
    expect($user->role)->toBe(UserRole::Employer);
    expect(AuditLog::query()->where('action', 'user.update')->where('subject_id', $user->id)->exists())->toBeTrue();
});

test('admin cannot change own role away from admin', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->put(route('admin.users.update', $admin), [
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => UserRole::Employer->value,
            'phone' => null,
            'address' => null,
            'is_active' => true,
        ])
        ->assertSessionHasErrors('role');

    expect($admin->fresh()->role)->toBe(UserRole::Admin);
});

test('admin cannot suspend own account', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('admin.users.suspend', $admin))
        ->assertSessionHasErrors('suspend');

    expect($admin->fresh()->is_active)->toBeTrue();
});

test('admin can suspend and reactivate another user', function (): void {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->employee()->create();

    $this->actingAs($admin)
        ->post(route('admin.users.suspend', $user))
        ->assertRedirect();
    expect($user->fresh()->is_active)->toBeFalse();

    $this->actingAs($admin)
        ->post(route('admin.users.activate', $user))
        ->assertRedirect();
    expect($user->fresh()->is_active)->toBeTrue();

    expect(AuditLog::query()->where('action', 'user.suspend')->count())->toBe(1);
    expect(AuditLog::query()->where('action', 'user.activate')->count())->toBe(1);
});

test('admin can delete a non-admin user', function (): void {
    $admin = User::factory()->admin()->create();
    $employee = User::factory()->employee()->create();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $employee))
        ->assertRedirect(route('admin.users.index'));

    expect(User::query()->find($employee->id))->toBeNull();
    expect(AuditLog::query()->where('action', 'user.delete')->exists())->toBeTrue();
});

test('admin cannot delete an admin user', function (): void {
    $admin = User::factory()->admin()->create();
    $other = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $other))
        ->assertSessionHasErrors('delete');

    expect(User::query()->find($other->id))->not->toBeNull();
});

test('admin cannot delete own account', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $admin))
        ->assertSessionHasErrors('delete');

    expect(User::query()->find($admin->id))->not->toBeNull();
});

test('admin can request password reset link for user', function (): void {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->employee()->create();

    $this->actingAs($admin)
        ->post(route('admin.users.password-reset', $user))
        ->assertRedirect();

    expect(AuditLog::query()->where('action', 'user.password_reset_link')->where('subject_id', $user->id)->exists())
        ->toBeTrue();
});
