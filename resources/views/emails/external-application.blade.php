@php
    $job = $application->job;
    $user = $application->employeeProfile?->user;
    $profile = $application->employeeProfile;
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Lamaran {{ $job?->title }}</title>
</head>
<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;">
    <p>Yth. Tim Rekrutmen {{ $job?->company?->name }},</p>

    <p>Saya ingin melamar posisi <strong>{{ $job?->title }}</strong>. Berikut data diri saya:</p>

    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;">
        <tr><td style="padding:2px 16px 2px 0;color:#6b7280;">Nama</td><td>{{ $user?->name }}</td></tr>
        <tr><td style="padding:2px 16px 2px 0;color:#6b7280;">Email</td><td>{{ $user?->email }}</td></tr>
        @if ($user?->phone)
            <tr><td style="padding:2px 16px 2px 0;color:#6b7280;">Telepon</td><td>{{ $user->phone }}</td></tr>
        @endif
        @if ($profile?->headline)
            <tr><td style="padding:2px 16px 2px 0;color:#6b7280;">Profil singkat</td><td>{{ $profile->headline }}</td></tr>
        @endif
        @if ($application->expected_salary)
            <tr><td style="padding:2px 16px 2px 0;color:#6b7280;">Ekspektasi gaji</td><td>Rp {{ number_format($application->expected_salary, 0, ',', '.') }}</td></tr>
        @endif
    </table>

    @if ($coverLetter)
        <p style="white-space:pre-line;">{{ $coverLetter }}</p>
    @endif

    @if ($application->candidateCv?->file_path)
        <p>CV saya terlampir pada email ini.</p>
    @endif

    <p>Terima kasih atas waktu dan perhatiannya.</p>

    <p>Hormat saya,<br>{{ $user?->name }}</p>
</body>
</html>
