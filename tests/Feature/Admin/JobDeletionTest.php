<?php

use App\Models\AuditLog;
use App\Models\Job;
use App\Models\User;

test('admin can delete a job', function (): void {
    $admin = User::factory()->admin()->create();
    $job = Job::factory()->create();

    $this->actingAs($admin)
        ->delete(route('admin.jobs.destroy', $job))
        ->assertRedirect(route('admin.jobs.index'));

    expect(Job::query()->find($job->id))->toBeNull();
    expect(Job::withTrashed()->find($job->id))->not->toBeNull();
    expect(AuditLog::query()->where('action', 'job.delete')->exists())->toBeTrue();
});

test('deleted job disappears from the admin listing', function (): void {
    $admin = User::factory()->admin()->create();
    $job = Job::factory()->create();

    $this->actingAs($admin)->delete(route('admin.jobs.destroy', $job));

    $this->actingAs($admin)
        ->get(route('admin.jobs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/jobs/index')
            ->has('jobs.data', 0));
});

test('non admin cannot delete a job', function (): void {
    $employer = User::factory()->employer()->create();
    $job = Job::factory()->create();

    $this->actingAs($employer)
        ->delete(route('admin.jobs.destroy', $job))
        ->assertForbidden();

    expect(Job::query()->find($job->id))->not->toBeNull();
});

test('guest cannot delete a job', function (): void {
    $job = Job::factory()->create();

    $this->delete(route('admin.jobs.destroy', $job))
        ->assertRedirect(route('login'));

    expect(Job::query()->find($job->id))->not->toBeNull();
});
