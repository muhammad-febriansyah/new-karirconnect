<?php

use App\Models\AuditLog;
use App\Models\User;
use App\Services\Exports\DatabaseSqlExporter;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Stands in for mysqldump so the outcome wiring can be tested without a MySQL
 * server. Reports whatever the test asks it to report.
 */
function fakeExporter(bool $successful, int $bytes, string $error = ''): DatabaseSqlExporter
{
    return new class($successful, $bytes, $error) extends DatabaseSqlExporter
    {
        public function __construct(
            private readonly bool $successful,
            private readonly int $bytes,
            private readonly string $error,
        ) {}

        public function assertAvailable(): void {}

        public function stream(?callable $onFinish = null): StreamedResponse
        {
            return response()->streamDownload(function () use ($onFinish): void {
                echo '-- dump';

                if ($onFinish !== null) {
                    $onFinish($this->successful, $this->bytes, $this->error);
                }
            }, 'test.sql');
        }
    };
}

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

test('a finished export records its size and outcome', function (): void {
    $admin = User::factory()->admin()->create();
    $this->instance(DatabaseSqlExporter::class, fakeExporter(successful: true, bytes: 2048));

    $response = $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->post(route('admin.database.export'));

    $response->assertOk();
    $response->streamedContent();

    $log = AuditLog::query()->where('action', 'database.export')->sole();

    expect($log->after_values['status'])->toBe('completed')
        ->and($log->after_values['bytes'])->toBe(2048)
        ->and($log->after_values['error'])->toBeNull();
});

test('a dump that dies halfway is recorded as failed, not as a backup', function (): void {
    // The bytes already left for the browser, so the only place the truth can
    // still be told is the history on the page.
    $admin = User::factory()->admin()->create();
    $this->instance(
        DatabaseSqlExporter::class,
        fakeExporter(successful: false, bytes: 120, error: "mysqldump: Error 2013: Lost connection\n")
    );

    $response = $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->post(route('admin.database.export'));

    $response->streamedContent();

    $log = AuditLog::query()->where('action', 'database.export')->sole();

    expect($log->after_values['status'])->toBe('failed')
        ->and($log->after_values['bytes'])->toBe(120)
        ->and($log->after_values['error'])->toContain('Lost connection');
});

test('an export that is still running shows as started', function (): void {
    // The audit row is written before the first byte, so an interrupted download
    // leaves evidence rather than vanishing.
    $admin = User::factory()->admin()->create();
    $this->instance(DatabaseSqlExporter::class, fakeExporter(successful: true, bytes: 1));

    $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->post(route('admin.database.export'));

    // Deliberately not draining the stream: the callback never fires.
    $log = AuditLog::query()->where('action', 'database.export')->sole();

    expect($log->after_values['status'])->toBe('started');
});

test('the export history exposes the outcome of each run', function (): void {
    $admin = User::factory()->admin()->create();

    AuditLog::query()->create([
        'user_id' => $admin->id,
        'action' => 'database.export',
        'after_values' => ['status' => 'failed', 'bytes' => 40, 'error' => 'boom'],
        'ip_address' => '203.0.113.9',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.database.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('recentExports', 1)
            ->where('recentExports.0.details.status', 'failed')
            ->where('recentExports.0.details.bytes', 40)
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
