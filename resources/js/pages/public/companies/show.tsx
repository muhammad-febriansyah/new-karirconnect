import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Briefcase,
    Building2,
    Calendar,
    CheckCircle2,
    ExternalLink,
    Flame,
    Globe,
    Heart,
    Link as LinkIcon,
    MapPin,
    Share2,
    Sparkles,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
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
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as companiesIndex } from '@/routes/public/companies';

type Office = {
    id: number;
    label: string;
    address: string | null;
    is_headquarter: boolean;
    map_url: string | null;
};

type CompanyBadge = { id: number; name: string; tone: string | null };

type CompanyJob = {
    id: number;
    slug: string;
    title: string;
    category: string | null;
    city: string | null;
    employment_type: string | null;
    work_arrangement: string | null;
    salary_min: number | null;
    salary_max: number | null;
    is_salary_visible: boolean;
    is_featured: boolean;
    published_at: string | null;
};

type Props = {
    company: {
        id: number;
        name: string;
        slug: string;
        tagline: string | null;
        about: string | null;
        culture: string | null;
        benefits: string | null;
        website: string | null;
        industry: string | null;
        size: string | null;
        province: string | null;
        city: string | null;
        logo_url: string | null;
        cover_url: string | null;
        verification_status: string | null;
        offices: Office[];
        badges: CompanyBadge[];
    };
    jobs: CompanyJob[];
};

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
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function formatHostname(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export default function PublicCompanyShow({ company, jobs }: Props) {
    const [copied, setCopied] = useState(false);
    const verified = company.verification_status === 'verified';

    const initials = useMemo(
        () =>
            company.name
                .split(' ')
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'PT',
        [company.name],
    );

    const featuredCount = useMemo(() => jobs.filter((j) => j.is_featured).length, [jobs]);

    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
            try {
                await navigator.share({ title: company.name, url });
                return;
            } catch {
                // user dismissed, fall through
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
            <Head title={company.name} />

            <div className="space-y-6">
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
                                <Link href={companiesIndex().url}>Perusahaan</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="line-clamp-1">{company.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* ===== Hero card with cover ===== */}
                <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card">
                    {/* Cover */}
                    <div className="relative h-32 w-full overflow-hidden sm:h-44">
                        {company.cover_url ? (
                            <img
                                src={company.cover_url}
                                alt={company.name}
                                className="size-full object-cover"
                            />
                        ) : (
                            <div className="size-full bg-gradient-to-br from-brand-navy via-brand-blue to-brand-cyan">
                                <div
                                    aria-hidden
                                    className="size-full opacity-40"
                                    style={{
                                        backgroundImage:
                                            'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
                                        backgroundSize: '28px 28px',
                                        maskImage:
                                            'radial-gradient(ellipse at 50% 30%, black 0%, transparent 75%)',
                                        WebkitMaskImage:
                                            'radial-gradient(ellipse at 50% 30%, black 0%, transparent 75%)',
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="relative px-5 pb-5 sm:px-7 sm:pb-7">
                        {/* Logo overlapping cover */}
                        <div className="-mt-10 sm:-mt-12">
                            <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-background shadow-md ring-4 ring-card sm:size-24">
                                {company.logo_url ? (
                                    <img
                                        src={company.logo_url}
                                        alt={company.name}
                                        className="size-full object-contain p-2.5"
                                    />
                                ) : (
                                    <span className="text-xl font-bold text-brand-navy">{initials}</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                        {company.name}
                                    </h1>
                                    {verified && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/20">
                                            <BadgeCheck className="size-3.5" /> Verified
                                        </span>
                                    )}
                                </div>
                                {company.tagline && (
                                    <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                                        {company.tagline}
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-foreground/80">
                                    {company.industry && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Sparkles className="size-4 text-muted-foreground" />
                                            {company.industry}
                                        </span>
                                    )}
                                    {(company.city || company.province) && (
                                        <>
                                            <span className="text-muted-foreground/50">·</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <MapPin className="size-4 text-muted-foreground" />
                                                {[company.city, company.province].filter(Boolean).join(', ')}
                                            </span>
                                        </>
                                    )}
                                    {company.size && (
                                        <>
                                            <span className="text-muted-foreground/50">·</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Users className="size-4 text-muted-foreground" />
                                                {company.size}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                                {company.website && (
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="h-10 rounded-xl border-border/60"
                                    >
                                        <a href={company.website} target="_blank" rel="noreferrer">
                                            <Globe className="size-4" />
                                            <span className="hidden sm:inline">Website</span>
                                            <ExternalLink className="size-3" />
                                        </a>
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleShare}
                                    className="h-10 rounded-xl border-border/60"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 className="size-4 text-emerald-600" />
                                            <span className="hidden sm:inline">Tersalin</span>
                                        </>
                                    ) : (
                                        <>
                                            <Share2 className="size-4" />
                                            <span className="hidden sm:inline">Bagikan</span>
                                        </>
                                    )}
                                </Button>
                                {jobs.length > 0 && (
                                    <Button
                                        asChild
                                        className="h-10 rounded-xl bg-brand-blue px-5 hover:bg-brand-blue/90"
                                    >
                                        <a href="#lowongan">
                                            <Briefcase className="size-4" />
                                            Lihat Lowongan
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Quick stats strip */}
                        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border/60 pt-5 sm:grid-cols-4">
                            <Stat
                                icon={Briefcase}
                                label="Lowongan Aktif"
                                value={String(jobs.length)}
                                tone="brand"
                            />
                            <Stat
                                icon={Flame}
                                label="Butuh Cepat"
                                value={String(featuredCount)}
                                tone={featuredCount > 0 ? 'warn' : 'default'}
                            />
                            <Stat
                                icon={Users}
                                label="Ukuran Tim"
                                value={company.size ?? 'N/A'}
                            />
                            <Stat
                                icon={MapPin}
                                label="Kantor"
                                value={
                                    company.offices.length > 0
                                        ? `${company.offices.length} lokasi`
                                        : (company.city ?? 'N/A')
                                }
                            />
                        </div>
                    </div>
                </section>

                {/* ===== Main grid ===== */}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <main className="space-y-6">
                        {company.about && (
                            <ContentCard title="Tentang Perusahaan" icon={Building2}>
                                <SafeHtml
                                    html={company.about}
                                    className="prose prose-sm max-w-none text-foreground/85 prose-headings:text-foreground prose-strong:text-foreground"
                                />
                            </ContentCard>
                        )}

                        {company.culture && (
                            <ContentCard title="Budaya Kerja" icon={Heart}>
                                <SafeHtml
                                    html={company.culture}
                                    className="prose prose-sm max-w-none text-foreground/85 prose-headings:text-foreground prose-strong:text-foreground"
                                />
                            </ContentCard>
                        )}

                        {company.benefits && (
                            <ContentCard title="Benefit & Tunjangan" icon={Sparkles}>
                                <SafeHtml
                                    html={company.benefits}
                                    className="prose prose-sm max-w-none text-foreground/85 prose-headings:text-foreground prose-strong:text-foreground"
                                />
                            </ContentCard>
                        )}

                        {/* Active jobs */}
                        <section
                            id="lowongan"
                            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
                        >
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-start gap-2">
                                    <span className="mt-0.5 flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <Briefcase className="size-4" />
                                    </span>
                                    <div>
                                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                                            Lowongan Aktif
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {jobs.length} posisi sedang dibuka di {company.name}.
                                        </p>
                                    </div>
                                </div>
                                {jobs.length > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue">
                                        {jobs.length} terbuka
                                    </span>
                                )}
                            </div>

                            {jobs.length === 0 ? (
                                <EmptyState
                                    icon={Briefcase}
                                    title="Belum ada lowongan aktif"
                                    description={`${company.name} belum mempublikasikan lowongan saat ini. Cek perusahaan lain di direktori.`}
                                    actions={
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="rounded-xl border-border/60"
                                        >
                                            <Link href={companiesIndex().url}>
                                                Telusuri perusahaan lain
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : (
                                <ul className="grid gap-3 sm:grid-cols-2">
                                    {jobs.map((job) => (
                                        <CompanyJobCard key={job.id} job={job} />
                                    ))}
                                </ul>
                            )}
                        </section>
                    </main>

                    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                        {/* Profile summary */}
                        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background">
                                    {company.logo_url ? (
                                        <img
                                            src={company.logo_url}
                                            alt={company.name}
                                            className="size-full object-contain p-1.5"
                                        />
                                    ) : (
                                        <span className="text-sm font-semibold text-brand-navy">
                                            {initials}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate font-semibold text-foreground">{company.name}</h3>
                                    {company.industry && (
                                        <p className="truncate text-xs text-muted-foreground">
                                            {company.industry}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <ul className="mt-4 space-y-2.5 text-sm">
                                {company.size && (
                                    <li className="flex items-center gap-2 text-foreground/85">
                                        <Users className="size-4 shrink-0 text-muted-foreground" />
                                        {company.size}
                                    </li>
                                )}
                                {(company.city || company.province) && (
                                    <li className="flex items-center gap-2 text-foreground/85">
                                        <MapPin className="size-4 shrink-0 text-muted-foreground" />
                                        {[company.city, company.province].filter(Boolean).join(', ')}
                                    </li>
                                )}
                                {company.website && (
                                    <li className="flex items-center gap-2 text-foreground/85">
                                        <Globe className="size-4 shrink-0 text-muted-foreground" />
                                        <a
                                            href={company.website}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="truncate text-brand-blue hover:underline"
                                        >
                                            {formatHostname(company.website)}
                                        </a>
                                    </li>
                                )}
                            </ul>

                            {company.badges.length > 0 && (
                                <div className="mt-4 border-t border-border/60 pt-4">
                                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Badge
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {company.badges.map((b) => (
                                            <Badge
                                                key={b.id}
                                                variant="secondary"
                                                className="rounded-full border border-brand-blue/15 bg-brand-blue/5 text-brand-blue"
                                            >
                                                {b.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Offices */}
                        {company.offices.length > 0 && (
                            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <MapPin className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-semibold">
                                        Kantor & Lokasi
                                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                            ({company.offices.length})
                                        </span>
                                    </h3>
                                </div>
                                <ul className="mt-4 space-y-3">
                                    {company.offices.map((o) => (
                                        <li
                                            key={o.id}
                                            className="rounded-xl border border-border/60 bg-muted/20 p-3"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-foreground">
                                                    {o.label}
                                                </span>
                                                {o.is_headquarter && (
                                                    <span className="rounded-md bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-blue">
                                                        HQ
                                                    </span>
                                                )}
                                            </div>
                                            {o.address && (
                                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                    {o.address}
                                                </p>
                                            )}
                                            {o.map_url && (
                                                <a
                                                    href={o.map_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                                                >
                                                    <LinkIcon className="size-3" />
                                                    Lihat di peta
                                                </a>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* CTA - Direktori */}
                        <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue p-5 text-white shadow-sm">
                            <h3 className="text-base font-semibold">Cari perusahaan lain?</h3>
                            <p className="mt-1 text-xs text-white/80">
                                Telusuri direktori 1.000+ perusahaan terverifikasi yang sedang aktif merekrut.
                            </p>
                            <Button
                                asChild
                                variant="secondary"
                                className="mt-3 h-9 w-full rounded-xl bg-white text-brand-navy hover:bg-white/90"
                            >
                                <Link href={companiesIndex().url}>
                                    Buka Direktori <ArrowRight className="size-3.5" />
                                </Link>
                            </Button>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
    tone = 'default',
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    tone?: 'default' | 'brand' | 'warn';
}) {
    return (
        <div
            className={cn(
                'rounded-xl border bg-card p-3',
                tone === 'brand'
                    ? 'border-brand-blue/20 bg-brand-blue/5'
                    : tone === 'warn'
                      ? 'border-amber-500/30 bg-amber-50'
                      : 'border-border/70',
            )}
        >
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        'flex size-7 items-center justify-center rounded-lg',
                        tone === 'brand'
                            ? 'bg-brand-blue/15 text-brand-blue'
                            : tone === 'warn'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-muted text-foreground/70',
                    )}
                >
                    <Icon className="size-3.5" />
                </span>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                </p>
            </div>
            <p className="mt-1.5 truncate text-base font-semibold text-foreground sm:text-lg">{value}</p>
        </div>
    );
}

function ContentCard({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon?: LucideIcon;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-start gap-2">
                {Icon && (
                    <span className="mt-0.5 flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                        <Icon className="size-4" />
                    </span>
                )}
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function CompanyJobCard({ job }: { job: CompanyJob }) {
    const salary = useMemo(() => {
        if (!job.is_salary_visible || !job.salary_min) return null;
        if (job.salary_max && job.salary_max !== job.salary_min) {
            return `${formatRupiahShort(job.salary_min)} – ${formatRupiahShort(job.salary_max)}`;
        }
        return formatRupiahShort(job.salary_min);
    }, [job.is_salary_visible, job.salary_min, job.salary_max]);

    return (
        <li>
            <Link
                href={`/jobs/${job.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-md hover:shadow-brand-blue/5"
            >
                <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-0 transition-opacity group-hover:opacity-100"
                />

                <div className="flex items-start justify-between gap-2">
                    {job.is_featured ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                            <Flame className="size-3" /> Butuh Cepat
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Lowongan
                        </span>
                    )}
                    {job.published_at && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="size-3" />
                            {formatRelative(job.published_at)}
                        </span>
                    )}
                </div>

                <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand-blue">
                    {job.title}
                </h3>

                <ul className="mt-2.5 space-y-1.5 text-sm">
                    {job.category && (
                        <li className="flex items-center gap-2 text-foreground/80">
                            <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="line-clamp-1">{job.category}</span>
                        </li>
                    )}
                    {(job.city || job.work_arrangement) && (
                        <li className="flex items-center gap-2 text-foreground/80">
                            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="line-clamp-1">
                                {job.work_arrangement
                                    ? `${formatStatus(job.work_arrangement)}${job.city ? ' · ' : ''}`
                                    : ''}
                                {job.city ?? ''}
                            </span>
                        </li>
                    )}
                    {job.employment_type && (
                        <li className="flex items-center gap-2 text-foreground/80">
                            <Briefcase className="size-3.5 shrink-0 text-muted-foreground" />
                            {formatStatus(job.employment_type)}
                        </li>
                    )}
                </ul>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    {salary ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue">
                            <Wallet className="size-3.5" />
                            {salary}
                            <span className="font-normal text-muted-foreground">/bulan</span>
                        </span>
                    ) : (
                        <span className="text-sm text-muted-foreground">Negotiable</span>
                    )}
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-blue opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                        Detail <ArrowRight className="size-3" />
                    </span>
                </div>
            </Link>
        </li>
    );
}
