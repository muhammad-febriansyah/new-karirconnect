<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Messaging\ConversationService;
use App\Services\Messaging\MessageService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConversationController extends Controller
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly MessageService $messages,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $paginator = $this->conversations->listForUser($user);

        return Inertia::render('conversations/index', [
            'conversations' => $paginator->through(function (Conversation $c) use ($user) {
                $other = $c->participants
                    ->pluck('user')
                    ->filter()
                    ->firstWhere('id', '!==', $user->id);

                $self = $c->participants->firstWhere('user_id', $user->id);
                $latest = $c->messages->first();
                $unread = $c->last_message_at !== null
                    && ($self?->last_read_at === null || $self->last_read_at->lt($c->last_message_at));

                return [
                    'id' => $c->id,
                    'type' => $c->type,
                    'subject' => $c->subject,
                    'last_message_at' => optional($c->last_message_at)->toIso8601String(),
                    'unread' => $unread,
                    'counterpart' => $other ? [
                        'id' => $other->id,
                        'name' => $other->name,
                        'avatar_url' => $other->avatar_path ? asset('storage/'.$other->avatar_path) : null,
                    ] : null,
                    'participant_count' => $c->participants->count(),
                    'last_message_preview' => $latest?->body
                        ? mb_substr((string) $latest->body, 0, 140)
                        : null,
                ];
            }),
            'unreadCount' => $this->conversations->unreadCount($user),
        ]);
    }

    public function show(Request $request, Conversation $conversation): Response
    {
        $user = $request->user();

        if (! $user->can('view', $conversation)) {
            throw new AuthorizationException;
        }

        $conversation->load([
            'participants.user:id,name,avatar_path',
            'messages.sender:id,name,avatar_path',
        ]);

        $this->messages->markRead($conversation, $user);

        return Inertia::render('conversations/show', [
            'conversation' => [
                'id' => $conversation->id,
                'type' => $conversation->type,
                'subject' => $conversation->subject,
                'participants' => $conversation->participants->map(fn ($p) => [
                    'user_id' => $p->user_id,
                    'name' => $p->user?->name,
                    'avatar_url' => $p->user?->avatar_path
                        ? asset('storage/'.$p->user->avatar_path)
                        : null,
                ])->values(),
            ],
            'messages' => $conversation->messages->map(fn (Message $m) => [
                'id' => $m->id,
                'body' => $m->body,
                'is_system' => $m->is_system,
                'sent_by_me' => $m->sender_user_id === $user->id,
                'sender' => [
                    'id' => $m->sender_user_id,
                    'name' => $m->sender?->name,
                    'avatar_url' => $m->sender?->avatar_path
                        ? asset('storage/'.$m->sender->avatar_path)
                        : null,
                ],
                'sent_at' => optional($m->created_at)->toIso8601String(),
            ])->values(),
        ]);
    }

    public function store(Request $request, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();

        if (! $user->can('send', $conversation)) {
            throw new AuthorizationException;
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $this->messages->send($conversation, $user, $data['body']);

        return back()->with('success', 'Pesan terkirim.');
    }

    public function markRead(Request $request, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();

        if (! $user->can('view', $conversation)) {
            throw new AuthorizationException;
        }

        $this->messages->markRead($conversation, $user);

        return back();
    }

    /**
     * Open or create a direct conversation with another user. Used by talent
     * search "Contact" buttons and by employee "Reply" links — turns the page
     * straight into the new thread.
     */
    public function startWith(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'subject' => ['nullable', 'string', 'max:255'],
        ]);

        if ((int) $data['user_id'] === $user->id) {
            return back()->with('error', 'Tidak bisa memulai percakapan dengan diri sendiri.');
        }

        $other = User::query()->findOrFail($data['user_id']);

        $conversation = $this->conversations->findOrCreateDirect(
            [$user->id, $other->id],
            $data['subject'] ?? null,
        );

        return redirect()->route('conversations.show', ['conversation' => $conversation->id]);
    }
}
