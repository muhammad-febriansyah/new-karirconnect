<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\InviteTeamMemberRequest;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\User;
use App\Services\Company\CompanyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    public function __construct(private readonly CompanyService $companies) {}

    public function index(Request $request): Response
    {
        $company = Company::query()->where('owner_id', $request->user()->id)->first();

        $members = $company
            ? $company->members()->with('user:id,name,email,avatar_path')->latest('joined_at')->get()
                ->map(fn (CompanyMember $m) => [
                    'id' => $m->id,
                    'user_id' => $m->user_id,
                    'name' => $m->user?->name,
                    'email' => $m->user?->email,
                    'role' => $m->role,
                    'invited_at' => optional($m->invited_at)->toIso8601String(),
                    'joined_at' => optional($m->joined_at)->toIso8601String(),
                ])->values()
            : collect();

        return Inertia::render('employer/team', [
            'company' => $company ? ['id' => $company->id, 'name' => $company->name, 'owner_id' => $company->owner_id] : null,
            'members' => $members,
        ]);
    }

    public function store(InviteTeamMemberRequest $request): RedirectResponse
    {
        $company = $this->resolveOwnedCompany($request);
        $data = $request->validated();

        $user = User::query()->where('email', $data['email'])->first();
        abort_unless($user !== null, 404);

        $this->companies->inviteTeamMember($company, $user, $data['role']);

        return back()->with('success', "{$user->name} berhasil diundang ke tim.");
    }

    public function destroy(Request $request, CompanyMember $member): RedirectResponse
    {
        $company = $this->resolveOwnedCompany($request);
        abort_unless($member->company_id === $company->id, 404);
        abort_if($member->user_id === $company->owner_id, 422, 'Pemilik perusahaan tidak dapat dihapus.');

        $this->companies->removeTeamMember($company, $member->user_id);

        return back()->with('success', 'Anggota tim berhasil dihapus.');
    }

    private function resolveOwnedCompany(Request $request): Company
    {
        $company = Company::query()
            ->where('owner_id', $request->user()->id)
            ->first();

        abort_unless($company !== null, 404, 'Perusahaan belum terdaftar.');

        return $company;
    }
}
