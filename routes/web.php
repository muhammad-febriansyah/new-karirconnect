<?php

use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Public\ApplicationController as PublicApplicationController;
use App\Http\Controllers\Public\CompanyBrowseController;
use App\Http\Controllers\Public\JobBrowseController;
use App\Http\Controllers\Public\PaymentCallbackController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::prefix('jobs')->name('public.jobs.')->group(function (): void {
    Route::get('/', [JobBrowseController::class, 'index'])->name('index');
    Route::get('{job:slug}', [JobBrowseController::class, 'show'])->name('show');

    Route::middleware(['auth', 'verified'])->group(function (): void {
        Route::get('{job:slug}/apply', [PublicApplicationController::class, 'create'])->name('apply.create');
        Route::post('{job:slug}/apply', [PublicApplicationController::class, 'store'])->name('apply.store');
    });
});

Route::prefix('companies')->name('public.companies.')->group(function (): void {
    Route::get('/', [CompanyBrowseController::class, 'index'])->name('index');
    Route::get('{company:slug}', [CompanyBrowseController::class, 'show'])->name('show');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::prefix('notifications')->name('notifications.')->group(function (): void {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::get('unread', [NotificationController::class, 'unread'])->name('unread');
        Route::post('{notification}/read', [NotificationController::class, 'markRead'])->name('read');
        Route::post('mark-all-read', [NotificationController::class, 'markAllRead'])->name('read-all');
        Route::delete('{notification}', [NotificationController::class, 'destroy'])->name('destroy');
    });
});

Route::prefix('payments/duitku')->name('payments.duitku.')->group(function (): void {
    Route::post('callback', [PaymentCallbackController::class, 'callback'])->name('callback');
    Route::get('return', [PaymentCallbackController::class, 'return'])->name('return');
});

require __DIR__.'/admin.php';
require __DIR__.'/employer.php';
require __DIR__.'/employee.php';
require __DIR__.'/settings.php';
