<?php

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
*/

Route::prefix('payments/midtrans')->name('payments.midtrans.')->group(function (): void {
    Route::post('notification', [PaymentCallbackController::class, 'callback'])->name('notification');
});
