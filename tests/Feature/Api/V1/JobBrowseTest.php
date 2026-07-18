<?php

use App\Enums\CompanyStatus;
use App\Enums\ScreeningQuestionType;
use App\Models\Application;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobScreeningQuestion;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
});

function apiJob(array $attributes = [], ?Company $company = null): Job
{
    $owner = User::factory()->employer()->create();
    $company ??= Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $category = JobCategory::query()->first() ?? JobCategory::factory()->create();

    return Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $category->id,
        ...$attributes,
    ]);
}

describe('job listing', function (): void {
    it('lists published jobs to a guest', function (): void {
        apiJob(['title' => 'Backend Engineer']);

        $this->getJson('/api/v1/jobs')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Backend Engineer')
            ->assertJsonStructure([
                'data' => [['id', 'slug', 'title', 'company', 'salary_min', 'is_salary_visible']],
                'links',
                'meta' => ['current_page', 'total'],
            ]);
    });

    it('hides jobs that are not published', function (): void {
        apiJob(['title' => 'Visible']);
        apiJob(['title' => 'Hidden Draft', 'status' => 'draft', 'published_at' => null]);

        $response = $this->getJson('/api/v1/jobs')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.title'))->toBe('Visible');
    });

    it('excludes jobs whose deadline has passed', function (): void {
        apiJob(['title' => 'Still Open', 'application_deadline' => now()->addWeek()]);
        apiJob(['title' => 'Expired', 'application_deadline' => now()->subDay()]);

        $titles = collect($this->getJson('/api/v1/jobs')->assertOk()->json('data'))->pluck('title');

        expect($titles)->toContain('Still Open')->not->toContain('Expired');
    });

    it('filters by search across title', function (): void {
        apiJob(['title' => 'Flutter Developer']);
        apiJob(['title' => 'Accountant']);

        $response = $this->getJson('/api/v1/jobs?search=Flutter')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.title'))->toBe('Flutter Developer');
    });

    it('accepts an enum filter as a single value or a list', function (): void {
        apiJob(['title' => 'Remote Role', 'work_arrangement' => 'remote']);
        apiJob(['title' => 'Onsite Role', 'work_arrangement' => 'onsite']);

        $single = $this->getJson('/api/v1/jobs?work_arrangement=remote')->assertOk();
        expect($single->json('data'))->toHaveCount(1);

        $list = $this->getJson('/api/v1/jobs?work_arrangement[]=remote&work_arrangement[]=onsite')->assertOk();
        expect($list->json('data'))->toHaveCount(2);
    });

    it('rejects an unknown enum filter value', function (): void {
        $this->getJson('/api/v1/jobs?work_arrangement=teleport')
            ->assertStatus(422)
            ->assertJsonValidationErrors('work_arrangement.0');
    });

    it('caps per_page so a caller cannot request the whole table', function (): void {
        $this->getJson('/api/v1/jobs?per_page=5000')
            ->assertStatus(422)
            ->assertJsonValidationErrors('per_page');
    });

    it('sorts by salary descending on request', function (): void {
        apiJob(['title' => 'Low', 'salary_min' => 5_000_000, 'salary_max' => 6_000_000]);
        apiJob(['title' => 'High', 'salary_min' => 20_000_000, 'salary_max' => 30_000_000]);

        $titles = collect($this->getJson('/api/v1/jobs?sort=salary_desc')->assertOk()->json('data'))->pluck('title');

        expect($titles->first())->toBe('High');
    });
});

