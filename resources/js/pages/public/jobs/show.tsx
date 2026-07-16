import { Link, router, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    Bookmark,
    BookmarkCheck,
    Briefcase,
    Building2,
    Calendar,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Eye,
    Flame,
    GraduationCap,
    Lightbulb,
    Link as LinkIcon,
    MapPin,
    Share2,
    Sparkles,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { StatusBadge } from '@/components/feedback/status-badge';
import { SeoHead } from '@/components/seo-head';
import { SafeHtml } from '@/components/shared/safe-html';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format-date';
import { stripHtml } from '@/lib/sanitize-html';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as jobBrowseIndex } from '@/routes/public/jobs';
import { destroy as savedJobDestroy, store as savedJobStore } from '@/routes/employee/saved-jobs';
import type { Auth } from '@/types';

type Job = {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    responsibilities: string | null;
    requirements: string | null;
    benefits: string | null;
    employment_type: string | null;
    work_arrangement: string | null;
    experience_level: string | null;
    min_education: string | null;
    salary_min: number | null;
    salary_max: number | null;
    is_salary_visible: boolean;
    is_featured: boolean;
    is_anonymous: boolean;
    published_at: string | null;
    application_deadline: string | null;
    company: {
        id?: number;
        slug?: string;
        name: string;
        logo_url: string | null;
        verification_status: string | null;
    };
    company_about: string | null;
    province: string | null;
    city: string | null;
    skills: string[];
    screening_questions: { id: number; question: string; type: string | null; is_required: boolean }[];
    views_count: number;
    applications_count: number;
};

type MatchBreakdown = {
    skills: number;
    experience: number;
    location: number;
    salary: number;
};

type Props = {
    job: Job;
    matchScore: number | null;
    matchBreakdown: MatchBreakdown | null;
    isSaved: boolean;
    similar: Array<SimilarJob>;
};

type SimilarJob = {
    id: number;
    slug: string;
    title: string;
    employment_type: string | null;
    work_arrangement: string | null;
    is_featured: boolean;
    salary_min: number | null;
    salary_max: number | null;
    is_salary_visible: boolean;
    company: {
        name: string;
        slug?: string;
        logo_url: string | null;
        verification_status: string | null;
    };
    city: string | null;
};

function formatRupiah(value: number | null): string {
    if (!value) return '';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatRupiahShort(value: number | null): string {
    if (!value) return '';
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}jt`;
    if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
    return `Rp ${value}`;
}

function formatRelative(iso: string | null): string {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'baru saja';
    if (min < 60) return `${min} menit lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} jam lalu`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day} hari lalu`;
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const APPLICATION_TIPS = [
    'Sesuaikan CV dengan kualifikasi dan kata kunci di lowongan ini.',
    'Soroti pengalaman dan project yang paling relevan dengan tanggung jawab.',
    'Tulis cover letter singkat: kenapa Anda cocok dan dampak yang pernah dibuat.',
    'Pastikan profil dan portofolio terbaru sebelum menekan Lamar.',
];

