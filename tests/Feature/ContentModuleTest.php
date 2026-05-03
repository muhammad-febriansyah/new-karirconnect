<?php

use App\Models\Announcement;
use App\Models\CareerResource;
use App\Models\City;
use App\Models\CompanyReview;
use App\Models\ContactMessage;
use App\Models\Faq;
use App\Models\LegalPage;
use App\Models\Report;
use App\Models\SalaryInsight;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can manage content resources', function () {
    $admin = User::factory()->admin()->create(['email_verified_at' => now()]);

    $this->actingAs($admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Maintenance Mingguan',
            'slug' => '',
            'body' => '<p>Platform akan maintenance hari Sabtu.</p>',
            'audience' => 'all',
            'is_published' => true,
        ])
        ->assertRedirect(route('admin.announcements.index'));

    $announcement = Announcement::query()->firstOrFail();

    $this->actingAs($admin)
        ->post(route('admin.career-resources.store'), [
            'title' => 'Cara Menulis CV Backend',
            'slug' => '',
            'excerpt' => 'Panduan ringkas menulis CV backend.',
            'body' => '<p>Fokus pada impact, stack, dan hasil terukur.</p>',
            'category' => 'CV',
            'tags' => ['cv', 'backend'],
            'reading_minutes' => 6,
            'is_published' => true,
        ])
        ->assertRedirect(route('admin.career-resources.index'));

    $resource = CareerResource::query()->firstOrFail();

    $this->actingAs($admin)
        ->post(route('admin.faqs.store'), [
            'question' => 'Apakah employer bisa melihat profil private?',
            'answer' => '<p>Tidak, hanya profil public atau recruiter_only yang dapat muncul.</p>',
            'category' => 'Employee',
            'order_number' => 1,
            'is_published' => true,
        ])
        ->assertRedirect(route('admin.faqs.index'));

    $faq = Faq::query()->firstOrFail();

    $this->actingAs($admin)
        ->post(route('admin.legal-pages.store'), [
            'slug' => 'privacy',
            'title' => 'Kebijakan Privasi',
            'body' => '<p>Kami menjaga data kandidat dengan standar terbaik.</p>',
        ])
        ->assertRedirect(route('admin.legal-pages.index'));

    $legalPage = LegalPage::query()->firstOrFail();

    expect($announcement->slug)->toBe('maintenance-mingguan')
        ->and($resource->slug)->toBe('cara-menulis-cv-backend')
        ->and($faq->category)->toBe('Employee')
        ->and($legalPage->slug)->toBe('privacy');
});

test('public can browse published content and submit contact message', function () {
    $resource = CareerResource::factory()->create([
        'title' => 'Tips Interview Backend',
        'slug' => 'tips-interview-backend',
        'is_published' => true,
        'published_at' => now(),
        'views_count' => 10,
    ]);

    Faq::factory()->create([
        'question' => 'Bagaimana sistem assessment berjalan?',
        'is_published' => true,
    ]);

    LegalPage::factory()->create([
        'slug' => 'terms',
        'title' => 'Syarat Penggunaan',
    ]);

    $this->get(route('public.career-resources.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('public/career-resources/index'));

    $this->get(route('public.career-resources.show', $resource->slug))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('public/career-resources/show'));

    expect($resource->fresh()->views_count)->toBe(11);

    $this->get(route('public.faq'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('public/faq'));

    $this->get(route('public.legal.show', 'terms'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('public/legal/show'));

    $this->post(route('public.contact.store'), [
        'name' => 'Budi',
        'email' => 'budi@example.com',
        'subject' => 'Ingin kerja sama kampus',
        'message' => 'Apakah KarirConnect membuka kerja sama campus hiring?',
    ])->assertRedirect();

    expect(ContactMessage::query()->count())->toBe(1)
        ->and(ContactMessage::query()->first()?->status)->toBe('new');
});

test('admin can manage salary insights and review reports', function () {
    $admin = User::factory()->admin()->create(['email_verified_at' => now()]);
    $city = City::factory()->create(['name' => 'Jakarta']);

    $this->actingAs($admin)
        ->post(route('admin.salary-insights.store'), [
            'job_title' => 'Senior Backend Engineer',
            'role_category' => 'Software Engineering',
            'city_id' => $city->id,
            'experience_level' => 'senior',
            'min_salary' => 'Rp 18.000.000',
            'median_salary' => 'Rp 25.000.000',
            'max_salary' => 'Rp 32.000.000',
            'sample_size' => 24,
            'source' => 'manual',
        ])
        ->assertRedirect(route('admin.salary-insights.index'));

    $insight = SalaryInsight::query()->firstOrFail();

    expect($insight->median_salary)->toBe(25000000);

    $review = CompanyReview::factory()->create();
    $report = Report::factory()->create([
        'reportable_type' => $review::class,
        'reportable_id' => $review->id,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.reports.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/reports/index'));

    $this->actingAs($admin)
        ->post(route('admin.reports.review', $report), [
            'status' => 'reviewed',
        ])
        ->assertRedirect(route('admin.reports.index'));

    $report->refresh();

    expect($report->status)->toBe('reviewed')
        ->and($report->reviewed_by)->toBe($admin->id);
});
