<?php

use App\Models\CareerResource;
use App\Models\User;

/**
 * Scheduling rides on `published_at` alone -- nothing is queued and no job
 * runs, so an article cannot be stranded by a stopped worker or a missed cron.
 * These tests pin that a future date really does keep an article off the site
 * and that it appears on its own once the clock passes.
 */
test('an article dated in the future stays off the public listing', function (): void {
    $live = CareerResource::factory()->create([
        'is_published' => true,
        'published_at' => now()->subDay(),
    ]);
    $scheduled = CareerResource::factory()->create([
        'title' => 'Tips Melamar Kerja Akhir Pekan',
        'is_published' => true,
        'published_at' => now()->addDays(2),
    ]);

    $this->get(route('public.career-resources.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('items', 1)
            ->where('items.0.id', $live->id));

    expect(CareerResource::query()->live()->pluck('id')->all())->toBe([$live->id])
        ->and(CareerResource::query()->scheduled()->pluck('id')->all())->toBe([$scheduled->id]);
});

test('a scheduled article appears once its moment passes', function (): void {
    $resource = CareerResource::factory()->create([
        'is_published' => true,
        'published_at' => now()->addHours(3),
    ]);

    expect(CareerResource::query()->live()->count())->toBe(0);

    $this->travel(4)->hours();

    expect(CareerResource::query()->live()->count())->toBe(1)
        ->and($resource->fresh()->isLive())->toBeTrue();
});

test('the url of a scheduled article 404s instead of leaking it early', function (): void {
    // Guessing the slug must not be a way to read the piece before its date.
    $resource = CareerResource::factory()->create([
        'is_published' => true,
        'published_at' => now()->addWeek(),
    ]);

    $this->get(route('public.career-resources.show', ['careerResource' => $resource->slug]))
        ->assertNotFound();

    $this->travel(8)->days();

    $this->get(route('public.career-resources.show', ['careerResource' => $resource->slug]))
        ->assertOk();
});

test('an article published before scheduling existed stays visible', function (): void {
    // Legacy rows carry no date. Treating those as pending would pull them off
    // the site the day this shipped.
    $resource = CareerResource::factory()->create([
        'is_published' => true,
        'published_at' => null,
    ]);

    expect(CareerResource::query()->live()->pluck('id')->all())->toBe([$resource->id]);

    $this->get(route('public.career-resources.show', ['careerResource' => $resource->slug]))
        ->assertOk();
});

test('admin can schedule an article for the weekend', function (): void {
    $admin = User::factory()->admin()->create();
    $saturday = now()->next('Saturday')->setTime(8, 0);

    $this->actingAs($admin)
        ->post(route('admin.career-resources.store'), [
            'title' => 'Panduan Interview Kerja',
            'body' => '<p>Isi artikel.</p>',
            'reading_minutes' => 5,
            'is_published' => true,
            'published_at' => $saturday->format('Y-m-d\TH:i'),
        ])
        ->assertRedirect(route('admin.career-resources.index'));

    $resource = CareerResource::query()->sole();

    expect($resource->is_published)->toBeTrue()
        ->and($resource->isScheduled())->toBeTrue()
        ->and($resource->published_at->format('Y-m-d H:i'))->toBe($saturday->format('Y-m-d H:i'));

    $this->get(route('public.career-resources.index'))
        ->assertInertia(fn ($page) => $page->has('items', 0));
});

test('publishing without a date goes live immediately', function (): void {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('admin.career-resources.store'), [
            'title' => 'Artikel Terbit Sekarang',
            'body' => '<p>Isi artikel.</p>',
            'reading_minutes' => 3,
            'is_published' => true,
            'published_at' => '',
        ]);

    expect(CareerResource::query()->sole()->isLive())->toBeTrue();
});

test('unpublishing clears the schedule so it cannot fire later', function (): void {
    // A stale future date left on a draft would publish the article the moment
    // someone ticked the box again, at a time nobody chose.
    $admin = User::factory()->admin()->create();
    $resource = CareerResource::factory()->create([
        'is_published' => true,
        'published_at' => now()->addWeek(),
    ]);

    $this->actingAs($admin)
        ->put(route('admin.career-resources.update', $resource), [
            'title' => $resource->title,
            'body' => $resource->body,
            'reading_minutes' => $resource->reading_minutes,
            'is_published' => false,
            'published_at' => now()->addWeek()->format('Y-m-d\TH:i'),
        ]);

    expect($resource->fresh()->published_at)->toBeNull();
});

test('the admin listing separates scheduled from live', function (): void {
    $admin = User::factory()->admin()->create();

    CareerResource::factory()->create(['is_published' => true, 'published_at' => now()->subDay()]);
    CareerResource::factory()->create(['is_published' => true, 'published_at' => now()->addDay()]);
    CareerResource::factory()->create(['is_published' => false, 'published_at' => null]);

    $this->actingAs($admin)
        ->get(route('admin.career-resources.index'))
        ->assertOk()
        ->assertInertia(function ($page) {
            $statuses = collect($page->toArray()['props']['items'])->pluck('status')->sort()->values()->all();

            expect($statuses)->toBe(['draft', 'live', 'scheduled']);
        });
});
