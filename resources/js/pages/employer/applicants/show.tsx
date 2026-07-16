import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Award,
    Briefcase,
    Building2,
    Calendar,
    CalendarPlus,
    Check,
    CheckCircle2,
    Clock,
    Download,
    ExternalLink,
    Github,
    GraduationCap,
    Linkedin,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Sparkles,
    User as UserIcon,
    Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { TextareaField } from '@/components/form/textarea-field';
import { MatchScoreBadge } from '@/components/shared/match-score-badge';
import { SafeHtml } from '@/components/shared/safe-html';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useInitials } from '@/hooks/use-initials';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';
import { status as applicantStatusRoute } from '@/routes/employer/applicants';

type Option = { value: string; label: string };

type StatusLog = {
    id: number;
    from_status: string | null;
    to_status: string | null;
    changed_at: string | null;
    changed_by: { id: number; name: string } | null;
    note: string | null;
};

type MatchBreakdown = {
    skills: number;
    experience: number;
    location: number;
    salary: number;
};

type WorkExperience = {
    id: number;
    company_name: string | null;
    position: string | null;
    employment_type: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    description: string | null;
};

type Education = {
    id: number;
    level: string | null;
    institution: string | null;
    major: string | null;
    gpa: number | null;
    start_year: number | null;
    end_year: number | null;
    description: string | null;
};

type Candidate = {
    id: number | null;
    user_id: number | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    city: string | null;
    headline: string | null;
    about: string | null;
    current_position: string | null;
    experience_level: string | null;
    is_open_to_work: boolean;
    profile_completion: number | null;
    expected_salary_min: number | null;
    expected_salary_max: number | null;
    portfolio_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    skills: string[];
    work_experiences: WorkExperience[];
    educations: Education[];
};

type Application = {
    id: number;
    status: string | null;
    ai_match_score: number | null;
    match_breakdown: MatchBreakdown | null;
    expected_salary: number | null;
    cover_letter: string | null;
    applied_at: string | null;
    reviewed_at: string | null;
    job: {
        id: number;
        title: string;
        slug: string;
        city: string | null;
        employment_type: string | null;
        work_arrangement: string | null;
        salary_min: number | null;
        salary_max: number | null;
    };
    candidate: Candidate;
    cv: { id: number; label: string; url: string } | null;
    screening_answers: Array<{
        id: number;
        question: string | null;
        type: string | null;
        answer: unknown;
    }>;
    status_logs: StatusLog[];
};

type Props = {
    application: Application;
    statusOptions: Option[];
};

const PIPELINE: Array<{ key: string; label: string }> = [
    { key: 'submitted', label: 'Dikirim' },
    { key: 'reviewed', label: 'Ditinjau' },
    { key: 'shortlisted', label: 'Shortlist' },
    { key: 'interview', label: 'Interview' },
    { key: 'offered', label: 'Tawaran' },
    { key: 'hired', label: 'Diterima' },
];

const idr = (v: number | null) =>
    v == null
        ? null
        : new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0,
          }).format(v);
const rupiahLike = /gaji|salary|rupiah|idr|\brp\b/i;

const normalizeAnswer = (answer: unknown): string => {
    if (typeof answer === 'object' && answer !== null) {
        return String(
            (answer as Record<string, unknown>).value ?? JSON.stringify(answer),
        );
    }

    return String(answer ?? '-');
};

const formatScreeningAnswer = (
    question: string | null,
    answer: unknown,
): string => {
    const normalized = normalizeAnswer(answer);

    if (rupiahLike.test(question ?? '')) {
        const digitsOnly = normalized.replace(/[^\d]/g, '');

        if (digitsOnly.length > 0) {
            const numeric = Number(digitsOnly);

            if (Number.isFinite(numeric)) {
                return idr(numeric) ?? normalized;
            }
        }
    }

    return normalized;
};

const salaryRange = (min: number | null, max: number | null) => {
    if (!min && !max) {
        return null;
    }

    if (min && max) {
        return `${idr(min)} – ${idr(max)}`;
    }

    return idr(min ?? max);
};

