<?php

use App\Http\Controllers\Api\V1\Admin\BillingController as AdminBillingController;
use App\Http\Controllers\Api\V1\Admin\ModerationController;
use App\Http\Controllers\Api\V1\Admin\TaxonomyController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\AiInterviewController;
use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CareerCoachController;
use App\Http\Controllers\Api\V1\CertificationController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\CompanyReviewController;
use App\Http\Controllers\Api\V1\ContentController;
use App\Http\Controllers\Api\V1\ConversationController;
use App\Http\Controllers\Api\V1\CvBuilderController;
use App\Http\Controllers\Api\V1\CvController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EducationController;
use App\Http\Controllers\Api\V1\Employer\AiInterviewReviewController;
use App\Http\Controllers\Api\V1\Employer\AiInterviewTemplateController;
use App\Http\Controllers\Api\V1\Employer\ApplicantController;
use App\Http\Controllers\Api\V1\Employer\BillingController;
use App\Http\Controllers\Api\V1\Employer\CompanyController as EmployerCompanyController;
use App\Http\Controllers\Api\V1\Employer\CompanyOfficeController;
use App\Http\Controllers\Api\V1\Employer\CompanyOpsController;
use App\Http\Controllers\Api\V1\Employer\InterviewController as EmployerInterviewController;
use App\Http\Controllers\Api\V1\Employer\JobController as EmployerJobController;
use App\Http\Controllers\Api\V1\Employer\MessageTemplateController;
use App\Http\Controllers\Api\V1\Employer\OnboardingController as EmployerOnboardingController;
use App\Http\Controllers\Api\V1\Employer\ScreeningQuestionController;
use App\Http\Controllers\Api\V1\Employer\TalentController;
use App\Http\Controllers\Api\V1\Employer\TeamController;
use App\Http\Controllers\Api\V1\InterviewController;
use App\Http\Controllers\Api\V1\JobAlertController;
use App\Http\Controllers\Api\V1\JobController;
use App\Http\Controllers\Api\V1\MetaController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OnboardingController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\RecommendationController;
use App\Http\Controllers\Api\V1\SalaryController;
use App\Http\Controllers\Api\V1\SavedJobController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\SkillAssessmentController;
use App\Http\Controllers\Api\V1\WorkExperienceController;
use App\Http\Controllers\GlobalSearchController;
use App\Http\Controllers\Public\PaymentCallbackController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Stateless routes (no session, no CSRF). Server-to-server payment webhooks
| live here because the calling party (Midtrans) can't send a CSRF token.
| The api prefix is disabled in bootstrap/app.php so URLs stay clean.
|
| The mobile API therefore carries its own explicit api/v1 prefix below rather
| than relying on apiPrefix. Turning apiPrefix back on would silently move the
| Midtrans notification URL, which is registered on the Midtrans dashboard.
|
*/

Route::prefix('payments/midtrans')->name('payments.midtrans.')->group(function (): void {
    Route::post('notification', [PaymentCallbackController::class, 'callback'])->name('notification');
});

/*
|--------------------------------------------------------------------------
| Mobile API (Flutter)
|--------------------------------------------------------------------------
|
| Authenticated with the "api" guard: short-lived JWT access tokens paired
| with rotating refresh tokens (App\Services\Auth\RefreshTokenService).
|
*/

