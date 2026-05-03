import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Briefcase,
    Building2,
    Calendar,
    Check,
    Clock,
    Download,
    ExternalLink,
    Globe2,
    MapPin,
    MessageSquare,
    Sparkles,
    Wallet,
} from 'lucide-react';
import { MatchScoreBadge } from '@/components/shared/match-score-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useInitials } from '@/hooks/use-initials';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { formatSalaryRange } from '@/lib/format-rupiah';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

type StatusLog = {
    id: number;
    from_status: string | null;
    to_status: string | null;
    changed_at: string | null;
    changed_by: string | null;
    note: string | null;
};

type Props = {
    application: {
        id: number;
        status: string | null;
        ai_match_score: number | null;
        cover_letter: string | null;
        expected_salary: number | null;
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
            is_salary_visible: boolean;
            application_deadline: string | null;
        };
        company: {
            name: string | null;
            slug: string | null;
            logo_url: string | null;
        };
        cv: { id: number; label: string; url: string } | null;
        status_logs: StatusLog[];
    };
};

const PIPELINE: Array<{ key: string; label: string; description: string }> = [
    { key: 'submitted', label: 'Dikirim', description: 'Lamaran berhasil dikirim ke perusahaan.' },
    { key: 'reviewed', label: 'Ditinjau', description: 'Recruiter sedang meninjau profil Anda.' },
    { key: 'shortlisted', label: 'Shortlist', description: 'Anda lolos seleksi awal.' },
    { key: 'interview', label: 'Interview', description: 'Tahap wawancara — pantau jadwal di tab Interview.' },
    { key: 'offered', label: 'Tawaran', description: 'Selamat — Anda mendapat tawaran kerja.' },
    { key: 'hired', label: 'Diterima', description: 'Lamaran berhasil & Anda diterima.' },
];

