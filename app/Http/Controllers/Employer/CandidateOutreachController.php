<?php

namespace App\Http\Controllers\Employer;

use App\Http\Controllers\Controller;
use App\Models\CandidateOutreachMessage;
use App\Models\Company;
use App\Models\EmployeeProfile;
use App\Notifications\CandidateOutreachReceivedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CandidateOutreachController extends Controller
{
    public function index(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);

        $messages = CandidateOutreachMessage::query()
            ->with([
                'candidateUser:id,name,email',
                'candidateProfile:id,user_id,headline,city_id',
                'candidateProfile.city:id,name',
                'sender:id,name',
                'job:id,title,slug',
            ])
            ->where('company_id', $company->id)
            ->latest('sent_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('employer/outreach/index', [
            'messages' => $messages->through(fn (CandidateOutreachMessage $m) => [
                'id' => $m->id,
                'candidate_name' => $m->candidateUser?->name,
                'candidate_email' => $m->candidateUser?->email,
                'candidate_headline' => $m->candidateProfile?->headline,
                'candidate_city' => $m->candidateProfile?->city?->name,
                'candidate_profile_id' => $m->candidate_profile_id,
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
            'stats' => [
                'total' => CandidateOutreachMessage::query()->where('company_id', $company->id)->count(),
                'replied' => CandidateOutreachMessage::query()->where('company_id', $company->id)->whereNotNull('replied_at')->count(),
            ],
        ]);
    }

    public function store(Request $request, EmployeeProfile $profile): RedirectResponse
    {
        $company = $this->resolveCompany($request);
        abort_unless($company !== null, 404);
        abort_unless(in_array($profile->visibility, ['public', 'employers'], true), 403);

        $candidateUser = $profile->user;
        abort_unless($candidateUser !== null, 404);

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:4000'],
            'job_id' => ['nullable', 'integer', 'exists:job_posts,id'],
        ]);

        $message = DB::transaction(fn () => CandidateOutreachMessage::query()->create([
            'company_id' => $company->id,
            'sender_user_id' => $request->user()->id,
            'candidate_profile_id' => $profile->id,
            'candidate_user_id' => $candidateUser->id,
            'job_id' => $data['job_id'] ?? null,
            'subject' => $data['subject'],
            'body' => $data['body'],
            'status' => 'sent',
            'sent_at' => now(),
        ]));

        $message->loadMissing('company');
        $candidateUser->notify(new CandidateOutreachReceivedNotification($message));

        return back()->with('success', 'Pesan terkirim ke kandidat.');
    }

    private function resolveCompany(Request $request): ?Company
    {
        return Company::query()->where('owner_id', $request->user()->id)->first();
    }
}
