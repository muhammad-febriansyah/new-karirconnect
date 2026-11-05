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
use App\Http\Controllers\Admin\DatabaseBackupController;
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
use App\Http\Controllers\Admin\Scraper\CrawlErrorController;
use App\Http\Controllers\Admin\Scraper\CrawlRunController;
use App\Http\Controllers\Admin\Scraper\ExternalJobController;
use App\Http\Controllers\Admin\Scraper\JobSourceController;
use App\Http\Controllers\Admin\Scraper\ScrapedJobListingController;
use App\Http\Controllers\Admin\Scraper\ScraperDashboardController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\ShowcaseDataController;
use App\Http\Controllers\Admin\SkillController;
use App\Http\Controllers\Admin\SubscriptionController as AdminSubscriptionController;
use App\Http\Controllers\Admin\SubscriptionPlanController;
use App\Http\Controllers\Admin\TalentSearchLogController;
use App\Http\Controllers\Admin\UserController;
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
                    ->whereIn('group', ['general', 'branding', 'seo', 'social', 'ai', 'payment', 'email', 'security', 'feature_flags', 'legal'])
                    ->name('group');
                Route::post('/', [SettingController::class, 'update'])->name('update');
                Route::post('test-email', [SettingController::class, 'testEmail'])->name('test-email');
            });

        /*
         * The dump is POST-only on purpose. As a GET it could be fired by a
         * link, an <img src>, or a browser prefetch -- dumping the entire
         * database as a side effect of hovering a bookmark.
         */
        Route::prefix('database')
            ->as('database.')
            ->group(function (): void {
                Route::get('/', [DatabaseBackupController::class, 'index'])->name('index');
                Route::post('export', [DatabaseBackupController::class, 'download'])->name('export');
            });

        /*
         * Purge is DELETE, never GET, for the same reason: a link or a prefetch
         * must not be able to wipe the demo data as a side effect.
         */
        Route::prefix('showcase-data')
            ->as('showcase-data.')
            ->group(function (): void {
                Route::get('/', [ShowcaseDataController::class, 'index'])->name('index');
                Route::delete('/', [ShowcaseDataController::class, 'destroy'])->name('destroy');
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
        Route::get('assessment-questions/skills/{skill}/bulk', [AssessmentQuestionController::class, 'bulkCreate'])
            ->name('assessment-questions.bulk-create');
        Route::post('assessment-questions/generate', [AssessmentQuestionController::class, 'generate'])
            ->name('assessment-questions.generate');
        Route::post('assessment-questions/bulk', [AssessmentQuestionController::class, 'bulkStore'])
            ->name('assessment-questions.bulk');

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
            ->only(['index', 'show', 'update', 'destroy']);

        /*
         * Job scraper: external sources, crawl runs, their results and logs.
         * Every action that starts or stops a crawl is a POST.
         */
        Route::prefix('scraper')
            ->as('scraper.')
            ->group(function (): void {
                Route::get('/', [ScraperDashboardController::class, 'index'])->name('dashboard');

                Route::resource('sources', JobSourceController::class)
                    ->except(['show'])
                    ->parameters(['sources' => 'jobSource']);
                Route::post('sources/{jobSource}/run', [JobSourceController::class, 'run'])->name('sources.run');

                Route::get('listings', [ScrapedJobListingController::class, 'index'])->name('listings.index');
                Route::post('listings/bulk-delete', [ScrapedJobListingController::class, 'bulkDestroy'])->name('listings.bulk-destroy');
                Route::get('listings/{listing}', [ScrapedJobListingController::class, 'show'])->name('listings.show');
                Route::get('listings/{listing}/edit', [ScrapedJobListingController::class, 'edit'])->name('listings.edit');
                Route::put('listings/{listing}', [ScrapedJobListingController::class, 'update'])->name('listings.update');
                Route::delete('listings/{listing}', [ScrapedJobListingController::class, 'destroy'])->name('listings.destroy');
                Route::patch('listings/{listing}/visibility', [ScrapedJobListingController::class, 'toggleVisibility'])->name('listings.visibility');

                Route::get('runs', [CrawlRunController::class, 'index'])->name('runs.index');
                Route::get('runs/{run}', [CrawlRunController::class, 'show'])->name('runs.show');
                Route::post('runs/{run}/retry', [CrawlRunController::class, 'retry'])->name('runs.retry');
                Route::post('runs/{run}/cancel', [CrawlRunController::class, 'cancel'])->name('runs.cancel');

                Route::get('logs', [CrawlErrorController::class, 'index'])->name('logs.index');

                // Jobs Eksternal: the "Scrap" dialog and publishing to the portal.
                Route::post('scrape', [ExternalJobController::class, 'scrape'])->name('scrape.start');
                Route::get('scrape/status', [ExternalJobController::class, 'status'])->name('scrape.status');
                Route::get('scrape/results', [ExternalJobController::class, 'results'])->name('scrape.results');
                Route::post('listings/publish', [ExternalJobController::class, 'publish'])->name('listings.publish');
            });

        Route::prefix('companies')
            ->name('companies.')
            ->group(function (): void {
                Route::get('/', [CompanyController::class, 'index'])->name('index');
                Route::get('create', [CompanyController::class, 'create'])->name('create');
                Route::post('/', [CompanyController::class, 'store'])->name('store');
                Route::get('{company}', [CompanyController::class, 'show'])->name('show');
                Route::post('{company}/approve', [CompanyController::class, 'approve'])->name('approve');
                Route::post('{company}/suspend', [CompanyController::class, 'suspend'])->name('suspend');
                Route::delete('{company}', [CompanyController::class, 'destroy'])->name('destroy');
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
        Route::get('subscriptions/{subscription}', [AdminSubscriptionController::class, 'show'])->name('subscriptions.show');
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

        Route::prefix('users')
            ->name('users.')
            ->group(function (): void {
                Route::get('/', [UserController::class, 'index'])->name('index');
                Route::get('{user}', [UserController::class, 'show'])->name('show');
                Route::put('{user}', [UserController::class, 'update'])->name('update');
                Route::delete('{user}', [UserController::class, 'destroy'])->name('destroy');
                Route::post('{user}/suspend', [UserController::class, 'suspend'])->name('suspend');
                Route::post('{user}/activate', [UserController::class, 'activate'])->name('activate');
                Route::post('{user}/password-reset', [UserController::class, 'sendPasswordReset'])
                    ->name('password-reset');
            });
    });
