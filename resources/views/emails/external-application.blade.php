@php
    $job = $application->job;
    $user = $application->employeeProfile?->user;
    $profile = $application->employeeProfile;
@endphp
<x-mail::message>
# Lamaran baru untuk {{ $job?->title }}

Kandidat berikut melamar lowongan **{{ $job?->title }}** di {{ $job?->company?->name }} melalui KarirConnect.
Lowongan ini kami tampilkan dari halaman karier Anda, dan kandidat sudah setuju lamarannya diteruskan ke alamat ini.

**Nama:** {{ $user?->name }}  
**Email:** {{ $user?->email }}  
@if ($user?->phone)
**Telepon:** {{ $user->phone }}  
@endif
@if ($profile?->headline)
**Headline:** {{ $profile->headline }}  
@endif
@if ($application->expected_salary)
**Ekspektasi gaji:** Rp {{ number_format($application->expected_salary, 0, ',', '.') }}  
@endif

@if ($application->cover_letter)
**Surat lamaran**

{{ trim(html_entity_decode(strip_tags(preg_replace('#<(br|/p|/li|/h[1-6])[^>]*>#i', "\n", $application->cover_letter)), ENT_QUOTES | ENT_HTML5)) }}
@endif

@if ($application->candidateCv?->file_path)
CV kandidat terlampir.
@endif

Balas email ini untuk menghubungi kandidat secara langsung.

<x-mail::subcopy>
Anda menerima email ini karena alamat ini terdaftar sebagai email rekrutmen {{ $job?->company?->name }} di KarirConnect. Jika ini keliru, balas email ini dan kami akan berhenti meneruskan lamaran.
</x-mail::subcopy>
</x-mail::message>
