<?php

use App\Http\Controllers\ConversationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeviceTokenController;
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

Route::get('/', HomeController::class.'@index')->name('home');

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

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

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

Route::prefix('payments/duitku')->name('payments.duitku.')->group(function (): void {
    Route::post('callback', [PaymentCallbackController::class, 'callback'])->name('callback');
    Route::get('return', [PaymentCallbackController::class, 'return'])->name('return');
});

require __DIR__.'/admin.php';
require __DIR__.'/employer.php';
require __DIR__.'/employee.php';
require __DIR__.'/settings.php';
