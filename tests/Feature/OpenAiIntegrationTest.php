<?php

use App\Services\Ai\AiClientFactory;
use App\Services\Ai\Clients\OpenAiClient;
use App\Services\Ai\Contracts\AiClient;
use App\Services\Settings\SettingService;
use Database\Seeders\SettingSeeder;
use Illuminate\Support\Facades\Http;

/**
 * Verify production AI integration: AiClientFactory picks OpenAiClient when
 * `ai.provider=openai`, OpenAiClient reads API key from setting `ai.api_key`,
 * uses `ai.model_chat` / `ai.model_interview` correctly, and POSTs to
 * api.openai.com/v1/chat/completions with the right body.
 */
beforeEach(function (): void {
    $this->seed(SettingSeeder::class);

    // Test environment binds 'ai.client' to FakeAiClient. Override to real
    // OpenAiClient so factory walks the production code path against Http::fake.
    app()->bind('ai.client', fn ($app) => $app->make(OpenAiClient::class));
    app()->bind(AiClient::class, fn ($app) => $app->make(OpenAiClient::class));

    $svc = app(SettingService::class);
    $svc->set('ai', 'provider', 'openai');
    $svc->set('ai', 'api_key', 'sk-test-real-integration');
    $svc->set('ai', 'model_chat', 'gpt-4o-mini');
    $svc->set('ai', 'model_interview', 'gpt-4o');
    $svc->set('ai', 'max_tokens', '512');
    $svc->set('ai', 'cost_input_per_1k', '0.00015');
    $svc->set('ai', 'cost_output_per_1k', '0.0006');
    $svc->set('ai', 'base_url', 'https://api.openai.com/v1');
    $svc->flush();
});

it('AiClientFactory resolves to OpenAiClient when provider=openai', function (): void {
    $client = app(AiClientFactory::class)->make();
    expect($client)->toBeInstanceOf(OpenAiClient::class);
    expect($client->provider())->toBe('openai');
});

it('OpenAiClient POSTs to api.openai.com with API key from setting', function (): void {
    Http::fake([
        'api.openai.com/*' => Http::response([
            'choices' => [['message' => ['content' => '{"ok":true}']]],
            'usage' => ['prompt_tokens' => 100, 'completion_tokens' => 50, 'total_tokens' => 150],
        ], 200),
    ]);

    $client = app(AiClientFactory::class)->make();
    $client->chat([
        ['role' => 'system', 'content' => 'You are a helper.'],
        ['role' => 'user', 'content' => 'Halo.'],
    ]);

    $captured = collect(Http::recorded())->first();
    expect($captured)->not->toBeNull();
    [$request] = $captured;

    expect($request->url())->toBe('https://api.openai.com/v1/chat/completions');
    expect($request->method())->toBe('POST');
    expect($request->header('Authorization'))->toBe(['Bearer sk-test-real-integration']);

    $body = $request->data();
    expect($body['model'])->toBe('gpt-4o'); // default → model_interview
    expect($body['messages'])->toBeArray()->toHaveCount(2);
    expect($body['response_format']['type'])->toBe('json_object');
    expect($body['max_tokens'])->toBe(512);
});

it('passes per-call model override (coach uses ai.model_chat)', function (): void {
    Http::fake([
        'api.openai.com/*' => Http::response([
            'choices' => [['message' => ['content' => '{"reply":"hi"}']]],
            'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 5, 'total_tokens' => 15],
        ], 200),
    ]);

    $client = app(AiClientFactory::class)->make();
    $client->chat(
        [['role' => 'user', 'content' => 'apa kabar?']],
        ['intent' => 'coach', 'model' => 'gpt-4o-mini'],
    );

    $captured = collect(Http::recorded())->first();
    [$request] = $captured;
    $body = $request->data();
    expect($body['model'])->toBe('gpt-4o-mini');
});

it('throws clear error when api_key setting is empty', function (): void {
    $svc = app(SettingService::class);
    $svc->set('ai', 'api_key', '');
    $svc->flush();

    expect(fn () => app(AiClientFactory::class)->make()->chat([['role' => 'user', 'content' => 'x']]))
        ->toThrow(RuntimeException::class, 'OpenAI API key belum diatur');
});

it('respects custom base_url setting (Azure / proxy)', function (): void {
    app(SettingService::class)->set('ai', 'base_url', 'https://my-proxy.example.com/v1');
    app(SettingService::class)->flush();

    Http::fake([
        'my-proxy.example.com/*' => Http::response([
            'choices' => [['message' => ['content' => '{}']]],
            'usage' => ['prompt_tokens' => 1, 'completion_tokens' => 1, 'total_tokens' => 2],
        ], 200),
    ]);

    app(AiClientFactory::class)->make()->chat([['role' => 'user', 'content' => 'ping']]);

    $captured = collect(Http::recorded())->first();
    [$request] = $captured;
    expect($request->url())->toBe('https://my-proxy.example.com/v1/chat/completions');
});

it('records cost estimate using cost_*_per_1k settings', function (): void {
    Http::fake([
        'api.openai.com/*' => Http::response([
            'choices' => [['message' => ['content' => '{}']]],
            'usage' => ['prompt_tokens' => 1000, 'completion_tokens' => 1000, 'total_tokens' => 2000],
        ], 200),
    ]);

    $response = app(AiClientFactory::class)->make()->chat([['role' => 'user', 'content' => 'x']]);

    // 1000 prompt tokens × 0.00015 + 1000 completion × 0.0006 = 0.00075
    expect($response->costUsd)->toBe(0.00075);
});
