<?php

namespace App\Http\Middleware;

use App\Enums\CompanyStatus;
use App\Enums\UserRole;
use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Block employer routes that require an approved company. Owners with a
 * pending or suspended company are redirected back with a toast pointing
 * them at the verification page so they understand why the action was
 * blocked.
 */
class EnsureCompanyApproved
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== UserRole::Employer) {
            return $next($request);
        }

        $company = Company::query()->where('owner_id', $user->id)->first();

        if ($company !== null && $company->hasRecruiterAccess()) {
            return $next($request);
        }

        $message = match ($company?->status) {
            CompanyStatus::Suspended => 'Akun perusahaan Anda dinonaktifkan. Hubungi admin untuk informasi lebih lanjut.',
            default => 'Fitur ini aktif setelah perusahaan disetujui admin. Cek status verifikasi di halaman verifikasi perusahaan.',
        };

        // A redirect to an HTML page is meaningless to the mobile client: it
        // would follow the 302 and try to decode a login/verification page as
        // JSON. Answer with a status and a code it can branch on instead.
        if ($request->is('api/*')) {
            return response()->json([
                'message' => $message,
                'code' => $company?->status === CompanyStatus::Suspended
                    ? 'company_suspended'
                    : 'company_not_approved',
            ], 403);
        }

        return redirect()
            ->to('/employer/company/verification')
            ->with('toast', ['type' => 'warning', 'message' => $message]);
    }
}
