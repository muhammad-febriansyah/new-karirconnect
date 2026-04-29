<?php

namespace App\Services\Ai\Contracts;

interface AiClient
{
    /**
     * Send a structured chat request and return the assistant message + token
     * usage. Implementations may live-stream internally but must return a
     * fully-resolved response here so the caller can persist it atomically.
     *
     * @param  array<int, array{role:string, content:string}>  $messages
     * @param  array<string, mixed>  $options
     */
    public function chat(array $messages, array $options = []): AiResponse;

    public function provider(): string;

    public function model(): string;
}
