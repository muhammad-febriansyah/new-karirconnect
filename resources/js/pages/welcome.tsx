import { Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Award, BookOpen, Bot, Brain, Briefcase, BriefcaseBusiness, Building2, CheckCircle2, ChevronDown, Clock, FileSearch, FileText, MapPin, Quote, Search, ShieldCheck, Sparkles, Star, Target, TrendingUp, UserPlus, Users, Wand2, Zap } from 'lucide-react';
import { InfiniteMovingCards } from '@/components/aceternity/infinite-moving-cards';
import { Spotlight } from '@/components/aceternity/spotlight';
import { type FormEvent, lazy, Suspense, useState } from 'react';

const Globe3D = lazy(() => import('@/components/ui/3d-globe').then((m) => ({ default: m.Globe3D })));
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';
import { register } from '@/routes';
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

type Home = {
    metrics: { open_jobs: number; active_companies: number; candidates: number; salary_reports: number };
    featured_jobs: FeaturedJob[];
    top_companies: TopCompany[];
    top_categories: TopCategory[];
    salary_teasers: SalaryTeaser[];
    testimonials: Testimonial[];
    articles: Article[];
    faqs: FaqEntry[];
};

type Props = {
    canRegister?: boolean;
    home: Home;
};

const idr = (v: number | null) => (v == null ? null : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v));

const compact = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

const salaryRange = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `${idr(min)} – ${idr(max)}`;
    return idr(min ?? max);
};

const PIN_SRC = '/marker-pin.svg';

const GLOBE_MARKERS = [
    // Indonesian hubs
    { lat: -6.2088, lng: 106.8456, src: PIN_SRC, label: 'Jakarta' },
    { lat: -6.9175, lng: 107.6191, src: PIN_SRC, label: 'Bandung' },
    { lat: -7.2575, lng: 112.7521, src: PIN_SRC, label: 'Surabaya' },
    { lat: 3.5952, lng: 98.6722, src: PIN_SRC, label: 'Medan' },
    { lat: -7.7956, lng: 110.3695, src: PIN_SRC, label: 'Yogyakarta' },
    { lat: -8.65, lng: 115.2167, src: PIN_SRC, label: 'Denpasar' },
    { lat: -5.1477, lng: 119.4327, src: PIN_SRC, label: 'Makassar' },
    { lat: 0.5333, lng: 101.45, src: PIN_SRC, label: 'Pekanbaru' },
    // Regional reach
    { lat: 1.3521, lng: 103.8198, src: PIN_SRC, label: 'Singapore' },
    { lat: 3.139, lng: 101.6869, src: PIN_SRC, label: 'Kuala Lumpur' },
    { lat: 14.5995, lng: 120.9842, src: PIN_SRC, label: 'Manila' },
    { lat: 35.6762, lng: 139.6503, src: PIN_SRC, label: 'Tokyo' },
];

const GLOBE_CONFIG_3D = {
    atmosphereColor: '#10C0E0',
    atmosphereIntensity: 1.4,
    showAtmosphere: true,
    atmosphereBlur: 2.5,
    bumpScale: 4,
    autoRotateSpeed: 0.4,
    initialRotation: { x: 0, y: 110 },
};

