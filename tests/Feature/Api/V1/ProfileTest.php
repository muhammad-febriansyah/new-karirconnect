<?php

use App\Models\CandidateCv;
use App\Models\Education;
use App\Models\EmployeeProfile;
use App\Models\Skill;
use App\Models\User;
use App\Services\Employee\EmployeeProfileService;
use Database\Seeders\LookupSeeder;
use Database\Seeders\ProvinceCitySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class, ProvinceCitySeeder::class, LookupSeeder::class]);
});

function seeker(): User
{
    $user = User::factory()->employee()->create(['password' => 'password']);
    EmployeeProfile::factory()->create(['user_id' => $user->id]);

    return $user;
}

function tokenFor(User $user): array
{
    $token = test()->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertOk()->json('data.tokens.access_token');

    return ['Authorization' => 'Bearer '.$token];
}

describe('profile', function (): void {
    it('returns the profile with what is still missing', function (): void {
        $user = seeker();

        $this->withHeaders(tokenFor($user))
            ->getJson('/api/v1/profile')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['headline', 'profile_completion', 'skills', 'educations', 'work_experiences'],
                'meta' => ['user', 'missing_items'],
            ]);
    });

    it('returns enum values, not labels, so an edit can round trip', function (): void {
        $user = seeker();
        $user->employeeProfile->update(['gender' => 'male', 'experience_level' => 'senior']);

        $response = $this->withHeaders(tokenFor($user))->getJson('/api/v1/profile')->assertOk();

        expect($response->json('data.gender'))->toBe('male')
            ->and($response->json('data.experience_level'))->toBe('senior');
    });

    it('updates the profile', function (): void {
        $user = seeker();

        $this->withHeaders(tokenFor($user))
            ->postJson('/api/v1/profile', [
                'headline' => 'Senior Flutter Engineer',
                'is_open_to_work' => true,
                'visibility' => 'public',
            ])
            ->assertOk()
            ->assertJsonPath('data.headline', 'Senior Flutter Engineer');

        expect($user->employeeProfile->fresh()->headline)->toBe('Senior Flutter Engineer');
    });

    it('recomputes completion using the weighted algorithm', function (): void {
        // Regression: the web controller used a flat 11-field count that ignored
        // records, so a candidate with a full history could score below the 60%
        // gate that SubmitApplicationAction enforces.
        $user = seeker();
        $profile = $user->employeeProfile;

        Education::factory()->create(['employee_profile_id' => $profile->id]);
        CandidateCv::factory()->create(['employee_profile_id' => $profile->id]);
        $profile->skills()->sync(Skill::query()->limit(3)->pluck('id'));

        $this->withHeaders(tokenFor($user))
            ->postJson('/api/v1/profile', [
                'headline' => 'Dev',
                'about' => 'About me',
                'current_position' => 'Engineer',
                'experience_level' => 'senior',
                'is_open_to_work' => true,
                'visibility' => 'public',
            ])
            ->assertOk();

        // Records are worth 50 of the 100 points; a flat scalar count would not
        // clear the gate here.
        expect($profile->fresh()->profile_completion)->toBeGreaterThanOrEqual(60);
    });

    it('rejects an invalid visibility', function (): void {
        $user = seeker();

        $this->withHeaders(tokenFor($user))
            ->postJson('/api/v1/profile', [
                'is_open_to_work' => true,
                'visibility' => 'everyone',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('visibility');
    });

    it('blocks an employer from the jobseeker profile', function (): void {
        $employer = User::factory()->employer()->create(['password' => 'password']);

        $this->withHeaders(tokenFor($employer))->getJson('/api/v1/profile')->assertStatus(403);
    });
});

describe('skills', function (): void {
    it('replaces the skill set, including removals', function (): void {
        // The web can only ever add skills (syncWithoutDetaching in onboarding),
        // so removing one is impossible there.
        $user = seeker();
        $skills = Skill::query()->limit(3)->pluck('id');
        $user->employeeProfile->skills()->sync($skills);

        $keep = $skills->take(1)->map(fn ($id) => ['id' => $id, 'level' => 'mid'])->all();

        $this->withHeaders(tokenFor($user))
            ->putJson('/api/v1/profile/skills', ['skills' => $keep])
            ->assertOk();

        expect($user->employeeProfile->fresh()->skills)->toHaveCount(1);
    });

    it('accepts an empty set to clear all skills', function (): void {
        $user = seeker();
        $user->employeeProfile->skills()->sync(Skill::query()->limit(2)->pluck('id'));

        $this->withHeaders(tokenFor($user))
            ->putJson('/api/v1/profile/skills', ['skills' => []])
            ->assertOk();

        expect($user->employeeProfile->fresh()->skills)->toHaveCount(0);
    });

    it('rejects duplicate skills', function (): void {
        $user = seeker();
        $id = Skill::query()->value('id');

        $this->withHeaders(tokenFor($user))
            ->putJson('/api/v1/profile/skills', ['skills' => [['id' => $id], ['id' => $id]]])
            ->assertStatus(422);
    });
});

