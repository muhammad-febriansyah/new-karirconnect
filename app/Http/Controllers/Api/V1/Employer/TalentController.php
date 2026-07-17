<?php

namespace App\Http\Controllers\Api\V1\Employer;

use App\Filters\Talent\TalentSearchFilter;
use App\Http\Controllers\Api\V1\Employer\Concerns\ResolvesEmployerCompany;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\EmployeeProfileResource;
use App\Models\CandidateOutreachMessage;
use App\Models\EmployeeProfile;
use App\Models\SavedCandidate;
use App\Services\Audit\AuditLogService;
use App\Services\Messaging\ConversationService;
use App\Services\Messaging\MessageService;
use App\Services\Talent\TalentSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Talent search, saved candidates, and outreach.
 *
 * Candidate visibility is enforced by TalentSearchFilter; a profile set to
 * private never surfaces here regardless of filters.
 */
class TalentController extends Controller
{
    use ResolvesEmployerCompany;

    public function __construct(
        private readonly TalentSearchService $search,
        private readonly AuditLogService $audit,
        private readonly ConversationService $conversations,
        private readonly MessageService $messages,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $results = $this->search->search($company, $request->user(), $this->filters($request));

        $savedIds = SavedCandidate::query()
            ->where('company_id', $company->id)
            ->pluck('candidate_profile_id')
            ->all();

        return response()->json([
            'data' => collect($results->items())->map(fn (EmployeeProfile $profile) => [
                'id' => $profile->id,
                'name' => $profile->user?->name,
                'avatar_url' => $profile->user?->avatar_path
                    ? asset('storage/'.$profile->user->avatar_path)
                    : null,
                'headline' => $profile->headline,
                'current_position' => $profile->current_position,
                'experience_level' => $profile->experience_level?->value,
                'expected_salary_min' => $profile->expected_salary_min,
                'expected_salary_max' => $profile->expected_salary_max,
                'is_open_to_work' => (bool) $profile->is_open_to_work,
                'profile_completion' => $profile->profile_completion,
                'city' => $profile->city?->name,
                'skills' => $profile->skills->take(8)->map(fn ($skill) => $skill->name)->values(),
                'is_saved' => in_array($profile->id, $savedIds, true),
            ])->values(),
            'meta' => [
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'total' => $results->total(),
            ],
        ]);
    }

    public function show(Request $request, EmployeeProfile $profile): JsonResponse
    {
        $this->requireCompany($request);

        // Same vocabulary as the listing, so a profile cannot appear in results
        // and then 403 when opened.
        abort_unless(in_array($profile->visibility, TalentSearchFilter::RECRUITER_VISIBLE, true), 403);

        // Recruiters viewing candidate profiles is audited, same as the web.
        $this->audit->record('talent_search.profile_viewed', $profile, after: [
            'company_id' => $this->resolveCompany($request)?->id,
            'visibility' => $profile->visibility,
        ]);

        $profile->load([
            'user:id,name,email,phone,avatar_path',
            'province:id,name',
            'city:id,name',
            'skills:id,name',
            'educations',
            'workExperiences',
            'certifications',
        ]);

        return response()->json([
            'data' => new EmployeeProfileResource($profile),
            'meta' => [
                'candidate' => [
                    'name' => $profile->user?->name,
                    'email' => $profile->user?->email,
                    'phone' => $profile->user?->phone,
                    'avatar_url' => $profile->user?->avatar_path
                        ? asset('storage/'.$profile->user->avatar_path)
                        : null,
                ],
            ],
        ]);
    }

