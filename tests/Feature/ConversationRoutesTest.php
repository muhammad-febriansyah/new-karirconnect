<?php

use App\Models\User;
use App\Services\Messaging\ConversationService;
use App\Services\Messaging\MessageService;

it('redirects guests away from the conversations index', function () {
    $this->get('/conversations')->assertRedirect('/login');
});

it('renders the index page for an authenticated user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/conversations')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page->component('conversations/index')
                ->has('conversations.data')
                ->where('unreadCount', 0),
        );
});

it('shows a conversation only to its participants', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $stranger = User::factory()->create();

    $conversation = app(ConversationService::class)
        ->findOrCreateDirect([$alice->id, $bob->id]);

    $this->actingAs($alice)
        ->get("/conversations/{$conversation->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('conversations/show'));

    $this->actingAs($stranger)
        ->get("/conversations/{$conversation->id}")
        ->assertForbidden();
});

it('lets a participant send a message and refuses outsiders', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $stranger = User::factory()->create();

    $conversation = app(ConversationService::class)
        ->findOrCreateDirect([$alice->id, $bob->id]);

    $this->actingAs($alice)
        ->post("/conversations/{$conversation->id}/messages", ['body' => 'Halo Bob'])
        ->assertRedirect();

    expect($conversation->messages()->count())->toBe(1);

    $this->actingAs($stranger)
        ->post("/conversations/{$conversation->id}/messages", ['body' => 'sneak'])
        ->assertForbidden();

    expect($conversation->messages()->count())->toBe(1);
});

it('starts a direct conversation with another user via /start', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();

    $response = $this->actingAs($alice)
        ->post('/conversations/start', ['user_id' => $bob->id, 'subject' => 'Tentang lowongan'])
        ->assertRedirect();

    expect($response->headers->get('Location'))->toContain('/conversations/');
});

it('marks a conversation read on visit', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create();

    $service = app(ConversationService::class);
    $conversation = $service->findOrCreateDirect([$alice->id, $bob->id]);
    app(MessageService::class)->send($conversation, $bob, 'Halo Alice');

    expect($service->unreadCount($alice->fresh()))->toBe(1);

    $this->actingAs($alice)
        ->get("/conversations/{$conversation->id}")
        ->assertOk();

    expect($service->unreadCount($alice->fresh()))->toBe(0);
});

it('refuses to start a conversation with yourself', function () {
    $alice = User::factory()->create();

    $this->actingAs($alice)
        ->post('/conversations/start', ['user_id' => $alice->id])
        ->assertSessionHas('error');
});
