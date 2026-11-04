@php
    $job = $application->job;
    $user = $application->employeeProfile?->user;
    $profile = $application->employeeProfile;
@endphp
Yth. Tim Rekrutmen {{ $job?->company?->name }},

Saya ingin melamar posisi {{ $job?->title }}. Berikut data diri saya:

Nama: {{ $user?->name }}
Email: {{ $user?->email }}
@if ($user?->phone)
Telepon: {{ $user->phone }}
@endif
@if ($profile?->headline)
Profil singkat: {{ $profile->headline }}
@endif
@if ($application->expected_salary)
Ekspektasi gaji: Rp {{ number_format($application->expected_salary, 0, ',', '.') }}
@endif

@if ($coverLetter)
{{ $coverLetter }}

@endif
@if ($application->candidateCv?->file_path)
CV saya terlampir pada email ini.

@endif
Terima kasih atas waktu dan perhatiannya.

Hormat saya,
{{ $user?->name }}
