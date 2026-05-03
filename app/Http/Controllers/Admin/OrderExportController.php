<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Exports\OrdersCsvExporter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderExportController extends Controller
{
    public function __construct(private readonly OrdersCsvExporter $exporter) {}

    public function download(Request $request): StreamedResponse
    {
        $filters = [
            'status' => $request->string('status')->toString() ?: null,
            'item_type' => $request->string('item_type')->toString() ?: null,
            'from' => $request->string('from')->toString() ?: null,
            'to' => $request->string('to')->toString() ?: null,
        ];

        return $this->exporter->stream(array_filter($filters));
    }
}