const toWhatsAppPhone = (raw: string | null): string | null => {
    if (!raw) {
        return null;
    }

    let phone = raw.replace(/[^\d]/g, '');

    if (phone.startsWith('0')) {
        phone = `62${phone.slice(1)}`;
    }

    return phone.length >= 9 ? phone : null;
};

const buildWhatsAppMessage = ({
    candidateName,
    jobTitle,
    jobCity,
    employmentType,
    workArrangement,
    expectedSalary,
    applicationId,
    stage,
}: {
    candidateName: string | null;
    jobTitle: string;
    jobCity: string | null;
    employmentType: string | null;
    workArrangement: string | null;
    expectedSalary: string | null;
    applicationId: number;
    stage: string;
}) =>
    [
        `Halo ${candidateName ?? 'Kandidat'},`,
        '',
        'Perkenalkan, saya dari tim rekrutmen yang menangani proses seleksi melalui KarirConnect.',
        '',
        `Kami menghubungi Anda terkait lamaran untuk posisi "${jobTitle}". Saat ini lamaran Anda berada pada tahap ${stage}. Kami tertarik untuk berdiskusi lebih lanjut mengenai profil, pengalaman, ketersediaan waktu, dan proses seleksi berikutnya.`,
        '',
        'Ringkasan lamaran:',
        `- Kandidat: ${candidateName ?? '-'}`,
        `- Posisi: ${jobTitle}`,
        `- Lokasi lowongan: ${jobCity ?? '-'}`,
        `- Tipe kerja: ${[employmentType ? formatStatus(employmentType) : null, workArrangement ? formatStatus(workArrangement) : null].filter(Boolean).join(' · ') || '-'}`,
        `- Ekspektasi gaji: ${expectedSalary ?? '-'}`,
        `- ID Lamaran: #${applicationId}`,
        '',
        'Apakah Anda bersedia melanjutkan komunikasi melalui WhatsApp ini? Jika berkenan, mohon informasikan waktu yang paling nyaman untuk kami hubungi atau jadwalkan diskusi/interview.',
        '',
        'Terima kasih atas waktu dan perhatian Anda.',
    ].join('\n');

const formatPeriod = (
    start: string | null,
    end: string | null,
    isCurrent = false,
) => {
    if (!start && !end) {
        return null;
    }

    const fmt = (iso: string | null) =>
        iso
            ? new Date(iso).toLocaleDateString('id-ID', {
                  month: 'short',
                  year: 'numeric',
              })
            : null;
    const startLabel = fmt(start) ?? '?';
    const endLabel = isCurrent ? 'Sekarang' : (fmt(end) ?? '?');

    return `${startLabel} – ${endLabel}`;
};

const yearsBetween = (
    start: string | null,
    end: string | null,
    isCurrent = false,
): string | null => {
    if (!start) {
        return null;
    }

    const startMs = new Date(start).getTime();
    const endMs = isCurrent || !end ? Date.now() : new Date(end).getTime();
    const months = Math.max(
        0,
        Math.round((endMs - startMs) / (1000 * 60 * 60 * 24 * 30.44)),
    );

    if (months < 1) {
        return null;
    }

    if (months < 12) {
        return `${months} bln`;
    }

    const years = Math.floor(months / 12);
    const rem = months % 12;

    return rem === 0 ? `${years} thn` : `${years} thn ${rem} bln`;
};

type TabKey =
    | 'profil'
    | 'pengalaman'
    | 'pendidikan'
    | 'cover'
    | 'screening'
    | 'riwayat';

