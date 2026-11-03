<?php

namespace App\Actions\Contact;

use App\Mail\ContactMessageReceived;
use App\Models\ContactMessage;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendContactMessageEmailAction
{
    public function execute(ContactMessage $contactMessage): bool
    {
        try {
            Mail::mailer('smtp')
                ->to(config('services.contact.recipient'))
                ->send(new ContactMessageReceived($contactMessage));
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }

        return true;
    }
}
