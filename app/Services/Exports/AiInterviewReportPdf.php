<?php

namespace App\Services\Exports;

use App\Models\AiInterviewSession;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

/**
 * Renders an AI interview session as a downloadable PDF report. The session
 * must already be loaded with its analysis + questions + responses; we only
 * eager-load defensively if a caller forgot. The filename embeds the session
 * id and candidate slug to stay unique across reruns.
 */
class AiInterviewReportPdf
{
    public function download(AiInterviewSession $session): Response
    {
        $session->loadMissing([
            'analysis',
            'questions.response',
            'job:id,title,company_id',
            'candidateProfile.user:id,name,email',
        ]);

        $candidateName = $session->candidateProfile?->user?->name ?? 'Kandidat';
        $candidateEmail = $session->candidateProfile?->user?->email;
        $jobTitle = $session->job?->title ?? '—';

        $pdf = Pdf::loadView('exports.ai-interview-report', [
            'candidateName' => $candidateName,
            'candidateEmail' => $candidateEmail,
            'jobTitle' => $jobTitle,
            'mode' => $session->mode?->value ?? '—',
            'status' => $session->status?->value ?? '—',
            'completedAt' => $session->completed_at,
            'analysis' => $session->analysis,
            'questions' => $session->questions,
            'generatedAt' => now(),
        ])->setPaper('a4');

        $slug = str($candidateName)->slug()->value() ?: 'kandidat';
        $filename = sprintf('ai-interview-%d-%s.pdf', $session->id, $slug);

        return $pdf->download($filename);
    }
}