export default function ApplicantShow({ application, statusOptions }: Props) {
    const getInitials = useInitials();
    const candidate = application.candidate;
    const [tab, setTab] = useState<TabKey>('profil');

    const form = useForm({
        status: application.status ?? 'reviewed',
        note: '',
    });

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post(applicantStatusRoute(application.id).url, {
            preserveScroll: true,
            onSuccess: () => form.reset('note'),
        });
    };

    const expectedSalary = salaryRange(
        candidate.expected_salary_min,
        candidate.expected_salary_max,
    );
    const jobSalary = salaryRange(
        application.job.salary_min,
        application.job.salary_max,
    );
    const currentStepIndex = PIPELINE.findIndex(
        (p) => p.key === application.status,
    );
    const isRejected =
        application.status === 'rejected' || application.status === 'withdrawn';
    const whatsappPhone = toWhatsAppPhone(candidate.phone);
    const whatsappUrl = whatsappPhone
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
              buildWhatsAppMessage({
                  candidateName: candidate.name,
                  jobTitle: application.job.title,
                  jobCity: application.job.city,
                  employmentType: application.job.employment_type,
                  workArrangement: application.job.work_arrangement,
                  expectedSalary,
                  applicationId: application.id,
                  stage: formatStatus(application.status ?? 'submitted'),
              }),
          )}`
        : null;

    const tabs: Array<{
        key: TabKey;
        label: string;
        icon: typeof UserIcon;
        count?: number;
    }> = [
        { key: 'profil', label: 'Profil', icon: UserIcon },
        {
            key: 'pengalaman',
            label: 'Pengalaman',
            icon: Briefcase,
            count: candidate.work_experiences.length,
        },
        {
            key: 'pendidikan',
            label: 'Pendidikan',
            icon: GraduationCap,
            count: candidate.educations.length,
        },
        ...(application.cover_letter
            ? [
                  {
                      key: 'cover' as TabKey,
                      label: 'Cover Letter',
                      icon: MessageSquare,
                  },
              ]
            : []),
        ...(application.screening_answers.length > 0
            ? [
                  {
                      key: 'screening' as TabKey,
                      label: 'Screening',
                      icon: CheckCircle2,
                      count: application.screening_answers.length,
                  },
              ]
            : []),
        {
            key: 'riwayat',
            label: 'Riwayat',
            icon: Clock,
            count: application.status_logs.length,
        },
    ];

    return (
        <>
            <Head title={candidate.name ?? 'Pelamar'} />

            <div className="space-y-5 p-3 sm:p-5 lg:p-6">
                {/* ===== Hero card ===== */}
                <Card className="relative overflow-hidden border-brand-blue/15">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-brand-blue/10 via-brand-cyan/10 to-transparent"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-brand-cyan/15 blur-3xl"
                    />
                    <CardContent className="relative space-y-4 p-4 sm:p-5 lg:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                            <div className="relative shrink-0">
                                <Avatar className="size-16 ring-4 ring-background sm:size-20 lg:size-24">
                                    <AvatarImage
                                        src={candidate.avatar_url ?? undefined}
                                        alt={candidate.name ?? ''}
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-brand-blue to-brand-cyan text-base font-bold text-white sm:text-xl">
                                        {getInitials(candidate.name ?? '?')}
                                    </AvatarFallback>
                                </Avatar>
                                {candidate.is_open_to_work && (
                                    <span
                                        title="Open to work"
                                        className="absolute right-0 -bottom-0.5 inline-flex size-5 items-center justify-center rounded-full border-2 border-background bg-emerald-500 text-white sm:size-6"
                                    >
                                        <Check className="size-3 sm:size-3.5" />
                                    </span>
                                )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-3">
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl lg:text-3xl">
                                        {candidate.name ?? 'Pelamar'}
                                    </h1>
                                    {(candidate.headline ||
                                        candidate.current_position) && (
                                        <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                                            {candidate.headline ??
                                                candidate.current_position}
                                        </p>
                                    )}
                                </div>

                                {/* Meta row */}
                                <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                                    <span className="inline-flex min-w-0 items-center gap-1.5">
                                        <Briefcase className="size-3.5 shrink-0 text-brand-blue" />
                                        <span className="line-clamp-1">
                                            Lamar{' '}
                                            <strong className="text-brand-navy">
                                                {application.job.title}
                                            </strong>
                                        </span>
                                    </span>
                                    {candidate.city && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin className="size-3.5 shrink-0 text-brand-blue" />
                                            {candidate.city}
                                        </span>
                                    )}
                                    {candidate.experience_level && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Award className="size-3.5 shrink-0 text-brand-blue" />
                                            {formatStatus(
                                                candidate.experience_level,
                                            )}
                                        </span>
                                    )}
                                    {expectedSalary && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Sparkles className="size-3.5 shrink-0 text-brand-blue" />
                                            <span className="line-clamp-1">
                                                Ekspektasi {expectedSalary}
                                            </span>
                                        </span>
                                    )}
                                </div>

                                {/* Action toolbar — primary CV button + icon-only contact cluster */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {application.cv && (
                                        <Button
                                            asChild
                                            size="sm"
                                            className="h-9 rounded-lg bg-gradient-to-r from-brand-blue to-brand-cyan text-white shadow-xs hover:brightness-105"
                                        >
                                            <a
                                                href={application.cv.url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Download className="size-4" />{' '}
                                                Unduh CV
                                            </a>
                                        </Button>
                                    )}
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="h-9 rounded-lg"
                                    >
                                        <Link
                                            href={`/jobs/${application.job.slug}`}
                                        >
                                            <ExternalLink className="size-3.5" />
                                            <span className="hidden sm:inline">
                                                Lihat Lowongan
                                            </span>
                                        </Link>
                                    </Button>

                                    {/* Icon-only contact cluster, pushed right on wide screens */}
                                    <div className="ml-auto flex items-center gap-1.5">
                                        {candidate.email && (
                                            <IconLink
                                                href={`mailto:${candidate.email}`}
                                                label={candidate.email}
                                                icon={Mail}
                                            />
                                        )}
                                        {whatsappUrl && (
                                            <IconLink
                                                href={whatsappUrl}
                                                label={`Hubungi ${candidate.name ?? 'kandidat'} via WhatsApp`}
                                                icon={Phone}
                                                external
                                            />
                                        )}
                                        {candidate.linkedin_url && (
                                            <IconLink
                                                href={candidate.linkedin_url}
                                                label="LinkedIn"
                                                icon={Linkedin}
                                                external
                                            />
                                        )}
                                        {candidate.github_url && (
                                            <IconLink
                                                href={candidate.github_url}
                                                label="GitHub"
                                                icon={Github}
                                                external
                                            />
                                        )}
                                        {candidate.portfolio_url && (
                                            <IconLink
                                                href={candidate.portfolio_url}
                                                label="Portfolio"
                                                icon={ExternalLink}
                                                external
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pipeline — scrollable on mobile, grid from sm */}
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 sm:p-3.5">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[11px] font-bold tracking-wider text-brand-navy uppercase">
                                    Tahap Rekrutmen
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    {isRejected
                                        ? 'Ditolak/Mundur'
                                        : `${Math.max(0, currentStepIndex + 1)} dari ${PIPELINE.length}`}
                                </span>
                            </div>
                            <ol className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
                                {PIPELINE.map((step, idx) => {
                                    const passed =
                                        !isRejected && currentStepIndex >= idx;
                                    const current =
                                        !isRejected && currentStepIndex === idx;

                                    return (
                                        <li
                                            key={step.key}
                                            className={cn(
                                                'relative flex min-w-[88px] shrink-0 snap-start flex-col items-center gap-1 rounded-lg border p-2 text-center text-[10px] sm:min-w-0 sm:text-[11px]',
                                                current &&
                                                    'border-brand-blue/40 bg-gradient-to-br from-brand-blue/8 to-brand-cyan/8 shadow-xs ring-1 ring-brand-blue/20',
                                                passed &&
                                                    !current &&
                                                    'border-brand-blue/20 bg-brand-blue/5',
                                                !passed &&
                                                    'border-border/60 bg-background',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-6 items-center justify-center rounded-full text-[10px] font-bold',
                                                    passed
                                                        ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-xs'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {passed ? (
                                                    <Check className="size-3" />
                                                ) : (
                                                    idx + 1
                                                )}
                                            </span>
                                            <span
                                                className={cn(
                                                    'leading-tight font-semibold',
                                                    current
                                                        ? 'text-brand-blue'
                                                        : passed
                                                          ? 'text-brand-navy'
                                                          : 'text-muted-foreground',
                                                )}
                                            >
                                                {step.label}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== Body grid ===== */}
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="min-w-0 space-y-5">
                        {/* Tabs — horizontal scroll on mobile to prevent crowding */}
                        <div
                            role="tablist"
                            className="-mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-border/60 bg-muted/30 p-1.5 px-1 sm:mx-0 sm:flex-wrap sm:px-1.5"
                        >
                            {tabs.map((t) => {
                                const active = t.key === tab;

                                return (
                                    <button
                                        key={t.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setTab(t.key)}
                                        className={cn(
                                            'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all sm:gap-2 sm:px-3',
                                            active
                                                ? 'bg-gradient-to-r from-brand-blue to-brand-cyan text-white shadow-xs'
                                                : 'text-muted-foreground hover:bg-background hover:text-brand-navy',
                                        )}
                                    >
                                        <t.icon className="size-4 shrink-0" />
                                        <span className="whitespace-nowrap">
                                            {t.label}
                                        </span>
                                        {typeof t.count === 'number' &&
                                            t.count > 0 && (
                                                <span
                                                    className={cn(
                                                        'rounded px-1.5 text-[10px] font-bold',
                                                        active
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-brand-blue/10 text-brand-blue',
                                                    )}
                                                >
                                                    {t.count}
                                                </span>
                                            )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Profil tab */}
                        {tab === 'profil' && (
                            <div className="space-y-4">
                                {candidate.about ? (
                                    <Card>
                                        <CardContent className="p-5">
                                            <h3 className="mb-2 text-xs font-bold tracking-wider text-brand-blue uppercase">
                                                Tentang Kandidat
                                            </h3>
                                            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                                                {candidate.about}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <EmptyHint
                                        icon={UserIcon}
                                        message="Kandidat belum mengisi ringkasan."
                                    />
                                )}

                                {candidate.skills.length > 0 && (
                                    <Card>
                                        <CardContent className="space-y-3 p-5">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-bold tracking-wider text-brand-blue uppercase">
                                                    Keahlian
                                                </h3>
                                                <span className="text-xs text-muted-foreground">
                                                    {candidate.skills.length}{' '}
                                                    skill
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {candidate.skills.map((s) => (
                                                    <Badge
                                                        key={s}
                                                        className="border-brand-blue/15 bg-brand-blue/8 font-medium text-brand-blue hover:bg-brand-blue/12"
                                                        variant="outline"
                                                    >
                                                        {s}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Pengalaman tab */}
                        {tab === 'pengalaman' && (
                            <Card>
                                <CardContent className="p-5">
                                    {candidate.work_experiences.length === 0 ? (
                                        <EmptyHint
                                            icon={Briefcase}
                                            message="Belum ada riwayat pengalaman kerja."
                                            bare
                                        />
                                    ) : (
                                        <ol className="relative ml-3 space-y-5 border-l-2 border-brand-blue/15 pl-6">
                                            {candidate.work_experiences.map(
                                                (exp) => (
                                                    <li
                                                        key={exp.id}
                                                        className="relative"
                                                    >
                                                        <span className="absolute top-1 -left-[34px] flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-xs ring-2 ring-background">
                                                            <Building2 className="size-3" />
                                                        </span>
                                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                            <div>
                                                                <h4 className="text-sm font-bold text-brand-navy">
                                                                    {exp.position ??
                                                                        '—'}
                                                                </h4>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {
                                                                        exp.company_name
                                                                    }
                                                                    {exp.employment_type && (
                                                                        <span className="ml-1.5 text-xs">
                                                                            ·{' '}
                                                                            {formatStatus(
                                                                                exp.employment_type,
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col items-end text-right">
                                                                <span className="text-xs font-medium text-brand-navy">
                                                                    {formatPeriod(
                                                                        exp.start_date,
                                                                        exp.end_date,
                                                                        exp.is_current,
                                                                    )}
                                                                </span>
                                                                {yearsBetween(
                                                                    exp.start_date,
                                                                    exp.end_date,
                                                                    exp.is_current,
                                                                ) && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {yearsBetween(
                                                                            exp.start_date,
                                                                            exp.end_date,
                                                                            exp.is_current,
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {exp.description && (
                                                            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                                                                {
                                                                    exp.description
                                                                }
                                                            </p>
                                                        )}
                                                    </li>
                                                ),
                                            )}
                                        </ol>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Pendidikan tab */}
                        {tab === 'pendidikan' && (
                            <Card>
                                <CardContent className="p-5">
                                    {candidate.educations.length === 0 ? (
                                        <EmptyHint
                                            icon={GraduationCap}
                                            message="Belum ada riwayat pendidikan."
                                            bare
                                        />
                                    ) : (
                                        <ol className="relative ml-3 space-y-5 border-l-2 border-brand-blue/15 pl-6">
                                            {candidate.educations.map((edu) => (
                                                <li
                                                    key={edu.id}
                                                    className="relative"
                                                >
                                                    <span className="absolute top-1 -left-[34px] flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-xs ring-2 ring-background">
                                                        <GraduationCap className="size-3" />
                                                    </span>
                                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                        <div>
                                                            <h4 className="text-sm font-bold text-brand-navy">
                                                                {edu.institution ??
                                                                    '—'}
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {[
                                                                    edu.level,
                                                                    edu.major,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' · ',
                                                                    )}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-medium text-brand-navy">
                                                            {[
                                                                edu.start_year,
                                                                edu.end_year ??
                                                                    'Sekarang',
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' – ')}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                                        {edu.gpa != null && (
                                                            <span>
                                                                IPK{' '}
                                                                <strong className="text-brand-navy">
                                                                    {edu.gpa}
                                                                </strong>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {edu.description && (
                                                        <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                                                            {edu.description}
                                                        </p>
                                                    )}
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Cover Letter tab */}
                        {tab === 'cover' && application.cover_letter && (
                            <Card>
                                <CardContent className="p-5">
                                    <h3 className="mb-2 text-xs font-bold tracking-wider text-brand-blue uppercase">
                                        Cover Letter
                                    </h3>
                                    <SafeHtml
                                        html={application.cover_letter}
                                        className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground/90 prose-headings:text-foreground prose-a:text-brand-blue prose-strong:text-foreground"
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Screening tab */}
                        {tab === 'screening' &&
                            application.screening_answers.length > 0 && (
                                <Card>
                                    <CardContent className="p-5">
                                        <h3 className="mb-3 text-xs font-bold tracking-wider text-brand-blue uppercase">
                                            Jawaban Screening
                                        </h3>
                                        <ul className="divide-y divide-border/60">
                                            {application.screening_answers.map(
                                                (a, idx) => (
                                                    <li
                                                        key={a.id}
                                                        className="space-y-1 py-3 first:pt-0 last:pb-0"
                                                    >
                                                        <div className="text-xs text-muted-foreground">
                                                            Pertanyaan {idx + 1}
                                                        </div>
                                                        <div className="text-sm font-medium text-brand-navy">
                                                            {a.question}
                                                        </div>
                                                        <div className="rounded-lg bg-muted/50 p-2.5 text-sm text-foreground">
                                                            {formatScreeningAnswer(
                                                                a.question,
                                                                a.answer,
                                                            )}
                                                        </div>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )}

                        {/* Riwayat tab */}
                        {tab === 'riwayat' && (
                            <Card>
                                <CardContent className="p-5">
                                    {application.status_logs.length === 0 ? (
                                        <EmptyHint
                                            icon={Clock}
                                            message="Belum ada perubahan status."
                                            bare
                                        />
                                    ) : (
                                        <ol className="relative ml-3 space-y-4 border-l-2 border-brand-blue/15 pl-6">
                                            {application.status_logs.map(
                                                (log) => (
                                                    <li
                                                        key={log.id}
                                                        className="relative"
                                                    >
                                                        <span className="absolute top-1 -left-[34px] flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-xs ring-2 ring-background">
                                                            <ArrowRight className="size-3" />
                                                        </span>
                                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                                            <Badge
                                                                variant="outline"
                                                                className="font-medium"
                                                            >
                                                                {formatStatus(
                                                                    log.from_status ??
                                                                        'new',
                                                                )}
                                                            </Badge>
                                                            <ArrowRight className="size-3 text-muted-foreground" />
                                                            <Badge className="border-brand-blue/15 bg-brand-blue/10 font-medium text-brand-blue">
                                                                {formatStatus(
                                                                    log.to_status,
                                                                )}
                                                            </Badge>
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {log.changed_at
                                                                ? formatDateTime(
                                                                      log.changed_at,
                                                                  )
                                                                : '-'}
                                                            {log.changed_by
                                                                ?.name && (
                                                                <>
                                                                    {' '}
                                                                    · oleh{' '}
                                                                    {
                                                                        log
                                                                            .changed_by
                                                                            .name
                                                                    }
                                                                </>
                                                            )}
                                                        </div>
                                                        {log.note && (
                                                            <p className="mt-1.5 rounded-md bg-muted/40 p-2 text-sm text-muted-foreground">
                                                                {log.note}
                                                            </p>
                                                        )}
                                                    </li>
                                                ),
                                            )}
                                        </ol>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* ===== Sidebar ===== */}
                    <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
                        {/* AI Match */}
                        {application.ai_match_score !== null && (
                            <Card className="overflow-hidden border-brand-blue/15">
                                <div className="bg-gradient-to-r from-brand-blue/8 via-brand-cyan/8 to-transparent px-4 py-3">
                                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-brand-blue uppercase">
                                        <Sparkles className="size-3.5" /> AI
                                        Match Score
                                    </div>
                                </div>
                                <CardContent className="space-y-4 p-4">
                                    <div className="flex items-center gap-3">
                                        <MatchScoreBadge
                                            score={application.ai_match_score}
                                            size="md"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Skill, pengalaman, lokasi &
                                            ekspektasi gaji digabung jadi skor
                                            kecocokan.
                                        </p>
                                    </div>
                                    {application.match_breakdown && (
                                        <ul className="space-y-2.5 text-xs">
                                            {[
                                                {
                                                    label: 'Skill',
                                                    value: application
                                                        .match_breakdown.skills,
                                                    max: 50,
                                                },
                                                {
                                                    label: 'Pengalaman',
                                                    value: application
                                                        .match_breakdown
                                                        .experience,
                                                    max: 20,
                                                },
                                                {
                                                    label: 'Lokasi',
                                                    value: application
                                                        .match_breakdown
                                                        .location,
                                                    max: 15,
                                                },
                                                {
                                                    label: 'Gaji',
                                                    value: application
                                                        .match_breakdown.salary,
                                                    max: 15,
                                                },
                                            ].map((row) => (
                                                <li
                                                    key={row.label}
                                                    className="space-y-1"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-brand-navy">
                                                            {row.label}
                                                        </span>
                                                        <span className="font-mono tabular-nums">
                                                            <strong className="text-brand-blue">
                                                                {row.value}
                                                            </strong>
                                                            <span className="text-muted-foreground/60">
                                                                {' '}
                                                                / {row.max}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={
                                                            (row.value /
                                                                row.max) *
                                                            100
                                                        }
                                                        className="h-1.5"
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Lowongan info */}
                        <Card>
                            <CardContent className="space-y-2.5 p-4 text-sm">
                                <h3 className="text-xs font-bold tracking-wider text-brand-blue uppercase">
                                    Lowongan
                                </h3>
                                <div className="leading-snug font-semibold break-words text-brand-navy">
                                    {application.job.title}
                                </div>
                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                    {application.job.city && (
                                        <li className="flex items-start gap-1.5">
                                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-blue" />
                                            <span className="min-w-0 break-words">
                                                {application.job.city}
                                            </span>
                                        </li>
                                    )}
                                    {application.job.employment_type && (
                                        <li className="flex items-start gap-1.5">
                                            <Briefcase className="mt-0.5 size-3.5 shrink-0 text-brand-blue" />
                                            <span className="min-w-0 break-words">
                                                {formatStatus(
                                                    application.job
                                                        .employment_type,
                                                )}
                                                {application.job
                                                    .work_arrangement && (
                                                    <>
                                                        {' '}
                                                        ·{' '}
                                                        {formatStatus(
                                                            application.job
                                                                .work_arrangement,
                                                        )}
                                                    </>
                                                )}
                                            </span>
                                        </li>
                                    )}
                                    {jobSalary && (
                                        <li className="flex items-start gap-1.5">
                                            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-blue" />
                                            <span className="min-w-0 break-words tabular-nums">
                                                {jobSalary}
                                            </span>
                                        </li>
                                    )}
                                </ul>
                                <div className="space-y-1 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                                    <div className="flex items-start gap-1.5">
                                        <Calendar className="mt-0.5 size-3 shrink-0" />
                                        <span className="min-w-0 break-words">
                                            Dikirim:{' '}
                                            {application.applied_at
                                                ? formatDateTime(
                                                      application.applied_at,
                                                  )
                                                : '-'}
                                        </span>
                                    </div>
                                    {application.reviewed_at && (
                                        <div className="flex items-start gap-1.5">
                                            <Calendar className="mt-0.5 size-3 shrink-0" />
                                            <span className="min-w-0 break-words">
                                                Ditinjau:{' '}
                                                {formatDateTime(
                                                    application.reviewed_at,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Schedule interview shortcut */}
                        <Card className="overflow-hidden border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5">
                            <CardContent className="space-y-3 p-4">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand-blue/15 text-brand-blue">
                                        <CalendarPlus className="size-4" />
                                    </span>
                                    <h3 className="text-xs font-bold tracking-wider text-brand-blue uppercase">
                                        Jadwalkan Interview
                                    </h3>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Buat undangan interview untuk kandidat.
                                    Status lamaran otomatis berubah ke
                                    "Interview".
                                </p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="h-auto flex-col gap-1 border-border/60 bg-background py-2 hover:border-brand-blue/40 hover:bg-brand-blue/5"
                                    >
                                        <Link
                                            href={`/employer/interviews/create?application=${application.id}&mode=ai`}
                                        >
                                            <Sparkles className="size-3.5 text-brand-blue" />
                                            <span className="text-[11px] font-semibold">
                                                AI
                                            </span>
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="h-auto flex-col gap-1 border-border/60 bg-background py-2 hover:border-brand-blue/40 hover:bg-brand-blue/5"
                                    >
                                        <Link
                                            href={`/employer/interviews/create?application=${application.id}&mode=online`}
                                        >
                                            <Video className="size-3.5 text-brand-blue" />
                                            <span className="text-[11px] font-semibold">
                                                Online
                                            </span>
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="h-auto flex-col gap-1 border-border/60 bg-background py-2 hover:border-brand-blue/40 hover:bg-brand-blue/5"
                                    >
                                        <Link
                                            href={`/employer/interviews/create?application=${application.id}&mode=onsite`}
                                        >
                                            <MapPin className="size-3.5 text-brand-blue" />
                                            <span className="text-[11px] font-semibold">
                                                Onsite
                                            </span>
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Update status */}
                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <h3 className="text-xs font-bold tracking-wider text-brand-blue uppercase">
                                    Ubah Status
                                </h3>
                                <form onSubmit={onSubmit} className="space-y-3">
                                    <Select
                                        value={form.data.status}
                                        onValueChange={(v) =>
                                            form.setData('status', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih status lamaran" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((c) => (
                                                <SelectItem
                                                    key={c.value}
                                                    value={c.value}
                                                >
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <TextareaField
                                        label="Catatan (opsional)"
                                        rows={3}
                                        placeholder="Pesan untuk kandidat…"
                                        value={form.data.note}
                                        onChange={(e) =>
                                            form.setData('note', e.target.value)
                                        }
                                    />
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="w-full bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-xs hover:brightness-105"
                                    >
                                        Perbarui Status
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}

function IconLink({
    href,
    label,
    icon: Icon,
    external = false,
}: {
    href: string;
    label: string;
    icon: LucideIcon;
    external?: boolean;
}) {
    return (
        <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            title={label}
            aria-label={label}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:bg-brand-blue/5 hover:text-brand-blue"
        >
            <Icon className="size-4" />
        </a>
    );
}

function EmptyHint({
    icon: Icon,
    message,
    bare = false,
}: {
    icon: LucideIcon;
    message: string;
    bare?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-3 text-sm text-muted-foreground',
                bare
                    ? 'justify-center py-6 text-center'
                    : 'rounded-xl border border-dashed border-border/60 bg-muted/20 p-5',
            )}
        >
            <Icon className="size-4 text-brand-blue" />
            <span>{message}</span>
        </div>
    );
}