Route::prefix('api/v1')->name('api.v1.')->group(function (): void {
    Route::prefix('auth')->name('auth.')->group(function (): void {
        // Throttled per IP: these are the endpoints an attacker can call
        // without already holding a credential.
        Route::middleware('throttle:10,1')->group(function (): void {
            Route::post('register', [AuthController::class, 'register'])->name('register');
            Route::post('login', [AuthController::class, 'login'])->name('login');
        });

        // Rotation is cheap but must not be a free oracle for guessing tokens.
        Route::post('refresh', [AuthController::class, 'refresh'])
            ->middleware('throttle:30,1')
            ->name('refresh');

        Route::middleware('auth:api')->group(function (): void {
            Route::get('me', [AuthController::class, 'me'])->name('me');
            Route::post('logout', [AuthController::class, 'logout'])->name('logout');
            Route::post('logout-all', [AuthController::class, 'logoutAll'])->name('logout-all');
        });
    });

    /*
     * Public browsing. Open to guests so the app can show jobs before signup,
     * matching the web. Job detail reads the optional viewer to add is_saved
     * and the match score, so the token is honoured when present.
     */
    Route::get('meta', [MetaController::class, 'index'])->name('meta');
    Route::get('settings', [SettingController::class, 'index'])->name('settings');

    Route::get('jobs', [JobController::class, 'index'])->name('jobs.index');
    Route::get('jobs/{job:slug}', [JobController::class, 'show'])->name('jobs.show');

    Route::get('companies', [CompanyController::class, 'index'])->name('companies.index');
    Route::get('companies/{company:slug}', [CompanyController::class, 'show'])->name('companies.show');
    Route::get('companies/{company:slug}/jobs', [CompanyController::class, 'jobs'])->name('companies.jobs');
    Route::get('companies/{company:slug}/reviews', [CompanyReviewController::class, 'index'])->name('companies.reviews');

    Route::get('salary-insights', [SalaryController::class, 'insights'])->name('salary.insights');

    // Public content
    Route::get('faqs', [ContentController::class, 'faqs'])->name('faqs');
    Route::get('legal', [ContentController::class, 'legalPages'])->name('legal.index');
    Route::get('legal/{legalPage:slug}', [ContentController::class, 'legalPage'])->name('legal.show');
    Route::get('about', [ContentController::class, 'about'])->name('about');
    Route::get('career-resources', [ContentController::class, 'careerResources'])->name('career-resources.index');
    Route::get('career-resources/{careerResource:slug}', [ContentController::class, 'careerResource'])->name('career-resources.show');

    // Unauthenticated and it writes, so it is rate limited per IP.
    Route::post('contact', [ContentController::class, 'contact'])
        ->middleware('throttle:5,1')->name('contact');

    /*
     * Jobseeker area.
     *
     * role:employee mirrors the web group in routes/employee.php. The web adds
     * `verified` and `onboarding`; those are deliberately left off here --
     * blocking a mobile client from reading its own applications until it has
     * finished an onboarding wizard it cannot yet render would strand the app.
     * Applying is still gated: SubmitApplicationAction enforces the 60% profile
     * completion rule on its own.
     */
    Route::middleware(['auth:api', 'role:employee'])->group(function (): void {
        // Onboarding
        Route::get('onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
        Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
        Route::post('onboarding/parse-cv', [OnboardingController::class, 'parseCv'])
            ->middleware('throttle:10,1')->name('onboarding.parse-cv');

        Route::post('jobs/{job:slug}/apply', [ApplicationController::class, 'store'])->name('jobs.apply');

        Route::get('applications', [ApplicationController::class, 'index'])->name('applications.index');
        Route::get('applications/{application}', [ApplicationController::class, 'show'])->name('applications.show');
        Route::post('applications/{application}/withdraw', [ApplicationController::class, 'withdraw'])->name('applications.withdraw');

        Route::get('saved-jobs', [SavedJobController::class, 'index'])->name('saved-jobs.index');
        Route::post('saved-jobs/{job:slug}', [SavedJobController::class, 'store'])->name('saved-jobs.store');
        Route::delete('saved-jobs/{job:slug}', [SavedJobController::class, 'destroy'])->name('saved-jobs.destroy');

        // Profile
        Route::get('profile', [ProfileController::class, 'show'])->name('profile.show');
        Route::post('profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::put('profile/skills', [ProfileController::class, 'syncSkills'])->name('profile.skills');

        Route::apiResource('profile/educations', EducationController::class)
            ->except('show')->names('educations')->parameters(['educations' => 'education']);
        Route::apiResource('profile/work-experiences', WorkExperienceController::class)
            ->except('show')->names('work-experiences')->parameters(['work-experiences' => 'workExperience']);
        Route::apiResource('profile/certifications', CertificationController::class)
            ->except('show')->names('certifications')->parameters(['certifications' => 'certification']);

        // CVs
        Route::get('cvs', [CvController::class, 'index'])->name('cvs.index');
        Route::post('cvs', [CvController::class, 'store'])->name('cvs.store');
        Route::post('cvs/{candidateCv}', [CvController::class, 'update'])->name('cvs.update');
        Route::delete('cvs/{candidateCv}', [CvController::class, 'destroy'])->name('cvs.destroy');

        // CV builder (generated CV, distinct from uploads)
        Route::get('cv-builder', [CvBuilderController::class, 'show'])->name('cv-builder.show');
        Route::post('cv-builder', [CvBuilderController::class, 'update'])->name('cv-builder.update');

        // Job alerts
        Route::get('job-alerts', [JobAlertController::class, 'index'])->name('job-alerts.index');
        Route::post('job-alerts', [JobAlertController::class, 'store'])->name('job-alerts.store');
        Route::put('job-alerts/{alert}', [JobAlertController::class, 'update'])->name('job-alerts.update');
        Route::delete('job-alerts/{alert}', [JobAlertController::class, 'destroy'])->name('job-alerts.destroy');
        Route::get('job-alerts/{alert}/preview', [JobAlertController::class, 'preview'])->name('job-alerts.preview');
        Route::post('job-alerts/{alert}/dispatch', [JobAlertController::class, 'dispatchNow'])
            ->middleware('throttle:10,1')->name('job-alerts.dispatch');

        // Interviews (candidate side)
        Route::get('interviews', [InterviewController::class, 'index'])->name('interviews.index');
        Route::get('interviews/{interview}', [InterviewController::class, 'show'])->name('interviews.show');
        Route::post('interviews/{interview}/respond', [InterviewController::class, 'respond'])->name('interviews.respond');
        Route::post('interviews/{interview}/reschedule', [InterviewController::class, 'requestReschedule'])->name('interviews.reschedule');

        // Company reviews (authoring)
        Route::get('my-reviews', [CompanyReviewController::class, 'mine'])->name('reviews.mine');
        Route::post('companies/{company:slug}/reviews', [CompanyReviewController::class, 'store'])->name('reviews.store');
        Route::put('reviews/{review}', [CompanyReviewController::class, 'update'])->name('reviews.update');
        Route::delete('reviews/{review}', [CompanyReviewController::class, 'destroy'])->name('reviews.destroy');

        // Salary submissions
        // Skill assessments
        Route::get('skill-assessments', [SkillAssessmentController::class, 'index'])->name('skill-assessments.index');
        Route::post('skill-assessments', [SkillAssessmentController::class, 'store'])->name('skill-assessments.store');
        Route::get('skill-assessments/{skillAssessment}', [SkillAssessmentController::class, 'show'])->name('skill-assessments.show');
        Route::post('skill-assessments/{skillAssessment}/submit', [SkillAssessmentController::class, 'submit'])->name('skill-assessments.submit');

        // Recommendations
        Route::get('recommendations', [RecommendationController::class, 'index'])->name('recommendations.index');
        Route::post('recommendations/{job:slug}/dismiss', [RecommendationController::class, 'dismiss'])->name('recommendations.dismiss');

        Route::get('my-salary-submissions', [SalaryController::class, 'mine'])->name('salary.mine');
        Route::post('salary-submissions', [SalaryController::class, 'store'])->name('salary.store');
        Route::delete('salary-submissions/{submission}', [SalaryController::class, 'destroy'])->name('salary.destroy');

        /*
         * AI. Throttled hard: every one of these can reach an external model,
         * which costs money per call.
         */
        Route::middleware('throttle:30,1')->group(function (): void {
            Route::get('ai-interviews', [AiInterviewController::class, 'index'])->name('ai-interviews.index');
            Route::post('ai-interviews/practice', [AiInterviewController::class, 'startPractice'])->name('ai-interviews.practice');
            Route::get('ai-interviews/{session}', [AiInterviewController::class, 'show'])->name('ai-interviews.show');
            Route::post('ai-interviews/{session}/questions/{question}/answer', [AiInterviewController::class, 'answer'])->name('ai-interviews.answer');
            Route::post('ai-interviews/{session}/complete', [AiInterviewController::class, 'complete'])->name('ai-interviews.complete');
            Route::get('ai-interviews/{session}/result', [AiInterviewController::class, 'result'])->name('ai-interviews.result');

            Route::get('career-coach', [CareerCoachController::class, 'index'])->name('career-coach.index');
            Route::post('career-coach', [CareerCoachController::class, 'store'])->name('career-coach.store');
            Route::get('career-coach/{session}', [CareerCoachController::class, 'show'])->name('career-coach.show');
            Route::post('career-coach/{session}/send', [CareerCoachController::class, 'send'])->name('career-coach.send');
            Route::post('career-coach/{session}/archive', [CareerCoachController::class, 'archive'])->name('career-coach.archive');
        });
    });

    /*
     * Messaging + helpful votes: both roles participate, so these sit outside
     * the role-scoped groups.
     */
    Route::middleware('auth:api')->group(function (): void {
        Route::get('conversations', [ConversationController::class, 'index'])->name('conversations.index');
        Route::post('conversations/start', [ConversationController::class, 'startWith'])->name('conversations.start');
        Route::get('conversations/{conversation}', [ConversationController::class, 'show'])->name('conversations.show');
        Route::post('conversations/{conversation}/messages', [ConversationController::class, 'send'])->name('conversations.send');
        Route::post('conversations/{conversation}/read', [ConversationController::class, 'markRead'])->name('conversations.read');

        Route::post('reviews/{review}/helpful', [CompanyReviewController::class, 'helpful'])->name('reviews.helpful');
        Route::delete('reviews/{review}/helpful', [CompanyReviewController::class, 'unhelpful'])->name('reviews.unhelpful');
    });

    /*
     * Admin area.
     *
     * role:admin re-reads is_active from the database, so a suspended admin is
     * refused even while holding a token whose claim still says otherwise.
     */
    Route::middleware(['auth:api', 'role:admin'])->prefix('admin')->name('admin.')->group(function (): void {
        Route::get('queue-counts', [ModerationController::class, 'queueCounts'])->name('queue-counts');

        // Companies
        Route::get('companies', [ModerationController::class, 'companies'])->name('companies.index');
        Route::post('companies/{company}/approve', [ModerationController::class, 'approveCompany'])->name('companies.approve');
        Route::post('companies/{company}/suspend', [ModerationController::class, 'suspendCompany'])->name('companies.suspend');

        // Verification documents
        Route::get('verifications', [ModerationController::class, 'verifications'])->name('verifications.index');
        Route::post('verifications/{verification}/review', [ModerationController::class, 'reviewVerification'])->name('verifications.review');

        // Review moderation
        Route::get('reviews', [ModerationController::class, 'reviews'])->name('reviews.index');
        Route::post('reviews/{review}/approve', [ModerationController::class, 'approveReview'])->name('reviews.approve');
        Route::post('reviews/{review}/reject', [ModerationController::class, 'rejectReview'])->name('reviews.reject');

        // Reports
        Route::get('reports', [ModerationController::class, 'reports'])->name('reports.index');
        Route::post('reports/{report}/review', [ModerationController::class, 'reviewReport'])->name('reports.review');

        // Users
        Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
        Route::get('users/{user}', [AdminUserController::class, 'show'])->name('users.show');
        Route::put('users/{user}', [AdminUserController::class, 'update'])->name('users.update');
        Route::post('users/{user}/suspend', [AdminUserController::class, 'suspend'])->name('users.suspend');
        Route::post('users/{user}/activate', [AdminUserController::class, 'activate'])->name('users.activate');

        // Billing (read-only: entitlement is granted by the payment webhook)
        Route::get('orders', [AdminBillingController::class, 'orders'])->name('orders.index');
        Route::get('payments', [AdminBillingController::class, 'payments'])->name('payments.index');
        Route::get('subscriptions', [AdminBillingController::class, 'subscriptions'])->name('subscriptions.index');
        Route::get('audit-logs', [AdminBillingController::class, 'auditLogs'])->name('audit-logs.index');

        /*
         * Taxonomy CRUD, keyed by resource name. Constrained so an unknown
         * name 404s at the router rather than reaching the controller.
         */
        Route::prefix('taxonomy/{resource}')->name('taxonomy.')->group(function (): void {
            Route::get('/', [TaxonomyController::class, 'index'])->name('index');
            Route::post('/', [TaxonomyController::class, 'store'])->name('store');
            Route::put('{id}', [TaxonomyController::class, 'update'])->name('update');
            Route::delete('{id}', [TaxonomyController::class, 'destroy'])->name('destroy');
        })->where(['resource' => 'job-categories|industries|company-sizes|skills|faqs|legal-pages', 'id' => '[0-9]+']);
    });

    /*
     * Employer area.
     *
     * company.approved and employer.onboarded are the same middleware the web
     * uses; they now answer api/* with JSON instead of a redirect to an HTML
     * page, which a mobile client could not act on.
     */
    Route::middleware(['auth:api', 'role:employer'])->prefix('employer')->name('employer.')->group(function (): void {
        // Readable before onboarding finishes, so the app can show the owner
        // exactly what state their company is in.
        Route::get('company', [EmployerCompanyController::class, 'show'])->name('company.show');
        Route::post('company', [EmployerCompanyController::class, 'update'])->name('company.update');

        /*
         * Onboarding must sit OUTSIDE employer.onboarded. Everything below that
         * gate 403s with employer_onboarding_required until it is finished, so
         * gating these too would leave a newly registered employer with no way
         * to ever satisfy it.
         */
        Route::get('onboarding', [EmployerOnboardingController::class, 'show'])->name('onboarding.show');
        Route::post('onboarding/profile', [EmployerOnboardingController::class, 'updateProfile'])->name('onboarding.profile');
        Route::post('onboarding/documents', [EmployerOnboardingController::class, 'uploadDocument'])->name('onboarding.documents');
        Route::post('onboarding/finish', [EmployerOnboardingController::class, 'finish'])->name('onboarding.finish');

        Route::middleware(['employer.onboarded', 'company.approved'])->group(function (): void {
            Route::get('stats', [EmployerCompanyController::class, 'stats'])->name('stats');

            Route::get('jobs', [EmployerJobController::class, 'index'])->name('jobs.index');
            Route::post('jobs', [EmployerJobController::class, 'store'])->name('jobs.store');
            Route::get('jobs/{job:slug}', [EmployerJobController::class, 'show'])->name('jobs.show');
            Route::put('jobs/{job:slug}', [EmployerJobController::class, 'update'])->name('jobs.update');
            Route::post('jobs/{job:slug}/publish', [EmployerJobController::class, 'publish'])->name('jobs.publish');
            Route::post('jobs/{job:slug}/close', [EmployerJobController::class, 'close'])->name('jobs.close');
            Route::post('jobs/{job:slug}/archive', [EmployerJobController::class, 'archive'])->name('jobs.archive');

            Route::get('applicants', [ApplicantController::class, 'index'])->name('applicants.index');
            Route::get('applicants/{application}', [ApplicantController::class, 'show'])->name('applicants.show');
            Route::post('applicants/{application}/status', [ApplicantController::class, 'changeStatus'])->name('applicants.status');

            // Screening questions (candidates answer these when applying)
            Route::get('jobs/{job:slug}/screening-questions', [ScreeningQuestionController::class, 'index'])->name('jobs.screening-questions.index');
            Route::post('jobs/{job:slug}/screening-questions', [ScreeningQuestionController::class, 'store'])->name('jobs.screening-questions.store');
            Route::put('jobs/{job:slug}/screening-questions/{screeningQuestion}', [ScreeningQuestionController::class, 'update'])->name('jobs.screening-questions.update');
            Route::delete('jobs/{job:slug}/screening-questions/{screeningQuestion}', [ScreeningQuestionController::class, 'destroy'])->name('jobs.screening-questions.destroy');

            Route::get('interviews', [EmployerInterviewController::class, 'index'])->name('interviews.index');
            Route::post('interviews', [EmployerInterviewController::class, 'store'])->name('interviews.store');
            Route::post('interviews/bulk', [EmployerInterviewController::class, 'bulkStore'])->name('interviews.bulk');
            Route::get('interviews/{interview}', [EmployerInterviewController::class, 'show'])->name('interviews.show');
            Route::post('interviews/{interview}/status', [EmployerInterviewController::class, 'changeStatus'])->name('interviews.status');
            Route::post('interviews/{interview}/stage', [EmployerInterviewController::class, 'changeStage'])->name('interviews.stage');
            Route::post('interviews/{interview}/scorecard', [EmployerInterviewController::class, 'storeScorecard'])->name('interviews.scorecard');
            Route::post('reschedule-requests/{rescheduleRequest}/approve', [EmployerInterviewController::class, 'approveReschedule'])->name('reschedule.approve');
            Route::post('reschedule-requests/{rescheduleRequest}/reject', [EmployerInterviewController::class, 'rejectReschedule'])->name('reschedule.reject');

            // Team
            Route::get('team', [TeamController::class, 'index'])->name('team.index');
            Route::post('team', [TeamController::class, 'store'])->name('team.store');
            Route::delete('team/{member}', [TeamController::class, 'destroy'])->name('team.destroy');

            // Offices
            Route::get('offices', [CompanyOfficeController::class, 'index'])->name('offices.index');
            Route::post('offices', [CompanyOfficeController::class, 'store'])->name('offices.store');
            Route::put('offices/{office}', [CompanyOfficeController::class, 'update'])->name('offices.update');
            Route::delete('offices/{office}', [CompanyOfficeController::class, 'destroy'])->name('offices.destroy');

            // Reviews about this company
            Route::get('reviews', [CompanyOpsController::class, 'reviews'])->name('reviews.index');
            Route::post('reviews/{review}/respond', [CompanyOpsController::class, 'respondToReview'])->name('reviews.respond');

            // Job boost (paid featured placement)
            Route::post('jobs/{job:slug}/boost', [CompanyOpsController::class, 'boostJob'])->name('jobs.boost');

            // Talent search: a paid surface, so it carries the subscription gate
            // the web applies to the same feature.
            Route::middleware('subscription.active')->group(function (): void {
                Route::get('talent', [TalentController::class, 'index'])->name('talent.index');
                Route::get('talent/{profile}', [TalentController::class, 'show'])->name('talent.show');
                Route::get('saved-candidates', [TalentController::class, 'savedCandidates'])->name('saved-candidates.index');
                Route::post('talent/{profile}/save', [TalentController::class, 'saveCandidate'])->name('talent.save');
                Route::delete('talent/{profile}/save', [TalentController::class, 'unsaveCandidate'])->name('talent.unsave');
                Route::post('talent/{profile}/outreach', [TalentController::class, 'outreach'])->name('talent.outreach');
            });

            // Message templates
            Route::get('message-templates', [MessageTemplateController::class, 'index'])->name('message-templates.index');
            Route::post('message-templates', [MessageTemplateController::class, 'store'])->name('message-templates.store');
            Route::put('message-templates/{template}', [MessageTemplateController::class, 'update'])->name('message-templates.update');
            Route::delete('message-templates/{template}', [MessageTemplateController::class, 'destroy'])->name('message-templates.destroy');

            // AI interview review (candidate sessions against this company's jobs)
            Route::get('ai-interviews', [AiInterviewReviewController::class, 'index'])->name('ai-interviews.index');
            Route::get('ai-interviews/{session}', [AiInterviewReviewController::class, 'show'])->name('ai-interviews.show');
            Route::get('outreach', [AiInterviewReviewController::class, 'outreach'])->name('outreach.index');

            // AI interview templates
            Route::get('ai-templates', [AiInterviewTemplateController::class, 'index'])->name('ai-templates.index');
            Route::post('ai-templates', [AiInterviewTemplateController::class, 'store'])->name('ai-templates.store');
            Route::get('ai-templates/{template}', [AiInterviewTemplateController::class, 'show'])->name('ai-templates.show');
            Route::put('ai-templates/{template}', [AiInterviewTemplateController::class, 'update'])->name('ai-templates.update');
            Route::delete('ai-templates/{template}', [AiInterviewTemplateController::class, 'destroy'])->name('ai-templates.destroy');
            Route::post('ai-templates/{template}/questions', [AiInterviewTemplateController::class, 'storeQuestion'])->name('ai-templates.questions.store');
            Route::put('ai-templates/{template}/questions/{question}', [AiInterviewTemplateController::class, 'updateQuestion'])->name('ai-templates.questions.update');
            Route::delete('ai-templates/{template}/questions/{question}', [AiInterviewTemplateController::class, 'destroyQuestion'])->name('ai-templates.questions.destroy');
        });

        // Verification documents: reachable while pending, since that is exactly
        // when an owner needs to submit them.
        Route::get('verifications', [CompanyOpsController::class, 'verifications'])->name('verifications.index');
        Route::post('verifications', [CompanyOpsController::class, 'uploadVerification'])->name('verifications.store');

        /*
         * Billing sits outside company.approved: an employer whose company is
         * still pending must be able to see plans and pay.
         */
        Route::middleware('employer.onboarded')->group(function (): void {
            Route::get('billing/plans', [BillingController::class, 'plans'])->name('billing.plans');
            Route::post('billing/plans/{plan:slug}/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
            Route::get('billing/orders', [BillingController::class, 'orders'])->name('billing.orders');
            Route::get('billing/orders/{reference}', [BillingController::class, 'order'])->name('billing.order');
        });
    });

    /*
     * Notifications: every signed-in role has an inbox, so this is not gated on
     * role:employee.
     */
    Route::middleware('auth:api')->group(function (): void {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        /*
         * The web GlobalSearchController already returns JSON and picks its
         * result groups by role, so it is reused verbatim rather than
         * reimplemented. Same throttle as the web route.
         */
        Route::get('search', GlobalSearchController::class)
            ->middleware('throttle:30,1')->name('search');

        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::get('notifications/unread', [NotificationController::class, 'unread'])->name('notifications.unread');
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
        Route::delete('notifications/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

        Route::post('device-tokens', [NotificationController::class, 'storeDeviceToken'])->name('device-tokens.store');
        Route::delete('device-tokens', [NotificationController::class, 'destroyDeviceToken'])->name('device-tokens.destroy');
    });
});