describe('salary and anonymity masking', function (): void {
    it('withholds salary when the employer hid it', function (): void {
        apiJob([
            'is_salary_visible' => false,
            'salary_min' => 15_000_000,
            'salary_max' => 25_000_000,
        ]);

        $row = $this->getJson('/api/v1/jobs')->assertOk()->json('data.0');

        expect($row['salary_min'])->toBeNull()
            ->and($row['salary_max'])->toBeNull()
            ->and($row['is_salary_visible'])->toBeFalse();
    });

    it('withholds salary on the detail endpoint too', function (): void {
        $job = apiJob(['is_salary_visible' => false, 'salary_min' => 15_000_000]);

        $this->getJson('/api/v1/jobs/'.$job->slug)
            ->assertOk()
            ->assertJsonPath('data.salary_min', null);
    });

    it('masks the employer on an anonymous posting', function (): void {
        $company = Company::factory()->approved()->create(['name' => 'Secret Corp']);
        apiJob(['is_anonymous' => true], $company);

        $row = $this->getJson('/api/v1/jobs')->assertOk()->json('data.0');

        expect($row['company']['name'])->toBe('Confidential')
            ->and($row['company']['logo_url'])->toBeNull();

        // Neither id nor slug may appear: either resolves straight back to the
        // employer through the public company endpoint.
        expect($row['company'])->not->toHaveKey('id')
            ->and($row['company'])->not->toHaveKey('slug');

        expect(json_encode($row))->not->toContain('Secret Corp');
    });

    it('withholds the company about text on an anonymous posting', function (): void {
        $company = Company::factory()->approved()->create([
            'name' => 'Secret Corp',
            'about' => 'We are a stealth startup.',
        ]);
        $job = apiJob(['is_anonymous' => true], $company);

        $response = $this->getJson('/api/v1/jobs/'.$job->slug)->assertOk();

        expect($response->json('data.company_about'))->toBeNull()
            ->and(json_encode($response->json()))->not->toContain('stealth startup');
    });
});

describe('job detail', function (): void {
    it('returns a published job with similar jobs', function (): void {
        $job = apiJob(['title' => 'Data Analyst']);

        $this->getJson('/api/v1/jobs/'.$job->slug)
            ->assertOk()
            ->assertJsonPath('data.title', 'Data Analyst')
            ->assertJsonStructure(['data' => ['description', 'screening_questions'], 'meta' => ['similar']]);
    });

    it('404s an unpublished job', function (): void {
        $job = apiJob(['status' => 'draft', 'published_at' => null]);

        $this->getJson('/api/v1/jobs/'.$job->slug)->assertStatus(404);
    });

    it('counts a view', function (): void {
        $job = apiJob();

        $this->getJson('/api/v1/jobs/'.$job->slug)->assertOk();

        $this->assertDatabaseHas('job_views', ['job_id' => $job->id, 'user_id' => null]);
        expect($job->fresh()->views_count)->toBe(1);
    });

    it('omits viewer context for a guest', function (): void {
        $job = apiJob();

        $response = $this->getJson('/api/v1/jobs/'.$job->slug)->assertOk();

        expect($response->json('meta'))->not->toHaveKey('is_saved');
    });

    it('adds viewer context when a bearer token is present', function (): void {
        // The route is public, so this only works if the controller reads the
        // api guard rather than the request's default (session) user.
        $job = apiJob();
        $user = User::factory()->employee()->create(['password' => 'password']);
        EmployeeProfile::factory()->create(['user_id' => $user->id]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email, 'password' => 'password',
        ])->assertOk()->json('data.tokens.access_token');

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/jobs/'.$job->slug)
            ->assertOk();

        expect($response->json('meta'))->toHaveKey('is_saved')
            ->and($response->json('meta.is_saved'))->toBeFalse()
            ->and($response->json('meta'))->toHaveKey('match_score');

        $this->assertDatabaseHas('job_views', ['job_id' => $job->id, 'user_id' => $user->id]);
    });

    it('treats a broken token as a guest rather than failing the page', function (): void {
        $job = apiJob();

        $this->withHeader('Authorization', 'Bearer garbage-token')
            ->getJson('/api/v1/jobs/'.$job->slug)
            ->assertOk();
    });
});

