<?php

namespace App\Http\Controllers\Employer;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Job;
use App\Services\Billing\BillingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class JobBoostController extends Controller
{
    private const BOOST_PRICE_IDR = 199000;

    private const BOOST_DAYS = 30;

    public function __construct(private readonly BillingService $billing) {}

    public function store(Request $request, Job $job): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null && $job->company_id === $company->id, 403);

        $order = $this->billing->checkoutJobBoost(
            $company,
            $request->user(),
            $job,
            self::BOOST_PRICE_IDR,
            self::BOOST_DAYS,
        );

        if ($order->status === OrderStatus::AwaitingPayment && $order->payment_url) {
            return redirect()->away($order->payment_url);
        }

        return redirect()->route('employer.billing.show', ['order' => $order->reference])
            ->with('success', 'Order boost dibuat. Selesaikan pembayaran untuk mengaktifkan.');
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }
}
