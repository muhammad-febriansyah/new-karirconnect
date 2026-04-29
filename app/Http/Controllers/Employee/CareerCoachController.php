<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\AiCoachSession;
use App\Services\Ai\AiCareerCoachService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CareerCoachController extends Controller
{
    public function __construct(private readonly AiCareerCoachService $coach) {}

    public function index(Request $request): Response
    {
        $sessions = AiCoachSession::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get(['id', 'title', 'status', 'last_message_at']);

        return Inertia::render('employee/career-coach/index', [
            'sessions' => $sessions,
            'activeSession' => null,
        ]);
    }

    public function show(Request $request, AiCoachSession $session): Response
    {
        $this->authorizeOwn($request, $session);

        $sessions = AiCoachSession::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get(['id', 'title', 'status', 'last_message_at']);

        $session->load('messages');

        return Inertia::render('employee/career-coach/index', [
            'sessions' => $sessions,
            'activeSession' => [
                'id' => $session->id,
                'title' => $session->title,
                'status' => $session->status,
                'messages' => $session->messages->map(fn ($m) => [
                    'id' => $m->id,
                    'role' => $m->role,
                    'content' => $m->content,
                    'created_at' => optional($m->created_at)->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
        ]);

        $session = AiCoachSession::query()->create([
            'user_id' => $request->user()->id,
            'title' => $data['title'],
            'status' => 'active',
            'last_message_at' => now(),
        ]);

        return redirect()->route('employee.career-coach.show', ['session' => $session->id]);
    }

    public function send(Request $request, AiCoachSession $session): RedirectResponse
    {
        $this->authorizeOwn($request, $session);

        $data = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
        ]);

        $this->coach->reply($session, $request->user(), $data['message']);

        return back()->with('success', 'Pesan terkirim.');
    }

    public function archive(Request $request, AiCoachSession $session): RedirectResponse
    {
        $this->authorizeOwn($request, $session);

        $session->forceFill(['status' => 'archived'])->save();

        return back()->with('success', 'Sesi diarsipkan.');
    }

    private function authorizeOwn(Request $request, AiCoachSession $session): void
    {
        abort_unless($session->user_id === $request->user()->id, 403);
    }
}
