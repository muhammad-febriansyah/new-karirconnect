<?php

use App\Models\Application;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\User;
use App\Services\Maintenance\ShowcaseDataPurger;
use Illuminate\Support\Facades\Hash;

/**
 * Creates an employer account shaped exactly like FreshShowcaseSeeder makes them,
 * with the company and published job hanging off it.
 *
 * @return array{user: User, company: Company, job: Job}
 */
function seededEmployer(string $domain = 'gojek.com', string $password = 'password'): array
{
    $user = User::factory()->employer()->create([
        'email' => 'hr@'.$domain,
        'password' => Hash::make($password),
    ]);

    $company = Company::factory()->create(['owner_id' => $user->id]);
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $user->id,
    ]);

    return ['user' => $user, 'company' => $company, 'job' => $job];
}

/**
 * @return array{user: User, profile: EmployeeProfile}
 */
function seededCandidate(int $number = 1, string $password = 'password'): array
{
    $user = User::factory()->employee()->create([
        'email' => "kandidat{$number}@karirkonek.test",
        'password' => Hash::make($password),
    ]);

    return ['user' => $user, 'profile' => EmployeeProfile::factory()->create(['user_id' => $user->id])];
}

test('guest cannot reach the showcase data page', function (): void {
    $this->get(route('admin.showcase-data.index'))->assertRedirect(route('login'));
});

test('non admin cannot reach the showcase data page', function (): void {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->get(route('admin.showcase-data.index'))
        ->assertForbidden();
});

test('non admin cannot trigger a purge', function (): void {
    // Hiding the page is not the control -- the DELETE is. An employer who
    // guesses the URL must still be refused, and the data must survive.
    $employee = User::factory()->employee()->create();
    $seeded = seededEmployer();

    $this->actingAs($employee)
        ->delete(route('admin.showcase-data.destroy'), ['confirmation' => 'HAPUS DATA DUMMY'])
        ->assertForbidden();

    expect(Company::query()->whereKey($seeded['company']->id)->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'showcase.purge')->count())->toBe(0);
});

test('purge without a confirmed password redirects to the confirmation screen', function (): void {
    $admin = User::factory()->admin()->create();
    $seeded = seededEmployer();

    $this->actingAs($admin)
        ->delete(route('admin.showcase-data.destroy'), ['confirmation' => 'HAPUS DATA DUMMY'])
        ->assertRedirect(route('password.confirm'));

    expect(Company::query()->whereKey($seeded['company']->id)->exists())->toBeTrue();
    expect(AuditLog::query()->where('action', 'showcase.purge')->count())->toBe(0);
});

test('purge is refused when the confirmation phrase does not match', function (): void {
    $admin = User::factory()->admin()->create();
    $seeded = seededEmployer();

    $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->delete(route('admin.showcase-data.destroy'), ['confirmation' => 'hapus'])
        ->assertSessionHasErrors('confirmation');

    expect(Company::query()->whereKey($seeded['company']->id)->exists())->toBeTrue();
});

test('admin sees the preview with the exact blast radius', function (): void {
    $admin = User::factory()->admin()->create();
    seededEmployer('gojek.com');
    seededEmployer('tokopedia.com');
    seededCandidate(1);

    // The preview is deferred, so it arrives on the partial reload the client
    // sends straight after the page paints -- not in the first response.
    $this->actingAs($admin)
        ->get(route('admin.showcase-data.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/showcase-data/index')
            ->has('confirmationPhrase')
            ->has('recentPurges')
            ->missing('preview')
            ->loadDeferredProps(fn ($deferred) => $deferred
                ->where('preview.employers', 2)
                ->where('preview.candidates', 1)
                ->where('preview.companies', 2)
                ->where('preview.jobs', 2)
            )
        );
});

