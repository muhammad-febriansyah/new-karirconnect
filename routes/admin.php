<?php

use App\Http\Controllers\Admin\CompanySizeController;
use App\Http\Controllers\Admin\IndustryController;
use App\Http\Controllers\Admin\JobCategoryController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\SkillController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'role:admin'])
    ->prefix('admin')
    ->as('admin.')
    ->group(function (): void {
        Route::prefix('settings')
            ->as('settings.')
            ->group(function (): void {
                Route::get('/', [SettingController::class, 'edit'])->name('edit');
                Route::get('{group}', [SettingController::class, 'edit'])
                    ->whereIn('group', ['general', 'branding', 'seo', 'ai', 'payment', 'email', 'feature_flags', 'legal'])
                    ->name('group');
                Route::post('/', [SettingController::class, 'update'])->name('update');
            });

        Route::resource('job-categories', JobCategoryController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('skills', SkillController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('industries', IndustryController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('company-sizes', CompanySizeController::class)
            ->only(['index', 'store', 'update', 'destroy']);
    });