export default function PublicJobShow({ job, matchScore, matchBreakdown, isSaved, similar }: Props) {
    const auth = (usePage().props as unknown as { auth?: Auth }).auth;
    const isEmployee = auth?.user?.role === 'employee';
    const [copied, setCopied] = useState(false);

    const seoDescription = useMemo(
        () =>
            [
                job.is_anonymous ? 'Perusahaan konfidensial' : job.company.name,
                job.city ?? undefined,
                job.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? undefined,
            ]
                .filter(Boolean)
                .join(' · ')
                .slice(0, 160),
        [job],
    );

    const initials = useMemo(
        () =>
            job.company.name
                .split(' ')
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'PT',
        [job.company.name],
    );

    const verified = job.company.verification_status === 'verified';
    const remainingDays = daysUntil(job.application_deadline);

    const salaryLabel = useMemo(() => {
        if (!job.is_salary_visible || !job.salary_min) return null;
        if (job.salary_max && job.salary_max !== job.salary_min) {
            return `${formatRupiahShort(job.salary_min)} – ${formatRupiahShort(job.salary_max)}`;
        }
        return formatRupiahShort(job.salary_min);
    }, [job.is_salary_visible, job.salary_min, job.salary_max]);

    const fullSalaryLabel = useMemo(() => {
        if (!job.is_salary_visible || !job.salary_min) return null;
        if (job.salary_max && job.salary_max !== job.salary_min) {
            return `${formatRupiah(job.salary_min)} – ${formatRupiah(job.salary_max)}`;
        }
        return formatRupiah(job.salary_min);
    }, [job.is_salary_visible, job.salary_min, job.salary_max]);

    const toggleSave = () => {
        if (!auth?.user) {
            router.visit('/login');
            return;
        }
        if (isSaved) {
            router.delete(savedJobDestroy(job.slug).url, { preserveScroll: true });
        } else {
            router.post(savedJobStore(job.slug).url, {}, { preserveScroll: true });
        }
    };

    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const title = `${job.title} – ${job.is_anonymous ? 'KarirConnect' : job.company.name}`;
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
            try {
                await navigator.share({ title, url });
                return;
            } catch {
                // user dismissed, fall through to copy
            }
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
    };

    return (
        <>
            <SeoHead title={job.title} description={seoDescription} canonical={`/jobs/${job.slug}`} type="article" />

            <div className="space-y-6 pb-24 lg:pb-0">
                {/* Breadcrumb */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href={home().url}>Beranda</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href={jobBrowseIndex().url}>Lowongan</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="line-clamp-1">{job.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* ===== Hero card ===== */}
                <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(800px 220px at 0% 0%, rgba(16,128,224,0.06), transparent 70%), radial-gradient(600px 180px at 100% 0%, rgba(16,192,224,0.05), transparent 70%)',
                        }}
                    />
                    <div className="relative p-5 sm:p-7">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background ring-1 ring-border/30 sm:size-16">
                                    {job.company.logo_url ? (
                                        <img
                                            src={job.company.logo_url}
                                            alt={job.company.name}
                                            className="size-full object-contain p-1.5"
                                        />
                                    ) : (
                                        <span className="text-base font-semibold text-brand-navy">{initials}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                                        {job.is_anonymous ? (
                                            <span>Perusahaan Konfidensial</span>
                                        ) : (
                                            <>
                                                {job.company.slug ? (
                                                    <Link
                                                        href={`/companies/${job.company.slug}`}
                                                        className="font-medium text-foreground hover:text-brand-blue hover:underline"
                                                    >
                                                        {job.company.name}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium text-foreground">{job.company.name}</span>
                                                )}
                                                {verified && (
                                                    <BadgeCheck
                                                        className="size-4 fill-brand-blue text-white"
                                                        aria-label="Verified"
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                        {job.title}
                                    </h1>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-foreground/80">
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin className="size-4 text-muted-foreground" />
                                            {[job.city, job.province].filter(Boolean).join(', ') || 'Lokasi fleksibel'}
                                        </span>
                                        {job.employment_type && (
                                            <>
                                                <span className="text-muted-foreground/50">·</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Briefcase className="size-4 text-muted-foreground" />
                                                    {formatStatus(job.employment_type)}
                                                </span>
                                            </>
                                        )}
                                        {job.work_arrangement && (
                                            <>
                                                <span className="text-muted-foreground/50">·</span>
                                                <span>{formatStatus(job.work_arrangement)}</span>
                                            </>
                                        )}
                                        {job.experience_level && (
                                            <>
                                                <span className="text-muted-foreground/50">·</span>
                                                <span>{formatStatus(job.experience_level)}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {job.is_featured && (
                                            <Badge className="gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                                                <Flame className="size-3" /> Butuh Cepat
                                            </Badge>
                                        )}
                                        {remainingDays !== null && remainingDays <= 7 && remainingDays > 0 && (
                                            <Badge
                                                variant="outline"
                                                className="gap-1 border-amber-500/40 bg-amber-50 text-amber-700"
                                            >
                                                <Clock className="size-3" /> {remainingDays} hari lagi
                                            </Badge>
                                        )}
                                        {remainingDays === 0 && (
                                            <Badge
                                                variant="outline"
                                                className="gap-1 border-rose-500/40 bg-rose-50 text-rose-700"
                                            >
                                                <Clock className="size-3" /> Tutup hari ini
                                            </Badge>
                                        )}
                                        {job.published_at && (
                                            <span className="text-xs text-muted-foreground">
                                                Diposting {formatRelative(job.published_at)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col sm:items-end">
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-11 flex-1 rounded-xl bg-brand-blue px-6 hover:bg-brand-blue/90 sm:flex-none"
                                >
                                    <Link href={`/jobs/${job.slug}/apply`}>Lamar Sekarang</Link>
                                </Button>
                                <div className="flex gap-2">
                                    {isEmployee && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={toggleSave}
                                            aria-label={isSaved ? 'Hapus dari tersimpan' : 'Simpan lowongan'}
                                            className={cn(
                                                'size-11 rounded-xl border-border/60',
                                                isSaved && 'border-brand-blue/40 bg-brand-blue/5 text-brand-blue',
                                            )}
                                        >
                                            {isSaved ? (
                                                <BookmarkCheck className="size-4" />
                                            ) : (
                                                <Bookmark className="size-4" />
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={handleShare}
                                        aria-label="Bagikan lowongan"
                                        className="size-11 rounded-xl border-border/60"
                                    >
                                        {copied ? (
                                            <CheckCircle2 className="size-4 text-emerald-600" />
                                        ) : (
                                            <Share2 className="size-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== Main grid ===== */}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    {/* min-w-0: grid items default to min-width:auto, which lets wide
                        children (the scrollable tab strip) stretch the whole page. */}
                    <main className="min-w-0 space-y-6">
                        {/* Highlight stats */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {/* Salary lives in the sticky apply box, which stays on screen
                                beside this strip — repeating it here said the same thing twice. */}
                            <Highlight
                                icon={MapPin}
                                label="Lokasi"
                                value={[job.city, job.province].filter(Boolean).join(', ') || 'Fleksibel'}
                                hint={job.work_arrangement ? formatStatus(job.work_arrangement) : undefined}
                                tone="brand"
                            />
                            <Highlight
                                icon={Briefcase}
                                label="Tipe Kerja"
                                value={
                                    job.employment_type
                                        ? formatStatus(job.employment_type)
                                        : '-'
                                }
                                hint={job.is_anonymous ? 'Perusahaan konfidensial' : undefined}
                            />
                            <Highlight
                                icon={GraduationCap}
                                label="Pengalaman"
                                value={job.experience_level ? formatStatus(job.experience_level) : 'Semua level'}
                                hint={job.min_education ? `Min. ${formatStatus(job.min_education)}` : undefined}
                            />
                            <Highlight
                                icon={Calendar}
                                label="Tenggat"
                                value={
                                    job.application_deadline
                                        ? formatDate(job.application_deadline)
                                        : 'Open'
                                }
                                hint={
                                    remainingDays !== null && remainingDays > 0
                                        ? `${remainingDays} hari lagi`
                                        : remainingDays === 0
                                          ? 'Tutup hari ini'
                                          : undefined
                                }
                                tone={remainingDays !== null && remainingDays <= 3 ? 'warn' : 'default'}
                            />
                        </div>

                        {/* Engagement strip */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-2.5 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <Eye className="size-4" />
                                <span className="font-medium text-foreground">{job.views_count}</span> dilihat
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Users className="size-4" />
                                <span className="font-medium text-foreground">{job.applications_count}</span> pelamar
                            </span>
                            {job.screening_questions.length > 0 && (
                                <span className="inline-flex items-center gap-1.5">
                                    <ClipboardCheck className="size-4" />
                                    <span className="font-medium text-foreground">
                                        {job.screening_questions.length}
                                    </span>{' '}
                                    pertanyaan screening
                                </span>
                            )}
                        </div>

                        {job.skills.length > 0 && (
                            <ContentCard title="Skill yang Dicari" icon={Sparkles}>
                                <div className="flex flex-wrap gap-1.5">
                                    {job.skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="inline-flex items-center rounded-full border border-brand-blue/15 bg-brand-blue/5 px-3 py-1 text-sm font-medium text-brand-blue"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </ContentCard>
                        )}

                        <JobDetailTabs
                            description={job.description}
                            responsibilities={job.responsibilities}
                            requirements={job.requirements}
                            benefits={job.benefits}
                        />

                        {job.screening_questions.length > 0 && (
                            <ContentCard
                                title="Pertanyaan Screening"
                                description="Akan ditanyakan saat Anda mengirim lamaran."
                                icon={ClipboardCheck}
                            >
                                <ol className="space-y-3 text-sm">
                                    {job.screening_questions.map((q, i) => (
                                        <li key={q.id} className="flex gap-3">
                                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-semibold text-brand-blue">
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-foreground">{q.question}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                    {q.type && (
                                                        <span className="rounded-md bg-muted px-1.5 py-0.5">
                                                            {formatStatus(q.type)}
                                                        </span>
                                                    )}
                                                    {q.is_required && (
                                                        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-600">
                                                            Wajib
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </ContentCard>
                        )}

                    </main>

                    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                        {/* Apply CTA card */}
                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                            {fullSalaryLabel ? (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Estimasi Gaji
                                    </p>
                                    <p className="text-xl font-bold text-foreground">{fullSalaryLabel}</p>
                                    <p className="text-xs text-muted-foreground">/ bulan</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Gaji
                                    </p>
                                    <p className="text-xl font-bold text-foreground">Negotiable</p>
                                    <p className="text-xs text-muted-foreground">Sesuai kesepakatan</p>
                                </div>
                            )}
                            <Button
                                asChild
                                size="lg"
                                className="mt-4 h-11 w-full rounded-xl bg-brand-blue hover:bg-brand-blue/90"
                            >
                                <Link href={`/jobs/${job.slug}/apply`}>Lamar Sekarang</Link>
                            </Button>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {isEmployee && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={toggleSave}
                                        className={cn(
                                            'h-10 rounded-xl border-border/60',
                                            isSaved && 'border-brand-blue/40 bg-brand-blue/5 text-brand-blue',
                                        )}
                                    >
                                        {isSaved ? (
                                            <BookmarkCheck className="size-4" />
                                        ) : (
                                            <Bookmark className="size-4" />
                                        )}
                                        {isSaved ? 'Tersimpan' : 'Simpan'}
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleShare}
                                    className={cn(
                                        'h-10 rounded-xl border-border/60',
                                        !isEmployee && 'col-span-2',
                                    )}
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 className="size-4 text-emerald-600" /> Tersalin
                                        </>
                                    ) : (
                                        <>
                                            <LinkIcon className="size-4" /> Bagikan
                                        </>
                                    )}
                                </Button>
                            </div>
                            {remainingDays !== null && (
                                <p className="mt-3 text-center text-xs text-muted-foreground">
                                    {remainingDays > 0
                                        ? `Lamaran ditutup dalam ${remainingDays} hari`
                                        : 'Lamaran ditutup hari ini'}
                                </p>
                            )}
                        </div>

                        {matchScore !== null && (
                            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                            <Sparkles className="size-4" />
                                        </span>
                                        <h3 className="text-sm font-semibold">Match Score</h3>
                                    </div>
                                    <span className="text-2xl font-bold tabular-nums text-foreground">
                                        {matchScore}
                                        <span className="text-sm font-normal text-muted-foreground">/100</span>
                                    </span>
                                </div>
                                <Progress value={matchScore} className="mt-3 h-2" />
                                {matchBreakdown && (
                                    <ul className="mt-4 space-y-2.5 text-xs">
                                        {[
                                            { label: 'Skill', value: matchBreakdown.skills, max: 50 },
                                            { label: 'Pengalaman', value: matchBreakdown.experience, max: 20 },
                                            { label: 'Lokasi', value: matchBreakdown.location, max: 15 },
                                            { label: 'Gaji', value: matchBreakdown.salary, max: 15 },
                                        ].map((row) => (
                                            <li key={row.label} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">{row.label}</span>
                                                    <span className="tabular-nums font-medium text-foreground">
                                                        {row.value}
                                                        <span className="text-muted-foreground/60"> / {row.max}</span>
                                                    </span>
                                                </div>
                                                <Progress value={(row.value / row.max) * 100} className="h-1" />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                                    Berdasarkan skill, pengalaman, lokasi, dan ekspektasi gaji dari profil Anda.
                                </p>
                            </div>
                        )}

                        {/* Company card */}
                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background">
                                    {job.company.logo_url ? (
                                        <img
                                            src={job.company.logo_url}
                                            alt={job.company.name}
                                            className="size-full object-contain p-1"
                                        />
                                    ) : (
                                        <Building2 className="size-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate font-semibold text-foreground">
                                        {job.is_anonymous ? 'Perusahaan Konfidensial' : job.company.name}
                                    </h3>
                                    {!job.is_anonymous && verified && (
                                        <StatusBadge tone="success">Verified</StatusBadge>
                                    )}
                                </div>
                            </div>
                            {job.company_about && (
                                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                                    {stripHtml(job.company_about)}
                                </p>
                            )}
                            {!job.is_anonymous && job.company.slug && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-4 h-10 w-full rounded-xl border-border/60"
                                >
                                    <Link href={`/companies/${job.company.slug}`}>Lihat Profil Perusahaan</Link>
                                </Button>
                            )}
                        </div>

                        {/* Tips melamar */}
                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    <Lightbulb className="size-4" />
                                </span>
                                <h3 className="text-sm font-semibold">Tips Melamar</h3>
                            </div>
                            <ul className="mt-3 space-y-2.5 text-sm">
                                {APPLICATION_TIPS.map((tip, i) => (
                                    <li key={i} className="flex gap-2 text-foreground/80">
                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                        <span className="leading-relaxed">{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </aside>
                </div>

                {/* Full width: the sticky aside is taller than the article, so keeping
                    similar jobs in the column left a long void beside it. */}
                {similar.length > 0 && <SimilarJobsCard jobs={similar} />}
            </div>

            {/* Mobile sticky apply bar */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted-foreground">{job.title}</p>
                        <p className="truncate text-sm font-semibold text-foreground">
                            {salaryLabel ? `${salaryLabel} / bulan` : 'Negotiable'}
                        </p>
                    </div>
                    {isEmployee && (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={toggleSave}
                            aria-label={isSaved ? 'Hapus dari tersimpan' : 'Simpan'}
                            className={cn(
                                'size-10 shrink-0 rounded-xl border-border/60',
                                isSaved && 'border-brand-blue/40 bg-brand-blue/5 text-brand-blue',
                            )}
                        >
                            {isSaved ? (
                                <BookmarkCheck className="size-4" />
                            ) : (
                                <Bookmark className="size-4" />
                            )}
                        </Button>
                    )}
                    <Button
                        asChild
                        size="lg"
                        className="h-10 shrink-0 rounded-xl bg-brand-blue px-5 hover:bg-brand-blue/90"
                    >
                        <Link href={`/jobs/${job.slug}/apply`}>Lamar</Link>
                    </Button>
                </div>
            </div>
        </>
    );
}

function Highlight({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'default',
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
    tone?: 'default' | 'brand' | 'warn';
}) {
    return (
        <div
            className={cn(
                'rounded-xl border bg-card p-3.5 shadow-xs sm:p-4',
                tone === 'brand'
                    ? 'border-brand-blue/20 bg-brand-blue/5'
                    : tone === 'warn'
                      ? 'border-amber-500/30 bg-amber-50'
                      : 'border-border/60',
            )}
        >
            <div
                className={cn(
                    'flex size-8 items-center justify-center rounded-lg',
                    tone === 'brand'
                        ? 'bg-brand-blue/15 text-brand-blue'
                        : tone === 'warn'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-muted text-foreground/70',
                )}
            >
                <Icon className="size-4" />
            </div>
            <p className="mt-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <p className="mt-0.5 text-sm font-semibold break-words text-foreground sm:text-base">{value}</p>
            {hint && (
                <p className="mt-0.5 text-xs break-words text-muted-foreground" title={hint}>
                    {hint}
                </p>
            )}
        </div>
    );
}

function SimilarJobsCard({ jobs }: { jobs: SimilarJob[] }) {
    const formatSalary = (s: SimilarJob): string | null => {
        if (!s.is_salary_visible || !s.salary_min) return null;
        if (s.salary_max && s.salary_max !== s.salary_min) {
            return `${formatRupiahShort(s.salary_min)} – ${formatRupiahShort(s.salary_max)}`;
        }
        return formatRupiahShort(s.salary_min);
    };

    return (
        <section className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                        <Briefcase className="size-4" />
                    </span>
                    <h3 className="text-sm font-semibold">Lowongan Serupa</h3>
                </div>
                <Link
                    href={jobBrowseIndex().url}
                    className="text-xs font-medium text-brand-blue hover:underline"
                >
                    Lihat semua
                </Link>
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {jobs.map((s) => {
                    const salary = formatSalary(s);
                    const verified = s.company.verification_status === 'verified';
                    const initials =
                        s.company.name
                            .split(' ')
                            .map((p) => p[0])
                            .filter(Boolean)
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'PT';

                    return (
                        <li key={s.id}>
                            <Link
                                href={`/jobs/${s.slug}`}
                                className="group relative block overflow-hidden rounded-xl border border-transparent p-3 transition-all hover:-translate-y-0.5 hover:border-brand-blue/20 hover:bg-brand-blue/5 hover:shadow-xs"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
                                        {s.company.logo_url ? (
                                            <img
                                                src={s.company.logo_url}
                                                alt={s.company.name}
                                                className="size-full object-contain p-1"
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold text-brand-navy">
                                                {initials}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start gap-1.5">
                                            <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-blue">
                                                {s.title}
                                            </p>
                                            {s.is_featured && (
                                                <span
                                                    aria-label="Loker butuh cepat"
                                                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white"
                                                >
                                                    <Flame className="size-3" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                            <span className="line-clamp-1">{s.company.name}</span>
                                            {verified && (
                                                <BadgeCheck
                                                    className="size-3 shrink-0 fill-brand-blue text-white"
                                                    aria-label="Verified"
                                                />
                                            )}
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                            {s.city && (
                                                <span className="inline-flex items-center gap-1 text-foreground/70">
                                                    <MapPin className="size-3 text-muted-foreground" />
                                                    <span className="line-clamp-1">{s.city}</span>
                                                </span>
                                            )}
                                            {s.employment_type && (
                                                <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
                                                    {formatStatus(s.employment_type)}
                                                </span>
                                            )}
                                            {s.work_arrangement && (
                                                <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
                                                    {formatStatus(s.work_arrangement)}
                                                </span>
                                            )}
                                        </div>

                                        {salary ? (
                                            <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">
                                                <Wallet className="size-3" />
                                                {salary}
                                                <span className="font-normal text-muted-foreground">
                                                    /bulan
                                                </span>
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                Gaji negotiable
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

const PROSE_CLASSES =
    'prose prose-sm max-w-none text-foreground/85 prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground prose-a:text-brand-blue prose-li:marker:text-muted-foreground prose-ul:my-3 prose-ol:my-3 prose-p:leading-relaxed';

function JobDetailTabs({
    description,
    responsibilities,
    requirements,
    benefits,
}: {
    description: string | null;
    responsibilities: string | null;
    requirements: string | null;
    benefits: string | null;
}) {
    const sections = [
        { key: 'description', label: 'Deskripsi', html: description },
        { key: 'responsibilities', label: 'Tanggung Jawab', html: responsibilities },
        { key: 'requirements', label: 'Kualifikasi', html: requirements },
        { key: 'benefits', label: 'Benefit & Tunjangan', html: benefits },
    ].filter((s): s is { key: string; label: string; html: string } => Boolean(s.html));

    if (sections.length === 0) {
        return null;
    }

    return (
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6">
            <Tabs defaultValue={sections[0].key} className="space-y-5">
                {/* The h-9 on TabsList is variant-prefixed, so a plain h-auto does not
                    override it — match the prefix or wrapped tabs spill out of the list. */}
                <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto bg-muted/50 p-1 group-data-[orientation=horizontal]/tabs:h-auto sm:flex-wrap">
                    {sections.map((section) => (
                        <TabsTrigger
                            key={section.key}
                            value={section.key}
                            // h-auto/flex-none override the base trigger's h-[calc(100%-1px)] and
                            // flex-1: inside a wrapping list those make every tab as tall as the
                            // whole list and force one per row, so they overlap the panel below.
                            className="h-auto flex-none rounded-lg px-3.5 py-1.5 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                        >
                            {section.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {sections.map((section) => (
                    <TabsContent key={section.key} value={section.key} className="focus-visible:outline-none">
                        <SafeHtml html={section.html} className={PROSE_CLASSES} />
                    </TabsContent>
                ))}
            </Tabs>
        </section>
    );
}

function ContentCard({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string;
    description?: string;
    icon?: LucideIcon;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-4 flex items-start gap-2">
                {Icon && (
                    <span className="mt-0.5 flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                        <Icon className="size-4" />
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                    {description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
            </div>
            {children}
        </section>
    );
}