test('a candidate is purged on its address alone, whatever its password', function (): void {
    // Deliberate: `.test` is a reserved TLD, so kandidat<N>@karirkonek.test
    // cannot be a real person's address and a bcrypt check there would buy
    // nothing but page-load time. Employers are checked; candidates are not.
    $admin = User::factory()->admin()->create();
    $candidate = seededCandidate(1, password: 'diganti-orang');

    $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->delete(route('admin.showcase-data.destroy'), ['confirmation' => 'HAPUS DATA DUMMY'])
        ->assertSessionHas('success');

    expect(User::query()->whereKey($candidate['user']->id)->exists())->toBeFalse();
});

test('the preview is cached between visits but never reused for a purge', function (): void {
    $admin = User::factory()->admin()->create();
    seededEmployer('gojek.com');

    $this->actingAs($admin)
        ->get(route('admin.showcase-data.index'))
        ->assertInertia(fn ($page) => $page
            ->loadDeferredProps(fn ($deferred) => $deferred->where('preview.employers', 1)));

    // Data changes underneath a cached preview; the purge must still see it.
    seededEmployer('tokopedia.com');

    $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->delete(route('admin.showcase-data.destroy'), ['confirmation' => 'HAPUS DATA DUMMY'])
        ->assertSessionHas('success');

    expect(User::query()->where('email', 'hr@tokopedia.com')->exists())->toBeFalse();

    $log = AuditLog::query()->where('action', 'showcase.purge')->sole();

    expect($log->after_values['employers'])->toBe(2);
});

test('purge removes showcase rows and leaves real data untouched', function (): void {
    $admin = User::factory()->admin()->create();

    $seeded = seededEmployer('gojek.com');
    $seededCandidate = seededCandidate(1);

    // A genuine employer and job seeker that must survive, including one whose
    // email merely resembles nothing in the seeder list.
    $realEmployer = User::factory()->employer()->create(['email' => 'rekrutmen@perusahaanasli.co.id']);
    $realCompany = Company::factory()->create(['owner_id' => $realEmployer->id]);
    $realJob = Job::factory()->published()->create([
        'company_id' => $realCompany->id,
        'posted_by_user_id' => $realEmployer->id,
    ]);
    $realCandidate = User::factory()->employee()->create(['email' => 'budi@gmail.com']);
    $realProfile = EmployeeProfile::factory()->create(['user_id' => $realCandidate->id]);

    $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->delete(route('admin.showcase-data.destroy'), ['confirmation' => 'HAPUS DATA DUMMY'])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(User::query()->whereKey($seeded['user']->id)->exists())->toBeFalse()
        ->and(Company::query()->whereKey($seeded['company']->id)->exists())->toBeFalse()
        ->and(Job::query()->whereKey($seeded['job']->id)->exists())->toBeFalse()
        ->and(User::query()->whereKey($seededCandidate['user']->id)->exists())->toBeFalse()
        ->and(EmployeeProfile::query()->whereKey($seededCandidate['profile']->id)->exists())->toBeFalse();

    expect(User::query()->whereKey($realEmployer->id)->exists())->toBeTrue()
        ->and(Company::query()->whereKey($realCompany->id)->exists())->toBeTrue()
        ->and(Job::query()->whereKey($realJob->id)->exists())->toBeTrue()
        ->and(User::query()->whereKey($realCandidate->id)->exists())->toBeTrue()
        ->and(EmployeeProfile::query()->whereKey($realProfile->id)->exists())->toBeTrue()
        ->and(User::query()->whereKey($admin->id)->exists())->toBeTrue();
});

