<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Services\Dashboard\AdminDashboardService;
use App\Services\Dashboard\EmployeeDashboardService;
use App\Services\Dashboard\EmployerDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Role-aware home screen data.
 *
 * The three snapshot services already return plain arrays, so this just picks
 * the right one -- same dispatch the web DashboardController does.
 */
class DashboardController extends Controller
{
    public function __construct(
        private readonly EmployeeDashboardService $employee,
        private readonly EmployerDashboardService $employer,
        private readonly AdminDashboardService $admin,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = match ($user->role) {
            UserRole::Admin => $this->admin->snapshot(),
            UserRole::Employer => $this->employer->snapshot($user),
            default => $this->employee->snapshot($user),
        };

        return response()->json([
            'data' => $data,
            'meta' => ['role' => $user->role->value],
        ]);
    }
}
