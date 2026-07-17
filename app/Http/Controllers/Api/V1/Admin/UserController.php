<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->when($request->filled('role'), fn ($query) => $query->where('role', $request->string('role')->toString()))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $term = $request->string('search')->toString();
                $query->where(fn ($q) => $q->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"));
            })
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'total' => $users->total(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'counts' => [
                    'admin' => User::query()->where('role', UserRole::Admin)->count(),
                    'employer' => User::query()->where('role', UserRole::Employer)->count(),
                    'employee' => User::query()->where('role', UserRole::Employee)->count(),
                ],
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['employeeProfile:id,user_id,headline,profile_completion', 'ownedCompanies:id,owner_id,name,status']);

        return response()->json([
            'data' => new UserResource($user),
            'meta' => [
                'employee_profile' => $user->employeeProfile,
                'owned_companies' => $user->ownedCompanies,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Edit a user, including their role.
     *
     * This is the legitimate path for granting admin -- unlike public
     * registration, which is restricted to the self-registerable roles.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'role' => ['required', new Enum(UserRole::class)],
            'phone' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ]);

        // Mirrors the web: an admin cannot demote or deactivate themselves, or
        // they could lock the last admin out of the panel.
        if ($user->id === $request->user()->id) {
            if ($validated['role'] !== UserRole::Admin->value) {
                return response()->json([
                    'message' => 'Anda tidak dapat mengubah role akun Anda sendiri.',
                    'code' => 'cannot_change_own_role',
                ], 422);
            }

            if (! $validated['is_active']) {
                return response()->json([
                    'message' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.',
                    'code' => 'cannot_deactivate_self',
                ], 422);
            }
        }

        $user->update($validated);

        return response()->json(['data' => new UserResource($user->fresh())]);
    }

    public function suspend(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.',
                'code' => 'cannot_deactivate_self',
            ], 422);
        }

        $user->forceFill(['is_active' => false])->save();

        return response()->json(['message' => 'Akun dinonaktifkan.', 'data' => new UserResource($user->fresh())]);
    }

    public function activate(User $user): JsonResponse
    {
        $user->forceFill(['is_active' => true])->save();

        return response()->json(['message' => 'Akun diaktifkan.', 'data' => new UserResource($user->fresh())]);
    }
}