describe('educations', function (): void {
    it('creates, lists, updates and deletes', function (): void {
        $user = seeker();
        $headers = tokenFor($user);

        $created = $this->withHeaders($headers)->postJson('/api/v1/profile/educations', [
            'level' => 's1',
            'institution' => 'Universitas Indonesia',
            'start_year' => 2015,
            'end_year' => 2019,
        ])->assertCreated();

        $id = $created->json('data.id');

        $this->withHeaders($headers)->getJson('/api/v1/profile/educations')
            ->assertOk()->assertJsonPath('data.0.institution', 'Universitas Indonesia');

        $this->withHeaders($headers)->putJson('/api/v1/profile/educations/'.$id, [
            'level' => 's1',
            'institution' => 'ITB',
            'start_year' => 2015,
            'end_year' => 2019,
        ])->assertOk()->assertJsonPath('data.institution', 'ITB');

        $this->withHeaders($headers)->deleteJson('/api/v1/profile/educations/'.$id)->assertOk();

        $this->assertDatabaseMissing('educations', ['id' => $id]);
    });

    it('recomputes completion when a record is added', function (): void {
        $user = seeker();

        // Baseline must be a computed score, not the factory's arbitrary
        // profile_completion value, or the comparison means nothing.
        $before = app(EmployeeProfileService::class)->recomputeCompletion($user->employeeProfile);

        $this->withHeaders(tokenFor($user))->postJson('/api/v1/profile/educations', [
            'level' => 's1',
            'institution' => 'UI',
            'start_year' => 2015,
        ])->assertCreated();

        // Educations are worth 15 points. The web CRUD never recomputes, so the
        // score there stays stale until some other screen resaves the profile.
        expect($user->employeeProfile->fresh()->profile_completion)->toBeGreaterThan($before);
    });

    it('404s when editing another candidate education', function (): void {
        $mine = seeker();
        $theirs = seeker();

        $row = Education::factory()->create(['employee_profile_id' => $theirs->employeeProfile->id]);

        $this->withHeaders(tokenFor($mine))
            ->putJson('/api/v1/profile/educations/'.$row->id, [
                'level' => 's1',
                'institution' => 'Hacked',
                'start_year' => 2015,
            ])
            ->assertStatus(404);

        expect($row->fresh()->institution)->not->toBe('Hacked');
    });

    it('validates end_year is not before start_year', function (): void {
        $user = seeker();

        $this->withHeaders(tokenFor($user))->postJson('/api/v1/profile/educations', [
            'level' => 's1',
            'institution' => 'UI',
            'start_year' => 2019,
            'end_year' => 2015,
        ])->assertStatus(422)->assertJsonValidationErrors('end_year');
    });
});

describe('work experiences', function (): void {
    it('creates one and clears end_date when it is current', function (): void {
        $user = seeker();

        $response = $this->withHeaders(tokenFor($user))->postJson('/api/v1/profile/work-experiences', [
            'company_name' => 'Acme',
            'position' => 'Engineer',
            'start_date' => '2020-01-01',
            'end_date' => '2022-01-01',
            'is_current' => true,
        ])->assertCreated();

        // WorkExperienceRequest forces end_date to null when is_current.
        expect($response->json('data.end_date'))->toBeNull()
            ->and($response->json('data.is_current'))->toBeTrue();
    });
});

