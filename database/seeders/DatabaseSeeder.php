<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SettingSeeder::class,
            ProvinceCitySeeder::class,
            LookupSeeder::class,
            SubscriptionPlanSeeder::class,
        ]);

        User::factory()->create([
            'name' => 'Admin KarirConnect',
            'email' => 'admin@karirconnect.test',
            'password' => Hash::make('password'),
            'role' => UserRole::Admin,
            'email_verified_at' => now(),
        ]);

        User::factory()->create([
            'name' => 'HR Demo Perusahaan',
            'email' => 'employer@karirconnect.test',
            'password' => Hash::make('password'),
            'role' => UserRole::Employer,
            'email_verified_at' => now(),
        ]);

        User::factory()->create([
            'name' => 'Pencari Kerja Demo',
            'email' => 'employee@karirconnect.test',
            'password' => Hash::make('password'),
            'role' => UserRole::Employee,
            'email_verified_at' => now(),
        ]);

        $this->call([
            CompanySeeder::class,
            DemoDataSeeder::class,
        ]);
    }
}
