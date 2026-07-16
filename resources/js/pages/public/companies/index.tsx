import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Briefcase,
    Building2,
    MapPin,
    Search,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { SelectControl } from '@/components/form/select-control';
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
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as companiesIndex } from '@/routes/public/companies';

/** Sentinel for "no filter applied". Mapped back to null before hitting the server. */
const ALL_FILTER = '__all__';

type Option = { value: string; label: string };

type CompanyRow = {
    id: number;
    name: string;
    slug: string;
    tagline: string | null;
    industry: string | null;
    city: string | null;
    size: string | null;
    logo_url: string | null;
    verification_status: string | null;
    open_jobs_count: number;
};

type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    search: string;
    industry_id: number | null;
    province_id: number | null;
    verified_only: boolean;
};

type Props = {
    companies: Pagination<CompanyRow>;
    filters: Filters;
    options: {
        industries: Option[];
        provinces: Option[];
    };
};

export default function PublicCompaniesIndex({ companies, filters, options }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const hasActiveFilters = Boolean(
        filters.search || filters.industry_id || filters.province_id || filters.verified_only,
    );

    const apply = (next: Partial<Filters>) => {
        router.get(
            companiesIndex().url,
            { ...filters, ...next },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        apply({ search });
    };

    const resetAll = () => {
        setSearch('');
        router.get(companiesIndex().url, {}, { preserveScroll: false, replace: true });
    };

    const industryOptions = useMemo(
        () => [{ value: ALL_FILTER, label: 'Semua industri' }, ...options.industries],
        [options.industries],
    );

    const provinceOptions = useMemo(
        () => [{ value: ALL_FILTER, label: 'Semua provinsi' }, ...options.provinces],
        [options.provinces],
    );

    return (
        <>
            <Head title="Direktori Perusahaan" />

            <div className="space-y-6">
                {/* ===== Page Header ===== */}
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
                                <BreadcrumbPage>Perusahaan</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="flex flex-col gap-3">
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                            <span className="relative flex size-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-blue/60" />
                                <span className="relative inline-flex size-1.5 rounded-full bg-brand-blue" />
                            </span>
                            {companies.total.toLocaleString('id-ID')}+ perusahaan terverifikasi
                        </span>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            Direktori Perusahaan
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Jelajahi perusahaan terverifikasi yang sedang aktif merekrut. Kenali budaya
                            kerja, posisi terbuka, dan industri sebelum Anda melamar.
                        </p>
                    </div>

                    {/* Quick chips */}
                    <div className="-mx-1 flex flex-wrap gap-2 px-1">
                        <button
                            type="button"
                            onClick={() => apply({ verified_only: !filters.verified_only })}
                            className={cn(
                                'group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
                                filters.verified_only
                                    ? 'border-brand-blue/40 bg-brand-blue/10 text-brand-blue shadow-xs'
                                    : 'border-border/60 bg-card text-foreground/80 hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-foreground',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-5 items-center justify-center rounded-full transition-colors',
                                    filters.verified_only ? 'bg-brand-blue text-white' : 'bg-emerald-100 text-emerald-700',
                                )}
                            >
                                <BadgeCheck className="size-3" />
                            </span>
                            Hanya Verified
                        </button>

                        {options.industries.slice(0, 6).map((industry) => {
                            const active = String(filters.industry_id ?? '') === industry.value;
                            return (
                                <button
                                    key={industry.value}
                                    type="button"
                                    onClick={() =>
                                        apply({
                                            industry_id: active ? null : Number(industry.value),
                                        })
                                    }
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
                                        active
                                            ? 'border-brand-blue/40 bg-brand-blue/10 text-brand-blue shadow-xs'
                                            : 'border-border/60 bg-card text-foreground/80 hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-foreground',
                                    )}
                                >
                                    <span className="line-clamp-1 max-w-[160px]">{industry.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search panel */}
                    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-xs sm:p-4">
                        <form
                            onSubmit={onSubmit}
                            className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama perusahaan, industri, atau kota…"
                                    className="h-11 rounded-xl border-border/60 bg-background pl-10 text-sm sm:h-12 sm:text-base"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="h-11 rounded-xl bg-brand-blue px-6 hover:bg-brand-blue/90 sm:h-12"
                            >
                                <Search className="size-4" /> Cari
                            </Button>
                        </form>

                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-sm">
                            <SelectControl
                                value={filters.industry_id ? String(filters.industry_id) : ALL_FILTER}
                                onValueChange={(v) =>
                                    apply({ industry_id: v === ALL_FILTER ? null : Number(v) })
                                }
                                options={industryOptions}
                                searchPlaceholder="Cari industri…"
                                className="h-9 w-auto min-w-[140px] rounded-lg border-border/60 bg-background"
                            />

                            <SelectControl
                                value={filters.province_id ? String(filters.province_id) : ALL_FILTER}
                                onValueChange={(v) =>
                                    apply({ province_id: v === ALL_FILTER ? null : Number(v) })
                                }
                                options={provinceOptions}
                                searchPlaceholder="Cari provinsi…"
                                className="h-9 w-auto min-w-[140px] rounded-lg border-border/60 bg-background"
                            />

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetAll}
                                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                                >
                                    <X className="size-3" /> Reset filter
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* ===== Result strip ===== */}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {hasActiveFilters ? 'Hasil Pencarian' : 'Perusahaan Aktif'}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        Menampilkan{' '}
                        <span className="font-medium text-foreground">
                            {companies.from ?? 0}–{companies.to ?? 0}
                        </span>{' '}
                        dari{' '}
                        <span className="font-medium text-foreground">
                            {companies.total.toLocaleString('id-ID')}
                        </span>{' '}
                        perusahaan
                    </span>
                </div>

                {/* ===== Company grid ===== */}
                {companies.data.length === 0 ? (
                    <EmptyState
                        icon={Building2}
                        title="Belum ada perusahaan"
                        description="Coba ubah kata kunci atau hapus sebagian filter."
                        actions={
                            hasActiveFilters ? (
                                <Button variant="outline" onClick={resetAll}>
                                    Reset filter
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {companies.data.map((c) => (
                            <CompanyCard key={c.id} company={c} />
                        ))}
                    </div>
                )}

                {/* ===== Pagination ===== */}
                {companies.links.length > 3 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm text-muted-foreground">
                        <span>
                            {companies.from ?? 0}–{companies.to ?? 0} dari{' '}
                            {companies.total.toLocaleString('id-ID')}
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {companies.links.map((l, i) => (
                                <Button
                                    key={i}
                                    variant={l.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!l.url}
                                    onClick={() =>
                                        l.url && router.get(l.url, undefined, { preserveScroll: true })
                                    }
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function CompanyCard({ company }: { company: CompanyRow }) {
    const verified = company.verification_status === 'verified';
    const initials =
        company.name
            .split(' ')
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'PT';

    return (
        <Link
            href={`/companies/${company.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/5"
        >
            {/* Top accent strip */}
            <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-0 transition-opacity group-hover:opacity-100"
            />

            {/* Soft gradient header */}
            <div className="relative h-20 overflow-hidden bg-gradient-to-br from-brand-blue/8 via-brand-cyan/5 to-transparent">
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-40"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, rgba(16,128,224,0.15) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                    }}
                />
            </div>

            {/* Logo, hovers above the gradient strip */}
            <div className="relative -mt-8 px-5">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xs ring-4 ring-card transition-transform group-hover:scale-105">
                    {company.logo_url ? (
                        <img
                            src={company.logo_url}
                            alt={company.name}
                            className="size-full object-contain p-2"
                        />
                    ) : (
                        <span className="text-base font-semibold text-brand-navy">{initials}</span>
                    )}
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5 pt-3">
                <div>
                    <div className="flex items-start gap-1.5">
                        <h3 className="line-clamp-1 flex-1 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand-blue">
                            {company.name}
                        </h3>
                        {verified && (
                            <BadgeCheck
                                className="mt-0.5 size-4 shrink-0 fill-brand-blue text-white"
                                aria-label="Verified"
                            />
                        )}
                    </div>
                    {company.tagline ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {company.tagline}
                        </p>
                    ) : (
                        <p className="mt-1 text-xs italic text-muted-foreground/60">
                            Belum ada deskripsi singkat.
                        </p>
                    )}
                </div>

                <ul className="space-y-1.5 text-sm">
                    {company.industry && (
                        <li className="flex items-center gap-2 text-foreground/80">
                            <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="line-clamp-1">{company.industry}</span>
                        </li>
                    )}
                    {company.city && (
                        <li className="flex items-center gap-2 text-foreground/80">
                            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="line-clamp-1">{company.city}</span>
                        </li>
                    )}
                    {company.size && (
                        <li className="flex items-center gap-2 text-foreground/80">
                            <Users className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="line-clamp-1">{company.size}</span>
                        </li>
                    )}
                </ul>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                            company.open_jobs_count > 0
                                ? 'bg-brand-blue/10 text-brand-blue'
                                : 'bg-muted text-muted-foreground',
                        )}
                    >
                        <Briefcase className="size-3" />
                        {company.open_jobs_count > 0
                            ? `${company.open_jobs_count} lowongan aktif`
                            : 'Belum ada lowongan'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                        Lihat <ArrowRight className="size-3" />
                    </span>
                </div>
            </div>
        </Link>
    );
}
