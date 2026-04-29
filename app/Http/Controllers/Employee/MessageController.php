<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\CandidateOutreachMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    public function index(Request $request): Response
    {
        $messages = CandidateOutreachMessage::query()
            ->with(['company:id,name,logo_path,slug', 'sender:id,name', 'job:id,title,slug'])
            ->where('candidate_user_id', $request->user()->id)
            ->latest('sent_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('employee/messages/index', [
            'messages' => $messages->through(fn (CandidateOutreachMessage $m) => [
                'id' => $m->id,
                'company_name' => $m->company?->name,
                'company_slug' => $m->company?->slug,
                'company_logo' => $m->company?->logo_path ? asset('storage/'.$m->company->logo_path) : null,
                'sender_name' => $m->sender?->name,
                'subject' => $m->subject,
                'body' => $m->body,
                'status' => $m->status,
                'job_title' => $m->job?->title,
                'job_slug' => $m->job?->slug,
                'sent_at' => optional($m->sent_at)->toIso8601String(),
                'replied_at' => optional($m->replied_at)->toIso8601String(),
                'reply_body' => $m->reply_body,
            ]),
        ]);
    }

    public function reply(Request $request, CandidateOutreachMessage $message): RedirectResponse
    {
        abort_unless($message->candidate_user_id === $request->user()->id, 403);

        $data = $request->validate([
            'reply_body' => ['required', 'string', 'max:4000'],
        ]);

        $message->forceFill([
            'reply_body' => $data['reply_body'],
            'replied_at' => now(),
            'status' => 'replied',
        ])->save();

        return back()->with('success', 'Balasan terkirim.');
    }
}
