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

class CandidateOutreachController extends Controller
{
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
