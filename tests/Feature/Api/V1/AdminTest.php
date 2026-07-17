<?php

use App\Enums\CompanyStatus;
use App\Enums\ReviewStatus;
use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\JobCategory;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
    Notification::fake();
});

function adminToken(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

function apiAdminUser(): User
{
    return User::factory()->admin()->create(['password' => 'password']);
}

describe('admin access control', function (): void {
    it('blocks a jobseeker from the admin api', function (): void {
        $seeker = User::factory()->employee()->create(['password' => 'password']);

        $this->withHeaders(adminToken($seeker))->getJson('/api/v1/admin/users')->assertStatus(403);
    });

    it('blocks an employer from the admin api', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);

        $this->withHeaders(adminToken($employer))->getJson('/api/v1/admin/companies')->assertStatus(403);
    });

    it('blocks a guest', function (): void {
        $this->getJson('/api/v1/admin/users')->assertStatus(401);
    });

    it('refuses a suspended admin even with a valid token', function (): void {
        // The token's is_active claim is only a snapshot taken at login;
        // role:admin re-reads the database, and that is what must decide.
        $admin = apiAdminUser();
        $headers = adminToken($admin);

        $this->withHeaders($headers)->getJson('/api/v1/admin/users')->assertOk();

        $admin->forceFill(['is_active' => false])->save();

        // Each real request resolves the guard from scratch. The test container
        // persists between calls, so the guard would otherwise hand back the
        // user it cached on the previous request and never notice the change.
        $this->app['auth']->forgetGuards();

        $this->withHeaders($headers)->getJson('/api/v1/admin/users')->assertStatus(403);
    });
});

describe('company moderation', function (): void {
    it('lists companies in every state, unlike the public listing', function (): void {
        Company::factory()->create(['name' => 'Pending Co', 'status' => CompanyStatus::Pending]);
        Company::factory()->approved()->create(['name' => 'Approved Co']);

        $names = collect($this->withHeaders(adminToken(apiAdminUser()))
            ->getJson('/api/v1/admin/companies')->assertOk()->json('data'))->pluck('name');

        expect($names)->toContain('Pending Co')->toContain('Approved Co');
    });

    it('approves a company', function (): void {
        $company = Company::factory()->create(['status' => CompanyStatus::Pending]);

        $this->withHeaders(adminToken(apiAdminUser()))
            ->postJson('/api/v1/admin/companies/'.$company->id.'/approve')
            ->assertOk();

        expect($company->fresh()->status)->toBe(CompanyStatus::Approved);
    });

    it('suspends a company', function (): void {
        $company = Company::factory()->approved()->create();

        $this->withHeaders(adminToken(apiAdminUser()))
            ->postJson('/api/v1/admin/companies/'.$company->id.'/suspend')
            ->assertOk();

        expect($company->fresh()->status)->toBe(CompanyStatus::Suspended);
    });

    it('returns queue counts', function (): void {
        Company::factory()->create(['status' => CompanyStatus::Pending]);

        $this->withHeaders(adminToken(apiAdminUser()))
            ->getJson('/api/v1/admin/queue-counts')
            ->assertOk()
            ->assertJsonStructure(['data' => ['companies_pending', 'verifications_pending', 'reviews_pending']]);
    });
});

describe('review moderation', function (): void {
    it('lists pending reviews by default', function (): void {
        CompanyReview::factory()->create(['title' => 'Waiting', 'status' => ReviewStatus::Pending]);
        CompanyReview::factory()->create(['title' => 'Already Live', 'status' => ReviewStatus::Approved]);

        $titles = collect($this->withHeaders(adminToken(apiAdminUser()))
            ->getJson('/api/v1/admin/reviews')->assertOk()->json('data'))->pluck('title');

        expect($titles)->toContain('Waiting')->not->toContain('Already Live');
    });

    it('approves a review so it becomes public', function (): void {
        $review = CompanyReview::factory()->create(['status' => ReviewStatus::Pending]);

        $this->withHeaders(adminToken(apiAdminUser()))
            ->postJson('/api/v1/admin/reviews/'.$review->id.'/approve')
            ->assertOk();

        expect($review->fresh()->status)->toBe(ReviewStatus::Approved);
    });

    it('rejects a review', function (): void {
        $review = CompanyReview::factory()->create(['status' => ReviewStatus::Pending]);

        $this->withHeaders(adminToken(apiAdminUser()))
            ->postJson('/api/v1/admin/reviews/'.$review->id.'/reject', ['note' => 'Tidak sesuai pedoman.'])
            ->assertOk();

        expect($review->fresh()->status)->toBe(ReviewStatus::Rejected);
    });
});

