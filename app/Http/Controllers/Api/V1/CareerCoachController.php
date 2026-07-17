<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiCoachMessage;
use App\Models\AiCoachSession;
use App\Services\Ai\AiCareerCoachService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * AI career coach chat.
 *
 * Attachments are not accepted here. The web builds its file context by parsing
 * an uploaded document inline; a mobile client should send text, and CV review
 * already has a home in the CV endpoints.
 */
class CareerCoachController extends Controller
{
    public function __construct(private readonly AiCareerCoachService $coach) {}

    public function index(Request $request): JsonResponse
    {
        $sessions = AiCoachSession::query()
            ->where('user_id', $request->user()->id)
            ->when(
                ! $request->boolean('include_archived'),
                fn ($query) => $query->where('status', 'active')
            )
            ->latest('last_message_at')
            ->paginate(min($request->integer('per_page') ?: 20, 50));

        return response()->json([
            'data' => collect($sessions->items())->map(fn (AiCoachSession $session) => [
                'id' => $session->id,
                'title' => $session->title,
                'status' => $session->status,
                'last_message_at' => $session->last_message_at?->toIso8601String(),
            ]),
            'meta' => ['total' => $sessions->total()],
        ]);
    }

    public function show(Request $request, AiCoachSession $session): JsonResponse
    {
        $this->authorizeOwn($request, $session);

        $session->load('messages');

        return response()->json([
            'data' => [
                'id' => $session->id,
                'title' => $session->title,
                'status' => $session->status,
                'messages' => $session->messages->map(fn (AiCoachMessage $message) => [
                    'id' => $message->id,
                    'role' => $message->role,
                    'content' => $message->content,
                    'created_at' => $message->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:4000'],
        ]);

        $session = AiCoachSession::query()->create([
            'user_id' => $request->user()->id,
            'title' => trim((string) ($data['title'] ?? '')) !== ''
                ? $data['title']
                : Str::limit($data['message'], 60, '…'),
            'status' => 'active',
            'last_message_at' => now(),
        ]);

        // The first message goes through reply(), so the session opens with the
        // coach's answer already in it rather than an empty thread.
        $this->coach->reply($session, $request->user(), $data['message']);

        return response()->json(['data' => ['id' => $session->id, 'title' => $session->title]], 201);
    }

    public function send(Request $request, AiCoachSession $session): JsonResponse
    {
        $this->authorizeOwn($request, $session);

        $data = $request->validate(['message' => ['required', 'string', 'max:4000']]);

        $reply = $this->coach->reply($session, $request->user(), $data['message']);

        return response()->json([
            'data' => [
                'id' => $reply->id,
                'role' => $reply->role,
                'content' => $reply->content,
                'created_at' => $reply->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function archive(Request $request, AiCoachSession $session): JsonResponse
    {
        $this->authorizeOwn($request, $session);

        $session->forceFill(['status' => 'archived'])->save();

        return response()->json(['message' => 'Sesi diarsipkan.']);
    }

    private function authorizeOwn(Request $request, AiCoachSession $session): void
    {
        abort_unless($session->user_id === $request->user()->id, 403);
    }
}