function GlobeFallback() {
    return (
        <div className="flex aspect-square w-full items-center justify-center">
            <div className="size-32 animate-pulse rounded-full bg-gradient-to-br from-brand-blue/30 to-brand-cyan/20 blur-xl" />
        </div>
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

function CityPill({ name, count, tone, delay = '0ms' }: { name: string; count: string; tone: string; delay?: string }) {
    return (
        <div
            className="flex items-center gap-2 rounded-full bg-background/95 px-3 py-1.5 text-xs shadow-md ring-1 ring-border/60 backdrop-blur animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: delay, animationDuration: '600ms', animationFillMode: 'both' }}
        >
            <span className="relative flex size-2">
                <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', tone)} />
                <span className={cn('relative inline-flex size-2 rounded-full', tone)} />
            </span>
            <span className="font-semibold text-brand-navy">{name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{count}</span>
        </div>
    );
}

export default function Welcome({ canRegister = true, home }: Props) {
    const { auth } = usePage<SharedPageProps>().props;
    const [search, setSearch] = useState('');

    const submitSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get('/jobs', search ? { search } : {}, { preserveState: false });
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

            {/* ===== Hero (Spotlight + clean backdrop) ===== */}
            <section className="relative overflow-hidden border-b bg-background">
                {/* Clean backdrop — soft radial wash + subtle grid */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in oklch, var(--color-brand-blue) 8%, transparent), transparent 70%)',
                    }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.4]"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, color-mix(in oklch, var(--color-border) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--color-border) 60%, transparent) 1px, transparent 1px)',
                        backgroundSize: '56px 56px',
                        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 0%, transparent 75%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 0%, transparent 75%)',
                    }}
                />
                <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#1080E0" />

                <div className="relative z-10">
                    <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pt-20 lg:pb-14">
                        {/* LEFT: Copy + search */}
                        <div className="space-y-6 text-center lg:col-span-7 lg:text-left">
                            {/* Status pill */}
                            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-1 py-1 pr-4 text-xs shadow-sm backdrop-blur">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                                    <Sparkles className="size-3" /> Baru
                                </span>
                                <span className="font-medium text-brand-navy">AI Career Coach gratis untuk semua kandidat</span>
                                <ArrowRight className="size-3 text-muted-foreground" />
                            </div>

                            {/* Heading */}
                            <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-brand-navy sm:text-4xl lg:text-[3.2rem]">
                                Karier impian Anda dimulai dari{' '}
                                <span className="relative inline-block">
                                    <span className="relative z-10 bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                                        satu pencarian
                                    </span>
                                    <span
                                        aria-hidden
                                        className="absolute -bottom-1 left-0 right-0 h-3 bg-gradient-to-r from-brand-cyan/40 to-brand-blue/30 blur-sm"
                                    />
                                </span>
                            </h1>

                            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0">
                                AI Coach, latihan interview, insight gaji riil & ribuan lowongan terverifikasi di
                                seluruh Indonesia.
                            </p>

                            {/* Search */}
                            <form
                                onSubmit={submitSearch}
                                className={cn(
                                    'group/search relative mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-border/60 bg-background/95 p-2 shadow-lg shadow-brand-blue/[0.08] backdrop-blur lg:mx-0',
                                    'transition-all duration-200',
                                    'focus-within:border-brand-blue/40 focus-within:shadow-xl focus-within:shadow-brand-blue/15 focus-within:ring-4 focus-within:ring-brand-blue/10',
                                )}
                            >
                                <Search className="ml-3 size-4 text-muted-foreground/70 transition-colors group-focus-within/search:text-brand-blue" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari posisi, perusahaan, atau kota…"
                                    className="border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
                                />
                                <Button
                                    type="submit"
                                    className="h-11 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan px-6 font-semibold shadow-md shadow-brand-blue/20 hover:brightness-105 hover:shadow-lg hover:shadow-brand-blue/30"
                                >
                                    <Search className="size-4" /> Cari
                                </Button>
                            </form>

                            {/* Popular chips */}
                            <div className="flex flex-wrap items-center justify-center gap-2 text-xs lg:justify-start">
                                <span className="text-muted-foreground">Populer:</span>
                                {['Backend Engineer', 'UI/UX Designer', 'Digital Marketing', 'Data Analyst'].map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => router.get('/jobs', { search: q }, { preserveState: false })}
                                        className="rounded-full border border-border/60 bg-background/80 px-3 py-1 font-medium text-brand-navy backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:text-brand-blue hover:shadow-sm"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>

                            {/* Compact inline stats */}
                            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-2 text-sm lg:justify-start">
                                {[
                                    { icon: BriefcaseBusiness, label: 'Lowongan', value: home.metrics.open_jobs },
                                    { icon: Building2, label: 'Perusahaan', value: home.metrics.active_companies },
                                    { icon: Users, label: 'Kandidat', value: home.metrics.candidates },
                                    { icon: TrendingUp, label: 'Lapor gaji', value: home.metrics.salary_reports },
                                ].map((m) => (
                                    <div key={m.label} className="flex items-center gap-2">
                                        <m.icon className="size-3.5 text-brand-blue" />
                                        <span className="font-bold text-brand-navy">{compact(m.value)}</span>
                                        <span className="text-muted-foreground">{m.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: GitHub-style globe */}
                        <div className="relative lg:col-span-5">
                            <div className="relative mx-auto aspect-square w-full max-w-[560px]">
                                {/* Glow halo behind globe */}
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-blue/30 via-brand-cyan/10 to-transparent blur-3xl"
                                />

                                {/* 3D Earth globe with markers */}
                                <div className="absolute inset-0">
                                    <Suspense fallback={<GlobeFallback />}>
                                        <Globe3D markers={GLOBE_MARKERS} config={GLOBE_CONFIG_3D} className="!h-full" />
                                    </Suspense>
                                </div>

                                {/* Floating city pills */}
                                <div className="absolute left-0 top-4 hidden flex-col gap-2 sm:flex">
                                    <CityPill name="Jakarta" count="234 lowongan" tone="bg-emerald-500" />
                                    <CityPill name="Bandung" count="58 lowongan" tone="bg-brand-blue" delay="200ms" />
                                </div>
                                <div className="absolute right-0 bottom-12 hidden flex-col gap-2 sm:flex">
                                    <CityPill name="Surabaya" count="92 lowongan" tone="bg-violet-500" delay="100ms" />
                                    <CityPill name="Bali" count="34 lowongan" tone="bg-amber-500" delay="300ms" />
                                </div>
                            </div>

                            {/* Caption */}
                            <div className="mt-3 text-center text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="relative flex size-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                                        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                                    </span>
                                    Lowongan tersebar di 30+ kota di Indonesia
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Live job marquee — Aceternity InfiniteMovingCards */}
                    {home.featured_jobs.length > 0 && (
                        <div className="relative pb-6">
                            <div className="mb-3 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                <span className="relative flex size-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                                </span>
                                Lowongan terbaru hari ini
                            </div>
                            <InfiniteMovingCards
                                speed="slow"
                                className="mx-auto"
                                items={home.featured_jobs.map((job) => (
                                    <Link
                                        href={`/jobs/${job.slug}`}
                                        className="flex w-[280px] shrink-0 items-center gap-3 rounded-2xl border border-border/60 bg-background/90 p-3 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md hover:shadow-brand-blue/10"
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
                            />
                        </div>
                    )}

                    {/* Trust strip */}
                    <div className="relative border-t border-border/40 bg-background/40 backdrop-blur">
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
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
                <div className="mb-12 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                        Cara Kerja
                    </span>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                        Tiga langkah menuju karier baru
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                        AI mencocokkan profil Anda dengan ribuan lowongan, melatih wawancara, dan memantau setiap progres lamaran.
                    </p>
                </div>
                <div className="relative grid gap-6 lg:grid-cols-3">
                    {/* Connector line desktop only */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-brand-blue/30 to-transparent lg:block"
                    />
                    {[
                        {
                            n: '01',
                            icon: UserPlus,
                            title: 'Bangun profil',
                            desc: 'Isi pengalaman, skill, dan ekspektasi gaji. AI langsung memetakan kekuatan & area yang bisa dikembangkan.',
                            tone: 'from-blue-500/15 to-cyan-400/10 ring-blue-500/20 text-blue-600',
                        },
                        {
                            n: '02',
                            icon: Wand2,
                            title: 'Dapatkan kecocokan',
                            desc: 'AI Match Score memberi Anda lowongan paling relevan, lengkap dengan persentase kecocokan & alasan.',
                            tone: 'from-violet-500/15 to-fuchsia-400/10 ring-violet-500/20 text-violet-600',
                        },
                        {
                            n: '03',
                            icon: Target,
                            title: 'Lamar & wawancara',
                            desc: 'Latih dengan AI Interview, kirim lamaran sekali klik, dan pantau progres real-time hingga tawaran masuk.',
                            tone: 'from-emerald-500/15 to-teal-400/10 ring-emerald-500/20 text-emerald-600',
                        },
                    ].map((step) => (
                        <div
                            key={step.n}
                            className="relative rounded-2xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground ring-1 ring-border/60">
                                STEP {step.n}
                            </div>
                            <div className={cn('inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1', step.tone)}>
                                <step.icon className="size-6" />
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-brand-navy">{step.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                        </div>
                    ))}
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
                            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                                Pilihan Editor
                            </span>
                            <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
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
                    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                        <div className="mb-7">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                                Eksplor
                            </span>
                            <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                Kategori Populer
                            </h2>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {home.top_categories.map((c) => (
                                <Link
                                    key={c.slug}
                                    href={`/jobs?category=${c.slug}`}
                                    className={cn(
                                        'group/cat flex items-center justify-between rounded-xl border border-border/60 bg-background p-4 transition-all',
                                        'hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md hover:shadow-brand-blue/10',
                                    )}
                                >
                                    <span className="font-medium text-brand-navy transition-colors group-hover/cat:text-brand-blue">
                                        {c.name}
                                    </span>
                                    <Badge className="bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/15 hover:bg-brand-blue/15">
                                        {c.job_count}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ===== Top Companies ===== */}
            {home.top_companies.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                    <div className="mb-7 flex items-end justify-between">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                                Mitra Terverifikasi
                            </span>
                            <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                Perusahaan Teratas
                            </h2>
                        </div>
                        <Link
                            href="/companies"
                            className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex"
                        >
                            Lihat semua →
                        </Link>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {home.top_companies.map((c) => (
                            <Card
                                key={c.slug}
                                className="border-border/60 transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-md hover:shadow-brand-blue/10"
                            >
                                <CardContent className="space-y-2 p-4">
                                    <Link
                                        href={`/companies/${c.slug}`}
                                        className="block font-semibold text-brand-navy transition-colors hover:text-brand-blue"
                                    >
                                        {c.name}
                                    </Link>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Briefcase className="size-3.5" /> {c.open_jobs} lowongan terbuka
                                    </div>
                                    {c.review_count > 0 && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                                            <span className="font-semibold text-brand-navy">{c.avg_rating}</span>
                                            <span className="text-muted-foreground">· {c.review_count} review</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* ===== Testimonials Marquee ===== */}
            {home.testimonials.length > 0 && (
                <section className="overflow-hidden py-16 sm:py-20">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="mb-10 text-center">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                                Cerita Pengguna
                            </span>
                            <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                                Dipercaya oleh ribuan profesional
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                                Dari fresh graduate hingga eksekutif — KarirConnect membantu kandidat menemukan posisi yang sesuai.
                            </p>
                        </div>
                    </div>
                    <InfiniteMovingCards
                        speed="slow"
                        items={home.testimonials.map((t) => (
                            <div className="flex w-[360px] shrink-0 flex-col gap-3 rounded-2xl border border-border/60 bg-background p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <Quote className="size-5 text-brand-blue/40" />
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                className={cn(
                                                    'size-3.5',
                                                    i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-muted/40',
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm leading-relaxed text-brand-navy">{t.text}</p>
                                <div className="mt-1 flex items-center gap-3 border-t border-border/60 pt-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-xs font-bold text-white shadow-sm">
                                        {t.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-brand-navy">{t.name}</div>
                                        <div className="truncate text-xs text-muted-foreground">
                                            {t.role} · {t.company}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    />
                </section>
            )}

            {/* ===== Salary Teaser ===== */}
            {home.salary_teasers.length > 0 && (
                <section className="border-y bg-muted/20">
                    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                        <div className="mb-7 flex items-end justify-between">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                                    Data Pasar
                                </span>
                                <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                    Insight Gaji
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Rentang gaji rata-rata berdasarkan lowongan aktif.
                                </p>
                            </div>
                            <Link
                                href="/salary-insight"
                                className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex"
                            >
                                Eksplorasi →
                            </Link>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {home.salary_teasers.map((s) => (
                                <Card
                                    key={s.title}
                                    className="border-border/60 transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-md hover:shadow-brand-blue/10"
                                >
                                    <CardContent className="space-y-1.5 p-4">
                                        <div className="font-semibold text-brand-navy">{s.title}</div>
                                        <div className="text-sm font-medium text-brand-blue">
                                            {idr(s.salary_min)} – {idr(s.salary_max)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Berdasarkan {s.sample_count} lowongan
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ===== Career Resources ===== */}
            {home.articles.length > 0 && (
                <section className="border-y bg-muted/20">
                    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                        <div className="mb-7 flex items-end justify-between">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                                    Belajar
                                </span>
                                <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                    Tips & Panduan Karier
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Artikel terbaru untuk membantu Anda berkembang.
                                </p>
                            </div>
                            <Link
                                href="/career-resources"
                                className="hidden text-sm font-semibold text-brand-blue hover:text-brand-blue/80 sm:inline-flex"
                            >
                                Lihat semua →
                            </Link>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {home.articles.map((a) => (
                                <Link
                                    key={a.slug}
                                    href={`/career-resources/${a.slug}`}
                                    className="group/article overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10">
                                        {a.thumbnail ? (
                                            <img
                                                src={a.thumbnail}
                                                alt={a.title}
                                                loading="lazy"
                                                className="size-full object-cover transition-transform duration-300 group-hover/article:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <BookOpen className="size-12 text-brand-blue/30" />
                                            </div>
                                        )}
                                        {a.category && (
                                            <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-background/95 px-2 py-1 text-[10px] font-semibold text-brand-blue ring-1 ring-border/60 backdrop-blur">
                                                {a.category}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2 p-5">
                                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-brand-navy transition-colors group-hover/article:text-brand-blue">
                                            {a.title}
                                        </h3>
                                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{a.excerpt}</p>
                                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                                            <Clock className="size-3" /> {a.reading_minutes} min baca
                                            <span aria-hidden>·</span>
                                            <FileText className="size-3" /> Artikel
                                        </div>
                                    </div>
                                </Link>
                            ))}
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

            {/* ===== Dual CTA ===== */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="group/cta relative overflow-hidden rounded-2xl border border-brand-blue/20 bg-gradient-to-br from-brand-blue/[0.04] to-brand-cyan/[0.06] p-7 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-blue/10">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-brand-blue/10 blur-2xl"
                        />
                        <div className="relative flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-md shadow-brand-blue/30">
                            <Award className="size-6" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold tracking-tight text-brand-navy">
                            Untuk Pencari Kerja
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            Profil profesional, AI Career Coach, latihan interview, rekomendasi personal,
                            dan notifikasi otomatis.
                        </p>
                        {!auth.user && canRegister && (
                            <Button
                                asChild
                                className="mt-5 h-11 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-md shadow-brand-blue/20 hover:brightness-105"
                            >
                                <Link href={register()}>Daftar sebagai kandidat</Link>
                            </Button>
                        )}
                    </div>
                    <div className="group/cta relative overflow-hidden rounded-2xl border border-brand-blue/20 bg-gradient-to-br from-brand-cyan/[0.06] to-brand-blue/[0.04] p-7 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-blue/10">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-brand-cyan/10 blur-2xl"
                        />
                        <div className="relative flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-blue text-white shadow-md shadow-brand-blue/30">
                            <Building2 className="size-6" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold tracking-tight text-brand-navy">
                            Untuk Perusahaan
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            Posting lowongan, AI screening, talent search, AI interview, dan analitik real-time.
                        </p>
                        {!auth.user && canRegister && (
                            <Button
                                asChild
                                className="mt-5 h-11 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-blue font-semibold shadow-md shadow-brand-blue/20 hover:brightness-105"
                            >
                                <Link href={register()}>Daftar sebagai pemberi kerja</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
}
