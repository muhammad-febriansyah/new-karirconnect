<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\AuditLog;
use App\Models\Job;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(private readonly AuditLogService $audit) {}

    public function index(Request $request): Response
    {
        $search = trim($request->string('search')->toString());
        $role = $request->string('role')->toString();
        $status = $request->string('status')->toString();
        $verified = $request->string('verified')->toString();

        $query = User::query()
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($role !== '', fn ($q) => $q->where('role', $role))
            ->when($status === 'active', fn ($q) => $q->where('is_active', true))
            ->when($status === 'suspended', fn ($q) => $q->where('is_active', false))
            ->when($verified === 'verified', fn ($q) => $q->whereNotNull('email_verified_at'))
            ->when($verified === 'unverified', fn ($q) => $q->whereNull('email_verified_at'));

        $users = $query
            ->withCount(['ownedCompanies', 'postedJobs'])
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $u): array => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role?->value,
                'role_label' => $u->role?->label(),
                'avatar_url' => $u->avatar_path ? asset('storage/'.$u->avatar_path) : null,
                'phone' => $u->phone,
                'is_active' => $u->is_active,
                'email_verified_at' => optional($u->email_verified_at)->toIso8601String(),
                'onboarding_completed_at' => optional($u->onboarding_completed_at)->toIso8601String(),
                'two_factor_enabled' => filled($u->two_factor_confirmed_at),
                'owned_companies_count' => $u->owned_companies_count,
                'posted_jobs_count' => $u->posted_jobs_count,
                'created_at' => optional($u->created_at)->toIso8601String(),
            ]);

        $totals = [
            'total' => User::query()->count(),
            'admin' => User::query()->where('role', UserRole::Admin)->count(),
            'employer' => User::query()->where('role', UserRole::Employer)->count(),
            'employee' => User::query()->where('role', UserRole::Employee)->count(),
            'suspended' => User::query()->where('is_active', false)->count(),
            'unverified' => User::query()->whereNull('email_verified_at')->count(),
            'new_this_month' => User::query()
                ->where('created_at', '>=', now()->startOfMonth())
                ->count(),
        ];

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'role' => $role,
                'status' => $status,
                'verified' => $verified,
            ],
            'roleOptions' => array_map(
                static fn (UserRole $r): array => ['value' => $r->value, 'label' => $r->label()],
                UserRole::cases(),
            ),
            'totals' => $totals,
        ]);
    }

    public function show(User $user): Response
    {
        $user->load([
            'employeeProfile.city:id,name,province_id',
            'employeeProfile.city.province:id,name',
            'employeeProfile.province:id,name',
            'ownedCompanies:id,name,slug,owner_id,status,verification_status,logo_path,created_at',
            'companyMemberships.company:id,name,slug,logo_path',
        ]);

        $isEmployee = $user->isEmployee();
        $isEmployer = $user->isEmployer();

        $applications = $isEmployee && $user->employeeProfile
            ? Application::query()
                ->where('employee_profile_id', $user->employeeProfile->id)
                ->with(['job:id,title,company_id,slug', 'job.company:id,name,slug,logo_path'])
                ->latest('created_at')
                ->limit(10)
                ->get()
                ->map(fn (Application $a): array => [
                    'id' => $a->id,
                    'status' => $a->status?->value ?? (string) $a->status,
                    'created_at' => optional($a->created_at)->toIso8601String(),
                    'job' => $a->job ? [
                        'id' => $a->job->id,
                        'title' => $a->job->title,
                        'slug' => $a->job->slug,
                        'company' => $a->job->company ? [
                            'id' => $a->job->company->id,
                            'name' => $a->job->company->name,
                            'logo_url' => $a->job->company->logo_path
                                ? asset('storage/'.$a->job->company->logo_path)
                                : null,
                        ] : null,
                    ] : null,
                ])->all()
            : [];

        $postedJobs = $isEmployer
            ? Job::query()
                ->where('posted_by_user_id', $user->id)
                ->with(['company:id,name,slug,logo_path'])
                ->latest('created_at')
                ->limit(10)
                ->get()
                ->map(fn (Job $j): array => [
                    'id' => $j->id,
                    'title' => $j->title,
                    'slug' => $j->slug,
                    'status' => $j->status?->value ?? (string) $j->status,
                    'created_at' => optional($j->created_at)->toIso8601String(),
                    'company' => $j->company ? [
                        'id' => $j->company->id,
                        'name' => $j->company->name,
                        'logo_url' => $j->company->logo_path
                            ? asset('storage/'.$j->company->logo_path)
                            : null,
                    ] : null,
                ])->all()
            : [];

        $auditLogs = AuditLog::query()
            ->where(function ($q) use ($user): void {
                $q->where('user_id', $user->id)
                    ->orWhere(function ($q) use ($user): void {
                        $q->where('subject_type', User::class)
                            ->where('subject_id', $user->id);
                    });
            })
            ->latest('id')
            ->limit(15)
            ->get(['id', 'user_id', 'action', 'subject_type', 'subject_id', 'ip_address', 'created_at'])
            ->map(fn (AuditLog $log): array => [
                'id' => $log->id,
                'action' => $log->action,
                'ip_address' => $log->ip_address,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id,
                'created_at' => optional($log->created_at)->toIso8601String(),
            ])->all();

        $applicationCount = $isEmployee && $user->employeeProfile
            ? Application::query()->where('employee_profile_id', $user->employeeProfile->id)->count()
            : 0;
        $postedJobsCount = $isEmployer
            ? Job::query()->where('posted_by_user_id', $user->id)->count()
            : 0;

        return Inertia::render('admin/users/show', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role?->value,
                'role_label' => $user->role?->label(),
                'avatar_url' => $user->avatar_path ? asset('storage/'.$user->avatar_path) : null,
                'phone' => $user->phone,
                'address' => $user->address,
                'locale' => $user->locale,
                'is_active' => $user->is_active,
                'email_verified_at' => optional($user->email_verified_at)->toIso8601String(),
                'onboarding_completed_at' => optional($user->onboarding_completed_at)->toIso8601String(),
                'two_factor_enabled' => filled($user->two_factor_confirmed_at),
                'created_at' => optional($user->created_at)->toIso8601String(),
                'updated_at' => optional($user->updated_at)->toIso8601String(),
                'employee_profile' => $user->employeeProfile ? [
                    'id' => $user->employeeProfile->id,
                    'headline' => $user->employeeProfile->headline,
                    'current_position' => $user->employeeProfile->current_position,
                    'experience_level' => $user->employeeProfile->experience_level?->value,
                    'is_open_to_work' => $user->employeeProfile->is_open_to_work,
                    'profile_completion' => $user->employeeProfile->profile_completion,
                    'expected_salary_min' => $user->employeeProfile->expected_salary_min,
                    'expected_salary_max' => $user->employeeProfile->expected_salary_max,
                    'city' => $user->employeeProfile->city?->name,
                    'province' => $user->employeeProfile->city?->province?->name
                        ?? $user->employeeProfile->province?->name,
                    'portfolio_url' => $user->employeeProfile->portfolio_url,
                    'linkedin_url' => $user->employeeProfile->linkedin_url,
                    'github_url' => $user->employeeProfile->github_url,
                ] : null,
                'owned_companies' => $user->ownedCompanies->map(fn ($c): array => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                    'status' => $c->status?->value ?? (string) $c->status,
                    'verification_status' => $c->verification_status?->value
                        ?? (string) $c->verification_status,
                    'logo_url' => $c->logo_path ? asset('storage/'.$c->logo_path) : null,
                ])->all(),
                'memberships' => $user->companyMemberships->map(fn ($m): array => [
                    'id' => $m->id,
                    'role' => $m->role,
                    'company' => $m->company ? [
                        'id' => $m->company->id,
                        'name' => $m->company->name,
                        'slug' => $m->company->slug,
                        'logo_url' => $m->company->logo_path
                            ? asset('storage/'.$m->company->logo_path)
                            : null,
                    ] : null,
                ])->all(),
            ],
            'stats' => [
                'application_count' => $applicationCount,
                'posted_jobs_count' => $postedJobsCount,
                'owned_companies_count' => $user->ownedCompanies->count(),
                'memberships_count' => $user->companyMemberships->count(),
            ],
            'applications' => $applications,
            'postedJobs' => $postedJobs,
            'auditLogs' => $auditLogs,
            'roleOptions' => array_map(
                static fn (UserRole $r): array => ['value' => $r->value, 'label' => $r->label()],
                UserRole::cases(),
            ),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'role' => ['required', new Enum(UserRole::class)],
            'phone' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ]);

        if ($user->id === $request->user()->id && (string) $validated['role'] !== UserRole::Admin->value) {
            return back()->withErrors(['role' => 'Anda tidak dapat mengubah role akun Anda sendiri.']);
        }
        if ($user->id === $request->user()->id && ! $validated['is_active']) {
            return back()->withErrors(['is_active' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.']);
        }

        $before = Arr::only($user->getAttributes(), ['name', 'email', 'role', 'phone', 'is_active']);
        $user->update($validated);
        $after = Arr::only($user->fresh()->getAttributes(), ['name', 'email', 'role', 'phone', 'is_active']);

        $this->audit->record('user.update', $user, $before, $after, $request->user());

        return back()->with('success', "Pengguna {$user->name} diperbarui.");
    }

    public function suspend(User $user, Request $request): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->withErrors(['suspend' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.']);
        }

        $user->forceFill(['is_active' => false])->save();
        $this->audit->record('user.suspend', $user, ['is_active' => true], ['is_active' => false], $request->user());

        return back()->with('success', "Pengguna {$user->name} dinonaktifkan.");
    }

    public function activate(User $user, Request $request): RedirectResponse
    {
        $user->forceFill(['is_active' => true])->save();
        $this->audit->record('user.activate', $user, ['is_active' => false], ['is_active' => true], $request->user());

        return back()->with('success', "Pengguna {$user->name} diaktifkan.");
    }

    public function sendPasswordReset(User $user, Request $request): RedirectResponse
    {
        $status = Password::sendResetLink(['email' => $user->email]);
        $this->audit->record('user.password_reset_link', $user, null, ['status' => $status], $request->user());

        return $status === Password::RESET_LINK_SENT
            ? back()->with('success', "Tautan reset password dikirim ke {$user->email}.")
            : back()->withErrors(['password_reset' => 'Gagal mengirim tautan reset password.']);
    }

    public function destroy(User $user, Request $request): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->withErrors(['delete' => 'Anda tidak dapat menghapus akun Anda sendiri.']);
        }
        if ($user->isAdmin()) {
            return back()->withErrors(['delete' => 'Akun administrator tidak dapat dihapus melalui panel ini.']);
        }

        $snapshot = Arr::only($user->getAttributes(), ['name', 'email', 'role', 'is_active']);
        $name = $user->name;
        $user->delete();
        $this->audit->record('user.delete', null, $snapshot, null, $request->user());

        return to_route('admin.users.index')->with('success', "Pengguna {$name} dihapus.");
    }
}