describe('user management', function (): void {
    it('lists users with role counts', function (): void {
        $this->withHeaders(adminToken(apiAdminUser()))
            ->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['counts' => ['admin', 'employer', 'employee']]]);
    });

    it('promotes a user to admin', function (): void {
        // The legitimate path for granting admin, unlike public registration.
        $admin = apiAdminUser();
        $user = User::factory()->employee()->create();

        $this->withHeaders(adminToken($admin))
            ->putJson('/api/v1/admin/users/'.$user->id, [
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'admin',
                'is_active' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.role', 'admin');
    });

    it('refuses to let an admin demote themselves', function (): void {
        $admin = apiAdminUser();

        $this->withHeaders(adminToken($admin))
            ->putJson('/api/v1/admin/users/'.$admin->id, [
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => 'employee',
                'is_active' => true,
            ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'cannot_change_own_role');

        expect($admin->fresh()->role->value)->toBe('admin');
    });

    it('refuses to let an admin suspend themselves', function (): void {
        $admin = apiAdminUser();

        $this->withHeaders(adminToken($admin))
            ->postJson('/api/v1/admin/users/'.$admin->id.'/suspend')
            ->assertStatus(422)
            ->assertJsonPath('code', 'cannot_deactivate_self');

        expect($admin->fresh()->is_active)->toBeTrue();
    });

    it('suspends and reactivates another user', function (): void {
        $admin = apiAdminUser();
        $user = User::factory()->employee()->create();
        $headers = adminToken($admin);

        $this->withHeaders($headers)->postJson('/api/v1/admin/users/'.$user->id.'/suspend')->assertOk();
        expect($user->fresh()->is_active)->toBeFalse();

        $this->withHeaders($headers)->postJson('/api/v1/admin/users/'.$user->id.'/activate')->assertOk();
        expect($user->fresh()->is_active)->toBeTrue();
    });
});

describe('taxonomy crud', function (): void {
    it('creates a job category and derives its slug', function (): void {
        $this->withHeaders(adminToken(apiAdminUser()))
            ->postJson('/api/v1/admin/taxonomy/job-categories', [
                'name' => 'Data Science',
                'is_active' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'data-science');
    });

    it('lists a taxonomy resource', function (): void {
        JobCategory::factory()->create(['name' => 'Engineering']);

        $this->withHeaders(adminToken(apiAdminUser()))
            ->getJson('/api/v1/admin/taxonomy/job-categories')
            ->assertOk()
            ->assertJsonPath('meta.resource', 'job-categories');
    });

    it('updates and deletes a taxonomy row', function (): void {
        $admin = apiAdminUser();
        $headers = adminToken($admin);
        $category = JobCategory::factory()->create(['name' => 'Old Name']);

        $this->withHeaders($headers)->putJson('/api/v1/admin/taxonomy/job-categories/'.$category->id, [
            'name' => 'New Name',
            'is_active' => true,
        ])->assertOk()->assertJsonPath('data.name', 'New Name');

        $this->withHeaders($headers)
            ->deleteJson('/api/v1/admin/taxonomy/job-categories/'.$category->id)
            ->assertOk();

        $this->assertDatabaseMissing('job_categories', ['id' => $category->id]);
    });

    it('404s an unknown taxonomy resource', function (): void {
        $this->withHeaders(adminToken(apiAdminUser()))
            ->getJson('/api/v1/admin/taxonomy/not-a-real-table')
            ->assertStatus(404);
    });

    it('validates taxonomy input', function (): void {
        $this->withHeaders(adminToken(apiAdminUser()))
            ->postJson('/api/v1/admin/taxonomy/job-categories', ['is_active' => true])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    });
});

describe('admin billing views', function (): void {
    it('lists orders with total revenue', function (): void {
        $this->withHeaders(adminToken(apiAdminUser()))
            ->getJson('/api/v1/admin/orders')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['revenue_idr']]);
    });

    it('lists audit logs', function (): void {
        $this->withHeaders(adminToken(apiAdminUser()))
            ->getJson('/api/v1/admin/audit-logs')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['total']]);
    });
});
