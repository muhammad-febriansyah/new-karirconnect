<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $data['personal']['full_name'] ?? 'CV' }}</title>
    <style>
        @page { margin: 32px; }
        body { font-family: 'Helvetica', Arial, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.45; }
        h1 { font-size: 22pt; margin: 0 0 4px 0; letter-spacing: -0.4pt; }
        h2 { font-size: 13pt; margin: 18px 0 6px 0; padding-bottom: 4px; border-bottom: 2px solid #0f172a; text-transform: uppercase; letter-spacing: 0.6pt; }
        h3 { font-size: 11pt; margin: 0 0 2px 0; }
        .muted { color: #64748b; font-size: 9pt; }
        .row { display: flex; justify-content: space-between; }
        .item { margin-bottom: 12px; }
        .header { margin-bottom: 16px; }
        .contact { font-size: 10pt; color: #475569; margin-top: 4px; }
        .contact span { margin-right: 12px; }
        ul { margin: 4px 0 0 0; padding-left: 18px; }
        .skills { display: flex; flex-wrap: wrap; gap: 6px; }
        .skill-tag { background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-size: 9pt; }
    </style>
</head>
<body>
    @php
        $personal = $data['personal'] ?? [];
        $summary = $data['summary'] ?? null;
        $experiences = $data['experiences'] ?? [];
        $educations = $data['educations'] ?? [];
        $skills = $data['skills'] ?? [];
        $certifications = $data['certifications'] ?? [];
    @endphp

    <div class="header">
        <h1>{{ $personal['full_name'] ?? $profile->user->name }}</h1>
        @if(! empty($personal['headline']))
            <div class="muted">{{ $personal['headline'] }}</div>
        @endif
        <div class="contact">
            @if(! empty($personal['email'])) <span>✉ {{ $personal['email'] }}</span> @endif
            @if(! empty($personal['phone'])) <span>☎ {{ $personal['phone'] }}</span> @endif
            @if(! empty($personal['location'])) <span>⌖ {{ $personal['location'] }}</span> @endif
            @if(! empty($personal['website'])) <span>⌘ {{ $personal['website'] }}</span> @endif
        </div>
    </div>

    @if($summary)
        <h2>Ringkasan Profesional</h2>
        <p>{{ $summary }}</p>
    @endif

    @if(! empty($experiences))
        <h2>Pengalaman Kerja</h2>
        @foreach($experiences as $exp)
            <div class="item">
                <div class="row">
                    <h3>{{ $exp['position'] ?? '' }} — {{ $exp['company'] ?? '' }}</h3>
                    <span class="muted">{{ $exp['period'] ?? '' }}</span>
                </div>
                @if(! empty($exp['description']))
                    <div>{{ $exp['description'] }}</div>
                @endif
            </div>
        @endforeach
    @endif

    @if(! empty($educations))
        <h2>Pendidikan</h2>
        @foreach($educations as $edu)
            <div class="item">
                <div class="row">
                    <h3>{{ $edu['institution'] ?? '' }} — {{ $edu['major'] ?? '' }}</h3>
                    <span class="muted">{{ $edu['period'] ?? '' }}</span>
                </div>
                @if(! empty($edu['gpa']))
                    <div class="muted">IPK: {{ $edu['gpa'] }}</div>
                @endif
            </div>
        @endforeach
    @endif

    @if(! empty($skills))
        <h2>Keahlian</h2>
        <div class="skills">
            @foreach($skills as $skill)
                <span class="skill-tag">{{ is_array($skill) ? ($skill['name'] ?? '') : $skill }}</span>
            @endforeach
        </div>
    @endif

    @if(! empty($certifications))
        <h2>Sertifikasi</h2>
        @foreach($certifications as $cert)
            <div class="item">
                <h3>{{ $cert['name'] ?? '' }}</h3>
                <div class="muted">{{ $cert['issuer'] ?? '' }} @if(! empty($cert['year'])) — {{ $cert['year'] }} @endif</div>
            </div>
        @endforeach
    @endif
</body>
</html>
