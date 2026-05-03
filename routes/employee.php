<?php

use App\Http\Controllers\Employee\AiInterviewController;
use App\Http\Controllers\Employee\ApplicationController;
use App\Http\Controllers\Employee\CareerCoachController;
use App\Http\Controllers\Employee\CertificationController;
use App\Http\Controllers\Employee\CompanyReviewController as EmployeeCompanyReviewController;
use App\Http\Controllers\Employee\CvBuilderController;
use App\Http\Controllers\Employee\CvUploadController;
use App\Http\Controllers\Employee\EducationController;
use App\Http\Controllers\Employee\InterviewController;
use App\Http\Controllers\Employee\JobAlertController;
use App\Http\Controllers\Employee\JobRecommendationController;
use App\Http\Controllers\Employee\MessageController;
use App\Http\Controllers\Employee\ProfileController;
use App\Http\Controllers\Employee\SalarySubmissionController;
use App\Http\Controllers\Employee\SavedJobController;
use App\Http\Controllers\Employee\SkillAssessmentController;
use App\Http\Controllers\Employee\WorkExperienceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'role:employee'])
    ->prefix('employee')
    ->name('employee.')
    ->group(function (): void {
        Route::get('profile/edit', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('profile/edit', [ProfileController::class, 'update'])->name('profile.update');

        Route::resource('profile/educations', EducationController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->names('educations');

        Route::resource('profile/work-experiences', WorkExperienceController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->names('work-experiences');

        Route::resource('profile/certifications', CertificationController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->names('certifications');

        Route::get('cv/index', [CvUploadController::class, 'index'])->name('cvs.index');
        Route::post('cv/index', [CvUploadController::class, 'store'])->name('cvs.store');
        Route::patch('cv/index/{candidateCv}', [CvUploadController::class, 'update'])->name('cvs.update');
        Route::delete('cv/index/{candidateCv}', [CvUploadController::class, 'destroy'])->name('cvs.destroy');

        Route::get('cv/builder', [CvBuilderController::class, 'edit'])->name('cv.builder.edit');
        Route::post('cv/builder', [CvBuilderController::class, 'update'])->name('cv.builder.update');

        Route::get('saved-jobs', [SavedJobController::class, 'index'])->name('saved-jobs.index');
        Route::post('saved-jobs/{job}', [SavedJobController::class, 'store'])->name('saved-jobs.store');
        Route::delete('saved-jobs/{job}', [SavedJobController::class, 'destroy'])->name('saved-jobs.destroy');

        Route::get('applications', [ApplicationController::class, 'index'])->name('applications.index');
        Route::get('applications/{application}', [ApplicationController::class, 'show'])->name('applications.show');

        Route::prefix('interviews')->name('interviews.')->group(function (): void {
            Route::get('/', [InterviewController::class, 'index'])->name('index');
            Route::get('{interview}', [InterviewController::class, 'show'])->name('show');
            Route::post('{interview}/respond', [InterviewController::class, 'respond'])->name('respond');
            Route::post('{interview}/reschedule', [InterviewController::class, 'requestReschedule'])->name('reschedule');
        });

        Route::prefix('ai-interviews')->name('ai-interviews.')->group(function (): void {
            Route::get('/', [AiInterviewController::class, 'index'])->name('index');
            Route::get('{session}/run', [AiInterviewController::class, 'run'])->name('run');
            Route::get('{session}/result', [AiInterviewController::class, 'result'])->name('result');

            Route::middleware('throttle:60,1')->group(function (): void {
                Route::post('practice', [AiInterviewController::class, 'startPractice'])->name('practice');
                Route::post('{session}/questions/{question}/answer', [AiInterviewController::class, 'answer'])->name('answer');
                Route::post('{session}/client-secret', [AiInterviewController::class, 'clientSecret'])->name('client-secret');
                Route::post('{session}/recording', [AiInterviewController::class, 'uploadRecording'])->name('recording');
                Route::post('{session}/voice-submit', [AiInterviewController::class, 'submitVoice'])->name('voice-submit');
                Route::post('{session}/complete', [AiInterviewController::class, 'complete'])->name('complete');
            });
        });

        Route::prefix('messages')->name('messages.')->group(function (): void {
            Route::get('/', [MessageController::class, 'index'])->name('index');
            Route::post('{message}/reply', [MessageController::class, 'reply'])->name('reply');
        });

        Route::prefix('company-reviews')->name('company-reviews.')->group(function (): void {
            Route::get('/', [EmployeeCompanyReviewController::class, 'index'])->name('index');
            Route::get('companies/{company:slug}/create', [EmployeeCompanyReviewController::class, 'create'])->name('create');
            Route::post('companies/{company:slug}', [EmployeeCompanyReviewController::class, 'store'])->name('store');
            Route::get('{review}/edit', [EmployeeCompanyReviewController::class, 'edit'])->name('edit');
            Route::patch('{review}', [EmployeeCompanyReviewController::class, 'update'])->name('update');
            Route::delete('{review}', [EmployeeCompanyReviewController::class, 'destroy'])->name('destroy');
        });

        Route::prefix('salary-submissions')->name('salary-submissions.')->group(function (): void {
            Route::get('/', [SalarySubmissionController::class, 'index'])->name('index');
            Route::get('create', [SalarySubmissionController::class, 'create'])->name('create');
            Route::post('/', [SalarySubmissionController::class, 'store'])->name('store');
            Route::delete('{submission}', [SalarySubmissionController::class, 'destroy'])->name('destroy');
        });

        Route::prefix('job-alerts')->name('job-alerts.')->group(function (): void {
            Route::get('/', [JobAlertController::class, 'index'])->name('index');
            Route::post('/', [JobAlertController::class, 'store'])->name('store');
            Route::patch('{alert}', [JobAlertController::class, 'update'])->name('update');
            Route::delete('{alert}', [JobAlertController::class, 'destroy'])->name('destroy');
            Route::get('{alert}/preview', [JobAlertController::class, 'preview'])->name('preview');
            Route::post('{alert}/dispatch', [JobAlertController::class, 'dispatchNow'])->name('dispatch');
        });

        Route::prefix('recommendations')->name('recommendations.')->group(function (): void {
            Route::get('/', [JobRecommendationController::class, 'index'])->name('index');
            Route::post('{job}/dismiss', [JobRecommendationController::class, 'dismiss'])->name('dismiss');
        });

        Route::prefix('career-coach')->name('career-coach.')->group(function (): void {
            Route::get('/', [CareerCoachController::class, 'index'])->name('index');
            Route::get('{session}', [CareerCoachController::class, 'show'])->name('show');
            Route::post('{session}/archive', [CareerCoachController::class, 'archive'])->name('archive');

            Route::middleware('throttle:60,1')->group(function (): void {
                Route::post('/', [CareerCoachController::class, 'store'])->name('store');
                Route::post('{session}/send', [CareerCoachController::class, 'send'])->name('send');
            });
        });

        Route::prefix('skill-assessments')->name('skill-assessments.')->group(function (): void {
            Route::get('/', [SkillAssessmentController::class, 'index'])->name('index');
            Route::post('/', [SkillAssessmentController::class, 'store'])->name('store');
            Route::get('{skillAssessment}', [SkillAssessmentController::class, 'show'])->name('show');
            Route::post('{skillAssessment}/submit', [SkillAssessmentController::class, 'submit'])->name('submit');
        });
    });
