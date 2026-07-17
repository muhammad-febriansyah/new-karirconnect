<?php

namespace App\Http\Controllers\Api\V1\Employer\Concerns;

use App\Models\Company;
use App\Models\Job;
use Illuminate\Http\Request;

/**
 * Resolves the company acting on an employer request.
 *
 * Matches the web: the company is the one this user OWNS. Note that this means
 * a company_members recruiter who is not the owner resolves to nothing and is
 * locked out -- an existing limitation of the web app, mirrored here rather
 * than quietly diverging, since widening it would grant mobile users access
 * the web does not.
 */
trait ResolvesEmployerCompany
{
    protected function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }

    protected function requireCompany(Request $request): Company
    {
        $company = $this->resolveCompany($request);

        abort_unless($company !== null, 404, 'Perusahaan belum terdaftar.');

        return $company;
    }

    /**
     * A job belonging to another company is a 403, matching the web.
     */
    protected function authorizeJob(Request $request, Job $job): void
    {
        $company = $this->resolveCompany($request);

        abort_unless($company !== null && $job->company_id === $company->id, 403);
    }
}
