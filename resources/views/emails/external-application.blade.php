@php
    $label = 'padding:6px 16px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;';
    $value = 'padding:6px 0;color:#111827;font-size:14px;vertical-align:top;';
    $heading = 'margin:0 0 10px;font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;';
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lamaran {{ $letter['job_title'] }}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
        <td align="center" style="padding:24px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;">
                {{-- Header --}}
                <tr>
                    <td style="padding:24px 28px 20px;border-bottom:1px solid #e5e7eb;">
                        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Lamaran untuk posisi</p>
                        <p style="margin:0;font-size:20px;font-weight:bold;color:#111827;">{{ $letter['job_title'] }}</p>
                        @if ($letter['company'])
                            <p style="margin:4px 0 0;font-size:14px;color:#374151;">{{ $letter['company'] }}</p>
                        @endif
                    </td>
                </tr>

                {{-- Greeting --}}
                <tr>
                    <td style="padding:22px 28px 6px;font-size:14px;line-height:1.65;color:#1f2937;">
                        <p style="margin:0 0 12px;">Yth. Tim Rekrutmen{{ $letter['company'] ? ' '.$letter['company'] : '' }},</p>
                        <p style="margin:0;">
                            Perkenalkan, saya <strong>{{ $letter['name'] }}</strong>. Melalui email ini saya ingin mengajukan lamaran
                            untuk posisi <strong>{{ $letter['job_title'] }}</strong>. Ringkasan profil saya sebagai berikut.
                        </p>
                    </td>
                </tr>

                {{-- Candidate summary --}}
                <tr>
                    <td style="padding:18px 28px 4px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                            <tr>
                                <td style="padding:16px 18px;">
                                    <p style="margin:0;font-size:16px;font-weight:bold;color:#111827;">{{ $letter['name'] }}</p>
                                    @if ($letter['headline'])
                                        <p style="margin:2px 0 0;font-size:13px;color:#4b5563;">{{ $letter['headline'] }}</p>
                                    @endif
                                    @if ($letter['summary'])
                                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                                            @foreach ($letter['summary'] as $row)
                                                <tr>
                                                    <td style="{{ $label }}">{{ $row['label'] }}</td>
                                                    <td style="{{ $value }}">
                                                        @if ($row['label'] === 'Email')
                                                            <a href="mailto:{{ $row['value'] }}" style="color:#1d4ed8;text-decoration:none;">{{ $row['value'] }}</a>
                                                        @else
                                                            {{ $row['value'] }}
                                                        @endif
                                                    </td>
                                                </tr>
                                            @endforeach
                                        </table>
                                    @endif
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                {{-- Experience --}}
                @if ($letter['experiences'])
                    <tr>
                        <td style="padding:20px 28px 0;">
                            <p style="{{ $heading }}">Pengalaman kerja</p>
                            @foreach ($letter['experiences'] as $experience)
                                <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#111827;">
                                    <strong>{{ $experience['title'] }}</strong>
                                    @if ($experience['period'])
                                        <br><span style="font-size:13px;color:#6b7280;">{{ $experience['period'] }}</span>
                                    @endif
                                </p>
                            @endforeach
                        </td>
                    </tr>
                @endif

                {{-- Education --}}
                @if ($letter['education'])
                    <tr>
                        <td style="padding:16px 28px 0;">
                            <p style="{{ $heading }}">Pendidikan terakhir</p>
                            <p style="margin:0;font-size:14px;color:#111827;">{{ $letter['education'] }}</p>
                        </td>
                    </tr>
                @endif

                {{-- Skills --}}
                @if ($letter['skills'])
                    <tr>
                        <td style="padding:16px 28px 0;">
                            <p style="{{ $heading }}">Keahlian</p>
                            <p style="margin:0;line-height:2;">
                                @foreach ($letter['skills'] as $skill)
                                    <span style="display:inline-block;margin:0 4px 4px 0;padding:2px 10px;border:1px solid #d1d5db;border-radius:999px;font-size:12px;color:#374151;">{{ $skill }}</span>
                                @endforeach
                            </p>
                        </td>
                    </tr>
                @endif

                {{-- Cover letter --}}
                @if ($letter['cover_letter'])
                    <tr>
                        <td style="padding:20px 28px 0;">
                            <p style="{{ $heading }}">Surat lamaran</p>
                            <p style="margin:0;font-size:14px;line-height:1.7;color:#1f2937;white-space:pre-line;">{{ $letter['cover_letter'] }}</p>
                        </td>
                    </tr>
                @endif

                {{-- Attachment and links --}}
                @if ($letter['cv_file'] || $letter['links'])
                    <tr>
                        <td style="padding:20px 28px 0;">
                            <p style="{{ $heading }}">Dokumen &amp; tautan</p>
                            @if ($letter['cv_file'])
                                <p style="margin:0 0 6px;font-size:14px;color:#111827;">📎 {{ $letter['cv_file'] }} <span style="color:#6b7280;">(terlampir)</span></p>
                            @endif
                            @foreach ($letter['links'] as $link)
                                <p style="margin:0 0 6px;font-size:14px;">
                                    <a href="{{ $link['url'] }}" style="color:#1d4ed8;text-decoration:none;">{{ $link['label'] }}</a>
                                </p>
                            @endforeach
                        </td>
                    </tr>
                @endif

                {{-- Closing --}}
                <tr>
                    <td style="padding:24px 28px 28px;font-size:14px;line-height:1.65;color:#1f2937;">
                        <p style="margin:0 0 16px;">
                            Besar harapan saya untuk dapat mengikuti tahap seleksi berikutnya. Saya dapat dihubungi melalui
                            balasan email ini{{ collect($letter['summary'])->firstWhere('label', 'Telepon') ? ' atau nomor telepon di atas' : '' }}.
                            Terima kasih atas waktu dan perhatian Bapak/Ibu.
                        </p>
                        <p style="margin:0;">Hormat saya,<br><strong>{{ $letter['name'] }}</strong></p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
