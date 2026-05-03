<?php

use App\Http\Controllers\Employer\AiInterviewReportExportController;
use App\Http\Controllers\Employer\AiInterviewReviewController;
use App\Http\Controllers\Employer\AiInterviewTemplateController;
use App\Http\Controllers\Employer\ApplicantController;
use App\Http\Controllers\Employer\ApplicantExportController;
use App\Http\Controllers\Employer\BillingController;
use App\Http\Controllers\Employer\CandidateOutreachController;
use App\Http\Controllers\Employer\CompanyOfficeController;
use App\Http\Controllers\Employer\CompanyProfileController;
use App\Http\Controllers\Employer\CompanyReviewResponseController;
use App\Http\Controllers\Employer\CompanyVerificationController;
use App\Http\Controllers\Employer\GoogleCalendarController;
use App\Http\Controllers\Employer\InterviewController;
use App\Http\Controllers\Employer\JobBoostController;
use App\Http\Controllers\Employer\JobController;
use App\Http\Controllers\Employer\JobScreeningQuestionController;
use App\Http\Controllers\Employer\MessageTemplateController;
use App\Http\Controllers\Employer\SavedCandidateController;
use App\Http\Controllers\Employer\TalentSearchController;
use App\Http\Controllers\Employer\TeamController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'role:employer'])
    ->prefix('employer')
    ->name('employer.')
    ->group(function (): void {
        Route::prefix('company')
            ->name('company.')
            ->group(function (): void {
                Route::get('edit', [CompanyProfileController::class, 'edit'])->name('edit');
                Route::post('/', [CompanyProfileController::class, 'store'])->name('store');
                Route::patch('/', [CompanyProfileController::class, 'update'])->name('update');

                Route::get('verification', [CompanyVerificationController::class, 'index'])->name('verification.index');
                Route::post('verification', [CompanyVerificationController::class, 'store'])->name('verification.store');
            });

        Route::resource('company-offices', CompanyOfficeController::class)
            ->only(['index', 'create', 'store', 'edit', 'update', 'destroy'])
            ->parameters(['company-offices' => 'office']);

        Route::get('team', [TeamController::class, 'index'])->name('team.index');
        Route::post('team', [TeamController::class, 'store'])->name('team.store');
        Route::delete('team/{member}', [TeamController::class, 'destroy'])->name('team.destroy');

        Route::resource('jobs', JobController::class)
            ->only(['index', 'create', 'store', 'show', 'edit', 'update'])
            ->middleware('company.approved');

        Route::resource('jobs.screening-questions', JobScreeningQuestionController::class)
            ->only(['store', 'update', 'destroy'])
            ->scoped()
            ->middleware('company.approved');

        Route::middleware('company.approved')->group(function (): void {
            Route::get('applicants', [ApplicantController::class, 'index'])->name('applicants.index');
            Route::get('applicants/export', [ApplicantExportController::class, 'download'])->name('applicants.export');
            Route::get('applicants/{application}', [ApplicantController::class, 'show'])->name('applicants.show');
            Route::post('applicants/{application}/status', [ApplicantController::class, 'changeStatus'])->name('applicants.status');

            Route::prefix('interviews')->name('interviews.')->group(function (): void {
                Route::get('/', [InterviewController::class, 'index'])->name('index');
                Route::get('create', [InterviewController::class, 'create'])->name('create');
                Route::post('/', [InterviewController::class, 'store'])->name('store');
                Route::get('{interview}', [InterviewController::class, 'show'])->name('show');
                Route::post('{interview}/cancel', [InterviewController::class, 'cancel'])->name('cancel');
                Route::post('{interview}/complete', [InterviewController::class, 'complete'])->name('complete');
                Route::post('{interview}/stage', [InterviewController::class, 'changeStage'])->name('stage');
                Route::post('{interview}/scorecard', [InterviewController::class, 'storeScorecard'])->name('scorecard');
                Route::get('{interview}/ics', [InterviewController::class, 'downloadIcs'])->name('ics');
            });

            Route::prefix('ai-interview-templates')->name('ai-interview-templates.')->group(function (): void {
                Route::get('/', [AiInterviewTemplateController::class, 'index'])->name('index');
                Route::post('/', [AiInterviewTemplateController::class, 'store'])->name('store');
                Route::patch('{template}', [AiInterviewTemplateController::class, 'update'])->name('update');
                Route::delete('{template}', [AiInterviewTemplateController::class, 'destroy'])->name('destroy');
            });

            Route::prefix('ai-interviews')->name('ai-interviews.')->group(function (): void {
                Route::get('/', [AiInterviewReviewController::class, 'index'])->name('index');
                Route::get('{session}', [AiInterviewReviewController::class, 'show'])->name('show');
                Route::get('{session}/report', [AiInterviewReportExportController::class, 'download'])->name('report');
            });

            Route::post('jobs/{job}/boost', [JobBoostController::class, 'store'])->name('jobs.boost');

            Route::prefix('google-calendar')->name('google-calendar.')->group(function (): void {
                Route::get('connect', [GoogleCalendarController::class, 'redirect'])->name('connect');
                Route::get('callback', [GoogleCalendarController::class, 'callback'])->name('callback');
                Route::delete('/', [GoogleCalendarController::class, 'disconnect'])->name('disconnect');
            });
        });

        Route::prefix('billing')->name('billing.')->group(function (): void {
            Route::get('/', [BillingController::class, 'index'])->name('index');
            Route::post('plans/{plan}/checkout', [BillingController::class, 'checkout'])->name('checkout');
            Route::get('orders/{order}', [BillingController::class, 'show'])->name('show');
        });

        Route::prefix('company-reviews')->name('company-reviews.')->group(function (): void {
            Route::get('/', [CompanyReviewResponseController::class, 'index'])->name('index');
            Route::post('{review}/respond', [CompanyReviewResponseController::class, 'respond'])->name('respond');
        });

        Route::prefix('message-templates')->name('message-templates.')->group(function (): void {
            Route::get('/', [MessageTemplateController::class, 'index'])->name('index');
            Route::post('/', [MessageTemplateController::class, 'store'])->name('store');
            Route::patch('{template}', [MessageTemplateController::class, 'update'])->name('update');
            Route::delete('{template}', [MessageTemplateController::class, 'destroy'])->name('destroy');
        });

        Route::middleware(['company.approved', 'subscription.active:starter'])->group(function (): void {
            Route::prefix('talent-search')->name('talent-search.')->group(function (): void {
                Route::get('/', [TalentSearchController::class, 'index'])->name('index');
                Route::get('saved', [SavedCandidateController::class, 'index'])->name('saved');
                Route::get('{profile}', [TalentSearchController::class, 'show'])->name('show');
                Route::post('{profile}/save', [SavedCandidateController::class, 'store'])->name('save');
                Route::delete('{profile}/save', [SavedCandidateController::class, 'destroy'])->name('unsave');
                Route::post('{profile}/outreach', [CandidateOutreachController::class, 'store'])->name('outreach');
            });
        });
    });
