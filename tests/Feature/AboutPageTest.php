<?php

use App\Models\AboutPage;
use App\Models\User;
use Database\Seeders\SettingSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class]);
});

test('non admin cannot access about page editor', function () {
    $employer = User::factory()->employer()->create();

    $this->actingAs($employer)
        ->get(route('admin.about-page.edit'))
        ->assertForbidden();
});

test('admin sees editor with empty defaults on first load', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('admin.about-page.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/about-page/edit')
            ->where('page.values', [])
            ->where('page.stats', [])
            ->where('page.team_members', []));
});

test('admin can update text fields and persist', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('admin.about-page.update'), [
            'hero_title' => 'Membangun karier terbaik di Indonesia',
            'hero_subtitle' => 'Platform karier all-in-one.',
            'story_body' => '<p>Mulai dari ide kecil di 2024.</p>',
            'vision' => '<p>Menjadi platform karier...</p>',
            'mission' => '<ul><li>Hubungkan kandidat & perusahaan</li></ul>',
            'office_address' => 'Jl. Sudirman No. 1, Jakarta',
            'seo_title' => 'Tentang KarirConnect',
            'seo_description' => 'Cerita & visi misi KarirConnect.',
        ])
        ->assertRedirect(route('admin.about-page.edit'))
        ->assertSessionHas('success');

    $page = AboutPage::firstSingleton();
    expect($page->hero_title)->toBe('Membangun karier terbaik di Indonesia');
    expect($page->story_body)->toContain('ide kecil');
    expect($page->seo_title)->toBe('Tentang KarirConnect');
});

test('admin can upload hero image and old file is replaced', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();

    // First upload
    $this->actingAs($admin)
        ->post(route('admin.about-page.update'), [
            'hero_title' => 'Hero v1',
            'hero_image' => UploadedFile::fake()->image('hero1.jpg', 1600, 600),
        ])
        ->assertRedirect();

    $first = AboutPage::firstSingleton()->hero_image_path;
    expect($first)->not->toBeNull();
    Storage::disk('public')->assertExists($first);

    // Second upload replaces first
    $this->actingAs($admin)
        ->post(route('admin.about-page.update'), [
            'hero_title' => 'Hero v2',
            'hero_image' => UploadedFile::fake()->image('hero2.jpg', 1600, 600),
        ])
        ->assertRedirect();

    $second = AboutPage::firstSingleton()->hero_image_path;
    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);
});

test('admin can persist values stats and team repeaters', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('admin.about-page.update'), [
            'values' => [
                ['icon' => 'shield', 'title' => 'Transparan', 'body' => 'Selalu jujur'],
                ['icon' => 'heart', 'title' => 'Peduli', 'body' => 'Kandidat utama'],
            ],
            'stats' => [
                ['number' => '10.000+', 'label' => 'Kandidat', 'description' => 'Sejak 2024'],
                ['number' => '200+', 'label' => 'Perusahaan'],
            ],
            'team_members' => [
                [
                    'name' => 'Budi Santoso',
                    'role' => 'CEO',
                    'bio_short' => 'Founder',
                    'linkedin_url' => 'https://linkedin.com/in/budi',
                    'photo' => UploadedFile::fake()->image('budi.jpg', 400, 400),
                ],
            ],
        ])
        ->assertRedirect();

    $page = AboutPage::firstSingleton();
    expect($page->values)->toHaveCount(2);
    expect($page->values[0]['title'])->toBe('Transparan');
    expect($page->stats)->toHaveCount(2);
    expect($page->stats[1]['description'])->toBeNull();
    expect($page->team_members)->toHaveCount(1);
    expect($page->team_members[0]['name'])->toBe('Budi Santoso');
    expect($page->team_members[0]['photo_path'])->not->toBeNull();
    Storage::disk('public')->assertExists($page->team_members[0]['photo_path']);
});

test('values without title are filtered out', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('admin.about-page.update'), [
            'values' => [
                ['icon' => 'a', 'title' => 'Valid', 'body' => 'x'],
                ['icon' => 'b', 'title' => '', 'body' => 'no title — should be dropped'],
            ],
        ])
        ->assertRedirect();

    expect(AboutPage::firstSingleton()->values)->toHaveCount(1);
});

test('public about page renders configured content', function () {
    AboutPage::query()->create([
        'hero_title' => 'Hello World',
        'hero_subtitle' => 'Tagline test',
        'seo_title' => 'About — Test',
        'seo_description' => 'A test about page.',
    ]);

    $this->get(route('public.about'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('public/about')
            ->where('page.hero_title', 'Hello World')
            ->where('page.hero_subtitle', 'Tagline test'));
});

test('public about page renders default empty state without crash', function () {
    $this->get(route('public.about'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('public/about'));
});
