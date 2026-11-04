Lamaran untuk posisi {{ $letter['job_title'] }}{{ $letter['company'] ? ' - '.$letter['company'] : '' }}

Yth. Tim Rekrutmen{{ $letter['company'] ? ' '.$letter['company'] : '' }},

Perkenalkan, saya {{ $letter['name'] }}. Melalui email ini saya ingin mengajukan lamaran untuk posisi {{ $letter['job_title'] }}. Ringkasan profil saya sebagai berikut.

{{ $letter['name'] }}
@if ($letter['headline'])
{{ $letter['headline'] }}
@endif
@foreach ($letter['summary'] as $row)
{{ $row['label'] }}: {{ $row['value'] }}
@endforeach
@if ($letter['experiences'])

PENGALAMAN KERJA
@foreach ($letter['experiences'] as $experience)
- {{ $experience['title'] }}{{ $experience['period'] ? ' ('.$experience['period'].')' : '' }}
@endforeach
@endif
@if ($letter['education'])

PENDIDIKAN TERAKHIR
{{ $letter['education'] }}
@endif
@if ($letter['skills'])

KEAHLIAN
{{ implode(', ', $letter['skills']) }}
@endif
@if ($letter['cover_letter'])

SURAT LAMARAN
{{ $letter['cover_letter'] }}
@endif
@if ($letter['cv_file'] || $letter['links'])

DOKUMEN & TAUTAN
@if ($letter['cv_file'])
- {{ $letter['cv_file'] }} (terlampir)
@endif
@foreach ($letter['links'] as $link)
- {{ $link['label'] }}: {{ $link['url'] }}
@endforeach
@endif

Besar harapan saya untuk dapat mengikuti tahap seleksi berikutnya. Saya dapat dihubungi melalui balasan email ini. Terima kasih atas waktu dan perhatian Bapak/Ibu.

Hormat saya,
{{ $letter['name'] }}
