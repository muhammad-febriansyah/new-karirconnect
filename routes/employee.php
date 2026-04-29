<?php

use App\Http\Controllers\Employee\AiInterviewController;
use App\Http\Controllers\Employee\ApplicationController;
use App\Http\Controllers\Employee\CareerCoachController;
use App\Http\Controllers\Employee\CertificationController;
use App\Http\Controllers\Employee\CvBuilderController;
use App\Http\Controllers\Employee\CvUploadController;
use App\Http\Controllers\Employee\EducationController;
use App\Http\Controllers\Employee\InterviewController;
use App\Http\Controllers\Employee\MessageController;
use App\Http\Controllers\Employee\ProfileController;
use App\Http\Controllers\Employee\SavedJobController;
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
            Route::post('practice', [AiInterviewController::class, 'startPractice'])->name('practice');
            Route::get('{session}/run', [AiInterviewController::class, 'run'])->name('run');
            Route::post('{session}/questions/{question}/answer', [AiInterviewController::class, 'answer'])->name('answer');
            Route::post('{session}/complete', [AiInterviewController::class, 'complete'])->name('complete');
            Route::get('{session}/result', [AiInterviewController::class, 'result'])->name('result');
        });

        Route::prefix('messages')->name('messages.')->group(function (): void {
            Route::get('/', [MessageController::class, 'index'])->name('index');
            Route::post('{message}/reply', [MessageController::class, 'reply'])->name('reply');
        });

        Route::prefix('career-coach')->name('career-coach.')->group(function (): void {
            Route::get('/', [CareerCoachController::class, 'index'])->name('index');
            Route::post('/', [CareerCoachController::class, 'store'])->name('store');
            Route::get('{session}', [CareerCoachController::class, 'show'])->name('show');
            Route::post('{session}/send', [CareerCoachController::class, 'send'])->name('send');
            Route::post('{session}/archive', [CareerCoachController::class, 'archive'])->name('archive');
        });
    });
