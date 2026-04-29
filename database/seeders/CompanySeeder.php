<?php

namespace Database\Seeders;

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Models\Company;
use App\Models\CompanyBadge;
use App\Models\CompanyMember;
use App\Models\CompanyOffice;
use App\Models\User;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::query()->where('email', 'employer@karirconnect.test')->first();

        if (! $owner) {
            return;
        }

        $company = Company::query()->firstOrCreate(
            ['owner_id' => $owner->id],
            [
                'name' => 'KarirConnect Labs',
                'slug' => 'karirconnect-labs',
                'tagline' => 'Membangun platform hiring modern untuk Indonesia.',
                'website' => 'https://karirconnect.test',
                'email' => 'hello@karirconnect.test',
                'phone' => '+62 21 5555 0000',
                'industry_id' => null,
                'company_size_id' => null,
                'founded_year' => 2021,
                'province_id' => null,
                'city_id' => null,
                'address' => 'Jakarta Selatan',
                'about' => 'KarirConnect Labs membantu tim hiring bergerak lebih cepat dengan tooling AI.',
                'culture' => 'Tim kecil, iterasi cepat, dan fokus pada kualitas pengalaman kandidat.',
                'benefits' => 'Hybrid work, BPJS, budget pembelajaran, dan cuti fleksibel.',
                'status' => CompanyStatus::Approved,
                'verification_status' => CompanyVerificationStatus::Verified,
                'approved_at' => now()->subWeeks(8),
                'verified_at' => now()->subWeeks(7),
            ],
        );

        CompanyMember::query()->firstOrCreate(
            ['company_id' => $company->id, 'user_id' => $owner->id],
            [
                'role' => 'owner',
                'invitation_email' => $owner->email,
                'invited_at' => now(),
                'joined_at' => now(),
            ],
        );

        CompanyOffice::query()->firstOrCreate(
            ['company_id' => $company->id, 'label' => 'Kantor Pusat'],
            [
                'address' => $company->address,
                'contact_phone' => $company->phone,
                'map_url' => 'https://maps.google.com',
                'is_headquarter' => true,
            ],
        );

        CompanyBadge::query()->firstOrCreate(
            ['company_id' => $company->id, 'code' => 'verified-employer'],
            [
                'name' => 'Verified Employer',
                'description' => 'Dokumen perusahaan sudah diverifikasi admin.',
                'tone' => 'success',
                'awarded_at' => $company->verified_at,
                'is_active' => true,
            ],
        );
    }
}
