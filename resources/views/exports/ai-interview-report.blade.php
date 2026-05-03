<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>AI Interview Report — {{ $candidateName }}</title>
    <style>
        @page { margin: 32px; }
        body { font-family: 'Helvetica', Arial, sans-serif; color: #1a1a1a; font-size: 10.5pt; line-height: 1.45; }
        h1 { font-size: 20pt; margin: 0 0 4px 0; }
        h2 { font-size: 12pt; margin: 18px 0 6px 0; padding-bottom: 4px; border-bottom: 2px solid #0f172a; text-transform: uppercase; letter-spacing: 0.5pt; }
        h3 { font-size: 11pt; margin: 0 0 4px 0; }
        .muted { color: #64748b; font-size: 9pt; }
        .meta { margin-bottom: 14px; }
        .meta div { margin: 2px 0; }
        .scores { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .scores th, .scores td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 10pt; }
        .scores th { background: #f8fafc; font-weight: 600; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #e2e8f0; font-size: 9pt; }
        .pill.pass { background: #dcfce7; color: #166534; }
        .pill.warn { background: #fef3c7; color: #92400e; }
        .pill.fail { background: #fee2e2; color: #991b1b; }
        .qa { margin-top: 8px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 6px; page-break-inside: avoid; }
        .qa .q { font-weight: 600; }
        .qa .a { margin-top: 6px; color: #334155; }
        .qa .fb { margin-top: 6px; color: #475569; font-style: italic; font-size: 9.5pt; }
        ul { margin: 4px 0 0 0; padding-left: 18px; }
        .footer { margin-top: 24px; font-size: 8pt; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <h1>AI Interview Report</h1>
    <div class="muted">Dihasilkan {{ $generatedAt->format('d M Y H:i') }} · KarirConnect</div>

    <div class="meta">
        <h2>Kandidat & Posisi</h2>
        <div><strong>Kandidat:</strong> {{ $candidateName }}</div>
        @if($candidateEmail)
            <div><strong>Email:</strong> {{ $candidateEmail }}</div>
        @endif
        <div><strong>Posisi:</strong> {{ $jobTitle }}</div>
        <div><strong>Mode:</strong> {{ $mode }}</div>
        <div><strong>Status:</strong> {{ $status }}</div>
        @if($completedAt)
            <div><strong>Selesai:</strong> {{ $completedAt->format('d M Y H:i') }}</div>
        @endif
    </div>

    @if($analysis)
        <h2>Skor Keseluruhan</h2>
        <table class="scores">
            <thead>
                <tr><th>Aspek</th><th>Skor</th></tr>
            </thead>
            <tbody>
                <tr><td>Overall</td><td>{{ $analysis->overall_score ?? '-' }}/100</td></tr>
                <tr><td>Job Fit</td><td>{{ $analysis->fit_score ?? '-' }}/100</td></tr>
                <tr><td>Komunikasi</td><td>{{ $analysis->communication_score ?? '-' }}/100</td></tr>
                <tr><td>Teknis</td><td>{{ $analysis->technical_score ?? '-' }}/100</td></tr>
                <tr><td>Problem Solving</td><td>{{ $analysis->problem_solving_score ?? '-' }}/100</td></tr>
                <tr><td>Culture Fit</td><td>{{ $analysis->culture_fit_score ?? '-' }}/100</td></tr>
            </tbody>
        </table>

        @if($analysis->recommendation)
            <p style="margin-top: 8px"><strong>Rekomendasi:</strong> <span class="pill">{{ $analysis->recommendation }}</span></p>
        @endif

        @if($analysis->summary)
            <h2>Ringkasan</h2>
            <p>{{ $analysis->summary }}</p>
        @endif

        @if(! empty($analysis->strengths))
            <h2>Kekuatan</h2>
            <ul>
                @foreach($analysis->strengths as $item)
                    <li>{{ is_array($item) ? ($item['text'] ?? json_encode($item)) : $item }}</li>
                @endforeach
            </ul>
        @endif

        @if(! empty($analysis->weaknesses))
            <h2>Area Pengembangan</h2>
            <ul>
                @foreach($analysis->weaknesses as $item)
                    <li>{{ is_array($item) ? ($item['text'] ?? json_encode($item)) : $item }}</li>
                @endforeach
            </ul>
        @endif

        @if(! empty($analysis->red_flags))
            <h2>Catatan Penting</h2>
            <ul>
                @foreach($analysis->red_flags as $item)
                    <li>{{ is_array($item) ? ($item['text'] ?? json_encode($item)) : $item }}</li>
                @endforeach
            </ul>
        @endif
    @else
        <h2>Skor</h2>
        <p class="muted">Analisis sesi belum tersedia.</p>
    @endif

    <h2>Pertanyaan & Jawaban</h2>
    @forelse($questions as $question)
        <div class="qa">
            <div class="q">{{ $question->order_number }}. {{ $question->question }}</div>
            @if($question->category)
                <div class="muted">Kategori: {{ $question->category }}</div>
            @endif
            @php($response = $question->response)
            <div class="a">
                <strong>Jawaban:</strong>
                {{ $response?->answer_text ?? $response?->transcript ?? '— tidak dijawab —' }}
            </div>
            @if($response?->ai_score !== null)
                <div class="muted" style="margin-top: 4px">Skor AI: {{ $response->ai_score }}/100</div>
            @endif
            @if($response?->ai_feedback)
                <div class="fb">Feedback AI: {{ $response->ai_feedback }}</div>
            @endif
        </div>
    @empty
        <p class="muted">Tidak ada pertanyaan.</p>
    @endforelse

    <div class="footer">
        Dokumen ini dibuat otomatis oleh sistem AI Interview KarirConnect.
        Skor AI bersifat indikatif dan harus dipertimbangkan bersama penilaian manusia.
    </div>
</body>
</html>
