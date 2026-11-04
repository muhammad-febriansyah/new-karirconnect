Yth. Bapak/Ibu Tim Rekrutmen{{ $letter['company'] ? ' '.$letter['company'] : '' }},

Saya {{ $letter['name'] }}{{ $letter['current_role'] ? ', saat ini bekerja sebagai '.$letter['current_role'] : '' }}. Melalui email ini, saya bermaksud melamar posisi {{ $letter['job_title'] }}{{ $letter['company'] ? ' di '.$letter['company'] : '' }}.

@if ($letter['cover_letter'])
{{ $letter['cover_letter'] }}
@else
Saya yakin pengalaman dan keahlian yang saya miliki sesuai dengan kebutuhan posisi ini, dan saya ingin berkontribusi bagi tim Bapak/Ibu.
@endif

Sebagai bahan pertimbangan, saya lampirkan CV beserta ringkasan profil saya di bawah ini. Saya siap mengikuti proses seleksi berikutnya dan dapat dihubungi kapan saja melalui balasan email ini{{ $letter['phone'] ? ' atau telepon/WhatsApp di '.$letter['phone'] : '' }}.

Terima kasih atas waktu dan perhatian Bapak/Ibu.

Hormat saya,
{{ $letter['name'] }}
@if ($letter['headline'])
{{ $letter['headline'] }}
@endif
@if ($letter['phone'])
{{ $letter['phone'] }}
@endif
@if ($letter['email'])
{{ $letter['email'] }}
@endif
@foreach ($letter['links'] as $profileLink)
{{ $profileLink['label'] }}: {{ $profileLink['url'] }}
@endforeach
@if ($letter['facts'])

----------------------------------------
RINGKASAN PROFIL
@foreach ($letter['facts'] as $fact)
{{ $fact['label'] }}: {{ $fact['value'] }}
@endforeach
@endif
@if ($letter['experiences'])

PENGALAMAN KERJA
@foreach ($letter['experiences'] as $experience)
- {{ $experience['position'] }}{{ $experience['company'] ? ', '.$experience['company'] : '' }}{{ $experience['period'] ? ' ('.$experience['period'].')' : '' }}
@endforeach
@endif
@if ($letter['skills'])

KEAHLIAN
{{ implode(', ', $letter['skills']) }}
@endif
@if ($letter['cv_file'])

Lampiran: {{ $letter['cv_file'] }}
@endif
