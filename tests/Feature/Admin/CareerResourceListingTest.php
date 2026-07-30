<?php

use App\Models\CareerResource;
use App\Models\User;

/**
 * The listing pages on the server, so the search box and the filters see the
 * whole table rather than the rows that happen to be on screen.
 */
test('every article is reachable through pagination', function (): void {
    $admin = User::factory()->admin()->create();
    CareerResource::factory()->count(25)->create();

    $this->actingAs($admin)
        ->get(route('admin.career-resources.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/career-resources/index')
            ->has('items.data', 12)
            ->where('items.total', 25)
            ->where('items.last_page', 3));

    $this->actingAs($admin)
        ->get(route('admin.career-resources.index', ['page' => 3]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 1)
            ->where('items.current_page', 3));
});

test('search reaches an article that is not on the first page', function (): void {
    $admin = User::factory()->admin()->create();

    // Oldest, so the newest-first ordering pushes it past page one.
    $target = CareerResource::factory()->create([
        'title' => 'Cara Menulis CV ATS Friendly',
        'published_at' => now()->subYear(),
    ]);
    CareerResource::factory()->count(25)->create(['published_at' => now()]);

    $this->actingAs($admin)
        ->get(route('admin.career-resources.index', ['search' => 'ATS Friendly']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('items.total', 1)
            ->where('items.data.0.id', $target->id));
});

test('the category filter narrows the listing and its options are listed', function (): void {
    $admin = User::factory()->admin()->create();

    CareerResource::factory()->count(2)->create(['category' => 'Interview']);
    CareerResource::factory()->count(3)->create(['category' => 'CV']);

    $this->actingAs($admin)
        ->get(route('admin.career-resources.index', ['category' => 'Interview']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('items.total', 2)
            ->where('filters.category', 'Interview')
            ->where('categoryOptions', ['CV', 'Interview']));
});

test('an unknown status value is ignored instead of emptying the listing', function (): void {
    $admin = User::factory()->admin()->create();
    CareerResource::factory()->count(4)->create();

    $this->actingAs($admin)
        ->get(route('admin.career-resources.index', ['status' => 'not-a-status']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('items.total', 4)
            ->where('filters.status', ''));
});

test('filters survive a page change', function (): void {
    $admin = User::factory()->admin()->create();

    CareerResource::factory()->count(20)->create([
        'category' => 'Interview',
        'is_published' => true,
        'published_at' => now()->subDay(),
    ]);
    CareerResource::factory()->count(5)->create(['category' => 'CV']);

    $this->actingAs($admin)
        ->get(route('admin.career-resources.index', ['category' => 'Interview', 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('items.total', 20)
            ->has('items.data', 8)
            ->where('filters.category', 'Interview'));
});

test('a card falls back to the body when the article has no excerpt', function (): void {
    // A blank card reads as a broken row, so the body fills in -- stripped of
    // its tags, since the card renders plain text.
    $admin = User::factory()->admin()->create();

    CareerResource::factory()->create([
        'excerpt' => null,
        'body' => '<p>Melamar kerja butuh persiapan matang.</p>',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.career-resources.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('items.data.0.excerpt', 'Melamar kerja butuh persiapan matang.')
            ->has('items.data.0.thumbnail_url')
            ->has('items.data.0.views_count')
            ->has('items.data.0.reading_minutes'));
});