describe('company browsing', function (): void {
    it('lists recruiter-active companies with their open job count', function (): void {
        $company = Company::factory()->approved()->create(['name' => 'Acme']);
        apiJob([], $company);

        $response = $this->getJson('/api/v1/companies')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.name'))->toBe('Acme')
            ->and($response->json('data.0.open_jobs_count'))->toBe(1);
    });

    it('hides companies that are not recruiter-active', function (): void {
        Company::factory()->approved()->create(['name' => 'Visible Co']);
        Company::factory()->create(['name' => 'Pending Co', 'status' => CompanyStatus::Pending]);

        $names = collect($this->getJson('/api/v1/companies')->assertOk()->json('data'))->pluck('name');

        expect($names)->toContain('Visible Co')->not->toContain('Pending Co');
    });

    it('404s a company detail that is not recruiter-active', function (): void {
        $company = Company::factory()->create(['status' => CompanyStatus::Suspended]);

        $this->getJson('/api/v1/companies/'.$company->slug)->assertStatus(404);
    });

    it('returns a company detail', function (): void {
        $company = Company::factory()->approved()->create(['name' => 'Acme', 'about' => 'We build things.']);

        $this->getJson('/api/v1/companies/'.$company->slug)
            ->assertOk()
            ->assertJsonPath('data.name', 'Acme')
            ->assertJsonPath('data.about', 'We build things.')
            ->assertJsonStructure(['data' => ['offices', 'badges', 'cover_url']]);
    });

    it('paginates company jobs instead of capping them', function (): void {
        $company = Company::factory()->approved()->create();
        foreach (range(1, 3) as $i) {
            apiJob(['title' => "Role {$i}"], $company);
        }

        $response = $this->getJson('/api/v1/companies/'.$company->slug.'/jobs?per_page=2')->assertOk();

        expect($response->json('data'))->toHaveCount(2)
            ->and($response->json('meta.total'))->toBe(3);
    });

    it('filters companies by search', function (): void {
        Company::factory()->approved()->create(['name' => 'Tokopedia']);
        Company::factory()->approved()->create(['name' => 'Gojek']);

        $response = $this->getJson('/api/v1/companies?search=Toko')->assertOk();

        expect($response->json('data'))->toHaveCount(1)
            ->and($response->json('data.0.name'))->toBe('Tokopedia');
    });
});

describe('meta', function (): void {
    it('returns the taxonomy the filter sheet needs', function (): void {
        $this->getJson('/api/v1/meta')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'job_categories', 'industries', 'company_sizes',
                    'provinces', 'cities', 'skills',
                    'employment_types', 'work_arrangements',
                    'experience_levels', 'education_levels',
                ],
            ]);
    });

    it('only offers active taxonomy entries', function (): void {
        JobCategory::factory()->create(['name' => 'Retired Category', 'is_active' => false]);

        $names = collect($this->getJson('/api/v1/meta')->assertOk()->json('data.job_categories'))->pluck('name');

        expect($names)->not->toContain('Retired Category');
    });
});

describe('job detail screening + viewer context', function (): void {
    it('exposes options for a choice screening question', function (): void {
        // The choice types are unanswerable on the client without their options;
        // text/number/yes_no questions have none.
        $job = apiJob(['title' => 'With Screening']);
        JobScreeningQuestion::factory()->create([
            'job_id' => $job->id,
            'question' => 'Level React Anda?',
            'type' => ScreeningQuestionType::SingleChoice,
            'options' => ['Pemula', 'Menengah', 'Mahir'],
        ]);

        $this->getJson('/api/v1/jobs/'.$job->slug)
            ->assertOk()
            ->assertJsonPath('data.screening_questions.0.type', 'single_choice')
            ->assertJsonPath('data.screening_questions.0.options', ['Pemula', 'Menengah', 'Mahir']);
    });

    it('reports has_applied for the authenticated viewer', function (): void {
        $user = User::factory()->employee()->create(['password' => 'password']);
        $profile = EmployeeProfile::factory()->create([
            'user_id' => $user->id,
            'profile_completion' => 80,
        ]);
        $job = apiJob(['title' => 'Applied Job']);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->json('data.tokens.access_token');
        $headers = ['Authorization' => 'Bearer '.$token];

        // Before applying.
        $this->withHeaders($headers)
            ->getJson('/api/v1/jobs/'.$job->slug)
            ->assertOk()
            ->assertJsonPath('meta.has_applied', false);

        Application::factory()->create([
            'job_id' => $job->id,
            'employee_profile_id' => $profile->id,
        ]);

        // After applying.
        $this->withHeaders($headers)
            ->getJson('/api/v1/jobs/'.$job->slug)
            ->assertOk()
            ->assertJsonPath('meta.has_applied', true);
    });
});
