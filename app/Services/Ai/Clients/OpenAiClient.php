<?php

namespace App\Services\Ai\Clients;

use App\Services\Ai\Contracts\AiClient;
use App\Services\Ai\Contracts\AiResponse;
use App\Services\Settings\SettingService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAiClient implements AiClient
{
    /** OpenAI Chat Completions endpoint. Override via Setting `ai.base_url`. */
    private const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

    public function __construct(private readonly SettingService $settings) {}

    public function chat(array $messages, array $options = []): AiResponse
    {
        $apiKey = (string) $this->settings->get('ai.api_key', '');
        if ($apiKey === '') {
            throw new RuntimeException('OpenAI API key belum diatur di pengaturan AI.');
        }

        $baseUrl = (string) ($this->settings->get('ai.base_url', self::DEFAULT_BASE_URL) ?: self::DEFAULT_BASE_URL);
        $model = $options['model'] ?? (string) $this->settings->get('ai.model_interview', 'gpt-4o-mini');

        $body = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => (float) ($options['temperature'] ?? 0.4),
            'response_format' => ['type' => 'json_object'],
        ];

        if (isset($options['max_tokens'])) {
            $body['max_tokens'] = (int) $options['max_tokens'];
        } elseif ($maxTokens = (int) $this->settings->get('ai.max_tokens', 0)) {
            $body['max_tokens'] = $maxTokens;
        }

        $start = microtime(true);

        try {
            $response = Http::withToken($apiKey)
                ->timeout(60)
                ->acceptJson()
                ->post("{$baseUrl}/chat/completions", $body);
        } catch (ConnectionException $e) {
            throw new RuntimeException('Tidak dapat terhubung ke layanan AI: '.$e->getMessage(), previous: $e);
        }

        if (! $response->successful()) {
            throw new RuntimeException("OpenAI error {$response->status()}: ".$response->body());
        }

        $latencyMs = (int) ((microtime(true) - $start) * 1000);
        $payload = $response->json();
        $content = data_get($payload, 'choices.0.message.content', '{}');

        return new AiResponse(
            content: (string) $content,
            promptTokens: (int) data_get($payload, 'usage.prompt_tokens', 0),
            completionTokens: (int) data_get($payload, 'usage.completion_tokens', 0),
            costUsd: $this->estimateCost($model, (int) data_get($payload, 'usage.prompt_tokens', 0), (int) data_get($payload, 'usage.completion_tokens', 0)),
            latencyMs: $latencyMs,
            rawJson: (string) $response->body(),
        );
    }

    public function provider(): string
    {
        return 'openai';
    }

    public function model(): string
    {
        return (string) ($this->settings->get('ai.model_interview', 'gpt-4o-mini') ?: 'gpt-4o-mini');
    }

    /**
     * Rough USD cost estimate per 1K tokens. Settings can override these via
     * `ai.cost_input_per_1k` / `ai.cost_output_per_1k` so we keep accurate
     * cost tracking even when OpenAI changes pricing.
     */
    private function estimateCost(string $model, int $promptTokens, int $completionTokens): float
    {
        $inputPer1k = (float) $this->settings->get('ai.cost_input_per_1k', 0.00015);
        $outputPer1k = (float) $this->settings->get('ai.cost_output_per_1k', 0.0006);

        return round(($promptTokens / 1000) * $inputPer1k + ($completionTokens / 1000) * $outputPer1k, 6);
    }
}
