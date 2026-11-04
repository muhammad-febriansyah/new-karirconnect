@php
    $paragraph = 'margin:0 0 16px;';
    $cellLabel = 'padding:2px 24px 2px 0;vertical-align:top;white-space:nowrap;';
    $cellValue = 'padding:2px 0;vertical-align:top;';
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lamaran {{ $letter['job_title'] }}</title>
</head>
<body style="margin:0;padding:16px;background:#ffffff;">
<div style="max-width:640px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222222;">

    <p style="{{ $paragraph }}">
        Kepada Yth.<br>
        Bapak/Ibu HRD{{ $letter['company'] ? ' '.$letter['company'] : '' }}<br>
        di tempat
    </p>

    <p style="{{ $paragraph }}">Dengan hormat,</p>

    <p style="{{ $paragraph }}">
        Bersama email ini, saya {{ $letter['name'] }} bermaksud mengajukan lamaran untuk posisi
        <b>{{ $letter['job_title'] }}</b>{{ $letter['company'] ? ' di '.$letter['company'] : '' }}.@if ($letter['current_role'])
        Saat ini saya bekerja sebagai {{ $letter['current_role'] }}.@endif
    </p>

    @if ($letter['cover_letter'])
        <p style="{{ $paragraph }}white-space:pre-line;">{{ $letter['cover_letter'] }}</p>
    @else
        <p style="{{ $paragraph }}">
            Saya tertarik dengan posisi tersebut dan berharap dapat berkontribusi bagi perusahaan Bapak/Ibu.
        </p>
    @endif

    <p style="{{ $paragraph }}">
        Sebagai bahan pertimbangan, saya lampirkan <i>curriculum vitae</i> (CV) saya pada email ini.
        @if ($letter['facts'])
            Berikut ringkasan data diri saya:
        @endif
    </p>

    @if ($letter['facts'])
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222222;">
            @foreach ($letter['facts'] as $fact)
                <tr>
                    <td style="{{ $cellLabel }}">{{ $fact['label'] }}</td>
                    <td style="padding:2px 8px 2px 0;vertical-align:top;">:</td>
                    <td style="{{ $cellValue }}">{{ $fact['value'] }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    @if ($letter['experiences'])
        <p style="margin:0 0 4px;">Riwayat pekerjaan:</p>
        <ul style="margin:0 0 16px;padding-left:20px;">
            @foreach ($letter['experiences'] as $experience)
                <li>{{ $experience['position'] }}{{ $experience['company'] ? ', '.$experience['company'] : '' }}{{ $experience['period'] ? ' ('.$experience['period'].')' : '' }}</li>
            @endforeach
        </ul>
    @endif

    @if ($letter['skills'])
        <p style="{{ $paragraph }}">Keahlian: {{ implode(', ', $letter['skills']) }}.</p>
    @endif

    <p style="{{ $paragraph }}">
        Besar harapan saya untuk dapat diberikan kesempatan wawancara agar dapat menjelaskan potensi diri saya
        secara lebih lanjut. Saya dapat dihubungi melalui balasan email ini{!! $letter['phone'] ? ' atau nomor <span style="white-space:nowrap;">'.e($letter['phone']).'</span>' : '' !!}.
    </p>

    <p style="{{ $paragraph }}">Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.</p>

    <p style="margin:0;">
        Hormat saya,<br><br>
        {{ $letter['name'] }}<br>
        @if ($letter['phone']){{ $letter['phone'] }}<br>@endif
        @if ($letter['email']){{ $letter['email'] }}<br>@endif
        @foreach ($letter['links'] as $profileLink)
            {{ $profileLink['label'] }}: <a href="{{ $profileLink['url'] }}" style="color:#1155cc;">{{ $profileLink['url'] }}</a><br>
        @endforeach
    </p>

</div>
</body>
</html>
