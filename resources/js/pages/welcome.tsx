import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    Briefcase,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    FileSearch,
    Flame,
    Gift,
    Globe,
    GraduationCap,
    MapPin,
    Search,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Star,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import {  useMemo, useState } from 'react';
import type {FormEvent} from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';
import type { SharedPageProps } from '@/types';

type FeaturedJob = {
    slug: string;
    title: string;
    company_name: string | null;
    company_slug: string | null;
    company_logo: string | null;
    category: string | null;
    city: string | null;
    employment_type: string | null;
    work_arrangement: string | null;
    experience_level: string | null;
    salary_min: number | null;
    salary_max: number | null;
    applications_count: number;
    is_featured: boolean;
    highlight: JobHighlight | null;
    published_at: string | null;
};

type JobHighlight = 'urgent' | 'few_applicants' | 'fresh_grad' | 'remote' | 'high_salary' | 'featured';

type TopCompany = {
    slug: string;
    name: string;
    logo: string | null;
    industry: string | null;
    open_jobs: number;
    review_count: number;
    avg_rating: number | null;
};

type TopCategory = {
    slug: string;
    name: string;
    job_count: number;
};

type SalaryTeaser = {
    title: string;
    sample_count: number;
    salary_min: number;
    salary_max: number;
};

type Testimonial = {
    name: string;
    role: string;
    company: string;
    rating: number;
    text: string;
};

type Article = {
    slug: string;
    title: string;
    excerpt: string;
    category: string | null;
    thumbnail: string | null;
    reading_minutes: number;
    published_at: string | null;
};

type FaqEntry = {
    id: number;
    question: string;
    answer: string;
    category: string | null;
};

type SelectOption = { value: string; label: string };

type SearchOptions = {
    provinces: SelectOption[];
    employment_types: SelectOption[];
    work_arrangements: SelectOption[];
    experience_levels: SelectOption[];
    education_levels: SelectOption[];
};

type Home = {
    metrics: { open_jobs: number; active_companies: number; candidates: number; salary_reports: number };
    featured_jobs: FeaturedJob[];
    top_companies: TopCompany[];
    top_categories: TopCategory[];
    salary_teasers: SalaryTeaser[];
    testimonials: Testimonial[];
    articles: Article[];
    faqs: FaqEntry[];
    search_options: SearchOptions;
};

type Props = {
    canRegister?: boolean;
    home: Home;
};

const idr = (v: number | null) => (v == null ? null : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v));

const compact = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

const salaryRange = (min: number | null, max: number | null) => {
    if (!min && !max) {
        return null;
    }

    if (min && max) {
        return `${idr(min)} – ${idr(max)}`;
    }

    return idr(min ?? max);
};

const initials = (name: string) =>
    name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

/** Relative "x jam lalu" label from an ISO timestamp. */
function timeAgo(iso: string | null): string | null {
    if (!iso) {
        return null;
    }

    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const mins = Math.round(diff / 60000);

    if (mins < 60) {
        return `${Math.max(1, mins)} menit lalu`;
    }

    const hours = Math.round(mins / 60);

    if (hours < 24) {
        return `${hours} jam lalu`;
    }

    const days = Math.round(hours / 24);

    if (days < 30) {
        return `${days} hari lalu`;
    }

    return `${Math.round(days / 30)} bulan lalu`;
}

/**
 * Searchable location picker for the hero search bar. Uses Command inside a
 * Popover so the user can type to filter the province list.
 */
