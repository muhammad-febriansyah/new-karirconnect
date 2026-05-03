import { Link, router, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    Bookmark,
    Briefcase,
    Building2,
    ChevronDown,
    ChevronRight,
    Clock,
    Flame,
    GraduationCap,
    Laptop2,
    MapPin,
    Megaphone,
    Search,
    Sparkles,
    TrendingUp,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { SeoHead } from '@/components/seo-head';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as jobBrowseIndex } from '@/routes/public/jobs';
import type { SharedPageProps } from '@/types/shared';

type Option = { value: string; label: string };

type JobRow = {
    id: number;
    slug: string;
    title: string;
    employment_type: string | null;
    work_arrangement: string | null;
    experience_level: string | null;
    is_featured: boolean;
    is_anonymous: boolean;
    salary_min: number | null;
    salary_max: number | null;
    is_salary_visible: boolean;
    published_at: string | null;
    application_deadline: string | null;
    company: {
        id?: number;
        name: string;
        slug?: string;
        logo_url: string | null;
        verification_status: string | null;
    };
    category: string | null;
    city: string | null;
    skills: string[];
};

type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    search: string | null;
    category_id: number | null;
    province_id: number | null;
    city_id: number | null;
    employment_type: string | null;
    work_arrangement: string | null;
    experience_level: string | null;
    salary_min: number | null;
    skill_ids: number[];
    featured_only: boolean | null;
    sort: string | null;
};

type Props = {
    jobs: Pagination<JobRow>;
    filters: Filters;
    options: {
        categories: Option[];
        provinces: Option[];
        cities: Option[];
        skills: Option[];
        employment_types: Option[];
        work_arrangements: Option[];
        experience_levels: Option[];
    };
};

const formatRupiahShort = (value: number | null): string => {
    if (!value) return '';
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} jt`;
    if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
    return `Rp ${value}`;
};

const formatRelative = (iso: string | null): string => {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'Baru saja';
    if (min < 60) return `${min} menit lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}j lalu`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}h lalu`;
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

const SALARY_BANDS: { value: string; label: string }[] = [
    { value: '5000000', label: '> Rp 5 jt' },
    { value: '10000000', label: '> Rp 10 jt' },
    { value: '15000000', label: '> Rp 15 jt' },
    { value: '20000000', label: '> Rp 20 jt' },
    { value: '30000000', label: '> Rp 30 jt' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
    { value: 'latest', label: 'Terbaru' },
    { value: 'salary_high', label: 'Gaji tertinggi' },
    { value: 'relevance', label: 'Paling relevan' },
];

const TAB_GRADIENTS: string[] = [
    'from-brand-blue/90 to-brand-cyan/90',
    'from-brand-navy/90 to-brand-blue/90',
    'from-fuchsia-500/85 to-rose-500/85',
    'from-amber-500/85 to-orange-500/85',
    'from-emerald-500/85 to-teal-500/85',
    'from-sky-500/85 to-indigo-500/85',
    'from-violet-500/85 to-purple-500/85',
    'from-rose-500/85 to-pink-500/85',
];

type QuickPick = {
    key: string;
    label: string;
    icon: LucideIcon;
    color: string;
    next: Partial<Filters>;
    isActive: (f: Filters) => boolean;
};

const QUICK_PICKS: QuickPick[] = [
    {
        key: 'urgent',
        label: 'Butuh Cepat',
        icon: Megaphone,
        color: 'text-orange-600 bg-orange-100',
        next: { featured_only: true },
        isActive: (f) => Boolean(f.featured_only),
    },
    {
        key: 'top',
        label: 'Top Company',
        icon: TrendingUp,
        color: 'text-brand-blue bg-brand-blue/10',
        next: { sort: 'relevance', featured_only: true },
        isActive: (f) => f.sort === 'relevance',
    },
    {
        key: 'remote',
        label: 'Kerja Remote',
        icon: Laptop2,
        color: 'text-emerald-600 bg-emerald-100',
        next: { work_arrangement: 'remote' },
        isActive: (f) => f.work_arrangement === 'remote',
    },
    {
        key: 'mt',
        label: 'MT / Magang',
        icon: Briefcase,
        color: 'text-violet-600 bg-violet-100',
        next: { employment_type: 'internship' },
        isActive: (f) => f.employment_type === 'internship',
    },
    {
        key: 'fresh',
        label: 'Fresh Graduate',
        icon: GraduationCap,
        color: 'text-amber-600 bg-amber-100',
        next: { experience_level: 'entry' },
        isActive: (f) => f.experience_level === 'entry',
    },
];

function CompanyAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
    const initials = useMemo(
        () => name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'PT',
        [name],
    );

    return (
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background ring-1 ring-border/30">
            {logoUrl ? (
                <img src={logoUrl} alt={name} className="size-full object-contain p-1" />
            ) : (
                <span className="text-sm font-semibold text-brand-navy">{initials}</span>
            )}
        </div>
    );
}

