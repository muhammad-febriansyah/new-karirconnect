<?php

use App\Models\Company;
use App\Models\CompanyReview;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    $this->seed([
        SettingSeeder::class,
        ProvinceCitySeeder::class,
        LookupSeeder::class,
    ]);
    Cache::flush();
});

test('homepage renders with metrics and featured jobs', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id, 'name' => 'Acme Engineering']);
    Job::factory()->published()->count(3)->create(['company_id' => $company->id]);

    $employee = User::factory()->employee()->create();
    EmployeeProfile::factory()->create(['user_id' => $employee->id]);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('home.metrics.open_jobs', 3)
            ->where('home.metrics.active_companies', 1)
            ->where('home.metrics.candidates', 1)
            ->has('home.featured_jobs', 3)
        );
});

test('homepage exposes top companies sorted by approved review count', function () {
    $ownerA = User::factory()->employer()->create();
    $popular = Company::factory()->approved()->create(['owner_id' => $ownerA->id, 'name' => 'Popular Co']);
    $ownerB = User::factory()->employer()->create();
    $quiet = Company::factory()->approved()->create(['owner_id' => $ownerB->id, 'name' => 'Quiet Co']);

    foreach (range(1, 3) as $i) {
        $reviewer = User::factory()->employee()->create();
        CompanyReview::query()->create([
            'company_id' => $popular->id,
            'user_id' => $reviewer->id,
            'title' => 'Great place '.$i,
            'rating' => 5,
            'employment_status' => 'former',
            'pros' => 'great team',
            'cons' => 'long hours',
            'status' => 'approved',
        ]);
    }

    $reviewerOne = User::factory()->employee()->create();
    CompanyReview::query()->create([
        'company_id' => $quiet->id,
        'user_id' => $reviewerOne->id,
        'title' => 'Decent',
        'rating' => 4,
        'employment_status' => 'former',
        'pros' => 'fine',
        'cons' => 'ok',
        'status' => 'approved',
    ]);

    $this->get('/')
        ->assertInertia(fn ($page) => $page
            ->where('home.top_companies.0.name', 'Popular Co')
            ->where('home.top_companies.0.review_count', 3)
        );
});

test('homepage top categories reflect job counts', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);

    $catA = JobCategory::query()->where('slug', 'teknologi-informasi')->first()
        ?? JobCategory::query()->first();

    Job::factory()->published()->count(2)->create(['company_id' => $company->id, 'job_category_id' => $catA->id]);

    $this->get('/')
        ->assertInertia(fn ($page) => $page
            ->has('home.top_categories', fn ($cats) => $cats
                ->where('0.name', $catA->name)
                ->where('0.job_count', 2)
                ->etc()
            )
        );
});

test('sitemap returns xml content type with public urls', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id, 'slug' => 'acme']);
    Job::factory()->published()->create(['company_id' => $company->id, 'title' => 'Senior Engineer']);

    $response = $this->get('/sitemap.xml');

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('application/xml');
    $body = $response->getContent();
    expect($body)->toContain('<urlset')
        ->toContain(url('/'))
        ->toContain('/jobs/senior-engineer')
        ->toContain('/companies/acme');
});

test('sitemap omits draft jobs', function () {
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    Job::factory()->create(['company_id' => $company->id, 'title' => 'Hidden Draft']);

    $response = $this->get('/sitemap.xml');
    expect($response->getContent())->not->toContain('hidden-draft');
});

test('robots txt advertises sitemap and disallows admin paths', function () {
    $response = $this->get('/robots.txt');

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('text/plain');
    $body = $response->getContent();
    expect($body)->toContain('Disallow: /admin')
        ->toContain('Disallow: /employer')
        ->toContain('Sitemap:')
        ->toContain('/sitemap.xml');
});

test('homepage works for authenticated users without redirecting', function () {
    $user = User::factory()->employee()->create();
    EmployeeProfile::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('welcome'));
});

test('homepage includes server rendered seo metadata', function () {
    $response = $this->get('/');

    $response->assertOk();

    $content = $response->getContent();

    expect($content)
        ->toContain('>KarirConnect</title>')
        ->toContain('name="description"')
        ->toContain('property="og:title"')
        ->toContain('rel="canonical" href="'.route('home').'"')
        ->toContain('data-inertia="structured-data"')
        ->toContain('WebSite');
});
