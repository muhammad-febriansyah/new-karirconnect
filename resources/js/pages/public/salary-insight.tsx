import { Head, Link, useForm } from '@inertiajs/react';
import {
    BarChart3,
    Briefcase,
    Building2,
    Calendar,
    DollarSign,
    Layers,
    LineChart,
    MapPin,
    Search,
    Sparkles,
    TrendingUp,
    Users,
    Wallet,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, type FormEvent, type ReactNode } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

type Aggregate = {
    sample_size: number;
    posting_count: number;
    submission_count: number;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    min: number | null;
    max: number | null;
    average: number | null;
    by_experience: Record<string, { count: number; p50: number | null }>;
};

type TopCompany = { company_name: string; slug: string; count: number; p50: number | null };
type Submission = {
    job_title: string;
    salary_idr: number;
    bonus_idr: number;
    experience_level: string | null;
    experience_years: number;
    employment_type: string;
    city: string | null;
    category: string | null;
    is_anonymous: boolean;
    created_at: string | null;
};
type Category = { id: number; name: string; slug: string; count: number };
type CuratedInsight = {
    id: number;
    job_title: string;
    role_category: string;
    city: string | null;
    experience_level: string | null;
    min_salary: number;
    median_salary: number;
    max_salary: number;
    sample_size: number;
    source: string;
    last_updated_at: string | null;
};

type Props = {
    filters: {
        job_category_id?: number;
        city_id?: number;
        experience_level?: string;
        employment_type?: string;
    };
    aggregate: Aggregate;
    topCompanies: TopCompany[];
    recentSubmissions: Submission[];
    popularCategories: Category[];
    curatedInsights: CuratedInsight[];
    options: {
        categories: Array<{ id: number; name: string; slug: string }>;
        cities: Array<{ id: number; name: string }>;
        experience_levels: Array<{ value: string; label: string }>;
    };
};

const idr = (v: number | null) =>
    v == null
        ? '-'
        : new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0,
          }).format(v);

