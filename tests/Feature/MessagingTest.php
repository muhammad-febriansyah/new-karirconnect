<?php

use App\Models\Application;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use App\Services\Messaging\ConversationService;
use App\Services\Messaging\MessageService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Notification;

describe('ConversationService', function () {
    it('creates a direct conversation between two users', function () {
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        $conversation = app(ConversationService::class)->findOrCreateDirect([$alice->id, $bob->id]);

        expect($conversation)->toBeInstanceOf(Conversation::class);
        expect($conversation->type)->toBe('direct');
        expect($conversation->participants()->count())->toBe(2);
    });

    it('returns the existing direct conversation on a second call (idempotent)', function () {
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        $service = app(ConversationService::class);

        $first = $service->findOrCreateDirect([$alice->id, $bob->id]);
        $second = $service->findOrCreateDirect([$alice->id, $bob->id]);

        expect($second->id)->toBe($first->id);
        expect(Conversation::query()->count())->toBe(1);
    });

    it('binds a conversation to a context model and stays idempotent per context', function () {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $application = Application::factory()->create();

        $service = app(ConversationService::class);

        $first = $service->findOrCreateForContext($application, [$alice->id, $bob->id], 'interview');
        $second = $service->findOrCreateForContext($application, [$alice->id, $bob->id], 'interview');

        expect($second->id)->toBe($first->id);
        expect($first->context_type)->toBe(Application::class);
        expect($first->context_id)->toBe($application->id);
    });

    it('counts unread conversations correctly', function () {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $service = app(ConversationService::class);
        $messages = app(MessageService::class);

        $conversation = $service->findOrCreateDirect([$alice->id, $bob->id]);
        $messages->send($conversation, $bob, 'Halo Alice');

        expect($service->unreadCount($alice->fresh()))->toBe(1);
        expect($service->unreadCount($bob->fresh()))->toBe(0);
    });
});

describe('MessageService', function () {
    it('persists a message and bumps last_message_at', function () {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $service = app(ConversationService::class);
        $messages = app(MessageService::class);

        $conversation = $service->findOrCreateDirect([$alice->id, $bob->id]);
        $message = $messages->send($conversation, $alice, 'Halo!');

        expect($message)->toBeInstanceOf(Message::class);
        expect($message->body)->toBe('Halo!');
        expect($conversation->fresh()->last_message_at)->not->toBeNull();
    });

    it('refuses to send from a non-participant', function () {
        $stranger = User::factory()->create();
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        $conversation = app(ConversationService::class)
            ->findOrCreateDirect([$alice->id, $bob->id]);

        expect(fn () => app(MessageService::class)->send($conversation, $stranger, 'sneak'))
            ->toThrow(AuthorizationException::class);
    });

    it('dispatches NewMessageNotification to other participants but not the sender', function () {
        Notification::fake();

        $alice = User::factory()->create();
        $bob = User::factory()->create();

        $conversation = app(ConversationService::class)
            ->findOrCreateDirect([$alice->id, $bob->id]);

        app(MessageService::class)->send($conversation, $alice, 'hai bob');

        Notification::assertSentTo($bob, NewMessageNotification::class);
        Notification::assertNotSentTo($alice, NewMessageNotification::class);
    });

    it('skips muted participants when notifying', function () {
        Notification::fake();

        $alice = User::factory()->create();
        $bob = User::factory()->create();

        $conversation = app(ConversationService::class)
            ->findOrCreateDirect([$alice->id, $bob->id]);

        $conversation->participants()
            ->where('user_id', $bob->id)
            ->update(['is_muted' => true]);

        app(MessageService::class)->send($conversation, $alice, 'hai bob');

        Notification::assertNotSentTo($bob, NewMessageNotification::class);
    });

    it('marks a conversation as read for the given user', function () {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $service = app(ConversationService::class);
        $messages = app(MessageService::class);

        $conversation = $service->findOrCreateDirect([$alice->id, $bob->id]);
        $messages->send($conversation, $bob, 'Halo Alice');

        expect($service->unreadCount($alice->fresh()))->toBe(1);

        $messages->markRead($conversation, $alice);

        expect($service->unreadCount($alice->fresh()))->toBe(0);
    });
});

describe('ConversationPolicy', function () {
    it('lets only participants and admins view a conversation', function () {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $stranger = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $conversation = app(ConversationService::class)
            ->findOrCreateDirect([$alice->id, $bob->id]);

        expect($alice->can('view', $conversation))->toBeTrue();
        expect($bob->can('view', $conversation))->toBeTrue();
        expect($stranger->can('view', $conversation))->toBeFalse();
        expect($admin->can('view', $conversation))->toBeTrue();
    });

    it('only lets participants send messages', function () {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $stranger = User::factory()->create();

        $conversation = app(ConversationService::class)
            ->findOrCreateDirect([$alice->id, $bob->id]);

        expect($alice->can('send', $conversation))->toBeTrue();
        expect($stranger->can('send', $conversation))->toBeFalse();
    });
});

describe('models wiring', function () {
    it('eagerly loads messages and participants', function () {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $conversation = Conversation::factory()->create();
        ConversationParticipant::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $alice->id]);
        ConversationParticipant::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $bob->id]);
        Message::factory()->create(['conversation_id' => $conversation->id, 'sender_user_id' => $alice->id]);

        $loaded = Conversation::query()
            ->with(['participants.user', 'messages'])
            ->find($conversation->id);

        expect($loaded->participants)->toHaveCount(2);
        expect($loaded->messages)->toHaveCount(1);
    });
});
