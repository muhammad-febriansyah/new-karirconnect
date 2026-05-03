<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\AiCoachSession;
use App\Services\Ai\AiCareerCoachService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Smalot\PdfParser\Parser as PdfParser;
use Throwable;
use ZipArchive;

class CareerCoachController extends Controller
{
    public function __construct(private readonly AiCareerCoachService $coach) {}

    public function index(Request $request): Response
    {
        return Inertia::render('employee/career-coach/index', [
            'sessions' => $this->sessionList($request->user()->id),
            'activeSession' => null,
        ]);
    }

    public function show(Request $request, AiCoachSession $session): Response
    {
        $this->authorizeOwn($request, $session);

        $session->load('messages');

        return Inertia::render('employee/career-coach/index', [
            'sessions' => $this->sessionList($request->user()->id),
            'activeSession' => [
                'id' => $session->id,
                'title' => $session->title,
                'status' => $session->status,
                'last_message_at' => optional($session->last_message_at)->toIso8601String(),
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
            'title' => ['nullable', 'string', 'max:200'],
            'message' => ['nullable', 'string', 'max:4000'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,doc,docx,txt', 'max:5120'],
        ]);
        $attachment = $request->file('attachment');
        $initialMessage = trim((string) ($data['message'] ?? ''));

        if ($initialMessage === '' && $attachment instanceof UploadedFile) {
            $initialMessage = 'Tolong review CV saya dan beri saran perbaikan.';
        }

        $title = trim((string) ($data['title'] ?? '')) !== ''
            ? (string) $data['title']
            : ($initialMessage !== '' ? Str::limit($initialMessage, 60, '…') : 'Sesi Coaching');

        $session = AiCoachSession::query()->create([
            'user_id' => $request->user()->id,
            'title' => $title,
            'status' => 'active',
            'last_message_at' => now(),
        ]);

        if ($initialMessage !== '') {
            $fileContext = $this->attachmentContext($attachment);
            $visibleMessage = $this->messageWithAttachmentLabel($initialMessage, $attachment);

            $this->coach->reply($session, $request->user(), $visibleMessage, $fileContext);
        }

        return redirect()->route('employee.career-coach.show', ['session' => $session->id]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function sessionList(int $userId): Collection
    {
        return AiCoachSession::query()
            ->withCount('messages')
            ->where('user_id', $userId)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get(['id', 'title', 'status', 'last_message_at'])
            ->map(fn (AiCoachSession $s) => [
                'id' => $s->id,
                'title' => $s->title,
                'status' => $s->status,
                'last_message_at' => optional($s->last_message_at)->toIso8601String(),
                'messages_count' => $s->messages_count,
            ]);
    }

    public function send(Request $request, AiCoachSession $session): RedirectResponse
    {
        $this->authorizeOwn($request, $session);

        $data = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,doc,docx,txt', 'max:5120'],
        ]);

        $fileContext = $this->attachmentContext($request->file('attachment'));
        $visibleMessage = $this->messageWithAttachmentLabel($data['message'], $request->file('attachment'));

        $this->coach->reply($session, $request->user(), $visibleMessage, $fileContext);

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

    private function messageWithAttachmentLabel(string $message, ?UploadedFile $file): string
    {
        if (! $file instanceof UploadedFile) {
            return $message;
        }

        return trim($message)."\n\n[Lampiran CV: {$file->getClientOriginalName()}]";
    }

    private function attachmentContext(?UploadedFile $file): ?string
    {
        if (! $file instanceof UploadedFile) {
            return null;
        }

        $name = $file->getClientOriginalName();
        $extension = strtolower((string) $file->getClientOriginalExtension());
        $text = match ($extension) {
            'txt' => $this->readPlainText($file),
            'docx' => $this->readDocxText($file),
            'doc' => $this->readDocxText($file),
            'pdf' => $this->readPdfText($file),
            default => null,
        };

        $summary = "Nama file: {$name}\nTipe file: {$extension}\n";

        if ($text === null || trim($text) === '') {
            return $summary.'Catatan: isi file tidak dapat diekstrak otomatis. Minta kandidat menempelkan teks CV jika analisis butuh detail isi.';
        }

        return $summary."Isi file:\n".Str::limit($text, 12000);
    }

    private function readPlainText(UploadedFile $file): ?string
    {
        $content = file_get_contents($file->getRealPath());

        return is_string($content) ? $content : null;
    }

    private function readPdfText(UploadedFile $file): ?string
    {
        try {
            $parser = new PdfParser;
            $document = $parser->parseFile($file->getRealPath());
            $text = $document->getText();

            $text = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;
            $text = preg_replace('/\n{3,}/u', "\n\n", $text) ?? $text;

            return trim($text);
        } catch (Throwable $throwable) {
            Log::warning('Career coach PDF parse failed', [
                'file' => $file->getClientOriginalName(),
                'error' => $throwable->getMessage(),
            ]);

            return null;
        }
    }

    private function readDocxText(UploadedFile $file): ?string
    {
        $zip = new ZipArchive;

        if (! class_exists(ZipArchive::class) || $zip->open($file->getRealPath()) !== true) {
            return null;
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if (! is_string($xml)) {
            return null;
        }

        $text = preg_replace('/<w:tab\/>/', "\t", $xml) ?? $xml;
        $text = preg_replace('/<\/w:p>/', "\n", $text) ?? $text;

        return trim(html_entity_decode(strip_tags($text)));
    }
}
