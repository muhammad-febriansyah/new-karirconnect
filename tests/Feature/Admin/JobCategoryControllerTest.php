<?php

use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;

test('admin can delete a job category that has no jobs', function () {
    $admin = User::factory()->admin()->create();
    $category = JobCategory::factory()->create();

    $this->actingAs($admin)
        ->delete("/admin/job-categories/{$category->id}")
        ->assertRedirect(route('admin.job-categories.index'))
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    expect(JobCategory::query()->whereKey($category->id)->exists())->toBeFalse();
});

test('cannot delete a job category that is still used by jobs', function () {
    $admin = User::factory()->admin()->create();
    $category = JobCategory::factory()->create();
    Job::factory()->create(['job_category_id' => $category->id]);

    $this->actingAs($admin)
        ->delete("/admin/job-categories/{$category->id}")
        ->assertRedirect(route('admin.job-categories.index'))
        ->assertSessionHas('inertia.flash_data.toast.type', 'error');

    expect(JobCategory::query()->whereKey($category->id)->exists())->toBeTrue();
});

test('non admin cannot delete a job category', function () {
    $employer = User::factory()->employer()->create();
    $category = JobCategory::factory()->create();

    $this->actingAs($employer)
        ->delete("/admin/job-categories/{$category->id}")
        ->assertForbidden();

    expect(JobCategory::query()->whereKey($category->id)->exists())->toBeTrue();
});
