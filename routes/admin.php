<?php

use App\Http\Controllers\Admin\AboutPageController;
use App\Http\Controllers\Admin\AiAuditLogController;
use App\Http\Controllers\Admin\AnnouncementController;
use App\Http\Controllers\Admin\AssessmentQuestionController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CareerResourceController;
use App\Http\Controllers\Admin\CompanyController;
use App\Http\Controllers\Admin\CompanySizeController;
use App\Http\Controllers\Admin\CompanyVerificationController;
use App\Http\Controllers\Admin\FaqController;
use App\Http\Controllers\Admin\IndustryController;
use App\Http\Controllers\Admin\JobCategoryController;
use App\Http\Controllers\Admin\JobController;
use App\Http\Controllers\Admin\LegalPageController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\OrderExportController as AdminOrderExportController;
use App\Http\Controllers\Admin\PaymentController as AdminPaymentController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\ReviewModerationController;
use App\Http\Controllers\Admin\SalaryInsightController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\SkillController;
use App\Http\Controllers\Admin\SubscriptionController as AdminSubscriptionController;
use App\Http\Controllers\Admin\SubscriptionPlanController;
use App\Http\Controllers\Admin\TalentSearchLogController;
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
                    ->whereIn('group', ['general', 'branding', 'seo', 'ai', 'payment', 'email', 'security', 'feature_flags', 'legal'])
                    ->name('group');
                Route::post('/', [SettingController::class, 'update'])->name('update');
                Route::post('test-email', [SettingController::class, 'testEmail'])->name('test-email');
            });

        Route::prefix('about-page')
            ->as('about-page.')
            ->group(function (): void {
                Route::get('/', [AboutPageController::class, 'edit'])->name('edit');
                Route::post('/', [AboutPageController::class, 'update'])->name('update');
            });

        Route::resource('job-categories', JobCategoryController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('skills', SkillController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('industries', IndustryController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('company-sizes', CompanySizeController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('assessment-questions', AssessmentQuestionController::class)
            ->only(['index', 'store', 'update', 'destroy']);
        Route::get('assessment-questions/skills/{skill}', [AssessmentQuestionController::class, 'showSkill'])
            ->name('assessment-questions.skill');
        Route::post('assessment-questions/generate', [AssessmentQuestionController::class, 'generate'])
            ->name('assessment-questions.generate');

        Route::resource('announcements', AnnouncementController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('career-resources', CareerResourceController::class)
            ->except(['show']);

        Route::resource('faqs', FaqController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('legal-pages', LegalPageController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('salary-insights', SalaryInsightController::class)
            ->only(['index', 'store', 'update', 'destroy']);

        Route::resource('jobs', JobController::class)
            ->only(['index', 'show', 'update']);

        Route::prefix('companies')
            ->name('companies.')
            ->group(function (): void {
                Route::get('/', [CompanyController::class, 'index'])->name('index');
                Route::get('{company}', [CompanyController::class, 'show'])->name('show');
                Route::post('{company}/approve', [CompanyController::class, 'approve'])->name('approve');
                Route::post('{company}/suspend', [CompanyController::class, 'suspend'])->name('suspend');
            });

        Route::prefix('company-verifications')
            ->name('company-verifications.')
            ->group(function (): void {
                Route::get('/', [CompanyVerificationController::class, 'index'])->name('index');
                Route::post('{verification}/review', [CompanyVerificationController::class, 'review'])->name('review');
            });

        Route::prefix('reviews')
            ->name('reviews.')
            ->group(function (): void {
                Route::get('/', [ReviewModerationController::class, 'index'])->name('index');
                Route::post('{review}/approve', [ReviewModerationController::class, 'approve'])->name('approve');
                Route::post('{review}/reject', [ReviewModerationController::class, 'reject'])->name('reject');
            });

        Route::prefix('orders')
            ->name('orders.')
            ->group(function (): void {
                Route::get('/', [AdminOrderController::class, 'index'])->name('index');
                Route::get('export', [AdminOrderExportController::class, 'download'])->name('export');
                Route::get('{order}', [AdminOrderController::class, 'show'])->name('show');
            });

        Route::resource('pricing-plans', SubscriptionPlanController::class)
            ->only(['index', 'create', 'store', 'edit', 'update', 'destroy'])
            ->parameters(['pricing-plans' => 'plan']);

        Route::get('subscriptions', [AdminSubscriptionController::class, 'index'])->name('subscriptions.index');
        Route::get('payments', [AdminPaymentController::class, 'index'])->name('payments.index');

        Route::prefix('ai-audit-logs')
            ->name('ai-audit-logs.')
            ->group(function (): void {
                Route::get('/', [AiAuditLogController::class, 'index'])->name('index');
                Route::get('{log}', [AiAuditLogController::class, 'show'])->name('show');
            });

        Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

        Route::prefix('talent-search-logs')
            ->name('talent-search-logs.')
            ->group(function (): void {
                Route::get('/', [TalentSearchLogController::class, 'index'])->name('index');
            });

        Route::prefix('reports')
            ->name('reports.')
            ->group(function (): void {
                Route::get('/', [ReportController::class, 'index'])->name('index');
                Route::post('{report}/review', [ReportController::class, 'review'])->name('review');
            });
    });