    public function savedCandidates(Request $request): JsonResponse
    {
        $company = $this->requireCompany($request);

        $saved = SavedCandidate::query()
            ->with(['candidateProfile.user:id,name,avatar_path', 'candidateProfile.city:id,name'])
            ->where('company_id', $company->id)
            ->latest('id')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($saved->items())->map(fn (SavedCandidate $row) => [
                'id' => $row->id,
                'profile_id' => $row->candidate_profile_id,
                'name' => $row->candidateProfile?->user?->name,
                'headline' => $row->candidateProfile?->headline,
                'city' => $row->candidateProfile?->city?->name,
                'note' => $row->note,
                'saved_at' => $row->created_at?->toIso8601String(),
            ])->values(),
            'meta' => ['total' => $saved->total()],
        ]);
    }

    public function saveCandidate(Request $request, EmployeeProfile $profile): JsonResponse
    {
        $company = $this->requireCompany($request);

        abort_unless(in_array($profile->visibility, TalentSearchFilter::RECRUITER_VISIBLE, true), 403);

        $data = $request->validate(['note' => ['nullable', 'string', 'max:500']]);

        // Idempotent: saving twice is not an error.
        SavedCandidate::query()->updateOrCreate(
            ['company_id' => $company->id, 'candidate_profile_id' => $profile->id],
            [
                'saved_by_user_id' => $request->user()->id,
                'note' => $data['note'] ?? null,
                'saved_at' => now(),
            ],
        );

        return response()->json(['message' => 'Kandidat disimpan.', 'data' => ['is_saved' => true]], 201);
    }

    public function unsaveCandidate(Request $request, EmployeeProfile $profile): JsonResponse
    {
        $company = $this->requireCompany($request);

        SavedCandidate::query()
            ->where('company_id', $company->id)
            ->where('candidate_profile_id', $profile->id)
            ->delete();

        return response()->json(['message' => 'Kandidat dihapus dari simpanan.', 'data' => ['is_saved' => false]]);
    }

    /**
     * Contact a candidate.
     *
     * Gated on an active subscription, matching ConversationController: cold
     * outreach is a paid feature, replies inside a thread are not.
     */
    public function outreach(Request $request, EmployeeProfile $profile): JsonResponse
    {
        $company = $this->requireCompany($request);

        abort_unless(in_array($profile->visibility, TalentSearchFilter::RECRUITER_VISIBLE, true), 403);

        if ($company->activeSubscription() === null) {
            return response()->json([
                'message' => 'Fitur kirim pesan ke kandidat butuh langganan aktif.',
                'code' => 'subscription_required',
            ], 403);
        }

        $data = $request->validate([
            'subject' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'job_id' => ['nullable', 'integer', 'exists:job_posts,id'],
        ]);

        $candidateUser = $profile->user;

        abort_unless($candidateUser !== null, 404);

        $conversation = $this->conversations->findOrCreateDirect(
            [$request->user()->id, $candidateUser->id],
            $data['subject'] ?? null,
        );

        $this->messages->send($conversation, $request->user(), $data['body']);

        CandidateOutreachMessage::query()->create([
            'company_id' => $company->id,
            'sender_user_id' => $request->user()->id,
            'candidate_profile_id' => $profile->id,
            'candidate_user_id' => $candidateUser->id,
            'job_id' => $data['job_id'] ?? null,
            'subject' => $data['subject'] ?? null,
            'body' => $data['body'],
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        return response()->json([
            'message' => 'Pesan terkirim ke kandidat.',
            'data' => ['conversation_id' => $conversation->id],
        ], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function filters(Request $request): array
    {
        $skillIds = $request->input('skill_ids', []);

        return array_filter([
            'keyword' => $request->input('keyword'),
            'province_id' => $request->integer('province_id') ?: null,
            'city_id' => $request->integer('city_id') ?: null,
            'experience_level' => $request->input('experience_level'),
            'skill_ids' => is_array($skillIds)
                ? (array_values(array_filter(array_map('intval', $skillIds))) ?: null)
                : null,
            'salary_max' => $request->integer('salary_max') ?: null,
            'open_to_work' => $request->boolean('open_to_work') ?: null,
            'sort' => $request->input('sort'),
        ], static fn ($value) => $value !== null && $value !== '' && $value !== []);
    }
}