describe('cvs', function (): void {
    beforeEach(fn () => Storage::fake('public'));

    it('uploads a CV and makes the first one primary', function (): void {
        $user = seeker();

        $response = $this->withHeaders(tokenFor($user))->postJson('/api/v1/cvs', [
            'label' => 'CV Utama',
            'file' => UploadedFile::fake()->create('cv.pdf', 200, 'application/pdf'),
        ])->assertCreated();

        expect($response->json('data.is_active'))->toBeTrue()
            ->and($user->employeeProfile->fresh()->primary_resume_id)->toBe($response->json('data.id'));
    });

    it('does not let a second upload steal the primary slot', function (): void {
        $user = seeker();
        $headers = tokenFor($user);

        $first = $this->withHeaders($headers)->postJson('/api/v1/cvs', [
            'label' => 'First',
            'file' => UploadedFile::fake()->create('a.pdf', 100, 'application/pdf'),
        ])->assertCreated();

        $this->withHeaders($headers)->postJson('/api/v1/cvs', [
            'label' => 'Second',
            'file' => UploadedFile::fake()->create('b.pdf', 100, 'application/pdf'),
        ])->assertCreated();

        expect($user->employeeProfile->fresh()->primary_resume_id)->toBe($first->json('data.id'));
    });

    it('switches the primary CV and deactivates the previous one', function (): void {
        $user = seeker();
        $headers = tokenFor($user);

        $first = $this->withHeaders($headers)->postJson('/api/v1/cvs', [
            'label' => 'First', 'file' => UploadedFile::fake()->create('a.pdf', 100, 'application/pdf'),
        ])->assertCreated()->json('data.id');

        $second = $this->withHeaders($headers)->postJson('/api/v1/cvs', [
            'label' => 'Second', 'file' => UploadedFile::fake()->create('b.pdf', 100, 'application/pdf'),
        ])->assertCreated()->json('data.id');

        $this->withHeaders($headers)->postJson('/api/v1/cvs/'.$second, [
            'label' => 'Second', 'is_active' => true,
        ])->assertOk();

        expect($user->employeeProfile->fresh()->primary_resume_id)->toBe($second);
        expect(CandidateCv::find($first)->is_active)->toBeFalse();
    });

    it('clears primary_resume_id when the primary CV is deleted', function (): void {
        $user = seeker();
        $headers = tokenFor($user);

        $id = $this->withHeaders($headers)->postJson('/api/v1/cvs', [
            'label' => 'Only', 'file' => UploadedFile::fake()->create('a.pdf', 100, 'application/pdf'),
        ])->assertCreated()->json('data.id');

        $this->withHeaders($headers)->deleteJson('/api/v1/cvs/'.$id)->assertOk();

        expect($user->employeeProfile->fresh()->primary_resume_id)->toBeNull();
    });

    it('rejects a non-document upload', function (): void {
        $user = seeker();

        $this->withHeaders(tokenFor($user))->postJson('/api/v1/cvs', [
            'label' => 'Bad',
            'file' => UploadedFile::fake()->image('photo.jpg'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    });

    it('404s when deleting another candidate CV', function (): void {
        $mine = seeker();
        $theirs = seeker();

        $cv = CandidateCv::factory()->create(['employee_profile_id' => $theirs->employeeProfile->id]);

        $this->withHeaders(tokenFor($mine))->deleteJson('/api/v1/cvs/'.$cv->id)->assertStatus(404);

        $this->assertDatabaseHas('candidate_cvs', ['id' => $cv->id]);
    });
});

describe('notifications', function (): void {
    it('lists notifications with an unread count', function (): void {
        $user = seeker();

        $this->withHeaders(tokenFor($user))
            ->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['unread_count', 'total']]);
    });

    it('returns the unread badge payload', function (): void {
        $user = seeker();

        $this->withHeaders(tokenFor($user))
            ->getJson('/api/v1/notifications/unread')
            ->assertOk()
            ->assertJsonStructure(['data' => ['count', 'recent']]);
    });

    it('registers and removes a device token', function (): void {
        $user = seeker();
        $headers = tokenFor($user);

        $this->withHeaders($headers)->postJson('/api/v1/device-tokens', [
            'token' => 'fcm-token-abc',
            'platform' => 'android',
            'device_name' => 'Pixel 8',
        ])->assertCreated();

        $this->assertDatabaseHas('user_device_tokens', ['user_id' => $user->id, 'token' => 'fcm-token-abc']);

        $this->withHeaders($headers)->deleteJson('/api/v1/device-tokens', ['token' => 'fcm-token-abc'])->assertOk();

        $this->assertDatabaseMissing('user_device_tokens', ['token' => 'fcm-token-abc']);
    });

    it('cannot unregister another user device token', function (): void {
        // Regression: revoke() deleted purely by token value, so anyone holding
        // another user's token string could silence their push notifications.
        $victim = seeker();
        $attacker = seeker();

        $this->withHeaders(tokenFor($victim))->postJson('/api/v1/device-tokens', [
            'token' => 'victim-token', 'platform' => 'android',
        ])->assertCreated();

        $this->withHeaders(tokenFor($attacker))
            ->deleteJson('/api/v1/device-tokens', ['token' => 'victim-token'])
            ->assertOk();

        $this->assertDatabaseHas('user_device_tokens', [
            'user_id' => $victim->id,
            'token' => 'victim-token',
        ]);
    });
});
