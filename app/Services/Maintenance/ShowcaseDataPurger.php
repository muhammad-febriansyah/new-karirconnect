<?php

namespace App\Services\Maintenance;

use App\Enums\UserRole;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * Removes only the rows created by FreshShowcaseSeeder, leaving real data
 * untouched. Safe on a database where genuine users, companies, and
 * applications already live alongside the showcase data.
 *
 * Identification is marker-based, never id-range based -- real signups
 * interleave with seeded ids the moment the site goes live:
 *
 * - employer accounts hold the literal address `hr@<domain>` for the 30 seeded domains
 * - candidate accounts match `kandidat<N>@karirkonek.test` (`.test` is a reserved TLD,
 *   so no human can own one)
 * - companies are the ones owned by those employer accounts
 *
 * A matched *employer* must also still carry the seeder's default password hash.
 * An address like `hr@gojek.com` is one a real recruiter could plausibly hold,
 * so anything with a changed password is set aside as a suspect and reported
 * rather than deleted. Candidates skip that check -- see resolve() for why.
 */
class ShowcaseDataPurger
{
    /**
     * Company domains hardcoded in FreshShowcaseSeeder::companies().
     * Keep in sync if that list ever changes.
     *
     * @var list<string>
     */
    public const SEEDED_DOMAINS = [
        'gojek.com', 'tokopedia.com', 'traveloka.com', 'bukalapak.com', 'grab.com',
        'shopee.co.id', 'blibli.com', 'bca.co.id', 'bankmandiri.co.id', 'bri.co.id',
        'ovo.id', 'dana.id', 'xendit.co', 'halodoc.com', 'alodokter.com',
        'ruangguru.com', 'zenius.net', 'astra.co.id', 'indofood.com', 'unilever.co.id',
        'kalbe.co.id', 'jne.co.id', 'sicepat.com', 'waresix.com', 'wika.co.id',
        'sociolla.com', 'kredivo.com', 'telkom.co.id', 'tiket.com', 'kitabisa.com',
    ];

    /**
     * Password every seeded account was created with.
     */
    private const SEEDED_PASSWORD = 'password';

    /**
     * Counts and blast radius of a purge, without touching anything.
     *
     * @return array{
     *     employers: int,
     *     candidates: int,
     *     companies: int,
     *     jobs: int,
     *     applications: int,
     *     applications_from_real_candidates: int,
     *     company_names: list<string>,
     *     suspects: list<array{id: int, email: string, role: string, created_at: string|null}>
     * }
     */
    public function preview(bool $skipPasswordCheck = false): array
    {
        $target = $this->resolve($skipPasswordCheck);

        $jobIds = DB::table('job_posts')->whereIn('company_id', $target['companies']->pluck('id'))->pluck('id');
        $candidateProfileIds = DB::table('employee_profiles')
            ->whereIn('user_id', $target['candidates']->pluck('id'))
            ->pluck('id');

        return [
            'employers' => $target['employers']->count(),
            'candidates' => $target['candidates']->count(),
            'companies' => $target['companies']->count(),
            'jobs' => $jobIds->count(),
            'applications' => DB::table('applications')->whereIn('job_id', $jobIds)->count(),

            // Applications a real job seeker filed against a dummy job. They die
            // with the job (applications.job_id is cascadeOnDelete), so they are
            // the one genuinely destructive side effect and must be shown.
            'applications_from_real_candidates' => DB::table('applications')
                ->whereIn('job_id', $jobIds)
                ->whereNotIn('employee_profile_id', $candidateProfileIds)
                ->count(),

            'company_names' => $target['companies']->pluck('name')->values()->all(),
            'suspects' => $target['suspects']
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'created_at' => $user->created_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * Deletes the showcase rows and their uploaded files.
     *
     * @return array{employers: int, candidates: int, companies: int}
     */
    public function purge(bool $skipPasswordCheck = false): array
    {
        $target = $this->resolve($skipPasswordCheck);

        $companies = $target['companies'];
        $employers = $target['employers'];
        $candidates = $target['candidates'];

        // Read the file paths before the rows go, otherwise the uploads are orphaned on disk.
        $logoPaths = $companies->pluck('logo_path')->filter()->all();
        $avatarPaths = $employers->merge($candidates)->pluck('avatar_path')->filter()->all();

        DB::transaction(function () use ($companies, $employers, $candidates): void {
            // Companies first: job_posts.posted_by_user_id and companies.owner_id are
            // both restrictOnDelete, so the owning users cannot go until these are gone.
            //
            // forceDelete, not delete: Company soft-deletes, and a soft-deleted row
            // still holds its owner_id, so a plain delete would leave the restrict FK
            // in place and block the user deletion below. The hard delete is also what
            // fires the database-level cascade into job_posts and applications.
            Company::withTrashed()->whereIn('id', $companies->pluck('id'))->forceDelete();
            User::query()->whereIn('id', $employers->pluck('id'))->delete();
            User::query()->whereIn('id', $candidates->pluck('id'))->delete();
        });

        Storage::disk('public')->delete([...$logoPaths, ...$avatarPaths]);

        return [
            'employers' => $employers->count(),
            'candidates' => $candidates->count(),
            'companies' => $companies->count(),
        ];
    }

    /**
     * @return array{
     *     employers: Collection<int, User>,
     *     candidates: Collection<int, User>,
     *     companies: Collection<int, Company>,
     *     suspects: Collection<int, User>
     * }
     */
    private function resolve(bool $skipPasswordCheck): array
    {
        $employerEmails = array_map(fn (string $domain): string => 'hr@'.$domain, self::SEEDED_DOMAINS);

        $employerMatches = User::query()
            ->where('role', UserRole::Employer)
            ->whereIn('email', $employerEmails)
            ->get();

        $candidateMatches = User::query()
            ->where('role', UserRole::Employee)
            ->where('email', 'like', 'kandidat%@karirkonek.test')
            ->get()
            // LIKE cannot express "digits only", so the exact shape is checked here.
            ->filter(fn (User $user): bool => (bool) preg_match('/^kandidat\d+@karirkonek\.test$/', $user->email));

        [$employers, $employerSuspects] = $this->splitByPassword($employerMatches, $skipPasswordCheck);

        // Candidates are not password-checked. `.test` is a reserved TLD: nobody
        // can register the domain or receive mail there, so a kandidat<N>@
        // karirkonek.test account cannot belong to a real person no matter what
        // its password is. Verifying them would only buy 30 bcrypt comparisons
        // at roughly 170ms each -- five seconds of page load for no information.
        $candidates = $candidateMatches->values();

        return [
            'employers' => $employers,
            'candidates' => $candidates,
            // withTrashed: a showcase company an admin already soft-deleted still
            // pins its owner via the restrict FK, so it has to be purged too.
            'companies' => Company::withTrashed()->whereIn('owner_id', $employers->pluck('id'))->get(),
            'suspects' => $employerSuspects,
        ];
    }

    /**
     * Splits marker-matched users into those still holding the seeder's default
     * password and those that do not -- the latter may be real people who
     * happened to claim the address.
     *
     * @param  Collection<int, User>  $users
     * @return array{0: Collection<int, User>, 1: Collection<int, User>}
     */
    private function splitByPassword(Collection $users, bool $skipPasswordCheck): array
    {
        if ($skipPasswordCheck) {
            return [$users->values(), new Collection];
        }

        $seeded = $users->filter(fn (User $user): bool => Hash::check(self::SEEDED_PASSWORD, $user->password));

        return [$seeded->values(), $users->diff($seeded)->values()];
    }
}
