<?php

namespace App\Services\Company;

use App\Enums\CompanyStatus;
use App\Models\Company;
use App\Models\CompanyBadge;
use App\Models\User;
use App\Notifications\CompanyApproved;
use App\Notifications\CompanyStatusChangedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CompanyService
{
    /**
     * Create a brand-new company for an employer user. The owner is added as
     * a CompanyMember with role=owner so authorization checks work uniformly.
     *
     * @param  array<string, mixed>  $data
     */
    public function register(User $owner, array $data): Company
    {
        return DB::transaction(function () use ($owner, $data) {
            $company = Company::query()->create([
                ...$data,
                'owner_id' => $owner->id,
                'slug' => $this->uniqueSlug($data['name']),
                'status' => CompanyStatus::Pending,
            ]);

            $company->members()->create([
                'user_id' => $owner->id,
                'role' => 'owner',
                'joined_at' => now(),
            ]);

            return $company;
        });
    }

    public function approve(Company $company, User $admin): Company
    {
        $company->forceFill([
            'status' => CompanyStatus::Approved,
            'approved_at' => now(),
        ])->save();

        CompanyBadge::query()->firstOrCreate(
            ['company_id' => $company->id, 'code' => 'approved-company'],
            [
                'name' => 'Approved Company',
                'description' => 'Perusahaan telah lolos review admin dan aktif di platform.',
                'tone' => 'success',
                'awarded_at' => now(),
                'is_active' => true,
            ],
        );

        $company->owner?->notify(new CompanyApproved($company));

        return $company;
    }

    public function suspend(Company $company): Company
    {
        $company->forceFill([
            'status' => CompanyStatus::Suspended,
        ])->save();

        $company->owner?->notify(new CompanyStatusChangedNotification(
            $company,
            'Status perusahaan Anda saat ini dinonaktifkan sementara. Silakan hubungi admin bila membutuhkan peninjauan ulang.',
        ));

        return $company;
    }

    /**
     * Add a teammate (recruiter or admin) to the company by user id.
     */
    public function inviteTeamMember(Company $company, User $user, string $role = 'recruiter'): void
    {
        $company->members()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'role' => $role,
                'invitation_email' => $user->email,
                'invited_at' => now(),
                'joined_at' => now(),
            ],
        );
    }

    public function removeTeamMember(Company $company, int $userId): void
    {
        if ($userId === $company->owner_id) {
            return;
        }

        $company->members()->where('user_id', $userId)->delete();
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;

        while (Company::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.++$i;
        }

        return $slug;
    }
}
