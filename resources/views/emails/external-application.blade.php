@php
    $text = 'margin:0 0 14px;font-size:15px;line-height:1.7;color:#1f2937;';
    $heading = 'margin:0 0 12px;font-size:11px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:#64748b;';
    $muted = 'color:#64748b;';
    $link = 'color:#1d4ed8;text-decoration:none;';
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>Lamaran {{ $letter['job_title'] }}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
{{-- Inbox preview line --}}
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Lamaran {{ $letter['job_title'] }} dari {{ $letter['name'] }}{{ $letter['current_role'] ? ', '.$letter['current_role'] : '' }}. CV terlampir.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr>
        <td align="center" style="padding:32px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">

                {{-- Letter --}}
                <tr>
                    <td style="padding:36px 40px 8px;">
                        <p style="{{ $text }}">Yth. Bapak/Ibu Tim Rekrutmen{{ $letter['company'] ? ' '.$letter['company'] : '' }},</p>

                        <p style="{{ $text }}">
                            Saya <strong>{{ $letter['name'] }}</strong>@if ($letter['current_role']), saat ini bekerja sebagai {{ $letter['current_role'] }}@endif.
                            Melalui email ini, saya bermaksud melamar posisi <strong>{{ $letter['job_title'] }}</strong>@if ($letter['company']) di {{ $letter['company'] }}@endif.
                        </p>

                        @if ($letter['cover_letter'])
                            <p style="{{ $text }}white-space:pre-line;">{{ $letter['cover_letter'] }}</p>
                        @else
                            <p style="{{ $text }}">
                                Saya yakin pengalaman dan keahlian yang saya miliki sesuai dengan kebutuhan posisi ini,
                                dan saya ingin berkontribusi bagi tim Bapak/Ibu.
                            </p>
                        @endif

                        <p style="{{ $text }}">
                            Sebagai bahan pertimbangan, saya lampirkan CV beserta ringkasan profil saya di bawah ini.
                            Saya siap mengikuti proses seleksi berikutnya dan dapat dihubungi kapan saja melalui balasan email ini{{ $letter['phone'] ? ' atau telepon/WhatsApp di '.$letter['phone'] : '' }}.
                        </p>

                        <p style="{{ $text }}margin-bottom:0;">Terima kasih atas waktu dan perhatian Bapak/Ibu.</p>
                    </td>
                </tr>

                {{-- Signature --}}
                <tr>
                    <td style="padding:24px 40px 32px;">
                        <p style="margin:0 0 2px;font-size:15px;color:#1f2937;">Hormat saya,</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;border-left:3px solid #2563eb;">
                            <tr>
                                <td style="padding:2px 0 2px 14px;">
                                    <p style="margin:0;font-size:16px;font-weight:bold;color:#0f172a;">{{ $letter['name'] }}</p>
                                    @if ($letter['headline'])
                                        <p style="margin:2px 0 0;font-size:13px;{{ $muted }}">{{ $letter['headline'] }}</p>
                                    @endif
                                    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#334155;">
                                        @if ($letter['phone']){{ $letter['phone'] }}<br>@endif
                                        @if ($letter['email'])<a href="mailto:{{ $letter['email'] }}" style="{{ $link }}">{{ $letter['email'] }}</a>@endif
                                        @foreach ($letter['links'] as $profileLink)
                                            &nbsp;·&nbsp;<a href="{{ $profileLink['url'] }}" style="{{ $link }}">{{ $profileLink['label'] }}</a>
                                        @endforeach
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                {{-- Profile summary --}}
                @if ($letter['facts'] || $letter['experiences'] || $letter['skills'])
                    <tr>
                        <td style="padding:0 40px;">
                            <div style="border-top:1px solid #e2e8f0;"></div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 40px 8px;">
                            <p style="{{ $heading }}">Ringkasan profil</p>

                            @if ($letter['facts'])
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                                    @foreach ($letter['facts'] as $fact)
                                        <tr>
                                            <td style="padding:10px 16px;width:130px;font-size:13px;{{ $muted }}vertical-align:top;{{ $loop->last ? '' : 'border-bottom:1px solid #e2e8f0;' }}">{{ $fact['label'] }}</td>
                                            <td style="padding:10px 16px;font-size:14px;color:#0f172a;vertical-align:top;{{ $loop->last ? '' : 'border-bottom:1px solid #e2e8f0;' }}">{{ $fact['value'] }}</td>
                                        </tr>
                                    @endforeach
                                </table>
                            @endif
                        </td>
                    </tr>

                    @if ($letter['experiences'])
                        <tr>
                            <td style="padding:20px 40px 0;">
                                <p style="{{ $heading }}">Pengalaman kerja</p>
                                @foreach ($letter['experiences'] as $experience)
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                                        <tr>
                                            <td style="width:14px;vertical-align:top;padding-top:6px;">
                                                <div style="width:8px;height:8px;border-radius:50%;background:{{ $loop->first ? '#2563eb' : '#cbd5e1' }};"></div>
                                            </td>
                                            <td style="vertical-align:top;">
                                                <p style="margin:0;font-size:14px;font-weight:bold;color:#0f172a;">{{ $experience['position'] }}</p>
                                                <p style="margin:1px 0 0;font-size:13px;color:#334155;">
                                                    {{ $experience['company'] }}@if ($experience['company'] && $experience['period']) &nbsp;·&nbsp; @endif<span style="{{ $muted }}">{{ $experience['period'] }}</span>
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                @endforeach
                            </td>
                        </tr>
                    @endif

                    @if ($letter['skills'])
                        <tr>
                            <td style="padding:12px 40px 0;">
                                <p style="{{ $heading }}">Keahlian</p>
                                <p style="margin:0;line-height:2.1;">
                                    @foreach ($letter['skills'] as $skill)
                                        <span style="display:inline-block;margin:0 4px 6px 0;padding:3px 12px;background:#eff6ff;border:1px solid #dbeafe;border-radius:999px;font-size:12px;color:#1e40af;">{{ $skill }}</span>
                                    @endforeach
                                </p>
                            </td>
                        </tr>
                    @endif
                @endif

                {{-- Attachment --}}
                @if ($letter['cv_file'])
                    <tr>
                        <td style="padding:20px 40px 36px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #cbd5e1;border-radius:10px;">
                                <tr>
                                    <td style="padding:14px 16px;font-size:13px;color:#334155;">
                                        <strong style="color:#0f172a;">Lampiran:</strong> {{ $letter['cv_file'] }}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                @else
                    <tr><td style="padding:0 0 28px;"></td></tr>
                @endif
            </table>
        </td>
    </tr>
</table>
</body>
</html>
