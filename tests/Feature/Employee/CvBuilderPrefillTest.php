<?php

use App\Models\Certification;
use App\Models\Education;
use App\Models\EmployeeProfile;
use App\Models\User;
use App\Models\WorkExperience;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed(SettingSeeder::class);
});

/**
 * The builder page runs string methods over every field it receives, so a null
 * from a nullable profile column used to throw during render and leave the
 * page blank.
 */
test('cv builder prefill never sends null fields', function () {
    $employee = User::factory()->employee()->create(['phone' => null]);
    $profile = EmployeeProfile::factory()->create([
        'user_id' => $employee->id,
        'headline' => null,
        'about' => null,
        'portfolio_url' => null,
        'city_id' => null,
        'cv_builder_json' => null,
    ]);

    WorkExperience::factory()->create([
        'employee_profile_id' => $profile->id,
        'description' => null,
    ]);

    Education::factory()->create([
        'employee_profile_id' => $profile->id,
        'major' => null,
        'gpa' => null,
    ]);

    Certification::factory()->create([
        'employee_profile_id' => $profile->id,
        'issued_date' => null,
    ]);

    $this->actingAs($employee)
        ->get(route('employee.cv.builder.edit'))
        ->assertOk()
        ->assertInertia(function ($page) {
            $page->component('employee/cv/builder');

            $data = $page->toArray()['props']['data'];

            expect($data['personal'])->each->toBeString();
            expect($data['summary'])->toBeString();
            expect($data['skills'])->each->toBeString();

            foreach ($data['experiences'] as $experience) {
                expect($experience)->each->toBeString();
            }

            foreach ($data['educations'] as $education) {
                expect($education)->each->toBeString();
            }

            foreach ($data['certifications'] as $certification) {
                expect($certification)->each->toBeString();
            }
        });
});