export default function PublicJobsIndex({ jobs, filters, options }: Props) {
    const { auth } = usePage<SharedPageProps>().props;
    const [search, setSearch] = useState(filters.search ?? '');
    const [showAllCategories, setShowAllCategories] = useState(false);

    const hasActiveFilters = Boolean(
        filters.search ||
            filters.category_id ||
            filters.province_id ||
            filters.city_id ||
            filters.employment_type ||
            filters.work_arrangement ||
            filters.experience_level ||
            filters.salary_min ||
            filters.featured_only ||
            (filters.skill_ids?.length ?? 0) > 0,
    );

    const description = filters.search
        ? `Temukan ${jobs.total} lowongan yang relevan untuk pencarian "${filters.search}" di KarirConnect.`
        : `Jelajahi ${jobs.total} lowongan kerja terbaru dari perusahaan terverifikasi di Indonesia.`;

    const apply = (next: Partial<Filters>) => {
        router.get(
            jobBrowseIndex().url,
            { ...filters, ...next },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        apply({ search });
    };

    const resetFilters = () => {
        router.get(
            jobBrowseIndex().url,
            { sort: 'latest' },
            { preserveScroll: false, replace: true },
        );
    };

    const visibleCategories = showAllCategories ? options.categories : options.categories.slice(0, 8);
    const isCategoryActive = (id: string) => String(filters.category_id ?? '') === id;
    const isAllActive = filters.category_id === null;

    const savedHref = auth.user ? '/employee/saved-jobs' : '/login';
    const applicationsHref = auth.user ? '/employee/applications' : '/login';

    return (
        <>
            <SeoHead
                title={filters.search ? `Lowongan ${filters.search}` : 'Lowongan Kerja'}
                description={description}
                canonical={jobBrowseIndex().url}
                robots={hasActiveFilters ? 'noindex,follow' : 'index,follow'}
            />

            <div className="space-y-8">
            {/* ===== Page Header ===== */}
            <header className="space-y-3">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href={home().url}>Beranda</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Lowongan Kerja</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            Lowongan Kerja
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Telusuri {jobs.total.toLocaleString('id-ID')}+ lowongan terbaru dari perusahaan
                            terverifikasi di seluruh Indonesia. Temukan peran yang sesuai dengan keahlian dan
                            tujuan karirmu.
                        </p>
                    </div>
                </div>
            </header>

            {/* ===== Hero / Job Fair banner ===== */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue text-white shadow-xl shadow-brand-navy/10">
                {/* Decorative grid pattern */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-30"
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
                {/* Soft glow blob */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-32 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-brand-cyan/30 blur-3xl"
                />

                <div className="relative px-4 py-10 sm:px-8 sm:py-14">
                    <div className="text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/90 backdrop-blur">
                            <Sparkles className="size-3.5" /> KarirConnect Job Fair
                        </span>
                        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                            Karir Impian Anda Mulai dari Sini{' '}
                            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                                #JalanKarirmu
                            </span>
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
                            Bursa kerja online dengan {jobs.total.toLocaleString('id-ID')}+ lowongan dari perusahaan
                            terverifikasi di seluruh Indonesia.
                        </p>
                    </div>

                    {/* Quick picks */}
                    <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                        {QUICK_PICKS.map((q) => {
                            const active = q.isActive(filters);
                            return (
                                <button
                                    key={q.key}
                                    type="button"
                                    onClick={() => apply(q.next)}
                                    className={cn(
                                        'group flex items-center justify-between gap-2 rounded-xl border bg-white/95 px-3 py-3 text-left text-sm font-semibold text-brand-navy shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-lg',
                                        active
                                            ? 'border-brand-blue/60 ring-2 ring-brand-blue/40'
                                            : 'border-white/30',
                                    )}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                                                q.color,
                                            )}
                                        >
                                            <q.icon className="size-4" />
                                        </span>
                                        <span className="truncate">{q.label}</span>
                                    </span>
                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-blue" />
                                </button>
                            );
                        })}
                    </div>

                    {/* Search panel */}
                    <div className="mx-auto mt-5 max-w-5xl">
                        <div className="rounded-2xl border border-white/30 bg-white/95 p-3 shadow-2xl shadow-brand-navy/30 backdrop-blur sm:p-4">
                            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari posisi, perusahaan, atau skill…"
                                        className="h-12 rounded-xl border-transparent bg-muted/30 pl-10 text-base focus-visible:bg-background"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" size="lg" className="h-12 flex-1 rounded-xl px-6 sm:flex-none">
                                        <Search className="size-4" /> Cari
                                    </Button>
                                    <Button
                                        type="button"
                                        size="lg"
                                        variant="outline"
                                        asChild
                                        className="h-12 rounded-xl border-brand-blue/20 bg-brand-blue/5 text-brand-navy hover:bg-brand-blue/10"
                                    >
                                        <Link href={savedHref}>
                                            <Bookmark className="size-4" /> <span className="hidden sm:inline">Tersimpan</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        type="button"
                                        size="lg"
                                        variant="outline"
                                        asChild
                                        className="h-12 rounded-xl border-brand-blue/20 bg-brand-blue/5 text-brand-navy hover:bg-brand-blue/10"
                                    >
                                        <Link href={applicationsHref}>
                                            <BadgeCheck className="size-4" /> <span className="hidden sm:inline">Lamaran</span>
                                        </Link>
                                    </Button>
                                </div>
                            </form>

                            {/* Filter dropdown row */}
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
                                <FilterSelect
                                    placeholder="Level"
                                    value={filters.experience_level}
                                    options={options.experience_levels}
                                    onChange={(v) => apply({ experience_level: v })}
                                />
                                <FilterSelect
                                    placeholder="Jenis"
                                    value={filters.employment_type}
                                    options={options.employment_types}
                                    onChange={(v) => apply({ employment_type: v })}
                                />
                                <FilterSelect
                                    placeholder="Tipe"
                                    value={filters.work_arrangement}
                                    options={options.work_arrangements}
                                    onChange={(v) => apply({ work_arrangement: v })}
                                />
                                <FilterSelect
                                    placeholder="Lokasi"
                                    value={filters.province_id !== null ? String(filters.province_id) : null}
                                    options={options.provinces}
                                    onChange={(v) => apply({ province_id: v ? Number(v) : null })}
                                />
                                <FilterSelect
                                    placeholder="Gaji"
                                    value={filters.salary_min !== null ? String(filters.salary_min) : null}
                                    options={SALARY_BANDS}
                                    onChange={(v) => apply({ salary_min: v ? Number(v) : null })}
                                />
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="hidden text-xs text-muted-foreground sm:inline">Urutkan</span>
                                    <FilterSelect
                                        placeholder="Terbaru"
                                        value={filters.sort && filters.sort !== 'latest' ? filters.sort : null}
                                        options={SORT_OPTIONS}
                                        onChange={(v) => apply({ sort: v ?? 'latest' })}
                                        defaultLabel="Terbaru"
                                    />
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <div className="mt-2 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="text-xs font-medium text-brand-blue hover:underline"
                                    >
                                        Reset semua filter
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== Body ===== */}
            <div className="space-y-6">
                {/* Category tabs */}
                <div className="-mx-1 flex flex-wrap gap-2 px-1">
                    <CategoryTab
                        active={isAllActive}
                        gradient="from-brand-blue to-brand-cyan"
                        onClick={() => apply({ category_id: null })}
                    >
                        Semua Pekerjaan
                    </CategoryTab>
                    {visibleCategories.map((c, i) => (
                        <CategoryTab
                            key={c.value}
                            active={isCategoryActive(c.value)}
                            gradient={TAB_GRADIENTS[(i + 1) % TAB_GRADIENTS.length]}
                            onClick={() =>
                                apply({
                                    category_id: isCategoryActive(c.value) ? null : Number(c.value),
                                })
                            }
                        >
                            {c.label}
                        </CategoryTab>
                    ))}
                    {options.categories.length > 8 && (
                        <button
                            type="button"
                            onClick={() => setShowAllCategories((prev) => !prev)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-amber-500/85 to-orange-500/85 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                        >
                            {showAllCategories ? 'Lebih Sedikit' : 'Lihat Semua'}
                            <ChevronDown className={cn('size-4 transition-transform', showAllCategories && 'rotate-180')} />
                        </button>
                    )}
                </div>

                {/* Result count */}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {hasActiveFilters ? 'Hasil Pencarian' : 'Lowongan Terbaru'}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        Menampilkan <span className="font-medium text-foreground">{jobs.from ?? 0}–{jobs.to ?? 0}</span> dari{' '}
                        <span className="font-medium text-foreground">{jobs.total.toLocaleString('id-ID')}</span> lowongan
                    </span>
                </div>

                {/* Job cards grid */}
                {jobs.data.length === 0 ? (
                    <EmptyState
                        icon={Briefcase}
                        title="Belum ada lowongan"
                        description="Coba longgarkan filter atau periksa kembali nanti."
                        actions={
                            hasActiveFilters ? (
                                <Button onClick={resetFilters} variant="outline">
                                    Reset filter
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {jobs.data.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {jobs.links.length > 3 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
                        <span>
                            {jobs.from ?? 0}–{jobs.to ?? 0} dari {jobs.total}
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {jobs.links.map((l, i) => (
                                <Button
                                    key={i}
                                    variant={l.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!l.url}
                                    onClick={() => l.url && router.get(l.url, undefined, { preserveScroll: true })}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            </div>
        </>
    );
}

function FilterSelect({
    placeholder,
    value,
    options,
    onChange,
    defaultLabel,
}: {
    placeholder: string;
    value: string | null;
    options: Option[];
    onChange: (value: string | null) => void;
    defaultLabel?: string;
}) {
    return (
        <Select
            value={value ?? '__all__'}
            onValueChange={(v) => onChange(v === '__all__' ? null : v)}
        >
            <SelectTrigger className="h-9 w-auto min-w-[120px] rounded-lg border-border/60 bg-background text-sm">
                <SelectValue placeholder={placeholder}>
                    {value
                        ? options.find((o) => o.value === value)?.label ?? placeholder
                        : (defaultLabel ?? placeholder)}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="__all__">{defaultLabel ?? `Semua ${placeholder.toLowerCase()}`}</SelectItem>
                {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function CategoryTab({
    active,
    gradient,
    onClick,
    children,
}: {
    active: boolean;
    gradient: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-sm font-semibold transition-all',
                active
                    ? `bg-gradient-to-br text-white shadow-md ${gradient}`
                    : 'border border-border/60 bg-background text-foreground/80 hover:border-brand-blue/30 hover:bg-muted/50 hover:text-foreground',
            )}
        >
            {active && (
                <span aria-hidden className="size-2 rounded-full bg-white/90" />
            )}
            <span className="max-w-[180px] truncate">{children}</span>
        </button>
    );
}

function JobCard({ job }: { job: JobRow }) {
    const salary = job.is_salary_visible && job.salary_min
        ? job.salary_max && job.salary_max !== job.salary_min
            ? `${formatRupiahShort(job.salary_min)} – ${formatRupiahShort(job.salary_max)}`
            : formatRupiahShort(job.salary_min)
        : 'Negotiable';

    const verified = job.company.verification_status === 'verified';
    const isHot = job.is_featured;

    return (
        <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/5">
            {/* Top decorative gradient strip on hover */}
            <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-0 transition-opacity group-hover:opacity-100"
            />

            <div className="flex items-start justify-between gap-2 p-4 pb-3">
                {isHot ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                        <Flame className="size-3" /> Loker Butuh Cepat
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        Lowongan
                    </span>
                )}
                <button
                    type="button"
                    aria-label="Simpan lowongan"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
                >
                    <Bookmark className="size-4" />
                </button>
            </div>

            <Link href={`/jobs/${job.slug}`} className="flex flex-1 flex-col gap-3 px-4 pb-4">
                <div className="flex items-start gap-3">
                    <CompanyAvatar name={job.company.name} logoUrl={job.company.logo_url} />
                    <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand-blue">
                            {job.title}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                            <span className="truncate">{job.company.name}</span>
                            {verified && (
                                <BadgeCheck className="size-3.5 shrink-0 fill-brand-blue text-white" aria-label="Verified" />
                            )}
                        </div>
                    </div>
                </div>

                <ul className="space-y-1.5 text-sm">
                    {job.employment_type && (
                        <li className="flex items-center gap-2 text-brand-blue">
                            <Briefcase className="size-3.5 shrink-0" />
                            <span className="font-medium">{formatStatus(job.employment_type)}</span>
                        </li>
                    )}
                    <li className="flex items-center gap-2 text-foreground/80">
                        <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                            {job.work_arrangement ? `${formatStatus(job.work_arrangement)} · ` : ''}
                            {job.city ?? 'Lokasi fleksibel'}
                        </span>
                    </li>
                    {job.experience_level && (
                        <li className="flex items-center gap-2 text-foreground/80">
                            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                            <span>Min. {formatStatus(job.experience_level)}</span>
                        </li>
                    )}
                    <li className="flex items-center gap-2 text-foreground/80">
                        <Wallet className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{salary}</span>
                    </li>
                </ul>
            </Link>

            <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {job.published_at ? `Diposting ${formatRelative(job.published_at)}` : 'Baru saja'}
                </span>
                {job.skills.length > 0 && (
                    <span className="hidden truncate font-medium text-foreground/70 sm:inline">
                        {job.skills.slice(0, 2).join(' · ')}
                    </span>
                )}
            </div>
        </article>
    );
}
