<?php

namespace App\Services\Ai\Contracts;

class AiResponse
{
    public function __construct(
        public readonly string $content,
        public readonly int $promptTokens = 0,
        public readonly int $completionTokens = 0,
        public readonly float $costUsd = 0.0,
        public readonly int $latencyMs = 0,
        public readonly string $rawJson = '',
    ) {}

    /**
     * Try to decode the assistant content as JSON. Returns null if the model
     * produced free-form text — caller is expected to fall back gracefully.
     *
     * @return array<string, mixed>|null
     */
    public function asArray(): ?array
    {
        $decoded = json_decode($this->content, true);

        return is_array($decoded) ? $decoded : null;
    }
}
