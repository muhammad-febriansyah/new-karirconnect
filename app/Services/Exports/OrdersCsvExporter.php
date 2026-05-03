<?php

namespace App\Services\Exports;

use App\Models\Order;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams the admin order ledger as CSV. Mirrors ApplicantCsvExporter's shape
 * (UTF-8 BOM, chunked iteration, streamed response) so finance can pipe the
 * download into spreadsheets without OOM on large date ranges.
 */
class OrdersCsvExporter
{
    /**
     * @param  array<string, mixed>  $filters  status, item_type, from, to
     */
    public function stream(array $filters = []): StreamedResponse
    {
        $filename = sprintf('orders-%s.csv', now()->format('Ymd-His'));

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
        ];

        return response()->streamDownload(function () use ($filters): void {
            $out = fopen('php://output', 'w');

            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Reference',
                'Created At',
                'Paid At',
                'Status',
                'Item Type',
                'Description',
                'Amount IDR',
                'Quantity',
                'Currency',
                'Company',
                'Buyer',
                'Buyer Email',
                'Payment Provider',
                'Payment Reference',
            ]);

            $query = Order::query()
                ->with([
                    'company:id,name,slug',
                    'user:id,name,email',
                ])
                ->latest('id');

            if (! empty($filters['status'])) {
                $query->where('status', $filters['status']);
            }
            if (! empty($filters['item_type'])) {
                $query->where('item_type', $filters['item_type']);
            }
            if (! empty($filters['from'])) {
                $query->where('created_at', '>=', $filters['from']);
            }
            if (! empty($filters['to'])) {
                $query->where('created_at', '<=', $filters['to']);
            }

            $query->chunkById(200, function ($chunk) use ($out): void {
                foreach ($chunk as $order) {
                    fputcsv($out, [
                        $order->reference,
                        optional($order->created_at)->toIso8601String(),
                        optional($order->paid_at)->toIso8601String(),
                        $order->status?->value,
                        $order->item_type?->value,
                        $order->description,
                        $order->amount_idr,
                        $order->quantity,
                        $order->currency,
                        $order->company?->name,
                        $order->user?->name,
                        $order->user?->email,
                        $order->payment_provider,
                        $order->payment_reference,
                    ]);
                }
            });

            fclose($out);
        }, $filename, $headers);
    }
}