const idrCompact = (v: number | null) => {
    if (v == null) return '-';
    if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}jt`;
    if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
    return `Rp ${v}`;
};

const EMPLOYMENT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'full_time', label: 'Full-time' },
    { value: 'part_time', label: 'Part-time' },
    { value: 'contract', label: 'Kontrak' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'internship', label: 'Magang' },
];

const TIPS = [
    'Gunakan median sebagai patokan, bukan rata-rata — outlier menarik angka rata-rata.',
    'P25-P75 menunjukkan rentang wajar untuk negosiasi.',
    'Sampel di bawah 5 sebaiknya dilihat sebagai indikatif, bukan benchmark.',
];

export default function SalaryInsightPage({
    filters,
    aggregate,
    topCompanies,
    recentSubmissions,
    popularCategories,
    curatedInsights,
    options,
}: Props) {
    const { data, setData, get, processing } = useForm({
        job_category_id: filters.job_category_id ?? '',
        city_id: filters.city_id ?? '',
        experience_level: filters.experience_level ?? '',
        employment_type: filters.employment_type ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get('/salary-insight', { preserveState: true, preserveScroll: true });
    };

    const resetAll = () => {
        setData({ job_category_id: '', city_id: '', experience_level: '', employment_type: '' });
        get('/salary-insight', { preserveScroll: false });
    };

    const hasFilters = Boolean(
        data.job_category_id || data.city_id || data.experience_level || data.employment_type,
    );

    const activeChips = useMemo(() => {
        const chips: Array<{ key: string; label: string; clear: () => void }> = [];
        if (data.job_category_id) {
            const cat = options.categories.find((c) => c.id === Number(data.job_category_id));
            if (cat) {
                chips.push({
                    key: 'cat',
                    label: cat.name,
                    clear: () => setData('job_category_id', ''),
                });
            }
        }
        if (data.city_id) {
            const city = options.cities.find((c) => c.id === Number(data.city_id));
            if (city) {
                chips.push({
                    key: 'city',
                    label: city.name,
                    clear: () => setData('city_id', ''),
                });
            }
        }
        if (data.experience_level) {
            chips.push({
                key: 'exp',
                label: formatStatus(data.experience_level as string),
                clear: () => setData('experience_level', ''),
            });
        }
        if (data.employment_type) {
            const type = EMPLOYMENT_TYPE_OPTIONS.find((t) => t.value === data.employment_type);
            chips.push({
                key: 'type',
                label: type?.label ?? formatStatus(data.employment_type as string),
                clear: () => setData('employment_type', ''),
            });
        }
        return chips;
    }, [data, options.categories, options.cities, setData]);

    // Max value across by_experience for bar scaling
    const maxLevelP50 = useMemo(() => {
        const values = Object.values(aggregate.by_experience)
            .map((s) => s.p50 ?? 0)
            .filter((v) => v > 0);
        return values.length > 0 ? Math.max(...values) : 0;
    }, [aggregate.by_experience]);

    // Distribution percentages for the range bar (min .. p25 .. p50 .. p75 .. max)
    const distribution = useMemo(() => {
        if (!aggregate.min || !aggregate.max || aggregate.min === aggregate.max) return null;
        const span = aggregate.max - aggregate.min;
        const pct = (v: number | null) => (v == null ? 0 : ((v - aggregate.min!) / span) * 100);
        return {
            p25: pct(aggregate.p25),
            p50: pct(aggregate.p50),
            p75: pct(aggregate.p75),
        };
    }, [aggregate.min, aggregate.max, aggregate.p25, aggregate.p50, aggregate.p75]);

    return (
        <>
            <Head title="Salary Insight - KarirConnect" />

            <div className="space-y-6">
                {/* ===== Header ===== */}
                <header className="space-y-6">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={home().url}>Beranda</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Insight Gaji</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="flex flex-col gap-3">
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                            <span className="relative flex size-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-blue/60" />
                                <span className="relative inline-flex size-1.5 rounded-full bg-brand-blue" />
                            </span>
                            Diperbarui dari {aggregate.sample_size.toLocaleString('id-ID')} sample data terkini
                        </span>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            Salary Insight Indonesia
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Data gaji riil dari ribuan lowongan terverifikasi dan laporan kandidat anonim.
                            Saring berdasarkan kategori, kota, dan level pengalaman untuk benchmark akurat.
                        </p>
                    </div>

                    {/* Filter panel */}
                    <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
                        <form
                            onSubmit={submit}
                            className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 md:items-center xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
                        >
                            <Select
                                value={String(data.job_category_id)}
                                onValueChange={(v) => setData('job_category_id', Number(v) || '')}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background sm:h-12">
                                    <SelectValue placeholder="Kategori pekerjaan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.categories.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={String(data.city_id)}
                                onValueChange={(v) => setData('city_id', Number(v) || '')}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background sm:h-12">
                                    <SelectValue placeholder="Kota" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.cities.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={data.experience_level}
                                onValueChange={(v) => setData('experience_level', v)}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background sm:h-12">
                                    <SelectValue placeholder="Level pengalaman" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.experience_levels.map((l) => (
                                        <SelectItem key={l.value} value={l.value}>
                                            {l.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={data.employment_type}
                                onValueChange={(v) => setData('employment_type', v)}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-background sm:h-12">
                                    <SelectValue placeholder="Tipe kerja" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EMPLOYMENT_TYPE_OPTIONS.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="col-span-full h-11 rounded-xl bg-brand-blue px-6 hover:bg-brand-blue/90 sm:h-12 xl:col-span-1"
                            >
                                <Search className="size-4" /> Lihat Data
                            </Button>
                        </form>

                        {activeChips.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Filter aktif:
                                </span>
                                {activeChips.map((chip) => (
                                    <button
                                        key={chip.key}
                                        type="button"
                                        onClick={chip.clear}
                                        className="group inline-flex items-center gap-1 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue transition-colors hover:bg-brand-blue/10"
                                    >
                                        {chip.label}
                                        <X className="size-3 opacity-60 group-hover:opacity-100" />
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={resetAll}
                                    className="ml-auto text-xs font-medium text-brand-blue hover:underline"
                                >
                                    Reset semua
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {aggregate.sample_size === 0 ? (
                    <section className="rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
                        <EmptyState
                            icon={LineChart}
                            title="Data belum cukup"
                            description="Sampel terlalu sedikit untuk filter ini. Coba longgarkan filter atau pilih kategori yang lebih populer."
                            actions={
                                hasFilters ? (
                                    <Button
                                        variant="outline"
                                        onClick={resetAll}
                                        className="rounded-xl border-border/60"
                                    >
                                        Reset filter
                                    </Button>
                                ) : undefined
                            }
                        />
                    </section>
                ) : (
                    <>
                        {/* ===== Hero stats ===== */}
                        <div className="grid gap-4 lg:grid-cols-3">
                            <HeroStat
                                icon={Wallet}
                                label="Median Gaji (P50)"
                                value={idr(aggregate.p50)}
                                hint="Setengah pekerja di rentang ini menerima ≥ angka ini"
                                tone="brand"
                                accentValue
                            />
                            <HeroStat
                                icon={BarChart3}
                                label="Rentang Wajar (P25 – P75)"
                                value={`${idrCompact(aggregate.p25)} – ${idrCompact(aggregate.p75)}`}
                                hint="Zona negosiasi yang umum dipakai"
                            >
                                {distribution && (
                                    <div className="mt-3 space-y-1.5">
                                        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="absolute h-full bg-gradient-to-r from-brand-cyan to-brand-blue"
                                                style={{
                                                    left: `${distribution.p25}%`,
                                                    width: `${distribution.p75 - distribution.p25}%`,
                                                }}
                                            />
                                            <div
                                                className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-navy ring-2 ring-card"
                                                style={{ left: `${distribution.p50}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
                                            <span>{idrCompact(aggregate.min)}</span>
                                            <span>{idrCompact(aggregate.max)}</span>
                                        </div>
                                    </div>
                                )}
                            </HeroStat>
                            <HeroStat
                                icon={Users}
                                label="Jumlah Sample"
                                value={aggregate.sample_size.toLocaleString('id-ID')}
                                hint={`${aggregate.posting_count} dari lowongan · ${aggregate.submission_count} dari kandidat`}
                            >
                                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="bg-brand-blue"
                                        style={{
                                            width: `${
                                                aggregate.sample_size > 0
                                                    ? (aggregate.posting_count / aggregate.sample_size) * 100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                    <div
                                        className="bg-brand-cyan"
                                        style={{
                                            width: `${
                                                aggregate.sample_size > 0
                                                    ? (aggregate.submission_count / aggregate.sample_size) * 100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="size-1.5 rounded-full bg-brand-blue" /> Lowongan
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="size-1.5 rounded-full bg-brand-cyan" /> Kandidat
                                    </span>
                                </div>
                            </HeroStat>
                        </div>

                        {/* ===== Median per Level ===== */}
                        {Object.keys(aggregate.by_experience).length > 0 && (
                            <ContentCard title="Median per Level Pengalaman" icon={TrendingUp}>
                                <div className="space-y-3">
                                    {Object.entries(aggregate.by_experience).map(([level, stat]) => {
                                        const pct =
                                            maxLevelP50 > 0 && stat.p50
                                                ? (stat.p50 / maxLevelP50) * 100
                                                : 0;
                                        return (
                                            <div key={level} className="space-y-1.5">
                                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                                    <span className="font-medium text-foreground">
                                                        {formatStatus(level)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {stat.count} sample
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-muted/50">
                                                        <div
                                                            className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-brand-blue to-brand-cyan transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="min-w-[110px] text-right text-sm font-semibold tabular-nums text-foreground">
                                                        {idrCompact(stat.p50)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ContentCard>
                        )}
                    </>
                )}

                {/* ===== Top companies ===== */}
                {topCompanies.length > 0 && (
                    <ContentCard
                        title="Perusahaan Aktif Membayar Tertinggi"
                        description="Median gaji untuk lowongan yang dibuka perusahaan ini."
                        icon={Briefcase}
                    >
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {topCompanies.map((c, i) => (
                                <li key={`${c.slug}-${i}`}>
                                    <Link
                                        href={`/companies/${c.slug}`}
                                        className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-sm"
                                    >
                                        <span
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums',
                                                i < 3
                                                    ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white'
                                                    : 'bg-muted text-foreground/70',
                                            )}
                                        >
                                            #{i + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-brand-blue">
                                                {c.company_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {c.count} lowongan terbuka
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-right">
                                            <span className="block text-sm font-semibold tabular-nums text-foreground">
                                                {idrCompact(c.p50)}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                Median
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </ContentCard>
                )}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-6">
                        {curatedInsights.length > 0 && (
                            <ContentCard
                                title="Salary Benchmark Kurasi"
                                description="Disusun tim KarirConnect dari berbagai sumber resmi."
                                icon={Sparkles}
                            >
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {curatedInsights.map((item) => {
                                        const span = item.max_salary - item.min_salary;
                                        const medianPct =
                                            span > 0
                                                ? ((item.median_salary - item.min_salary) / span) * 100
                                                : 50;
                                        return (
                                            <div
                                                key={item.id}
                                                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-md hover:shadow-brand-blue/5"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-blue">
                                                        {item.job_title}
                                                    </h3>
                                                    <span className="shrink-0 rounded-md bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-blue">
                                                        Kurasi
                                                    </span>
                                                </div>
                                                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                                    {item.role_category}
                                                    {item.city && (
                                                        <>
                                                            <span className="mx-1.5 text-muted-foreground/50">
                                                                ·
                                                            </span>
                                                            <MapPin className="inline size-3" /> {item.city}
                                                        </>
                                                    )}
                                                    {item.experience_level && (
                                                        <>
                                                            <span className="mx-1.5 text-muted-foreground/50">
                                                                ·
                                                            </span>
                                                            {formatStatus(item.experience_level)}
                                                        </>
                                                    )}
                                                </p>

                                                <div className="mt-3 space-y-1.5">
                                                    <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-brand-cyan/40 to-brand-blue/40" />
                                                        <div
                                                            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-navy ring-2 ring-card"
                                                            style={{ left: `${medianPct}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
                                                        <span>{idrCompact(item.min_salary)}</span>
                                                        <span>{idrCompact(item.max_salary)}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex items-baseline justify-between gap-2">
                                                    <span className="text-base font-bold text-brand-blue tabular-nums">
                                                        {idrCompact(item.median_salary)}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Median · {item.sample_size} sample
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ContentCard>
                        )}

                        {recentSubmissions.length > 0 && (
                            <ContentCard
                                title="Laporan Terbaru dari Kandidat"
                                description="Submisi anonim dari pengguna KarirConnect."
                                icon={Layers}
                            >
                                <ul className="divide-y divide-border/60">
                                    {recentSubmissions.map((s, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {s.job_title}
                                                </p>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                    {s.experience_level && (
                                                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
                                                            {formatStatus(s.experience_level)}
                                                        </span>
                                                    )}
                                                    <span>{s.experience_years} thn</span>
                                                    <span>·</span>
                                                    <span>{formatStatus(s.employment_type)}</span>
                                                    {s.city && (
                                                        <>
                                                            <span>·</span>
                                                            <span className="inline-flex items-center gap-0.5">
                                                                <MapPin className="size-3" />
                                                                {s.city}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-sm font-bold text-brand-blue tabular-nums">
                                                    {idr(s.salary_idr)}
                                                </p>
                                                {s.bonus_idr > 0 && (
                                                    <p className="text-[11px] text-emerald-600 tabular-nums">
                                                        +{idrCompact(s.bonus_idr)} bonus
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </ContentCard>
                        )}
                    </div>

                    <aside className="space-y-4">
                        {popularCategories.length > 0 && (
                            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <Layers className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-semibold">Kategori Populer</h3>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {popularCategories.map((c) => (
                                        <Link
                                            key={c.id}
                                            href={`/salary-insight?job_category_id=${c.id}`}
                                            className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground/80 transition-all hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-brand-blue"
                                        >
                                            {c.name}
                                            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground group-hover:bg-brand-blue/10 group-hover:text-brand-blue">
                                                {c.count}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tips card */}
                        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    <DollarSign className="size-4" />
                                </span>
                                <h3 className="text-sm font-semibold">Cara Membaca Data</h3>
                            </div>
                            <ul className="mt-3 space-y-2.5 text-sm">
                                {TIPS.map((tip, i) => (
                                    <li key={i} className="flex gap-2 text-foreground/85">
                                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-blue" />
                                        <span className="leading-relaxed">{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* CTA - submit your salary */}
                        <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue p-5 text-white shadow-sm">
                            <h3 className="text-base font-semibold">Bantu komunitas</h3>
                            <p className="mt-1 text-xs text-white/80">
                                Submit gaji Anda secara anonim. Setiap data membantu transparansi pasar
                                kerja Indonesia.
                            </p>
                            <Button
                                asChild
                                variant="secondary"
                                className="mt-3 h-9 w-full rounded-xl bg-white text-brand-navy hover:bg-white/90"
                            >
                                <Link href="/salary-insight#kontribusi">
                                    Submit Gaji Anda
                                </Link>
                            </Button>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

function HeroStat({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'default',
    accentValue,
    children,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
    tone?: 'default' | 'brand';
    accentValue?: boolean;
    children?: ReactNode;
}) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm',
                tone === 'brand'
                    ? 'border-brand-blue/30 bg-gradient-to-br from-brand-blue/8 via-brand-cyan/5 to-transparent'
                    : 'border-border/70',
            )}
        >
            {tone === 'brand' && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-brand-blue/10 blur-2xl"
                />
            )}
            <div className="relative flex items-center gap-2">
                <span
                    className={cn(
                        'flex size-8 items-center justify-center rounded-lg',
                        tone === 'brand'
                            ? 'bg-brand-blue/15 text-brand-blue'
                            : 'bg-muted text-foreground/70',
                    )}
                >
                    <Icon className="size-4" />
                </span>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                </p>
            </div>
            <p
                className={cn(
                    'relative mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl',
                    accentValue ? 'text-brand-blue' : 'text-foreground',
                )}
            >
                {value}
            </p>
            {hint && <p className="relative mt-1 text-xs text-muted-foreground">{hint}</p>}
            {children}
        </div>
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
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
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