function LocationCombobox({
    value,
    options,
    onChange,
    bare = false,
    placeholder = 'Semua Lokasi',
}: {
    value: string | null;
    options: SelectOption[];
    onChange: (value: string | null) => void;
    bare?: boolean;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const active = options.find((o) => o.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'flex flex-1 items-center gap-2 text-left text-sm text-brand-navy transition-all focus:outline-none',
                        bare
                            ? 'h-12 rounded-xl px-3 hover:bg-muted/40 sm:max-w-[15rem]'
                            : 'h-14 rounded-2xl border border-border/70 bg-background px-5 hover:border-brand-blue/40 data-[state=open]:border-brand-blue/40 data-[state=open]:ring-2 data-[state=open]:ring-brand-blue/15 md:max-w-xs',
                    )}
                >
                    <MapPin className="size-4 shrink-0 text-muted-foreground/70" />
                    <span className={cn('flex-1 truncate', !active && 'text-muted-foreground/60')}>{active?.label ?? placeholder}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Cari lokasi…" />
                    <CommandList>
                        <CommandEmpty>Lokasi tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="Semua Lokasi"
                                onSelect={() => {
                                    onChange(null);
                                    setOpen(false);
                                }}
                            >
                                <Check className={cn('size-4', value === null ? 'opacity-100' : 'opacity-0')} />
                                Semua Lokasi
                            </CommandItem>
                            {options.map((o) => (
                                <CommandItem
                                    key={o.value}
                                    value={o.label}
                                    onSelect={() => {
                                        onChange(o.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('size-4', value === o.value ? 'opacity-100' : 'opacity-0')} />
                                    {o.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

/** Quick-filter pills under the hero search — each lands on /jobs with a valid query. */
const QUICK_FILTERS: { label: string; icon: React.ComponentType<{ className?: string }>; params: Record<string, string | number | boolean> }[] = [
    { label: 'Butuh Cepat', icon: Flame, params: { sort: 'latest' } },
    { label: 'Top Perusahaan', icon: Star, params: { featured_only: true } },
    { label: 'Kerja Remote', icon: Globe, params: { work_arrangement: 'remote' } },
    { label: 'Fresh Graduate', icon: GraduationCap, params: { experience_level: 'entry' } },
    { label: 'Pelamar Sedikit', icon: Users, params: { sort: 'oldest' } },
    { label: 'Gaji Tinggi', icon: Banknote, params: { sort: 'salary_desc' } },
];

/** Native styled dropdown for the job-grid filter row. */
function FilterSelect({
    value,
    onChange,
    options,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder: string;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-border/70 bg-background pl-4 pr-9 text-sm font-medium text-brand-navy transition-colors hover:border-brand-blue/40 focus:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
            >
                <option value="">{placeholder}</option>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        </div>
    );
}

const HIGHLIGHTS: Record<JobHighlight, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
    urgent: { label: 'Butuh Cepat', icon: Flame, className: 'bg-orange-500 text-white' },
    few_applicants: { label: 'Pelamar Sedikit', icon: Zap, className: 'bg-amber-400 text-amber-950' },
    fresh_grad: { label: 'Fresh Graduate', icon: GraduationCap, className: 'bg-emerald-500 text-white' },
    remote: { label: 'Kerja Remote', icon: Globe, className: 'bg-brand-blue text-white' },
    high_salary: { label: 'Gaji Tinggi', icon: Banknote, className: 'bg-violet-500 text-white' },
    featured: { label: 'Pilihan', icon: Sparkles, className: 'bg-sky-500 text-white' },
};

function JobCard({ job }: { job: FeaturedJob }) {
    const salary = salaryRange(job.salary_min, job.salary_max);
    const posted = timeAgo(job.published_at);
    const highlight = job.highlight ? HIGHLIGHTS[job.highlight] : null;

    return (
        <div className="group/card relative flex flex-col rounded-2xl border border-border/60 bg-background p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-lg hover:shadow-brand-blue/10">
            {/* Highlight badge */}
            {highlight && (
                <span
                    className={cn(
                        'mb-3 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm',
                        highlight.className,
                    )}
                >
                    <highlight.icon className="size-3" /> {highlight.label}
                </span>
            )}

            {/* Company + title */}
            <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 ring-1 ring-border/60">
                    {job.company_logo ? (
                        <img src={job.company_logo} alt={job.company_name ?? ''} loading="lazy" className="size-full object-cover" />
                    ) : (
                        <span className="bg-gradient-to-br from-brand-blue to-brand-cyan bg-clip-text text-sm font-bold text-transparent">
                            {initials(job.company_name ?? job.title)}
                        </span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <Link
                        href={`/jobs/${job.slug}`}
                        className="line-clamp-2 text-sm font-bold leading-snug text-brand-navy transition-colors hover:text-brand-blue"
                    >
                        {job.title}
                    </Link>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{job.company_name ?? '-'}</div>
                </div>
            </div>

            {/* Meta badges */}
            <div className="mt-4 flex flex-wrap gap-1.5">
                {job.employment_type && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-brand-navy">
                        {formatStatus(job.employment_type)}
                    </span>
                )}
                {job.city && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-brand-navy">
                        <MapPin className="size-3 text-muted-foreground" /> {job.city}
                    </span>
                )}
                {job.work_arrangement && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-brand-navy">
                        {formatStatus(job.work_arrangement)}
                    </span>
                )}
                {job.experience_level && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-brand-navy">
                        {formatStatus(job.experience_level)}
                    </span>
                )}
            </div>

            {salary && <div className="mt-4 text-sm font-bold text-brand-navy">{salary}</div>}

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <Users className="size-3" /> {compact(job.applications_count)} pelamar
                    </span>
                    {posted && (
                        <>
                            <span aria-hidden>·</span>
                            <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" /> {posted}
                            </span>
                        </>
                    )}
                </span>
                <Button asChild size="sm" className="h-8 rounded-lg bg-gradient-to-r from-brand-blue to-[#1565E0] px-4 text-xs font-bold text-white shadow-sm shadow-brand-blue/30 hover:shadow-md">
                    <Link href={`/jobs/${job.slug}`}>Lamar</Link>
                </Button>
            </div>
        </div>
    );
}

function CompanyGridCard({ company }: { company: TopCompany }) {
    return (
        <Link
            href={`/companies/${company.slug}`}
            className="group/co flex flex-col rounded-2xl border border-border/60 bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md hover:shadow-brand-blue/10"
        >
            <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 ring-1 ring-border/60">
                    {company.logo ? (
                        <img src={company.logo} alt={company.name} loading="lazy" className="size-full object-cover" />
                    ) : (
                        <span className="bg-gradient-to-br from-brand-blue to-brand-cyan bg-clip-text text-sm font-bold text-transparent">
                            {initials(company.name)}
                        </span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-bold text-brand-navy transition-colors group-hover/co:text-brand-blue">{company.name}</h3>
                    {company.industry && <p className="line-clamp-1 text-xs text-muted-foreground">{company.industry}</p>}
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                <span className="text-sm font-semibold text-brand-blue">{company.open_jobs} Loker</span>
                <ChevronRight className="size-4 text-muted-foreground/50 transition-all group-hover/co:translate-x-0.5 group-hover/co:text-brand-blue" />
            </div>
        </Link>
    );
}

function ArticleCard({ article, logoPath }: { article: Article; logoPath?: string | null }) {
    // Treat broken or placeholder (tiny) thumbnails as missing so the brand logo shows instead.
    const [thumbBroken, setThumbBroken] = useState(false);
    const hasThumb = !!article.thumbnail && !thumbBroken;

    return (
        <Link
            href={`/career-resources/${article.slug}`}
            className="group/art flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-lg hover:shadow-brand-blue/10"
        >
            <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-muted/40">
                {hasThumb ? (
                    <img
                        src={article.thumbnail!}
                        alt={article.title}
                        loading="lazy"
                        onError={() => setThumbBroken(true)}
                        onLoad={(e) => {
                            if (e.currentTarget.naturalWidth < 64 || e.currentTarget.naturalHeight < 64) {
                                setThumbBroken(true);
                            }
                        }}
                        className="size-full object-cover transition-transform duration-500 group-hover/art:scale-105"
                    />
                ) : logoPath ? (
                    <img src={logoPath} alt="KarirConnect" loading="lazy" className="h-9 w-auto opacity-90 transition-transform duration-300 group-hover/art:scale-110" />
                ) : (
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-md transition-transform duration-300 group-hover/art:scale-110">
                        <AppLogoIcon className="size-7 fill-current text-white" />
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-2.5 p-5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {article.category && (
                        <span className="inline-flex items-center rounded-full bg-brand-blue/10 px-2 py-0.5 font-semibold text-brand-blue">{article.category}</span>
                    )}
                    <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {article.reading_minutes} menit baca
                    </span>
                </div>
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-brand-navy transition-colors group-hover/art:text-brand-blue">{article.title}</h3>
            </div>
        </Link>
    );
}

export default function Welcome({ home }: Props) {
    const page = usePage<SharedPageProps>();
    const { auth } = page.props;
    const logoPath = (page.props as unknown as { branding?: { logo_path?: string | null } }).branding?.logo_path ?? null;
    const options = home.search_options;
    const [search, setSearch] = useState('');
    const [provinceId, setProvinceId] = useState<string | null>(null);

    // Job-grid client-side filters
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [typeFilter, setTypeFilter] = useState('');
    const [arrangementFilter, setArrangementFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');

    const goToJobs = (overrides: Record<string, string | number | boolean> = {}) => {
        const params: Record<string, string | number | boolean> = {};

        if (search.trim()) {
            params.search = search.trim();
        }

        if (provinceId) {
            params.province_id = provinceId;
        }

        router.get('/jobs', { ...params, ...overrides }, { preserveState: false });
    };

    const submitSearch = (e: FormEvent) => {
        e.preventDefault();
        goToJobs();
    };

    const categoryTabs = useMemo(() => ['Semua', ...home.top_categories.map((c) => c.name)], [home.top_categories]);

    const typeOptions = useMemo<SelectOption[]>(() => {
        const seen = new Map<string, string>();
        home.featured_jobs.forEach((j) => {
            if (j.employment_type) {
                seen.set(j.employment_type, formatStatus(j.employment_type));
            }
        });

        return [...seen].map(([value, label]) => ({ value, label }));
    }, [home.featured_jobs]);

    const arrangementOptions = useMemo<SelectOption[]>(() => {
        const seen = new Map<string, string>();
        home.featured_jobs.forEach((j) => {
            if (j.work_arrangement) {
                seen.set(j.work_arrangement, formatStatus(j.work_arrangement));
            }
        });

        return [...seen].map(([value, label]) => ({ value, label }));
    }, [home.featured_jobs]);

    const cityOptions = useMemo<SelectOption[]>(() => {
        const seen = new Set<string>();
        home.featured_jobs.forEach((j) => {
            if (j.city) {
                seen.add(j.city);
            }
        });

        return [...seen].map((c) => ({ value: c, label: c }));
    }, [home.featured_jobs]);

    const filteredJobs = useMemo(
        () =>
            home.featured_jobs.filter(
                (j) =>
                    (activeCategory === 'Semua' || j.category === activeCategory) &&
                    (!typeFilter || j.employment_type === typeFilter) &&
                    (!arrangementFilter || j.work_arrangement === arrangementFilter) &&
                    (!cityFilter || j.city === cityFilter),
            ),
        [home.featured_jobs, activeCategory, typeFilter, arrangementFilter, cityFilter],
    );

    return (
        <>
            <SeoHead
                title="KarirConnect"
                description="KarirConnect membantu Anda menemukan lowongan kerja terbaik di Indonesia, terhubung dengan perusahaan, dan menavigasi karier dengan AI."
                canonical="/"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: 'KarirConnect',
                    url: '/',
                    description: 'Lowongan kerja, insight gaji, dan dukungan AI dalam satu platform karier.',
                }}
            />

            {/* ===== Hero ===== */}
            <section className="relative overflow-hidden border-b border-brand-navy/20 bg-gradient-to-b from-[#1b5fd6] via-[#1550c4] to-[#103e9e] text-white">
                {/* Flowing contour lines */}
                <svg
                    aria-hidden
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    preserveAspectRatio="xMidYMid slice"
                    viewBox="0 0 1440 760"
                    fill="none"
                >
                    <g stroke="#fff" strokeWidth="1" fill="none">
                        <path d="M-50 120 C 360 40, 720 200, 1100 90 S 1600 180, 1700 110" strokeOpacity="0.10" />
                        <path d="M-50 200 C 380 110, 760 280, 1140 170 S 1620 250, 1720 190" strokeOpacity="0.08" />
                        <path d="M-50 300 C 320 220, 700 380, 1120 270 S 1640 340, 1740 300" strokeOpacity="0.06" />
                        <path d="M1490 60 C 1300 200, 1380 420, 1180 560 S 1240 760, 1040 880" strokeOpacity="0.12" />
                        <path d="M1560 60 C 1370 210, 1450 440, 1250 580 S 1310 780, 1110 900" strokeOpacity="0.09" />
                        <path d="M1630 60 C 1440 220, 1520 460, 1320 600 S 1380 800, 1180 920" strokeOpacity="0.06" />
                        <path d="M-120 560 C 180 470, 360 700, 700 600 S 1100 700, 1300 600" strokeOpacity="0.08" />
                        <path d="M-120 640 C 200 540, 380 780, 720 680 S 1120 780, 1320 690" strokeOpacity="0.06" />
                    </g>
                </svg>
                {/* Glow blobs */}
                <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand-cyan/20 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-white/8 blur-3xl" />
                <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pt-24 pb-10 text-center sm:px-6 sm:pt-32">
                    <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                        Cari Lowongan Kerja Impianmu
                        <br className="hidden sm:block" />{' '}
                        <span className="bg-gradient-to-b from-yellow-300 to-amber-400 bg-clip-text text-transparent">#BarengKarirConnect</span>
                    </h1>
                    {/* Trust badges */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-white/80 sm:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="size-4 text-brand-cyan" /> Data terenkripsi
                        </span>
                        <span aria-hidden className="text-white/30">·</span>
                        <span className="inline-flex items-center gap-1.5">
                            <Building2 className="size-4 text-brand-cyan" /> Perusahaan terverifikasi
                        </span>
                        <span aria-hidden className="text-white/30">·</span>
                        <span className="inline-flex items-center gap-1.5">
                            <Star className="size-4 fill-brand-cyan text-brand-cyan" /> 4.8 rating pengguna
                        </span>
                        <span aria-hidden className="text-white/30">·</span>
                        <span className="inline-flex items-center gap-1.5">
                            <Gift className="size-4 text-brand-cyan" /> Gratis untuk kandidat
                        </span>
                    </div>

                    {/* Search bar — single flat pill */}
                    <form
                        onSubmit={submitSearch}
                        className="mt-9 flex w-full max-w-3xl flex-col gap-2 rounded-2xl border border-border/60 bg-white p-2 shadow-xl shadow-brand-blue/5 sm:flex-row sm:items-center"
                    >
                        <div className="flex h-12 flex-1 items-center gap-2 rounded-xl px-3">
                            <Search className="size-5 shrink-0 text-muted-foreground/60" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Posisi, skill, atau perusahaan…"
                                className="border-0 bg-transparent text-sm text-brand-navy shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
                            />
                        </div>
                        <div aria-hidden className="hidden h-7 w-px shrink-0 bg-border sm:block" />
                        <LocationCombobox value={provinceId} options={options.provinces} onChange={setProvinceId} bare placeholder="Kota atau Remote…" />
                        <Button
                            type="submit"
                            className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-brand-blue to-[#1565E0] px-7 text-sm font-bold text-white shadow-md shadow-brand-blue/30 transition-all hover:shadow-lg"
                        >
                            <Search className="size-4" /> Cari Loker
                        </Button>
                    </form>

                    {/* Quick-filter pills — satu baris */}
                    <div className="mt-6 flex w-full max-w-5xl flex-nowrap items-center justify-center gap-2 overflow-x-auto px-1 sm:gap-2.5">
                        {QUICK_FILTERS.map((f) => (
                            <button
                                key={f.label}
                                type="button"
                                onClick={() => goToJobs(f.params)}
                                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:text-brand-blue"
                            >
                                <f.icon className="size-3.5 text-brand-blue" /> {f.label}
                            </button>
                        ))}
                    </div>

                </div>
            </section>

            {/* ===== Job listings ===== */}
            {home.featured_jobs.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                    <div className="mb-6 flex flex-col gap-1">
                        <h2 className="text-2xl font-bold tracking-tight text-brand-navy">Lowongan Terbaru</h2>
                        <p className="text-sm text-muted-foreground">Posisi terbaru dari perusahaan tepercaya di seluruh Indonesia.</p>
                    </div>

                    {/* Category tabs — satu baris, scroll horizontal kalau sempit */}
                    <div className="-mx-4 mb-4 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                        {categoryTabs.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveCategory(tab)}
                                className={cn(
                                    'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                                    activeCategory === tab
                                        ? 'border-brand-blue bg-brand-blue text-white shadow-sm shadow-brand-blue/30'
                                        : 'border-border bg-background text-brand-navy hover:border-brand-blue/40 hover:bg-brand-blue/5',
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Dropdown filters + count */}
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                            <FilterSelect value={typeFilter} onChange={setTypeFilter} options={typeOptions} placeholder="Semua Jenis" />
                            <FilterSelect value={arrangementFilter} onChange={setArrangementFilter} options={arrangementOptions} placeholder="Semua Kerja" />
                            <FilterSelect value={cityFilter} onChange={setCityFilter} options={cityOptions} placeholder="Semua Lokasi" />
                        </div>
                        <span className="text-sm text-muted-foreground">
                            Menampilkan <span className="font-semibold text-brand-navy">{filteredJobs.length}</span> lowongan
                        </span>
                    </div>

                    {filteredJobs.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredJobs.map((job) => (
                                <JobCard key={job.slug} job={job} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
                            <p className="text-sm text-muted-foreground">Tidak ada lowongan yang cocok dengan filter ini.</p>
                        </div>
                    )}

                    <div className="mt-8 flex justify-center">
                        <Button asChild variant="outline" className="h-11 rounded-xl border-brand-blue/30 px-6 font-semibold text-brand-blue hover:bg-brand-blue/5">
                            <Link href="/jobs">
                                Lihat Semua Lowongan <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                </section>
            )}

            {/* ===== Featured companies ===== */}
            {home.top_companies.length > 0 && (
                <section className="border-y bg-muted/20">
                    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                        <div className="mb-7 flex items-end justify-between">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">Perusahaan Unggulan</span>
                                <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Bergabung dengan perusahaan terbaik</h2>
                            </div>
                            <Link href="/companies" className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex">
                                Lihat semua →
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {home.top_companies.map((c) => (
                                <CompanyGridCard key={c.slug} company={c} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ===== AI CV Analyzer ===== */}
            <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-blue to-brand-cyan p-8 text-white shadow-xl shadow-brand-blue/20 sm:p-10">
                    <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-white/15 blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-brand-cyan/40 blur-3xl" />
                    <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
                        <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
                                <Sparkles className="size-3" /> Fitur Baru: AI CV Analyzer
                            </span>
                            <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight">Analisis CV-mu dengan Kecerdasan Buatan</h2>
                            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
                                Upload CV-mu dan dapatkan feedback instan tentang kekuatan, kelemahan, skor ATS, dan rekomendasi perbaikan dari AI
                                kami.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Button asChild size="lg" className="h-11 rounded-xl bg-white px-5 font-bold text-brand-blue shadow-md hover:bg-white/95">
                                    <Link href={auth?.user ? '/employee/cv/index' : '/register/jobseeker'}>
                                        Analisis CV Sekarang <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="h-11 rounded-xl border-white/30 bg-white/10 px-5 font-semibold text-white backdrop-blur hover:bg-white/15 hover:text-white"
                                >
                                    <Link href="/career-resources">Lihat Demo</Link>
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[
                                { icon: TrendingUp, text: 'Skor ATS otomatis (0–100)' },
                                { icon: FileSearch, text: 'Analisis kata kunci per industri' },
                                { icon: CheckCircle2, text: 'Rekomendasi format & struktur' },
                                { icon: Briefcase, text: 'Perbandingan dengan deskripsi kerja' },
                            ].map((f) => (
                                <div key={f.text} className="flex items-start gap-3 rounded-xl bg-white/10 p-4 backdrop-blur">
                                    <f.icon className="mt-0.5 size-5 shrink-0 text-white" />
                                    <span className="text-sm font-medium leading-snug text-white">{f.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== Articles ===== */}
            {home.articles.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
                    <div className="mb-7 flex items-end justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">Tips & Panduan</span>
                            <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Artikel terbaru untuk kariermu</h2>
                        </div>
                        <Link href="/career-resources" className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex">
                            Semua Artikel →
                        </Link>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {home.articles.map((a) => (
                            <ArticleCard key={a.slug} article={a} logoPath={logoPath} />
                        ))}
                    </div>
                </section>
            )}

            {/* ===== Employer CTA ===== */}
            <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
                <div className="relative overflow-hidden rounded-3xl bg-brand-navy p-8 text-white shadow-xl sm:p-10">
                    <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-blue/30 blur-3xl" />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-[0.12]"
                        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
                    />
                    <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-cyan backdrop-blur">
                                <Building2 className="size-4" /> Untuk Perusahaan
                            </span>
                            <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Temukan talenta terbaik Indonesia</h2>
                            <p className="mt-3 max-w-lg text-sm text-white/85 sm:text-base">
                                Posting lowongan kerja, akses database kandidat, dan gunakan fitur ATS kami untuk merekrut lebih cepat dan efisien.
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                            <div className="flex flex-col gap-3 sm:w-64">
                                <Button asChild size="lg" className="h-12 rounded-xl bg-white px-5 font-bold text-brand-blue shadow-md hover:bg-white/95">
                                    <Link href="/register/perusahaan">
                                        Pasang Lowongan — Gratis <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="h-12 rounded-xl border-white/30 bg-white/5 px-5 font-semibold text-white backdrop-blur hover:bg-white/15 hover:text-white"
                                >
                                    <Link href="/register/perusahaan">Lihat Paket Harga</Link>
                                </Button>
                            </div>
                            <p className="text-xs text-white/60 sm:text-right">
                                Lebih dari {compact(home.metrics.active_companies)} perusahaan telah bergabung
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== Download App ===== */}
            <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
                <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/60 bg-muted/30 p-6 sm:flex-row sm:items-center sm:p-8">
                    <div className="flex items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-md">
                            <Smartphone className="size-6" />
                        </span>
                        <div>
                            <h3 className="text-lg font-bold text-brand-navy">Download Aplikasi KarirConnect</h3>
                            <p className="text-sm text-muted-foreground">Lamar kerja di mana saja, kapan saja. Gratis!</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-navy px-5 text-sm font-semibold text-white transition-all hover:bg-brand-navy/90"
                        >
                            <Smartphone className="size-4" /> Google Play
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-navy px-5 text-sm font-semibold text-white transition-all hover:bg-brand-navy/90"
                        >
                            <Smartphone className="size-4" /> App Store
                        </button>
                    </div>
                </div>
            </section>
        </>
    );
}
