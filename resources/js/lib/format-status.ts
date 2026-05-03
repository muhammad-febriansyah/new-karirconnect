/**
 * Maps backend enum values (snake_case) to Indonesian display labels.
 * Use formatStatus() anywhere a raw enum value would otherwise leak to the
 * UI as e.g. "in_progress", "awaiting_payment", "full_time".
 *
 * Unknown values fall back to a humanised version of the input so a missing
 * mapping degrades gracefully rather than rendering an empty string.
 */

const STATUS_LABELS: Record<string, string> = {
    // ApplicationStatus
    submitted: 'Dikirim',
    reviewed: 'Ditinjau',
    shortlisted: 'Shortlist',
    interview: 'Interview',
    offered: 'Ditawarkan',
    hired: 'Diterima',
    rejected: 'Ditolak',
    withdrawn: 'Ditarik',

    // AiInterviewStatus / InterviewStatus
    pending: 'Menunggu',
    invited: 'Diundang',
    in_progress: 'Sedang Berjalan',
    completed: 'Selesai',
    expired: 'Kedaluwarsa',
    cancelled: 'Dibatalkan',
    scheduled: 'Terjadwal',
    rescheduled: 'Dijadwalkan Ulang',
    ongoing: 'Berlangsung',
    no_show: 'Tidak Hadir',

    // JobStatus
    draft: 'Draf',
    published: 'Tayang',
    closed: 'Ditutup',
    archived: 'Diarsipkan',

    // EmploymentType
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Kontrak',
    internship: 'Magang',
    freelance: 'Freelance',

    // WorkArrangement
    onsite: 'Onsite',
    remote: 'Remote',
    hybrid: 'Hybrid',

    // ExperienceLevel
    entry: 'Entry',
    junior: 'Junior',
    mid: 'Mid',
    senior: 'Senior',
    lead: 'Lead',
    executive: 'Eksekutif',

    // Assessment / question types / difficulty
    multiple_choice: 'Pilihan Ganda',
    text: 'Teks',
    code: 'Kode',
    easy: 'Mudah',
    medium: 'Menengah',
    hard: 'Sulit',

    // CompanyStatus
    approved: 'Disetujui',
    suspended: 'Disuspensi',

    // OrderStatus
    awaiting_payment: 'Menunggu Pembayaran',
    paid: 'Dibayar',
    failed: 'Gagal',
    refunded: 'Dikembalikan',

    // PaymentStatus
    success: 'Berhasil',

    // SubscriptionStatus
    active: 'Aktif',

    // ReviewStatus
    // (approved/pending/rejected covered above)

    // InterviewStage
    screening: 'Screening',
    hr: 'HR',
    user: 'User',
    technical: 'Teknis',
    final: 'Final',

    // InterviewMode
    ai: 'AI',
    online: 'Online',
    // onsite already mapped

    // AI features / modules
    ai_interview: 'AI Interview',
    career_coach: 'Career Coach',
    coach: 'Career Coach',
    ai_interview_pack: 'Paket AI Interview',
    job_boost: 'Job Boost',
    subscription_plan: 'Paket Langganan',
    og_image: 'OG Image',

    // CompanyVerificationStatus
    unverified: 'Belum Verifikasi',
    verified: 'Terverifikasi',

    // Frequencies (job alerts)
    daily: 'Harian',
    weekly: 'Mingguan',
    instant: 'Instan',

    // Recommendations
    strong_yes: 'Sangat Direkomendasikan',
    yes: 'Direkomendasikan',
    maybe: 'Mungkin',
    no: 'Tidak',
    strong_no: 'Sangat Tidak Direkomendasikan',

    // Generic statuses
    sent: 'Terkirim',
    read: 'Dibaca',
    replied: 'Dibalas',
    new: 'Baru',
    spam: 'Spam',
    current: 'Saat Ini',
    former: 'Sebelumnya',
    companyreview: 'Review Perusahaan',
    salarysubmission: 'Laporan Gaji',
    skillassessment: 'Skill Assessment',
    contactmessage: 'Pesan Kontak',
};

export function formatStatus(value: string | null | undefined): string {
    if (!value) {
        return '-';
    }

    return STATUS_LABELS[value] ?? humanize(value);
}

function humanize(v: string): string {
    const ACRONYMS: Record<string, string> = {
        ai: 'AI',
        seo: 'SEO',
        og: 'OG',
        smtp: 'SMTP',
        hr: 'HR',
        faq: 'FAQ',
        cv: 'CV',
        idr: 'IDR',
        api: 'API',
    };

    return v
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => {
            const normalized = word.toLowerCase();

            return ACRONYMS[normalized] ?? normalized.charAt(0).toUpperCase() + normalized.slice(1);
        })
        .join(' ');
}