const idr = (v: number | null) =>
    v == null
        ? null
        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function ApplicationShow({ application }: Props) {
    const getInitials = useInitials();
    const isRejected = application.status === 'rejected' || application.status === 'withdrawn';
    const currentStepIndex = PIPELINE.findIndex((p) => p.key === application.status);
    const currentStep = currentStepIndex >= 0 ? PIPELINE[currentStepIndex] : null;
    const salaryLabel = application.job.is_salary_visible
        ? formatSalaryRange(application.job.salary_min, application.job.salary_max)
        : 'Tidak ditampilkan';

    return (
        <>
            <Head title={application.job.title} />

            <div className="space-y-5 p-4 sm:p-6">
                {/* ===== Hero ===== */}
                <Card className="relative overflow-hidden border-brand-blue/15">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-brand-blue/12 via-brand-cyan/10 to-transparent"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-cyan/15 blur-3xl"
                    />
                    <CardContent className="relative space-y-5 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <Avatar className="size-16 rounded-2xl ring-2 ring-background sm:size-20">
                                <AvatarImage
                                    src={application.company.logo_url ?? undefined}
                                    alt={application.company.name ?? ''}
                                    className="object-contain"
                                />
                                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan text-base font-bold text-white">
                                    {getInitials(application.company.name ?? 'PT')}
                                </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1 space-y-2">
                                {application.company.name && (
                                    <Link
                                        href={application.company.slug ? `/companies/${application.company.slug}` : '#'}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
                                    >
                                        <Building2 className="size-3.5" /> {application.company.name}
                                    </Link>
                                )}
                                <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                    {application.job.title}
                                </h1>
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                    {application.job.city && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin className="size-3.5 text-brand-blue" /> {application.job.city}
                                        </span>
                                    )}
                                    {application.job.employment_type && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Briefcase className="size-3.5 text-brand-blue" /> {formatStatus(application.job.employment_type)}
                                        </span>
                                    )}
                                    {application.job.work_arrangement && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Globe2 className="size-3.5 text-brand-blue" /> {formatStatus(application.job.work_arrangement)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/jobs/${application.job.slug}`}>
                                            <ExternalLink className="size-3.5" /> Lihat Lowongan
                                        </Link>
                                    </Button>
                                    {application.cv && (
                                        <Button asChild size="sm" variant="outline">
                                            <a href={application.cv.url} target="_blank" rel="noreferrer">
                                                <Download className="size-3.5" /> {application.cv.label}
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Status pill (right side) */}
                            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                                <StatusPill status={application.status} />
                                {currentStep && !isRejected && (
                                    <p className="max-w-[12rem] text-right text-xs text-muted-foreground">
                                        {currentStep.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Pipeline */}
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-navy">
                                    Tahap Lamaran
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    {isRejected
                                        ? application.status === 'withdrawn'
                                            ? 'Ditarik'
                                            : 'Tidak lolos'
                                        : `${Math.max(0, currentStepIndex + 1)} dari ${PIPELINE.length}`}
                                </span>
                            </div>
                            <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                                {PIPELINE.map((step, idx) => {
                                    const passed = !isRejected && currentStepIndex >= idx;
                                    const current = !isRejected && currentStepIndex === idx;
                                    return (
                                        <li
                                            key={step.key}
                                            className={cn(
                                                'relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-[10px] sm:text-[11px]',
                                                current && 'border-brand-blue/40 bg-gradient-to-br from-brand-blue/8 to-brand-cyan/8 shadow-sm ring-1 ring-brand-blue/20',
                                                passed && !current && 'border-brand-blue/20 bg-brand-blue/5',
                                                !passed && 'border-border/60 bg-background',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-6 items-center justify-center rounded-full text-[10px] font-bold',
                                                    passed
                                                        ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-sm'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {passed ? <Check className="size-3" /> : idx + 1}
                                            </span>
                                            <span
                                                className={cn(
                                                    'font-semibold leading-tight',
                                                    current ? 'text-brand-blue' : passed ? 'text-brand-navy' : 'text-muted-foreground',
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
                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-5">
                        {application.cover_letter && (
                            <Card>
                                <CardContent className="p-5">
                                    <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                        <MessageSquare className="size-3.5" /> Cover Letter Anda
                                    </h3>
                                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                                        {application.cover_letter}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardContent className="p-5">
                                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    <Clock className="size-3.5" /> Riwayat Status
                                </h3>
                                {application.status_logs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Belum ada perubahan status.</p>
                                ) : (
                                    <ol className="relative ml-3 space-y-4 border-l-2 border-brand-blue/15 pl-6">
                                        {application.status_logs.map((log) => (
                                            <li key={log.id} className="relative">
                                                <span className="absolute -left-[34px] top-1 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-sm ring-2 ring-background">
                                                    <ArrowRight className="size-3" />
                                                </span>
                                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                                    <Badge variant="outline" className="font-medium">
                                                        {formatStatus(log.from_status ?? 'new')}
                                                    </Badge>
                                                    <ArrowRight className="size-3 text-muted-foreground" />
                                                    <Badge className="border-brand-blue/15 bg-brand-blue/10 font-medium text-brand-blue">
                                                        {formatStatus(log.to_status)}
                                                    </Badge>
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {log.changed_at ? formatDateTime(log.changed_at) : '-'}
                                                    {log.changed_by && <> · oleh {log.changed_by}</>}
                                                </div>
                                                {log.note && (
                                                    <p className="mt-1.5 rounded-md bg-muted/40 p-2 text-sm text-muted-foreground">
                                                        {log.note}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        {/* Match score */}
                        {application.ai_match_score !== null && (
                            <Card className="overflow-hidden border-brand-blue/15">
                                <div className="bg-gradient-to-r from-brand-blue/8 via-brand-cyan/8 to-transparent px-4 py-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                        <Sparkles className="size-3.5" /> AI Match Score
                                    </div>
                                </div>
                                <CardContent className="space-y-2 p-4">
                                    <div className="flex items-center gap-3">
                                        <MatchScoreBadge score={application.ai_match_score} size="md" />
                                        <p className="text-xs text-muted-foreground">
                                            Estimasi kecocokan profil Anda dengan persyaratan lowongan ini.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Job snapshot */}
                        <Card>
                            <CardContent className="space-y-3 p-4 text-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    Detail Posisi
                                </h3>
                                <DetailRow icon={Wallet} label="Gaji" value={salaryLabel} />
                                {application.expected_salary !== null && (
                                    <DetailRow
                                        icon={Sparkles}
                                        label="Ekspektasi Anda"
                                        value={idr(application.expected_salary) ?? '–'}
                                    />
                                )}
                                {application.job.application_deadline && (
                                    <DetailRow
                                        icon={Calendar}
                                        label="Deadline"
                                        value={formatDate(application.job.application_deadline) || '–'}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* Timestamps */}
                        <Card>
                            <CardContent className="space-y-2.5 p-4 text-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    Linimasa
                                </h3>
                                <DetailRow
                                    icon={Calendar}
                                    label="Dikirim"
                                    value={application.applied_at ? formatDateTime(application.applied_at) : '–'}
                                />
                                <DetailRow
                                    icon={Calendar}
                                    label="Ditinjau"
                                    value={application.reviewed_at ? formatDateTime(application.reviewed_at) : 'Belum ditinjau'}
                                />
                            </CardContent>
                        </Card>

                        {/* Tip */}
                        <Card className="border-brand-blue/15 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5">
                            <CardContent className="space-y-2 p-4 text-sm">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    <Sparkles className="size-3.5" /> Tips
                                </h3>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Pastikan profil & CV up-to-date. Recruiter akan mengontak via email atau halaman ini saat ada update.
                                </p>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}

function StatusPill({ status }: { status: string | null }) {
    const meta: Record<string, { label: string; className: string }> = {
        submitted: { label: 'Dikirim', className: 'border-blue-500/30 bg-blue-500/10 text-blue-700' },
        reviewed: { label: 'Ditinjau', className: 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue' },
        shortlisted: { label: 'Shortlist', className: 'border-violet-500/30 bg-violet-500/10 text-violet-700' },
        interview: { label: 'Interview', className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700' },
        offered: { label: 'Tawaran', className: 'border-amber-500/30 bg-amber-500/10 text-amber-700' },
        hired: { label: 'Diterima', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' },
        rejected: { label: 'Tidak Lolos', className: 'border-rose-500/30 bg-rose-500/10 text-rose-700' },
        withdrawn: { label: 'Ditarik', className: 'border-slate-500/30 bg-slate-500/10 text-slate-700' },
    };
    const m = meta[status ?? ''] ?? { label: formatStatus(status) ?? '-', className: 'border-slate-500/30 bg-slate-500/10 text-slate-700' };
    return (
        <Badge variant="outline" className={cn('h-7 px-3 text-sm font-semibold', m.className)}>
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />
            {m.label}
        </Badge>
    );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5" /> {label}
            </span>
            <span className="text-right font-medium text-brand-navy">{value}</span>
        </div>
    );
}
