import { Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Award, BookOpen, Bot, Brain, Briefcase, BriefcaseBusiness, Building2, Check, CheckCircle2, ChevronDown, Clock, FileSearch, FileText, MapPin, Search, ShieldCheck, Sparkles, Star, Target, TrendingUp, UserPlus, Users, Wand2, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { type FormEvent, useState } from 'react';
import { AnimatedTestimonials } from '@/components/ui/animated-testimonials';
import { Marquee } from '@/components/ui/marquee';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
    salary_min: number | null;
    salary_max: number | null;
    is_featured: boolean;
    published_at: string | null;
};

type TopCompany = {
    slug: string;
    name: string;
    logo: string | null;
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

const idrCompact = (v: number) => {
    if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)} M`;
    if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)} jt`;
    if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)} rb`;
    return `Rp ${v}`;
};

const compact = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

type CategoryMeta = {
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    blob: string;
};

/**
 * Map a job category name/slug to an icon + color theme. Pattern matching
 * keeps it forgiving — admins can rename categories without breaking the UI.
 */
function categoryMeta(name: string, slug: string, fallbackIndex: number): CategoryMeta {
    const key = `${name} ${slug}`.toLowerCase();
    if (/(software|engineer|developer|tech|teknologi|programmer|it)/.test(key)) {
        return { icon: Brain, tone: 'from-blue-500/15 to-cyan-400/10 ring-blue-500/20 text-blue-600', blob: 'from-blue-400/40 to-cyan-300/20' };
    }
    if (/(data|analytic|ai|machine|kecerdasan)/.test(key)) {
        return { icon: Zap, tone: 'from-violet-500/15 to-fuchsia-400/10 ring-violet-500/20 text-violet-600', blob: 'from-violet-400/40 to-fuchsia-300/20' };
    }
    if (/(product)/.test(key)) {
        return { icon: Target, tone: 'from-rose-500/15 to-pink-400/10 ring-rose-500/20 text-rose-600', blob: 'from-rose-400/40 to-pink-300/20' };
    }
    if (/(design|ui|ux|kreatif)/.test(key)) {
        return { icon: Wand2, tone: 'from-orange-500/15 to-amber-400/10 ring-orange-500/20 text-orange-600', blob: 'from-orange-400/40 to-amber-300/20' };
    }
    if (/(marketing|brand|content|sosial)/.test(key)) {
        return { icon: Sparkles, tone: 'from-pink-500/15 to-rose-400/10 ring-pink-500/20 text-pink-600', blob: 'from-pink-400/40 to-rose-300/20' };
    }
    if (/(sales|business|bisnis)/.test(key)) {
        return { icon: TrendingUp, tone: 'from-emerald-500/15 to-teal-400/10 ring-emerald-500/20 text-emerald-600', blob: 'from-emerald-400/40 to-teal-300/20' };
    }
    if (/(human|hr|sumber|people|talent)/.test(key)) {
        return { icon: Users, tone: 'from-cyan-500/15 to-sky-400/10 ring-cyan-500/20 text-cyan-600', blob: 'from-cyan-400/40 to-sky-300/20' };
    }
    if (/(finance|accounting|keuangan|akun)/.test(key)) {
        return { icon: BriefcaseBusiness, tone: 'from-amber-500/15 to-yellow-400/10 ring-amber-500/20 text-amber-600', blob: 'from-amber-400/40 to-yellow-300/20' };
    }
    // Fallback rotates through 4 brand colors
    const fallbacks: CategoryMeta[] = [
        { icon: Briefcase, tone: 'from-blue-500/15 to-cyan-400/10 ring-blue-500/20 text-blue-600', blob: 'from-blue-400/40 to-cyan-300/20' },
        { icon: Briefcase, tone: 'from-violet-500/15 to-fuchsia-400/10 ring-violet-500/20 text-violet-600', blob: 'from-violet-400/40 to-fuchsia-300/20' },
        { icon: Briefcase, tone: 'from-emerald-500/15 to-teal-400/10 ring-emerald-500/20 text-emerald-600', blob: 'from-emerald-400/40 to-teal-300/20' },
        { icon: Briefcase, tone: 'from-amber-500/15 to-orange-400/10 ring-amber-500/20 text-amber-600', blob: 'from-amber-400/40 to-orange-300/20' },
    ];
    return fallbacks[fallbackIndex % fallbacks.length];
}

const salaryRange = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `${idr(min)} – ${idr(max)}`;
    return idr(min ?? max);
};

function ProfileFieldsPreview() {
    return (
        <div className="space-y-1.5">
            {[
                { label: 'Nama', val: 'Bima Santoso', filled: true },
                { label: 'Posisi', val: 'Backend Engineer', filled: true },
                { label: 'Skills', val: 'PHP · Laravel · MySQL', filled: true },
                { label: 'Ekspektasi', val: '—', filled: false },
            ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 rounded-md bg-background px-2.5 py-1.5 ring-1 ring-border/40">
                    <span className="w-16 shrink-0 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                        {f.label}
                    </span>
                    <span className={cn('flex-1 truncate text-[11px]', f.filled ? 'font-semibold text-brand-navy' : 'text-muted-foreground/60')}>
                        {f.val}
                    </span>
                    {f.filled ? (
                        <CheckCircle2 className="size-3 text-emerald-500" />
                    ) : (
                        <span className="size-2 rounded-full bg-muted-foreground/30" />
                    )}
                </div>
            ))}
        </div>
    );
}

function MatchScorePreview() {
    return (
        <div className="space-y-2">
            {[
                { title: 'Senior Backend', match: 92 },
                { title: 'Tech Lead', match: 78 },
                { title: 'Full Stack', match: 64 },
            ].map((j) => (
                <div key={j.title} className="rounded-md bg-background p-2 ring-1 ring-border/40">
                    <div className="mb-1 flex items-center justify-between">
                        <span className="truncate text-[11px] font-semibold text-brand-navy">{j.title}</span>
                        <span className="text-[11px] font-bold text-brand-blue">{j.match}%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-brand-blue" style={{ width: `${j.match}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function PipelinePreview() {
    const steps = ['Dikirim', 'Ditinjau', 'Interview', 'Tawaran'];
    const activeIndex = 2;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-1">
                {steps.map((s, i) => (
                    <div key={s} className="flex flex-1 flex-col items-center gap-1">
                        <div className="relative w-full">
                            <div className={cn('h-1 w-full rounded-full', i <= activeIndex ? 'bg-brand-blue' : 'bg-muted')} />
                            {i === activeIndex && (
                                <span className="absolute -top-0.5 right-0 size-2 rounded-full border-2 border-background bg-brand-blue shadow-sm" />
                            )}
                        </div>
                        <span
                            className={cn(
                                'text-[9px] font-medium',
                                i <= activeIndex ? 'text-brand-navy' : 'text-muted-foreground/60',
                            )}
                        >
                            {s}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5 ring-1 ring-border/40">
                <CheckCircle2 className="size-3 shrink-0 text-emerald-600" />
                <span className="truncate text-[10px] font-medium text-brand-navy">
                    Interview dijadwalkan · Sen 10:00
                </span>
            </div>
        </div>
    );
}

function CompanyCard({ company }: { company: TopCompany }) {
    const isHiring = company.open_jobs > 0;
    const hasReviews = company.review_count > 0 && company.avg_rating !== null;

    return (
        <Link
            href={`/companies/${company.slug}`}
            className="group/co relative flex w-[280px] shrink-0 items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md hover:shadow-brand-blue/10 sm:w-[320px] sm:gap-3.5 sm:p-3.5"
        >
            <div className="relative shrink-0">
                <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 ring-1 ring-border/60 sm:size-14">
                    {company.logo ? (
                        <img src={company.logo} alt={company.name} loading="lazy" className="size-full object-cover" />
                    ) : (
                        <span className="bg-gradient-to-br from-brand-blue to-brand-cyan bg-clip-text text-base font-bold text-transparent">
                            {company.name
                                .split(' ')
                                .slice(0, 2)
                                .map((w) => w[0])
                                .join('')
                                .toUpperCase()}
                        </span>
                    )}
                </div>
                {isHiring && (
                    <span
                        aria-label="Sedang merekrut"
                        className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-background ring-1 ring-border/60"
                    >
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                        </span>
                    </span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <h3 className="line-clamp-1 text-sm font-bold text-brand-navy transition-colors group-hover/co:text-brand-blue">
                        {company.name}
                    </h3>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {hasReviews ? (
                        <>
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            <span className="font-semibold text-brand-navy">{company.avg_rating}</span>
                            <span>({company.review_count})</span>
                        </>
                    ) : (
                        <span>Belum ada ulasan</span>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-1">
                        <Briefcase className="size-3 text-brand-blue" />
                        <span className="font-semibold text-brand-navy">{company.open_jobs}</span>
                        <span>lowongan</span>
                    </span>
                </div>
            </div>

            <ArrowRight className="size-4 shrink-0 -translate-x-1 text-brand-blue opacity-0 transition-all group-hover/co:translate-x-0 group-hover/co:opacity-100" />
        </Link>
    );
}

function FaqItem({ item }: { item: FaqEntry }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={cn('overflow-hidden rounded-xl border border-border/60 bg-background transition-all', open && 'shadow-sm')}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open}
            >
                <span className="text-sm font-semibold text-brand-navy sm:text-base">{item.question}</span>
                <ChevronDown
                    className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180 text-brand-blue')}
                />
            </button>
            <div
                className={cn(
                    'grid transition-all duration-200',
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-border/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Searchable location picker for the hero search bar. Uses Command inside a
 * Popover so the user can type to filter the province list.
 */
function LocationCombobox({
    value,
    options,
    onChange,
    onBlue = false,
}: {
    value: string | null;
    options: SelectOption[];
    onChange: (value: string | null) => void;
    onBlue?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const active = options.find((o) => o.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'flex flex-1 items-center gap-2 text-left text-sm transition-all focus:outline-none',
                        onBlue
                            ? 'h-12 rounded-xl bg-white px-4 text-brand-navy shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-white/60'
                            : 'h-14 md:max-w-xs rounded-2xl border border-border/70 bg-background px-5 text-[15px] text-brand-navy hover:border-brand-blue/40 data-[state=open]:border-brand-blue/40 data-[state=open]:ring-2 data-[state=open]:ring-brand-blue/15',
                    )}
                >
                    <MapPin className={cn('size-4 shrink-0', onBlue ? 'text-brand-blue' : 'text-muted-foreground/70')} />
                    <span className={cn('flex-1 truncate', !active && (onBlue ? 'text-muted-foreground' : 'text-muted-foreground/60'))}>
                        {active?.label ?? 'Semua Lokasi'}
                    </span>
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

/**
 * Pill-style dropdown for the hero search filters. Mirrors the kitalulus
 * filter row — value is held in local state and applied on search submit.
 */
export default function Welcome({ home }: Props) {
    const { auth } = usePage<SharedPageProps>().props;
    const options = home.search_options;
    const [search, setSearch] = useState('');
    const [provinceId, setProvinceId] = useState<string | null>(null);

    const goToJobs = (overrides: Record<string, string | number> = {}) => {
        const params: Record<string, string | number> = {};
        if (search.trim()) params.search = search.trim();
        if (provinceId) params.province_id = provinceId;
        router.get('/jobs', { ...params, ...overrides }, { preserveState: false });
    };

    const submitSearch = (e: FormEvent) => {
        e.preventDefault();
        goToJobs();
    };

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

            {/* ===== Hero (white backdrop) ===== */}
            <section className="relative overflow-hidden border-b bg-white">
                {/* Large smooth bubble shapes (concentric radial blobs) */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -left-1/4 -top-1/3 size-[60rem] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(96,165,255,0.16) 0%, rgba(96,165,255,0.07) 38%, rgba(96,165,255,0) 65%)' }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute right-[-18rem] -top-1/4 size-[58rem] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(120,180,255,0.14) 0%, rgba(120,180,255,0.06) 40%, rgba(120,180,255,0) 66%)' }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/3 top-1/4 size-[40rem] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(120,180,255,0.08) 0%, rgba(120,180,255,0) 60%)' }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-1/3 -right-1/4 size-[52rem] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(86,160,255,0.13) 0%, rgba(86,160,255,0.05) 42%, rgba(86,160,255,0) 68%)' }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-1/4 -left-1/4 size-[46rem] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(96,165,255,0.12) 0%, rgba(96,165,255,0.05) 42%, rgba(96,165,255,0) 68%)' }}
                />
                {/* Dotted grids (top-right + bottom-left) */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute right-8 top-12 hidden h-48 w-52 opacity-70 md:block"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(96,165,255,0.4) 2px, transparent 2px)',
                        backgroundSize: '22px 22px',
                    }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute bottom-12 left-8 hidden h-48 w-52 opacity-60 md:block"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(96,165,255,0.4) 2px, transparent 2px)',
                        backgroundSize: '22px 22px',
                    }}
                />

                <div className="relative z-10">
                    <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-16 lg:pt-20 lg:pb-16">
                        {/* Status pill */}
                        <Link
                            href="/register/jobseeker"
                            className="group/badge inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-1 py-1 pr-4 text-xs shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-blue/10 hover:shadow-md"
                        >
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-blue to-[#1565E0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                                <Sparkles className="size-3" /> Baru
                            </span>
                            <span className="font-medium text-brand-navy">AI Career Coach gratis untuk semua kandidat</span>
                            <ArrowRight className="size-3 text-muted-foreground/60 transition-transform group-hover/badge:translate-x-0.5" />
                        </Link>

                        {/* Heading */}
                        <h1 className="text-2xl font-extrabold leading-[1.1] tracking-tight text-brand-navy sm:text-3xl lg:text-4xl xl:text-5xl">
                            <span className="lg:whitespace-nowrap">
                                Karir Impianmu Dimulai{' '}
                                <span className="bg-gradient-to-b from-brand-blue to-[#1565E0] bg-clip-text text-transparent">
                                    dari Sini
                                </span>
                            </span>
                        </h1>

                        <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                            AI Coach, latihan interview, insight gaji riil & ribuan lowongan terverifikasi di
                            seluruh Indonesia.
                        </p>

                        {/* Search panel — white card on blue backdrop */}
                        <div className="w-full max-w-5xl rounded-[2rem] border border-border/60 bg-white p-5 shadow-2xl shadow-brand-blue/10 sm:p-7">
                            <form
                                onSubmit={submitSearch}
                                className="group/search relative flex flex-col items-stretch gap-3 md:flex-row md:items-center"
                            >
                                {/* Keyword input */}
                                <div className="flex h-14 flex-1 items-center gap-2.5 rounded-2xl border border-border/70 bg-background px-5 transition-all focus-within:border-brand-blue/50 focus-within:ring-2 focus-within:ring-brand-blue/15">
                                    <Search className="size-5 shrink-0 text-muted-foreground/60" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Cari nama pekerjaan/perusahaan"
                                        className="border-0 bg-transparent text-[15px] text-brand-navy shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
                                    />
                                </div>
                                {/* Location combobox (searchable) */}
                                <LocationCombobox
                                    value={provinceId}
                                    options={options.provinces}
                                    onChange={setProvinceId}
                                />
                                <Button
                                    type="submit"
                                    className="h-14 rounded-2xl bg-gradient-to-r from-brand-blue to-[#1565E0] px-8 text-base font-bold text-white shadow-md shadow-brand-blue/30 transition-all hover:shadow-lg md:w-auto"
                                >
                                    <Search className="size-5" /> Cari
                                </Button>
                            </form>
                        </div>

                        {/* Popular chips */}
                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                            <span className="text-muted-foreground">Populer:</span>
                            {['Backend Engineer', 'UI/UX Designer', 'Digital Marketing', 'Data Analyst'].map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => router.get('/jobs', { search: q }, { preserveState: false })}
                                    className="rounded-full border border-border bg-background px-3 py-1 font-medium text-brand-navy transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:bg-brand-blue/5 hover:shadow-sm"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>

                        {/* Stat strip */}
                        <div className="grid w-full max-w-md grid-cols-2 justify-items-center gap-x-6 gap-y-5 pt-1 sm:max-w-4xl sm:grid-cols-4 sm:gap-x-8">
                            {[
                                { icon: BriefcaseBusiness, label: 'Lowongan', value: home.metrics.open_jobs },
                                { icon: Building2, label: 'Perusahaan', value: home.metrics.active_companies },
                                { icon: Users, label: 'Kandidat', value: home.metrics.candidates },
                                { icon: TrendingUp, label: 'Lapor gaji', value: home.metrics.salary_reports },
                            ].map((m) => (
                                <div key={m.label} className="flex items-center gap-2.5">
                                    <m.icon className="size-6 shrink-0 text-brand-blue" strokeWidth={2} />
                                    <span className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
                                        {compact(m.value)}
                                    </span>
                                    <span className="text-sm font-medium text-muted-foreground">{m.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Company trust strip */}
                        {home.top_companies.some((c) => c.logo) && (
                            <div className="flex flex-col items-center gap-3 pt-1">
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                    Dipercaya perusahaan terkemuka
                                </span>
                                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                                    {home.top_companies
                                        .filter((c) => c.logo)
                                        .slice(0, 6)
                                        .map((c) => (
                                            <Link
                                                key={c.slug}
                                                href={`/companies/${c.slug}`}
                                                title={c.name}
                                                className="grayscale opacity-60 transition-all hover:opacity-100 hover:grayscale-0"
                                            >
                                                <img
                                                    src={c.logo!}
                                                    alt={c.name}
                                                    loading="lazy"
                                                    className="h-7 w-auto object-contain sm:h-8"
                                                />
                                            </Link>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Live job marquee */}
                    {home.featured_jobs.length > 0 && (
                        <div className="relative pb-6">
                            <div className="mb-3 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                <span className="relative flex size-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                                </span>
                                Lowongan terbaru hari ini
                            </div>
                            <div className="relative">
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-20"
                                />
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-20"
                                />
                                <Marquee pauseOnHover className="[--duration:80s] [--gap:0.75rem]">
                                    {home.featured_jobs.map((job) => (
                                        <Link
                                            key={job.slug}
                                            href={`/jobs/${job.slug}`}
                                            className="flex w-[260px] shrink-0 items-center gap-3 rounded-2xl border border-border/60 bg-background/90 p-3 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md hover:shadow-brand-blue/10 sm:w-[280px]"
                                        >
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 text-brand-blue ring-1 ring-brand-blue/15">
                                                <BriefcaseBusiness className="size-4" />
                                            </div>
                                            <div className="min-w-0 flex-1 text-left">
                                                <div className="truncate text-xs font-semibold text-brand-navy">{job.title}</div>
                                                <div className="flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                                                    <span className="truncate">{job.company_name ?? '-'}</span>
                                                    {job.city && (
                                                        <>
                                                            <span aria-hidden>·</span>
                                                            <MapPin className="size-2.5 shrink-0" />
                                                            <span className="truncate">{job.city}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {job.is_featured && (
                                                <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                                                    Top
                                                </span>
                                            )}
                                        </Link>
                                    ))}
                                </Marquee>
                            </div>
                        </div>
                    )}

                    {/* Trust strip */}
                    <div className="relative border-t border-border/60 bg-muted/30">
                        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-4 text-center sm:flex-row sm:justify-center sm:gap-8 sm:px-6 lg:px-8">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <ShieldCheck className="size-3.5 text-brand-blue" /> Data terenkripsi
                            </span>
                            <span aria-hidden className="hidden text-border sm:inline">·</span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CheckCircle2 className="size-3.5 text-emerald-500" /> Perusahaan terverifikasi
                            </span>
                            <span aria-hidden className="hidden text-border sm:inline">·</span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Star className="size-3.5 fill-amber-400 text-amber-400" /> 4.8 rating pengguna
                            </span>
                            <span aria-hidden className="hidden text-border sm:inline">·</span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Award className="size-3.5 text-brand-blue" /> Gratis untuk kandidat
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== How It Works ===== */}
            <section className="border-y bg-muted/20 py-16 sm:py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="mb-12 max-w-2xl"
                    >
                        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                            Cara Kerja
                        </span>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                            Dari profil ke offer dalam 3 langkah
                        </h2>
                        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                            AI bekerja di belakang layar — Anda fokus melamar dan wawancara.
                        </p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
                        className="relative grid gap-5 lg:grid-cols-3 lg:gap-6"
                    >
                        {[
                            {
                                n: '01',
                                icon: UserPlus,
                                title: 'Bangun profil',
                                desc: 'Isi pengalaman & skill — AI langsung memetakan kekuatan dan area pengembangan.',
                                preview: <ProfileFieldsPreview />,
                            },
                            {
                                n: '02',
                                icon: Wand2,
                                title: 'Dapatkan kecocokan',
                                desc: 'AI Match Score merekomendasikan lowongan paling relevan dengan persentase & alasan.',
                                preview: <MatchScorePreview />,
                            },
                            {
                                n: '03',
                                icon: Target,
                                title: 'Lamar & wawancara',
                                desc: 'Latih dengan AI Interview, lamar 1-klik, pantau progres hingga tawaran masuk.',
                                preview: <PipelinePreview />,
                            },
                        ].map((step) => (
                            <motion.div
                                key={step.n}
                                variants={{
                                    hidden: { opacity: 0, y: 24 },
                                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                                }}
                                className="group/step relative flex flex-col rounded-2xl border border-border/60 bg-background p-6 transition-colors hover:border-brand-blue/30 sm:p-7"
                            >
                                {/* Step number + icon row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex size-11 items-center justify-center rounded-xl bg-brand-blue/8 text-brand-blue ring-1 ring-brand-blue/15">
                                        <step.icon className="size-5" />
                                    </div>
                                    <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground/70">
                                        {step.n} / 03
                                    </span>
                                </div>

                                <h3 className="mt-5 text-lg font-semibold tracking-tight text-brand-navy">
                                    {step.title}
                                </h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                    {step.desc}
                                </p>

                                {/* Mini visual preview */}
                                <div className="mt-5 rounded-lg border border-border/40 bg-muted/30 p-3">
                                    {step.preview}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ===== AI Features Bento ===== */}
            <section className="border-y bg-gradient-to-br from-brand-blue/[0.04] via-background to-brand-cyan/[0.04]">
                <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
                    <div className="mb-10 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-blue ring-1 ring-brand-blue/20">
                            <Sparkles className="size-3" /> Fitur AI
                        </span>
                        <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                            Asisten karier AI yang bekerja 24/7
                        </h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                            Empat fitur AI terintegrasi yang membantu Anda dari mempersiapkan diri hingga mendapat tawaran.
                        </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
                        {/* AI Career Coach (large card) */}
                        <div className="group/bento relative overflow-hidden rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:shadow-lg lg:col-span-2 lg:row-span-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-md">
                                        <Bot className="size-6" />
                                    </div>
                                    <h3 className="mt-4 text-2xl font-bold text-brand-navy">AI Career Coach</h3>
                                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                                        Konsultasi karier kapan saja: rencana 6 bulan, persiapan interview, negosiasi gaji, atau review CV — semua dalam Bahasa Indonesia.
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> Online
                                </span>
                            </div>

                            {/* Mock chat preview */}
                            <div className="mt-6 space-y-2.5">
                                <div className="flex items-end gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white">
                                        <Bot className="size-3.5" />
                                    </div>
                                    <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-xs leading-relaxed text-brand-navy">
                                        Berdasarkan profil Anda, fokus latihan ke <strong>System Design</strong> akan paling impactful untuk naik ke senior level.
                                    </div>
                                </div>
                                <div className="flex flex-row-reverse items-end gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                                        K
                                    </div>
                                    <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-gradient-to-r from-brand-blue to-brand-cyan px-3 py-2 text-xs text-white">
                                        Beri saya 3 resource terbaik
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white">
                                        <Bot className="size-3.5" />
                                    </div>
                                    <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
                                        <div className="flex gap-1">
                                            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                                            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '150ms' }} />
                                            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Match Score */}
                        <div className="group/bento relative overflow-hidden rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:shadow-lg">
                            <div className="inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
                                <Brain className="size-5" />
                            </div>
                            <h3 className="mt-3 text-lg font-bold text-brand-navy">AI Match Score</h3>
                            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                Setiap lowongan dapat skor kecocokan personal — Anda fokus melamar yang prospektif.
                            </p>
                            <div className="mt-4 flex items-end gap-2">
                                <div className="relative size-16">
                                    <svg className="-rotate-90" viewBox="0 0 64 64">
                                        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="6" />
                                        <circle
                                            cx="32"
                                            cy="32"
                                            r="26"
                                            fill="none"
                                            stroke="url(#match-grad)"
                                            strokeWidth="6"
                                            strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 26}`}
                                            strokeDashoffset={`${2 * Math.PI * 26 * 0.08}`}
                                        />
                                        <defs>
                                            <linearGradient id="match-grad">
                                                <stop offset="0%" stopColor="#8b5cf6" />
                                                <stop offset="100%" stopColor="#d946ef" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-violet-600">92%</div>
                                </div>
                                <div className="pb-1 text-xs text-muted-foreground">
                                    rata-rata akurasi rekomendasi
                                </div>
                            </div>
                        </div>

                        {/* AI Interview */}
                        <div className="group/bento relative overflow-hidden rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:shadow-lg">
                            <div className="inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
                                <Zap className="size-5" />
                            </div>
                            <h3 className="mt-3 text-lg font-bold text-brand-navy">AI Interview</h3>
                            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                Latihan wawancara yang adaptif dengan feedback per jawaban & skor akhir.
                            </p>
                            <div className="mt-4 space-y-2">
                                {[
                                    { l: 'Komunikasi', v: 90 },
                                    { l: 'Teknikal', v: 85 },
                                    { l: 'Problem Solving', v: 86 },
                                ].map((b) => (
                                    <div key={b.l} className="flex items-center gap-2 text-[10px]">
                                        <span className="w-20 text-muted-foreground">{b.l}</span>
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${b.v}%` }} />
                                        </div>
                                        <span className="w-6 text-right font-semibold text-brand-navy">{b.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Insight Gaji */}
                        <div className="group/bento relative overflow-hidden rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:shadow-lg lg:col-span-2">
                            <div className="flex items-start gap-4">
                                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
                                    <FileSearch className="size-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg font-bold text-brand-navy">Insight Gaji Riil</h3>
                                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                        Rentang gaji aktual berdasarkan ribuan lowongan & laporan komunitas — bukan estimasi anonim.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                                        {[
                                            { role: 'Backend Engineer', range: 'Rp 12 – 28 jt' },
                                            { role: 'Product Designer', range: 'Rp 9 – 22 jt' },
                                            { role: 'Data Analyst', range: 'Rp 8 – 18 jt' },
                                        ].map((s) => (
                                            <span key={s.role} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-700 ring-1 ring-emerald-500/20">
                                                <span className="font-semibold">{s.role}</span>
                                                <span className="text-emerald-600">·</span>
                                                <span>{s.range}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== Featured Jobs ===== */}
            {home.featured_jobs.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                    <div className="mb-7 flex items-end justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                Lowongan Pilihan
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Posisi terbaru dari perusahaan tepercaya.
                            </p>
                        </div>
                        <Link
                            href="/jobs"
                            className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex"
                        >
                            Lihat semua →
                        </Link>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {home.featured_jobs.map((job) => (
                            <Card
                                key={job.slug}
                                className="group/card relative overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-lg hover:shadow-brand-blue/10"
                            >
                                <span
                                    aria-hidden
                                    className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-brand-blue/0 via-brand-blue to-brand-cyan opacity-0 transition-opacity group-hover/card:opacity-100"
                                />
                                <CardContent className="space-y-2.5 p-5">
                                    <div className="flex items-start justify-between gap-2">
                                        <Link
                                            href={`/jobs/${job.slug}`}
                                            className="font-semibold leading-snug text-brand-navy transition-colors hover:text-brand-blue"
                                        >
                                            {job.title}
                                        </Link>
                                        {job.is_featured && (
                                            <Badge className="shrink-0 bg-gradient-to-r from-brand-blue to-brand-cyan text-white">
                                                Featured
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Building2 className="size-3.5" /> {job.company_name ?? '-'}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-xs">
                                        {job.city && (
                                            <Badge variant="outline" className="gap-1 font-medium">
                                                <MapPin className="size-3" /> {job.city}
                                            </Badge>
                                        )}
                                        {job.employment_type && (
                                            <Badge variant="secondary" className="font-medium">
                                                {formatStatus(job.employment_type)}
                                            </Badge>
                                        )}
                                        {job.work_arrangement && (
                                            <Badge variant="secondary" className="font-medium">
                                                {formatStatus(job.work_arrangement)}
                                            </Badge>
                                        )}
                                    </div>
                                    {salaryRange(job.salary_min, job.salary_max) && (
                                        <div className="pt-1 text-sm font-semibold text-brand-navy">
                                            {salaryRange(job.salary_min, job.salary_max)}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* ===== Categories ===== */}
            {home.top_categories.length > 0 && (
                <section className="border-y bg-muted/20">
                    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                        <div className="mb-8 flex items-end justify-between">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                                    Eksplor
                                </span>
                                <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                    Kategori Populer
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Telusuri lowongan berdasarkan bidang profesi yang Anda minati.
                                </p>
                            </div>
                            <Link
                                href="/jobs"
                                className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex"
                            >
                                Lihat semua →
                            </Link>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {home.top_categories.map((c, i) => {
                                const meta = categoryMeta(c.name, c.slug, i);
                                return (
                                    <Link
                                        key={c.slug}
                                        href={`/jobs?category=${c.slug}`}
                                        className={cn(
                                            'group/cat relative overflow-hidden rounded-2xl border border-border/60 bg-background p-5 transition-all',
                                            'hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-lg hover:shadow-brand-blue/10',
                                        )}
                                    >
                                        {/* Decorative gradient blob */}
                                        <div
                                            aria-hidden
                                            className={cn(
                                                'pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br opacity-50 blur-xl transition-opacity group-hover/cat:opacity-80',
                                                meta.blob,
                                            )}
                                        />
                                        <div className="relative">
                                            <div
                                                className={cn(
                                                    'inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1 transition-transform group-hover/cat:scale-110',
                                                    meta.tone,
                                                )}
                                            >
                                                <meta.icon className="size-5" />
                                            </div>
                                            <div className="mt-3 flex items-baseline justify-between gap-2">
                                                <h3 className="line-clamp-1 text-sm font-semibold text-brand-navy transition-colors group-hover/cat:text-brand-blue">
                                                    {c.name}
                                                </h3>
                                                <ArrowRight className="size-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover/cat:translate-x-0 group-hover/cat:text-brand-blue group-hover/cat:opacity-100" />
                                            </div>
                                            <div className="mt-1 flex items-center gap-2 text-xs">
                                                <span className="font-semibold text-brand-navy">{c.job_count}</span>
                                                <span className="text-muted-foreground">lowongan aktif</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ===== Top Companies (Marquee) ===== */}
            {home.top_companies.length > 0 && (
                <section className="overflow-hidden py-16 sm:py-20">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.4 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="mb-8 flex items-end justify-between"
                        >
                            <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-500/20">
                                    <ShieldCheck className="size-3" /> Terverifikasi
                                </span>
                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                    Perusahaan Teratas
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Bergabung dengan perusahaan yang sedang merekrut sekarang.
                                </p>
                            </div>
                            <Link
                                href="/companies"
                                className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex"
                            >
                                Lihat semua →
                            </Link>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.8, delay: 0.15 }}
                        className="relative"
                    >
                        {/* Edge fade masks */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent sm:w-24"
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent sm:w-24"
                        />

                        <Marquee pauseOnHover className="[--duration:50s] [--gap:1rem] sm:[--gap:1.25rem]">
                            {home.top_companies.map((c) => (
                                <CompanyCard key={c.slug} company={c} />
                            ))}
                        </Marquee>
                        <Marquee reverse pauseOnHover className="mt-2 [--duration:60s] [--gap:1rem] sm:[--gap:1.25rem]">
                            {home.top_companies.map((c) => (
                                <CompanyCard key={`r-${c.slug}`} company={c} />
                            ))}
                        </Marquee>
                    </motion.div>
                </section>
            )}

            {/* ===== Testimonials (Marquee) ===== */}
            {home.testimonials.length > 0 && (
                <section className="overflow-hidden py-16 sm:py-20">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.4 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="mb-10 text-center"
                        >
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-500/20">
                                <Star className="size-3 fill-amber-500 text-amber-500" /> Cerita Pengguna
                            </span>
                            <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                                Dipercaya oleh ribuan profesional
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                                Dari fresh graduate hingga eksekutif — KarirConnect membantu kandidat menemukan posisi yang sesuai.
                            </p>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.8, delay: 0.15 }}
                    >
                        <AnimatedTestimonials
                            autoplay
                            testimonials={home.testimonials.map((t) => ({
                                quote: t.text,
                                name: t.name,
                                designation: `${t.role} · ${t.company}`,
                                src: `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&size=500&background=1080E0&color=ffffff&bold=true&format=png`,
                            }))}
                        />
                    </motion.div>
                </section>
            )}

            {/* ===== Salary Teaser ===== */}
            {home.salary_teasers.length > 0 && (
                <section className="border-y bg-muted/20">
                    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                        <div className="mb-8 flex items-end justify-between">
                            <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-500/20">
                                    <TrendingUp className="size-3" /> Data Pasar Riil
                                </span>
                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                    Insight Gaji
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Rentang aktual berdasarkan ribuan lowongan terbuka — bukan estimasi anonim.
                                </p>
                            </div>
                            <Link
                                href="/salary-insight"
                                className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex"
                            >
                                Eksplorasi semua →
                            </Link>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {home.salary_teasers.map((s) => {
                                const median = (s.salary_min + s.salary_max) / 2;
                                return (
                                    <Link
                                        key={s.title}
                                        href={`/salary-insight?role=${encodeURIComponent(s.title)}`}
                                        className="group/sal relative overflow-hidden rounded-2xl border border-border/60 bg-background p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-lg hover:shadow-brand-blue/10"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="line-clamp-1 text-sm font-bold text-brand-navy transition-colors group-hover/sal:text-brand-blue">
                                                    {s.title}
                                                </h3>
                                                <div className="mt-0.5 text-[11px] text-muted-foreground">
                                                    Berdasarkan <span className="font-semibold text-brand-navy">{s.sample_count}</span> lowongan
                                                </div>
                                            </div>
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
                                                <TrendingUp className="size-4" />
                                            </div>
                                        </div>

                                        {/* Median highlight */}
                                        <div className="mt-4 text-2xl font-bold leading-none text-brand-navy">
                                            {idrCompact(median)}
                                            <span className="ml-1.5 text-xs font-medium text-muted-foreground">/ bulan median</span>
                                        </div>

                                        {/* Range bar */}
                                        <div className="mt-4">
                                            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span>Min {idrCompact(s.salary_min)}</span>
                                                <span>Max {idrCompact(s.salary_max)}</span>
                                            </div>
                                            <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-gradient-to-r from-emerald-500 via-brand-blue to-brand-cyan" />
                                                <div className="absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full border-2 border-background bg-brand-blue shadow-sm" />
                                            </div>
                                            <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground/70">
                                                <span>Junior</span>
                                                <span>Mid</span>
                                                <span>Senior</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="mt-6 sm:hidden">
                            <Link
                                href="/salary-insight"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue"
                            >
                                Eksplorasi semua →
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ===== Career Resources ===== */}
            {home.articles.length > 0 && (
                <section className="border-y bg-muted/20">
                    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                        <div className="mb-8 flex items-end justify-between">
                            <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 ring-1 ring-violet-500/20">
                                    <BookOpen className="size-3" /> Belajar
                                </span>
                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                    Tips & Panduan Karier
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Pengetahuan dari praktisi untuk percepat pertumbuhan karier Anda.
                                </p>
                            </div>
                            <Link
                                href="/career-resources"
                                className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex"
                            >
                                Lihat semua artikel →
                            </Link>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-3">
                            {/* Featured article (large card on left) */}
                            {home.articles[0] && (
                                <Link
                                    href={`/career-resources/${home.articles[0].slug}`}
                                    className="group/feat relative overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition-all hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-lg hover:shadow-brand-blue/10 lg:col-span-2 lg:row-span-2"
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-brand-blue/15 to-brand-cyan/10">
                                        {home.articles[0].thumbnail ? (
                                            <img
                                                src={home.articles[0].thumbnail}
                                                alt={home.articles[0].title}
                                                loading="lazy"
                                                className="size-full object-cover transition-transform duration-500 group-hover/feat:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <BookOpen className="size-20 text-brand-blue/30" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 via-brand-navy/20 to-transparent" />
                                        <div className="absolute left-4 top-4 flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                                                <Sparkles className="size-3" /> Pilihan Editor
                                            </span>
                                            {home.articles[0].category && (
                                                <span className="inline-flex items-center rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-semibold text-brand-blue ring-1 ring-border/60 backdrop-blur">
                                                    {home.articles[0].category}
                                                </span>
                                            )}
                                        </div>
                                        <div className="absolute inset-x-4 bottom-4 space-y-2">
                                            <h3 className="line-clamp-2 text-lg font-bold leading-tight text-white sm:text-xl">
                                                {home.articles[0].title}
                                            </h3>
                                            <p className="line-clamp-2 text-xs leading-relaxed text-white/80 sm:text-sm">
                                                {home.articles[0].excerpt}
                                            </p>
                                            <div className="flex items-center gap-3 pt-1 text-[11px] text-white/70">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="size-3" /> {home.articles[0].reading_minutes} min baca
                                                </span>
                                                {home.articles[0].published_at && (
                                                    <>
                                                        <span aria-hidden>·</span>
                                                        <span>{new Date(home.articles[0].published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )}

                            {/* Side cards (compact horizontal) */}
                            {home.articles.slice(1, 3).map((a) => (
                                <Link
                                    key={a.slug}
                                    href={`/career-resources/${a.slug}`}
                                    className="group/article flex gap-4 overflow-hidden rounded-2xl border border-border/60 bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md hover:shadow-brand-blue/10 lg:flex-col lg:gap-3 lg:p-0"
                                >
                                    <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 lg:aspect-[16/9] lg:size-auto lg:rounded-none">
                                        {a.thumbnail ? (
                                            <img
                                                src={a.thumbnail}
                                                alt={a.title}
                                                loading="lazy"
                                                className="size-full object-cover transition-transform duration-300 group-hover/article:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <BookOpen className="size-8 text-brand-blue/30" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:p-4 lg:pt-2">
                                        {a.category && (
                                            <span className="inline-flex w-fit items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                                {a.category}
                                            </span>
                                        )}
                                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-brand-navy transition-colors group-hover/article:text-brand-blue">
                                            {a.title}
                                        </h3>
                                        <div className="mt-auto flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                                            <Clock className="size-3" /> {a.reading_minutes} min baca
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        <div className="mt-6 sm:hidden">
                            <Link
                                href="/career-resources"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue"
                            >
                                Lihat semua artikel →
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ===== FAQ ===== */}
            {home.faqs.length > 0 && (
                <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
                    <div className="mb-10 text-center">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                            Pertanyaan Umum
                        </span>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                            Masih ragu? Jawaban di sini
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {home.faqs.map((f) => (
                            <FaqItem key={f.id} item={f} />
                        ))}
                    </div>
                    <div className="mt-8 text-center">
                        <Link
                            href="/faq"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:text-brand-blue/80"
                        >
                            Lihat semua pertanyaan <ArrowRight className="size-3.5" />
                        </Link>
                    </div>
                </section>
            )}

        </>
    );
}
