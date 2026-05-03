<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Services\Dashboard\AdminDashboardService;
use App\Services\Dashboard\EmployeeDashboardService;
use App\Services\Dashboard\EmployerDashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly EmployeeDashboardService $employee,
        private readonly EmployerDashboardService $employer,
        private readonly AdminDashboardService $admin,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        return match ($user->role) {
            UserRole::Admin => Inertia::render('dashboards/admin', [
                'data' => $this->admin->snapshot(),
            ]),
            UserRole::Employer => Inertia::render('dashboards/employer', [
                'data' => $this->employer->snapshot($user),
            ]),
            default => Inertia::render('dashboards/employee', [
                'data' => $this->employee->snapshot($user),
            ]),
        };
    }
}