test('an account matching the dummy pattern but with a changed password is spared', function (): void {
    // The scenario this guards: the seeded hr@gojek.com was removed at some
    // point and a real recruiter later claimed the address.
    $admin = User::factory()->admin()->create();
    $real = seededEmployer('gojek.com', password: 'a-real-persons-password');

    $this->actingAs($admin)
        ->get(route('admin.showcase-data.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->loadDeferredProps(fn ($deferred) => $deferred
                ->where('preview.employers', 0)
                ->has('preview.suspects', 1)
                ->where('preview.suspects.0.email', 'hr@gojek.com')
            )
        );

    $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->delete(route('admin.showcase-data.destroy'), ['confirmation' => 'HAPUS DATA DUMMY'])
        ->assertRedirect()
        ->assertSessionHas('error');

    expect(User::query()->whereKey($real['user']->id)->exists())->toBeTrue()
        ->and(Company::query()->whereKey($real['company']->id)->exists())->toBeTrue();
});

test('a showcase company that was already soft deleted is purged too', function (): void {
    // Company soft-deletes, and a soft-deleted row keeps its owner_id, so leaving
    // it behind would pin the employer account via the restrict foreign key.
    $admin = User::factory()->admin()->create();
    $seeded = seededEmployer('gojek.com');
    $seeded['company']->delete();

    $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->delete(route('admin.showcase-data.destroy'), ['confirmation' => 'HAPUS DATA DUMMY'])
        ->assertSessionHas('success');

    expect(Company::withTrashed()->whereKey($seeded['company']->id)->exists())->toBeFalse()
        ->and(Job::withTrashed()->whereKey($seeded['job']->id)->exists())->toBeFalse()
        ->and(User::query()->whereKey($seeded['user']->id)->exists())->toBeFalse();
});

test('the preview counts applications real candidates filed against dummy jobs', function (): void {
    $admin = User::factory()->admin()->create();
    $seeded = seededEmployer('gojek.com');
    $seededCandidate = seededCandidate(1);

    $realCandidate = User::factory()->employee()->create(['email' => 'sinta@gmail.com']);
    $realProfile = EmployeeProfile::factory()->create(['user_id' => $realCandidate->id]);

    Application::factory()->create([
        'job_id' => $seeded['job']->id,
        'employee_profile_id' => $seededCandidate['profile']->id,
    ]);
    Application::factory()->create([
        'job_id' => $seeded['job']->id,
        'employee_profile_id' => $realProfile->id,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.showcase-data.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->loadDeferredProps(fn ($deferred) => $deferred
                ->where('preview.applications', 2)
                ->where('preview.applications_from_real_candidates', 1)
            )
        );
});

test('a purge is written to the audit log with the counts it removed', function (): void {
    $admin = User::factory()->admin()->create();
    seededEmployer('gojek.com');
    seededCandidate(1);

    $this->actingAs($admin)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->delete(route('admin.showcase-data.destroy'), ['confirmation' => 'HAPUS DATA DUMMY']);

    $log = AuditLog::query()->where('action', 'showcase.purge')->sole();

    expect($log->user_id)->toBe($admin->id)
        ->and($log->after_values['companies'])->toBe(1)
        ->and($log->after_values['employers'])->toBe(1)
        ->and($log->after_values['candidates'])->toBe(1);
});

test('the purger reports nothing on a database that never held showcase data', function (): void {
    User::factory()->employer()->create(['email' => 'hrd@perusahaan.co.id']);
    User::factory()->employee()->create(['email' => 'kandidat@gmail.com']);

    $preview = app(ShowcaseDataPurger::class)->preview();

    expect($preview['employers'])->toBe(0)
        ->and($preview['candidates'])->toBe(0)
        ->and($preview['companies'])->toBe(0)
        ->and($preview['suspects'])->toBe([]);
});

test('the console command deletes nothing without the apply flag', function (): void {
    User::factory()->admin()->create();
    $seeded = seededEmployer('gojek.com');

    $this->artisan('showcase:purge')->assertExitCode(0);

    expect(Company::query()->whereKey($seeded['company']->id)->exists())->toBeTrue();

    $this->artisan('showcase:purge --apply --force')->assertExitCode(0);

    expect(Company::query()->whereKey($seeded['company']->id)->exists())->toBeFalse();
});
