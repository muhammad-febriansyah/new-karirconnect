<?php

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\User;
use App\Notifications\ApplicationStatusChangedNotification;
use App\Notifications\ApplicationSubmittedNotification;
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

function makeNotificationContext(): array
{
    $owner = User::factory()->employer()->create();
    $company = Company::factory()->approved()->create(['owner_id' => $owner->id]);
    $cat = JobCategory::query()->first() ?? JobCategory::factory()->create();
    $job = Job::factory()->published()->create([
        'company_id' => $company->id,
        'posted_by_user_id' => $owner->id,
        'job_category_id' => $cat->id,
    ]);
    $candidate = User::factory()->employee()->create();
    $profile = EmployeeProfile::factory()->create(['user_id' => $candidate->id]);

    return compact('owner', 'company', 'job', 'candidate', 'profile');
}

test('database channel persists notification with structured payload', function () {
    ['owner' => $owner, 'profile' => $profile, 'job' => $job] = makeNotificationContext();
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Submitted,
    ]);

    $owner->notify(new ApplicationSubmittedNotification($application));

    $row = $owner->notifications()->first();
    expect($row)->not->toBeNull();
    expect($row->data['title'])->toBe('Lamaran baru diterima');
    expect($row->data['action_url'])->toContain('/employer/applicants');
    expect($row->data['icon'])->toBe('send');
});

test('user sees their unread notifications via index', function () {
    ['owner' => $owner, 'profile' => $profile, 'job' => $job] = makeNotificationContext();
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Submitted,
    ]);
    $owner->notify(new ApplicationSubmittedNotification($application));

    $this->actingAs($owner)
        ->get(route('notifications.index'))
        ->assertOk();

    expect($owner->unreadNotifications()->count())->toBe(1);
});

test('mark-read endpoint sets read_at and decrements unread', function () {
    ['owner' => $owner, 'profile' => $profile, 'job' => $job] = makeNotificationContext();
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Submitted,
    ]);
    $owner->notify(new ApplicationSubmittedNotification($application));
    $notification = $owner->notifications()->first();

    $this->actingAs($owner)
        ->post(route('notifications.read', ['notification' => $notification->id]))
        ->assertRedirect()
        ->assertSessionHas('success', 'Notifikasi ditandai sebagai sudah dibaca.');

    expect($owner->fresh()->unreadNotifications()->count())->toBe(0);
    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('mark-all-read clears unread count', function () {
    ['owner' => $owner, 'profile' => $profile, 'job' => $job] = makeNotificationContext();
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Submitted,
    ]);
    $owner->notify(new ApplicationSubmittedNotification($application));
    $owner->notify(new ApplicationSubmittedNotification($application));

    expect($owner->unreadNotifications()->count())->toBe(2);

    $this->actingAs($owner)
        ->post(route('notifications.read-all'))
        ->assertRedirect()
        ->assertSessionHas('success', 'Semua notifikasi berhasil ditandai sebagai sudah dibaca.');

    expect($owner->fresh()->unreadNotifications()->count())->toBe(0);
});

test('user cannot mark another user notification as read', function () {
    ['owner' => $owner, 'profile' => $profile, 'job' => $job] = makeNotificationContext();
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Submitted,
    ]);
    $owner->notify(new ApplicationSubmittedNotification($application));
    $notification = $owner->notifications()->first();

    $other = User::factory()->employer()->create();

    $this->actingAs($other)
        ->post(route('notifications.read', ['notification' => $notification->id]))
        ->assertNotFound();
});

test('destroy endpoint removes the notification', function () {
    ['owner' => $owner, 'profile' => $profile, 'job' => $job] = makeNotificationContext();
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Submitted,
    ]);
    $owner->notify(new ApplicationSubmittedNotification($application));
    $notification = $owner->notifications()->first();

    $this->actingAs($owner)
        ->delete(route('notifications.destroy', ['notification' => $notification->id]))
        ->assertRedirect()
        ->assertSessionHas('success', 'Notifikasi berhasil dihapus.');

    expect($owner->fresh()->notifications()->count())->toBe(0);
});

test('unread endpoint returns json payload with count and recent', function () {
    ['owner' => $owner, 'profile' => $profile, 'job' => $job] = makeNotificationContext();
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Submitted,
    ]);
    $owner->notify(new ApplicationSubmittedNotification($application));

    $this->actingAs($owner)
        ->getJson(route('notifications.unread'))
        ->assertOk()
        ->assertJson(['count' => 1])
        ->assertJsonStructure(['count', 'recent' => [['id', 'title', 'body', 'icon']]]);
});

test('candidate receives database notification when status changes', function () {
    ['profile' => $profile, 'job' => $job, 'candidate' => $candidate] = makeNotificationContext();
    $application = Application::factory()->create([
        'job_id' => $job->id,
        'employee_profile_id' => $profile->id,
        'status' => ApplicationStatus::Reviewed,
    ]);

    $candidate->notify(new ApplicationStatusChangedNotification($application, 'Mohon hadir interview HR.'));

    $row = $candidate->notifications()->first();
    expect($row->data['title'])->toBe('Status lamaran diperbarui');
    expect($row->data['action_url'])->toBe('/employee/applications');
});
