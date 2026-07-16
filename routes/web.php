<?php

use App\Enums\UserRole;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeviceTokenController;
use App\Http\Controllers\GlobalSearchController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Public\AboutPageController as PublicAboutPageController;
use App\Http\Controllers\Public\ApplicationController as PublicApplicationController;
use App\Http\Controllers\Public\CareerResourceController;
use App\Http\Controllers\Public\CompanyBrowseController;
use App\Http\Controllers\Public\CompanyReviewController as PublicCompanyReviewController;
use App\Http\Controllers\Public\ContactMessageController;
use App\Http\Controllers\Public\FaqController;
use App\Http\Controllers\Public\HomeController;
use App\Http\Controllers\Public\JobBrowseController;
use App\Http\Controllers\Public\LegalPageController;
use App\Http\Controllers\Public\PaymentCallbackController;
use App\Http\Controllers\Public\SalaryInsightController;
use App\Http\Controllers\Public\SitemapController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', HomeController::class.'@index')->name('home');

Route::middleware('guest')->group(function (): void {
    Route::get('register/jobseeker', fn () => Inertia::render('auth/register', [
        'mode' => 'form',
        'role' => UserRole::Employee->value,
        'roleLabel' => UserRole::Employee->label(),
        'title' => 'Daftar sebagai Jobseeker',
        'description' => 'Bangun profil profesional, lamar lowongan, dan akses fitur AI untuk karier Anda.',
        'googleUrl' => route('auth.google.register', ['audience' => 'jobseeker']),
        'loginUrl' => route('login'),
        'locale' => app()->getLocale(),
    ]))->name('register.jobseeker');

    Route::get('register/perusahaan', fn () => Inertia::render('auth/register', [
        'mode' => 'form',
        'role' => UserRole::Employer->value,
        'roleLabel' => 'Perusahaan Perekrut',
        'title' => 'Daftar sebagai Perusahaan Perekrut',
        'description' => 'Mulai posting lowongan, kelola kandidat, dan percepat proses rekrutmen tim Anda.',
        'googleUrl' => route('auth.google.register', ['audience' => 'perusahaan']),
        'loginUrl' => route('login'),
        'locale' => app()->getLocale(),
    ]))->name('register.company');

    Route::prefix('auth/google')->name('auth.google.')->group(function (): void {
        Route::get('login', [GoogleAuthController::class, 'login'])->name('login');
        Route::get('register/{audience}', [GoogleAuthController::class, 'register'])->name('register');
        Route::get('callback', [GoogleAuthController::class, 'callback'])->name('callback');
    });
});

Route::get('sitemap.xml', SitemapController::class)->name('sitemap');
Route::get('robots.txt', function () {
    $body = "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /employer\nDisallow: /employee\nDisallow: /payments\n\nSitemap: ".url('/sitemap.xml')."\n";

    return response($body, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
})->name('robots');

Route::prefix('jobs')->name('public.jobs.')->group(function (): void {
    Route::get('/', [JobBrowseController::class, 'index'])->name('index');
    Route::get('{job:slug}', [JobBrowseController::class, 'show'])->name('show');

    Route::middleware(['auth', 'verified'])->group(function (): void {
        Route::get('{job:slug}/apply', [PublicApplicationController::class, 'create'])->name('apply.create');
        Route::post('{job:slug}/apply', [PublicApplicationController::class, 'store'])->name('apply.store');
    });
});

Route::get('salary-insight', [SalaryInsightController::class, 'index'])->name('public.salary-insight');

Route::prefix('career-resources')->name('public.career-resources.')->group(function (): void {
    Route::get('/', [CareerResourceController::class, 'index'])->name('index');
    Route::get('{careerResource:slug}', [CareerResourceController::class, 'show'])->name('show');
});

Route::get('faq', [FaqController::class, 'index'])->name('public.faq');
Route::get('contact', [ContactMessageController::class, 'index'])->name('public.contact');
Route::post('contact', [ContactMessageController::class, 'store'])->name('public.contact.store');
Route::get('tentang-kami', [PublicAboutPageController::class, 'index'])->name('public.about');
Route::get('legal/{legalPage:slug}', [LegalPageController::class, 'show'])->name('public.legal.show');

Route::prefix('companies')->name('public.companies.')->group(function (): void {
    Route::get('/', [CompanyBrowseController::class, 'index'])->name('index');
    Route::get('{company:slug}', [CompanyBrowseController::class, 'show'])->name('show');
    Route::get('{company:slug}/reviews', [PublicCompanyReviewController::class, 'index'])->name('reviews');

    Route::middleware(['auth', 'verified'])->group(function (): void {
        Route::post('reviews/{review}/helpful', [PublicCompanyReviewController::class, 'helpful'])->name('reviews.helpful');
    });
});

Route::middleware(['auth', 'verified', 'onboarding', 'employer.onboarded'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('search', GlobalSearchController::class)
        ->middleware('throttle:30,1')
        ->name('search');

    Route::prefix('notifications')->name('notifications.')->group(function (): void {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::get('unread', [NotificationController::class, 'unread'])->name('unread');
        Route::post('{notification}/read', [NotificationController::class, 'markRead'])->name('read');
        Route::post('mark-all-read', [NotificationController::class, 'markAllRead'])->name('read-all');
        Route::delete('{notification}', [NotificationController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('conversations')->name('conversations.')->group(function (): void {
        Route::get('/', [ConversationController::class, 'index'])->name('index');
        Route::post('start', [ConversationController::class, 'startWith'])->name('start');
        Route::get('{conversation}', [ConversationController::class, 'show'])->name('show');
        Route::post('{conversation}/messages', [ConversationController::class, 'store'])->name('messages.store');
        Route::post('{conversation}/read', [ConversationController::class, 'markRead'])->name('read');
    });

    Route::post('device-tokens', [DeviceTokenController::class, 'store'])->name('device-tokens.store');
    Route::delete('device-tokens', [DeviceTokenController::class, 'destroy'])->name('device-tokens.destroy');
});

// Browser return URL only. The server-to-server notification webhook lives in
// routes/api.php so it skips web session + CSRF middleware (Midtrans can't send
// a CSRF token).
Route::prefix('payments/midtrans')->name('payments.midtrans.')->group(function (): void {
    Route::get('finish', [PaymentCallbackController::class, 'return'])->name('finish');
});

require __DIR__.'/admin.php';
require __DIR__.'/employer.php';
require __DIR__.'/employee.php';
require __DIR__.'/settings.php';

// Preview branded error pages locally without forcing APP_DEBUG=false.
// Visit /_preview/errors/{403|404|419|429|500|503}
if (app()->environment('local')) {
    Route::get('/_preview/errors/{status}', function (int $status) {
        return Inertia::render('errors/error', ['status' => $status])
            ->toResponse(request())
            ->setStatusCode($status);
    })->whereIn('status', ['403', '404', '419', '429', '500', '503']);
}
