Kepada Yth.
Bapak/Ibu HRD{{ $letter['company'] ? ' '.$letter['company'] : '' }}
di tempat

Dengan hormat,

Bersama email ini, saya {{ $letter['name'] }} bermaksud mengajukan lamaran untuk posisi {{ $letter['job_title'] }}{{ $letter['company'] ? ' di '.$letter['company'] : '' }}.{{ $letter['current_role'] ? ' Saat ini saya bekerja sebagai '.$letter['current_role'].'.' : '' }}

@if ($letter['cover_letter'])
{{ $letter['cover_letter'] }}
@else
Saya tertarik dengan posisi tersebut dan berharap dapat berkontribusi bagi perusahaan Bapak/Ibu.
@endif

Sebagai bahan pertimbangan, saya lampirkan curriculum vitae (CV) saya pada email ini.{{ $letter['facts'] ? ' Berikut ringkasan data diri saya:' : '' }}
@if ($letter['facts'])

@foreach ($letter['facts'] as $fact)
{{ $fact['label'] }}: {{ $fact['value'] }}
@endforeach
@endif
@if ($letter['experiences'])

Riwayat pekerjaan:
@foreach ($letter['experiences'] as $experience)
- {{ $experience['position'] }}{{ $experience['company'] ? ', '.$experience['company'] : '' }}{{ $experience['period'] ? ' ('.$experience['period'].')' : '' }}
@endforeach
@endif
@if ($letter['skills'])

Keahlian: {{ implode(', ', $letter['skills']) }}.
@endif

Besar harapan saya untuk dapat diberikan kesempatan wawancara agar dapat menjelaskan potensi diri saya secara lebih lanjut. Saya dapat dihubungi melalui balasan email ini{{ $letter['phone'] ? ' atau nomor '.$letter['phone'] : '' }}.

Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.

Hormat saya,

{{ $letter['name'] }}
@if ($letter['phone'])
{{ $letter['phone'] }}
@endif
@if ($letter['email'])
{{ $letter['email'] }}
@endif
@foreach ($letter['links'] as $profileLink)
{{ $profileLink['label'] }}: {{ $profileLink['url'] }}
@endforeach
