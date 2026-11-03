<?php

namespace App\Http\Controllers\Public;

use App\Actions\Contact\SendContactMessageEmailAction;
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

    public function store(ContactMessageRequest $request, SendContactMessageEmailAction $sendContactMessageEmail): RedirectResponse
    {
        $contactMessage = ContactMessage::query()->create([
            ...$request->validated(),
            'ip' => $request->ip(),
            'status' => 'new',
        ]);

        if (! $sendContactMessageEmail->execute($contactMessage)) {
            return back()->with('error', 'Pesan tersimpan, tetapi notifikasi email belum terkirim. Tim tetap dapat melihat pesan Anda.');
        }

        return back()->with('success', 'Pesan Anda sudah kami terima. Tim kami akan segera menghubungi Anda.');
    }
}
