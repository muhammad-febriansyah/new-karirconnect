<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Messaging\ConversationService;
use App\Services\Messaging\MessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Direct messaging between recruiters and candidates.
 *
 * Authorization goes through ConversationPolicy via $user->can(), which is how
 * the web controller does it -- these are the few places in this codebase that
 * use policies rather than inline checks.
 */
class ConversationController extends Controller
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly MessageService $messages,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $conversations = $this->conversations->listForUser(
            $request->user(),
            min($request->integer('per_page') ?: 20, 50),
        );

        return response()->json([
            'data' => collect($conversations->items())->map(fn (Conversation $conversation) => $this->present($conversation, $request->user())),
            'meta' => [
                'total' => $conversations->total(),
                'unread_count' => $this->conversations->unreadCount($request->user()),
            ],
        ]);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless($request->user()->can('view', $conversation), 403);

        $conversation->load([
            'participants.user:id,name,avatar_path',
            'messages.sender:id,name,avatar_path',
        ]);

        // Opening the thread marks it read, matching the web.
        $this->messages->markRead($conversation, $request->user());

        return response()->json([
            'data' => [
                ...$this->present($conversation, $request->user()),
                'messages' => $conversation->messages
                    ->map(fn (Message $message) => [
                        'id' => $message->id,
                        'body' => $message->body,
                        'sender' => [
                            'id' => $message->sender?->id,
                            'name' => $message->sender?->name,
                            'avatar_url' => $message->sender?->avatar_path
                                ? asset('storage/'.$message->sender->avatar_path)
                                : null,
                        ],
                        'is_mine' => $message->sender_id === $request->user()->id,
                        'created_at' => $message->created_at?->toIso8601String(),
                    ])->values(),
            ],
        ]);
    }

    public function send(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless($request->user()->can('send', $conversation), 403);

        $data = $request->validate(['body' => ['required', 'string', 'max:5000']]);

        $message = $this->messages->send($conversation, $request->user(), $data['body']);

        return response()->json([
            'data' => [
                'id' => $message->id,
                'body' => $message->body,
                'is_mine' => true,
                'created_at' => $message->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless($request->user()->can('view', $conversation), 403);

        $this->messages->markRead($conversation, $request->user());

        return response()->json(['message' => 'Percakapan ditandai dibaca.']);
    }

    /**
     * Open (or reopen) a direct thread with someone.
     */
    public function startWith(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'subject' => ['nullable', 'string', 'max:255'],
        ]);

        if ((int) $data['user_id'] === $user->id) {
            return response()->json([
                'message' => 'Tidak bisa memulai percakapan dengan diri sendiri.',
                'code' => 'self_conversation',
            ], 422);
        }

        // Outreach to candidates is a paid feature for employers. Replying
        // inside an existing thread stays free for everyone, which is why the
        // check lives here and not on send().
        if ($user->isEmployer()) {
            $company = Company::query()->where('owner_id', $user->id)->first();

            if ($company !== null && $company->activeSubscription() === null) {
                return response()->json([
                    'message' => 'Fitur kirim pesan ke kandidat butuh langganan aktif.',
                    'code' => 'subscription_required',
                ], 403);
            }
        }

        $other = User::query()->findOrFail($data['user_id']);

        $conversation = $this->conversations->findOrCreateDirect(
            [$user->id, $other->id],
            $data['subject'] ?? null,
        );

        return response()->json(['data' => $this->present($conversation->fresh('participants.user'), $user)], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Conversation $conversation, User $viewer): array
    {
        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'subject' => $conversation->subject,
            'participants' => $conversation->relationLoaded('participants')
                ? $conversation->participants->map(fn ($participant) => [
                    'id' => $participant->user?->id,
                    'name' => $participant->user?->name,
                    'avatar_url' => $participant->user?->avatar_path
                        ? asset('storage/'.$participant->user->avatar_path)
                        : null,
                    'is_me' => $participant->user_id === $viewer->id,
                ])->values()
                : [],
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'updated_at' => $conversation->updated_at?->toIso8601String(),
        ];
    }
}
