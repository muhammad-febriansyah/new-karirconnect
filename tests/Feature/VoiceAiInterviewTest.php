<?php

use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewSession;
use App\Models\EmployeeProfile;
use App\Models\User;
use App\Services\Settings\SettingService;
use Database\Seeders\SettingSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Verify the OpenAI Realtime voice interview flow: client_secret minting,
 * recording upload, and batch answer submission with live_transcript.
 */
beforeEach(function (): void {
    $this->seed(SettingSeeder::class);

    $svc = app(SettingService::class);
    $svc->set('ai', 'provider', 'openai');
    $svc->set('ai', 'api_key', 'sk-test-realtime');
    $svc->flush();

    $this->candidate = User::factory()->create(['role' => 'employee']);
    $this->profile = EmployeeProfile::factory()->create(['user_id' => $this->candidate->id]);
});

it('mints OpenAI realtime client_secret for a voice session', function (): void {
    Http::fake([
        'api.openai.com/v1/realtime/client_secrets' => Http::response([
            'value' => 'rsec_test_token_abc123',
        ], 200),
    ]);

    $session = AiInterviewSession::factory()->create([
        'candidate_profile_id' => $this->profile->id,
        'mode' => 'voice',
        'language' => 'id',
        'voice' => 'marin',
        'status' => 'in_progress',
        'is_practice' => true,
    ]);
    AiInterviewQuestion::factory()->create([
        'session_id' => $session->id,
        'order_number' => 1,
        'question' => 'Ceritakan pengalaman kerjamu.',
    ]);

    $response = $this->actingAs($this->candidate)
        ->postJson("/employee/ai-interviews/{$session->id}/client-secret");

    $response->assertOk();
    expect($response->json('client_secret'))->toBe('rsec_test_token_abc123');
    expect($response->json('model'))->toBe('gpt-realtime');

    $captured = collect(Http::recorded())->first();
    [$request] = $captured;
    $body = $request->data();
    expect($request->url())->toBe('https://api.openai.com/v1/realtime/client_secrets');
    expect($body['session']['type'])->toBe('realtime');
    expect($body['session']['audio']['output']['voice'])->toBe('marin');
    expect($body['session']['audio']['input']['transcription']['language'])->toBe('id');
});

it('rejects client_secret request when session mode is text', function (): void {
    $session = AiInterviewSession::factory()->create([
        'candidate_profile_id' => $this->profile->id,
        'mode' => 'text',
        'is_practice' => true,
    ]);

    $response = $this->actingAs($this->candidate)
        ->postJson("/employee/ai-interviews/{$session->id}/client-secret");

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('mode teks');
});

it('rejects client_secret when api_key is empty', function (): void {
    app(SettingService::class)->set('ai', 'api_key', '');
    app(SettingService::class)->flush();

    $session = AiInterviewSession::factory()->create([
        'candidate_profile_id' => $this->profile->id,
        'mode' => 'voice',
        'is_practice' => true,
    ]);

    $response = $this->actingAs($this->candidate)
        ->postJson("/employee/ai-interviews/{$session->id}/client-secret");

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('API key');
});

it('uploads voice recording and stores public URL on session', function (): void {
    Storage::fake('public');

    $session = AiInterviewSession::factory()->create([
        'candidate_profile_id' => $this->profile->id,
        'mode' => 'voice',
        'is_practice' => true,
    ]);

    $file = UploadedFile::fake()->create('rec.webm', 100, 'audio/webm');

    $response = $this->actingAs($this->candidate)
        ->post("/employee/ai-interviews/{$session->id}/recording", [
            'recording' => $file,
        ]);

    $response->assertOk();
    expect($response->json('recording_url'))->toStartWith('/storage/ai-interview-recordings/');

    $session->refresh();
    expect($session->recording_url)->toStartWith('/storage/ai-interview-recordings/');
});

it('submits voice answers with live_transcript and redirects to complete', function (): void {
    $session = AiInterviewSession::factory()->create([
        'candidate_profile_id' => $this->profile->id,
        'mode' => 'voice',
        'language' => 'id',
        'is_practice' => true,
    ]);
    $q1 = AiInterviewQuestion::factory()->create([
        'session_id' => $session->id,
        'order_number' => 1,
        'question' => 'Apa motivasimu?',
    ]);
    $q2 = AiInterviewQuestion::factory()->create([
        'session_id' => $session->id,
        'order_number' => 2,
        'question' => 'Apa kekuatanmu?',
    ]);

    $response = $this->actingAs($this->candidate)
        ->post("/employee/ai-interviews/{$session->id}/voice-submit", [
            'answers' => [
                $q1->id => 'Saya termotivasi oleh pertumbuhan.',
                $q2->id => 'Komunikasi dan teamwork.',
            ],
            'live_transcript' => 'AI: Apa motivasimu? Kandidat: Saya termotivasi...',
        ]);

    $response->assertRedirect("/employee/ai-interviews/{$session->id}/complete");

    $session->refresh();
    expect($session->live_transcript)->toContain('Saya termotivasi');
    expect($session->responses()->count())->toBe(2);
    expect($session->responses()->where('question_id', $q1->id)->first()->answer_text)
        ->toBe('Saya termotivasi oleh pertumbuhan.');
});

it('candidate cannot mint client_secret for other users session', function (): void {
    $other = User::factory()->create(['role' => 'employee']);
    $otherProfile = EmployeeProfile::factory()->create(['user_id' => $other->id]);

    $session = AiInterviewSession::factory()->create([
        'candidate_profile_id' => $otherProfile->id,
        'mode' => 'voice',
        'is_practice' => true,
    ]);

    $response = $this->actingAs($this->candidate)
        ->postJson("/employee/ai-interviews/{$session->id}/client-secret");

    $response->assertForbidden();
});
