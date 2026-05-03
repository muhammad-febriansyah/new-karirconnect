<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ContactMessageRequest;
use App\Models\ContactMessage;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ContactMessageController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('public/contact');
    }

    public function store(ContactMessageRequest $request): RedirectResponse
    {
        ContactMessage::query()->create([
            ...$request->validated(),
            'ip' => $request->ip(),
            'status' => 'new',
        ]);

        return back()->with('success', 'Pesan Anda sudah kami terima. Tim kami akan segera menghubungi Anda.');
    }
}
