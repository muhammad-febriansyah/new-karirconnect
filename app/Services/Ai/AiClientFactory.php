<?php

namespace App\Services\Ai;

use App\Services\Ai\Clients\FakeAiClient;
use App\Services\Ai\Clients\OpenAiClient;
use App\Services\Ai\Contracts\AiClient;
use App\Services\Settings\SettingService;
use Illuminate\Contracts\Foundation\Application;

/**
 * Picks the AI client implementation. Tests bind FakeAiClient directly via
 * the container; production reads `ai.provider` from Settings (default openai).
 */
class AiClientFactory
{
    public function __construct(
        private readonly Application $app,
        private readonly SettingService $settings,
    ) {}

    public function make(): AiClient
    {
        // Tests/seed: short-circuit when explicitly bound.
        if ($this->app->bound('ai.client')) {
            return $this->app->make('ai.client');
        }

        $provider = (string) ($this->settings->get('ai.provider', 'openai') ?: 'openai');

        return match ($provider) {
            'fake' => new FakeAiClient,
            default => $this->app->make(OpenAiClient::class),
        };
    }
}
