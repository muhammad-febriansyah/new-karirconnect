<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employer\InviteTeamMemberRequest;
use App\Models\CompanyMember;
use App\Models\User;
use App\Services\Company\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    use ResolvesEmployerCompany;

    public function __construct(private readonly CompanyService $companies) {}

    public function index(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $members = $company->members()
            ->with('user:id,name,email,avatar_path')
            ->get()
            ->map(fn (CompanyMember $member) => [
                'id' => $member->id,
                'user_id' => $member->user_id,
                'name' => $member->user?->name,
                'email' => $member->user?->email,
                'avatar_url' => $member->user?->avatar_path
                    ? asset('storage/'.$member->user->avatar_path)
                    : null,
                'role' => $member->role,
                'is_owner' => $member->user_id === $company->owner_id,
                'invited_at' => $member->invited_at?->toIso8601String(),
                'joined_at' => $member->joined_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => $members,
            'meta' => ['owner_id' => $company->owner_id],
        ]);
    }

    /**
     * Invite an existing user onto the team.
     *
     * Matches the web: the invitee must already have an account. 404 when they
     * do not, rather than creating one on their behalf.
     */
    public function store(InviteTeamMemberRequest $request): JsonResponse
    {
        $company = $this->requireCompany($request);
        $data = $request->validated();

        $user = User::query()->where('email', $data['email'])->first();

        abort_unless($user !== null, 404, 'Pengguna dengan email tersebut belum terdaftar.');

        $this->companies->inviteTeamMember($company, $user, $data['role']);

        return response()->json([
            'message' => "{$user->name} berhasil diundang ke tim.",
            'data' => ['user_id' => $user->id, 'role' => $data['role']],
        ], 201);
    }

    public function destroy(Request $request, CompanyMember $member): JsonResponse
    {
        $company = $this->requireCompany($request);

        abort_unless($member->company_id === $company->id, 404);

        // Removing the owner would leave the company unreachable by its own
        // account, so it is refused outright.
        abort_if($member->user_id === $company->owner_id, 422, 'Pemilik perusahaan tidak dapat dihapus.');

        $this->companies->removeTeamMember($company, $member->user_id);

        return response()->json(['message' => 'Anggota tim dihapus.']);
    }
}
