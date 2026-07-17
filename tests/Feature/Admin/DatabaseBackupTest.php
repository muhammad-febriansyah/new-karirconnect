<?php

use App\Models\AuditLog;
use App\Models\User;

test('guest cannot reach the database export page', function (): void {
    $this->get(route('admin.database.index'))->assertRedirect(route('login'));
});

test('non admin cannot reach the database export page', function (): void {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->get(route('admin.database.index'))
        ->assertForbidden();
});

test('non admin cannot trigger an export', function (): void {
    // The page being hidden is not the control -- the POST is. An employer who
    // guesses the URL must still be refused.
    $employee = User::factory()->employee()->create();

    $this->actingAs($employee)
        ->post(route('admin.database.export'))
        ->assertForbidden();

    expect(AuditLog::query()->where('action', 'database.export')->count())->toBe(0);
});

test('guest cannot trigger an export', function (): void {
    $this->post(route('admin.database.export'))->assertRedirect(route('login'));

    expect(AuditLog::query()->where('action', 'database.export')->count())->toBe(0);
});

test('deactivated admin cannot trigger an export', function (): void {
    // A suspended admin is the exact case where an export would be an
    // exfiltration, so role alone must not be enough.
    $admin = User::factory()->admin()->state(['is_active' => false])->create();

    $this->actingAs($admin)
        ->post(route('admin.database.export'))
        ->assertForbidden();

    expect(AuditLog::query()->where('action', 'database.export')->count())->toBe(0);
});

test('admin sees the export page', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('admin.database.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/database/index')
            ->has('database')
            ->has('csrfToken')
            ->has('recentExports')
        );
});

test('export without a confirmed password redirects to the confirmation screen', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('admin.database.export'))
        ->assertRedirect(route('password.confirm'));

    // Nothing was dumped, so nothing should claim it was.
    expect(AuditLog::query()->where('action', 'database.export')->count())->toBe(0);
});

test('the export page lists previous exports with actor and ip', function (): void {
    $admin = User::factory()->admin()->create();

    AuditLog::query()->create([
        'user_id' => $admin->id,
        'action' => 'database.export',
        'ip_address' => '203.0.113.9',
        'user_agent' => 'PestTest',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.database.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('recentExports', 1)
            ->where('recentExports.0.actor', $admin->name)
            ->where('recentExports.0.ip_address', '203.0.113.9')
        );
});

test('the export page does not leak database credentials to the frontend', function (): void {
    config()->set('database.connections.mysql.password', 'super-secret-db-password');

    $admin = User::factory()->admin()->create();

    $html = $this->actingAs($admin)
        ->get(route('admin.database.index'))
        ->getContent();

    expect($html)->not->toContain('super-secret-db-password');
});
