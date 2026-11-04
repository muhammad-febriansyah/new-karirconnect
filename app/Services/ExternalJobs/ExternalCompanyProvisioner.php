<?php

namespace App\Services\ExternalJobs;

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Enums\UserRole;
use App\Models\Company;
use App\Models\ScrapedCompany;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Gives every scraped employer a `companies` row so its jobs can live on the
 * portal with the employer's own name and logo.
 *
 * These companies are owned by one system user ("Jobs Eksternal") that never
 * logs in. A scraped employer is never attached to a company that registered
 * itself, even with the same name: that would put jobs into someone else's
 * account without their consent.
 */
class ExternalCompanyProvisioner
{
    private ?User $owner = null;

    public function owner(): User
    {
        if ($this->owner !== null) {
            return $this->owner;
        }

        $email = (string) config('external_jobs.owner_email');

        $owner = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => 'Jobs Eksternal',
                // A random password nobody knows: this account only owns data.
                'password' => Hash::make(Str::random(64)),
                'role' => UserRole::Employer,
                'is_active' => false,
            ],
        );

        if ($owner->email_verified_at === null) {
            $owner->forceFill(['email_verified_at' => now()])->save();
        }

        return $this->owner = $owner;
    }

    public function companyFor(ScrapedCompany $scraped): Company
    {
        $existing = $scraped->company_id ? Company::query()->find($scraped->company_id) : null;
        if ($existing !== null) {
            return $existing;
        }

        $company = Company::query()->create([
            'owner_id' => $this->owner()->id,
            'name' => $scraped->name,
            'slug' => $this->uniqueSlug($scraped->name),
            'tagline' => $scraped->tagline,
            'logo_path' => $this->copyLogo($scraped),
            'website' => $scraped->website,
            'phone' => $scraped->phone,
            'industry_id' => $scraped->industry_id,
            'company_size_id' => $scraped->company_size_id,
            'founded_year' => $scraped->founded_year,
            'province_id' => $scraped->province_id,
            'city_id' => $scraped->city_id,
            'address' => $scraped->address,
            'about' => $scraped->about,
            'status' => CompanyStatus::Approved,
            'verification_status' => CompanyVerificationStatus::Unverified,
            'approved_at' => now(),
            'onboarding_completed_at' => now(),
        ]);

        $scraped->forceFill(['company_id' => $company->id])->save();

        return $company;
    }

    /**
     * Keep the portal company's logo independent of the scraper's copy, which
     * is replaced whenever the source changes its logo.
     */
    private function copyLogo(ScrapedCompany $scraped): ?string
    {
        if (blank($scraped->logo_path)) {
            return null;
        }

        $disk = Storage::disk((string) config('crawler.logos.disk'));
        if (! $disk->exists($scraped->logo_path)) {
            return null;
        }

        $target = 'company-logos/external-'.$scraped->id.'-'.basename($scraped->logo_path);
        $disk->copy($scraped->logo_path, $target);

        return $target;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::limit(Str::slug($name) ?: 'perusahaan', 180, '');
        $slug = $base;
        $suffix = 2;

        while (Company::withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
