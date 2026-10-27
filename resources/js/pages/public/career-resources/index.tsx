import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Briefcase,
    Calendar,
    Clock3,
    Compass,
    DollarSign,
    Eye,
    FileText,
    GraduationCap,
    Lightbulb,
    Megaphone,
    MessagesSquare,
    Rocket,
    Search,
    Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as resourceIndex, show as resourceShow } from '@/routes/public/career-resources';

type ResourceItem = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
    tags: string[];
    reading_minutes: number;
    views_count: number;
    published_at: string | null;
    thumbnail: string | null;
};

type Props = {
    filters: { category: string; search: string };
    categories: string[];
    items: {
        data: ResourceItem[];
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
};

const CATEGORY_META: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
    career: {
        icon: Rocket,
        tone: 'bg-brand-blue/10 text-brand-blue',
        label: 'Pengembangan Karier',
    },
    cv: {
        icon: FileText,
        tone: 'bg-violet-100 text-violet-700',
        label: 'CV & Resume',
    },
    interview: {
        icon: MessagesSquare,
        tone: 'bg-emerald-100 text-emerald-700',
        label: 'Interview',
    },
    salary: {
        icon: DollarSign,
        tone: 'bg-amber-100 text-amber-700',
        label: 'Gaji & Negosiasi',
    },
    tips: {
        icon: Lightbulb,
        tone: 'bg-rose-100 text-rose-600',
        label: 'Tips Praktis',
    },
};

function metaFor(category: string | null): { icon: LucideIcon; tone: string } {
    if (!category) {
        return { icon: BookOpen, tone: 'bg-muted text-muted-foreground' };
    }

    const lower = category.toLowerCase();

    return CATEGORY_META[lower] ?? { icon: Compass, tone: 'bg-brand-blue/10 text-brand-blue' };
}

export default function CareerResourcesIndex({ filters, categories, items }: Props) {
    return (
        <CareerResourcesIndexContent
            key={filters.search}
            filters={filters}
            categories={categories}
            items={items}
        />
    );
}

function CareerResourcesIndexContent({ filters, categories, items }: Props) {
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        const normalizedSearch = search.trim();

        if (normalizedSearch === filters.search) {
            return;
        }

        const timeout = window.setTimeout(() => {
            router.get(
                resourceIndex().url,
                { category: filters.category, search: normalizedSearch },
                { preserveScroll: true, preserveState: true, replace: true },
            );
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [filters.category, filters.search, search]);

    const featured = items.current_page === 1 ? items.data[0] : undefined;
    const rest = items.current_page === 1 ? items.data.slice(1) : items.data;

    const setCategory = (category: string) => {
        router.get(
            resourceIndex().url,
            { category, search: search.trim() },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Career Resources" />

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
                                <BreadcrumbPage>Tips Karier</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="flex flex-col gap-3">
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                            <Sparkles className="size-3" />
                            {items.total} panduan praktis
                        </span>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            Tips & Panduan Karier
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Kumpulan panduan menulis CV, persiapan interview, negosiasi gaji, hingga
                            pengembangan karier — relevan untuk pasar kerja Indonesia.
                        </p>
                    </div>

                    {/* Search + categories panel */}
                    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-xs sm:p-4">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari topik, judul artikel, atau tag…"
                                className="h-11 rounded-xl border-border/60 bg-background pl-10 text-sm sm:h-12 sm:text-base"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                            <CategoryChip
                                active={filters.category === ''}
                                icon={Briefcase}
                                tone="bg-brand-blue text-white"
                                onClick={() => setCategory('')}
                            >
                                Semua
                            </CategoryChip>
                            {categories.map((category) => {
                                const meta = metaFor(category);

                                return (
                                    <CategoryChip
                                        key={category}
                                        active={filters.category === category}
                                        icon={meta.icon}
                                        tone={meta.tone}
                                        onClick={() => setCategory(category)}
                                    >
                                        {(CATEGORY_META[category.toLowerCase()]?.label ?? category)}
                                    </CategoryChip>
                                );
                            })}
                        </div>
                    </div>
                </header>

                {items.data.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                            <Search className="size-5" />
                        </div>
                        <h3 className="mt-4 text-base font-semibold text-foreground">
                            Tidak ada artikel cocok
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Coba kata kunci lain atau pilih kategori berbeda.
                        </p>
                    </section>
                ) : (
                    <>
                        {/* ===== Featured article (only when no filter/search to keep it stable) ===== */}
                        {featured && (
                            <FeaturedArticleCard item={featured} />
                        )}

                        {/* ===== Rest of articles grid ===== */}
                        {rest.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-baseline justify-between">
                                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                                        {featured ? 'Artikel Lainnya' : 'Artikel'}
                                    </h2>
                                    <span className="text-sm text-muted-foreground">
                                        {rest.length} artikel di halaman ini
                                    </span>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {rest.map((item) => (
                                        <ArticleCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {items.last_page > 1 && (
                    <div className="flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-5 sm:flex-row">
                        <p className="text-sm text-muted-foreground">
                            Menampilkan {items.from}–{items.to} dari {items.total} artikel
                        </p>
                        <nav aria-label="Navigasi halaman artikel" className="flex flex-wrap justify-center gap-1">
                            {items.links.map((link, index) => {
                                const isPrevious = /previous/i.test(link.label);
                                const isNext = /next/i.test(link.label);
                                const label = isPrevious
                                    ? '‹ Sebelumnya'
                                    : isNext
                                      ? 'Berikutnya ›'
                                      : link.label;
                                const className = cn(
                                    'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm transition-colors',
                                    link.active
                                        ? 'border-brand-blue bg-brand-blue text-white'
                                        : 'border-border/60 bg-card text-foreground hover:border-brand-blue/40 hover:text-brand-blue',
                                    !link.url && 'pointer-events-none opacity-40',
                                );

                                return link.url ? (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url}
                                        aria-current={link.active ? 'page' : undefined}
                                        className={className}
                                    >
                                        {label}
                                    </Link>
                                ) : (
                                    <span key={`${link.label}-${index}`} className={className}>
                                        {label}
                                    </span>
                                );
                            })}
                        </nav>
                    </div>
                )}

                {/* ===== Bottom CTA ===== */}
                <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue p-6 text-white shadow-xs sm:p-8">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <span className="hidden size-12 items-center justify-center rounded-2xl bg-white/15 sm:flex">
                                <GraduationCap className="size-6 text-white" />
                            </span>
                            <div className="max-w-xl">
                                <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                                    Butuh saran personal?
                                </h3>
                                <p className="mt-1 text-sm text-white/80">
                                    AI Career Coach kami menganalisis CV dan profil Anda untuk
                                    rekomendasi karier yang spesifik.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/employee/career-coach"
                            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-5 text-sm font-semibold text-brand-navy transition-colors hover:bg-white/90"
                        >
                            Coba AI Coach <ArrowRight className="size-4" />
                        </Link>
                    </div>
                </section>
            </div>
        </>
    );
}

function CategoryChip({
    active,
    icon: Icon,
    tone,
    onClick,
    children,
}: {
    active: boolean;
    icon: LucideIcon;
    tone: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
                active
                    ? 'border-brand-blue/40 bg-brand-blue/10 text-brand-blue shadow-xs'
                    : 'border-border/60 bg-card text-foreground/80 hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-foreground',
            )}
        >
            <span
                className={cn(
                    'flex size-5 items-center justify-center rounded-full transition-colors',
                    active ? 'bg-brand-blue text-white' : tone,
                )}
            >
                <Icon className="size-3" />
            </span>
            {children}
        </button>
    );
}

function FeaturedArticleCard({ item }: { item: ResourceItem }) {
    const meta = metaFor(item.category);
    const Icon = meta.icon;

    return (
        <Link
            href={resourceShow(item.slug).url}
            className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/5"
        >
            <span
                aria-hidden
                className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-0 transition-opacity group-hover:opacity-100"
            />
            <div className="flex flex-col">
                {/* Image / illustration */}
                <div className="relative w-full overflow-hidden bg-gradient-to-br from-brand-navy via-brand-blue to-brand-cyan">
                    {item.thumbnail ? (
                        <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="block h-auto w-full"
                        />
                    ) : (
                        <div className="relative aspect-[16/9] w-full">
                            <div
                                aria-hidden
                                className="absolute inset-0 opacity-30"
                                style={{
                                    backgroundImage:
                                        'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Icon className="size-20 text-white/30" strokeWidth={1.2} />
                            </div>
                        </div>
                    )}
                    <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-amber-500/30">
                        <Megaphone className="size-3" /> Pilihan
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-col justify-between gap-4 p-6 sm:p-7">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {item.category && (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                                        meta.tone,
                                    )}
                                >
                                    <Icon className="size-3" />
                                    {(CATEGORY_META[item.category.toLowerCase()]?.label ?? item.category)}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                <Clock3 className="size-3" />
                                {item.reading_minutes} menit
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-brand-blue sm:text-3xl">
                            {item.title}
                        </h2>
                        {item.excerpt && (
                            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                                {item.excerpt}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                            {item.published_at && (
                                <span className="inline-flex items-center gap-1">
                                    <Calendar className="size-3.5" />
                                    {formatDate(item.published_at)}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                                <Eye className="size-3.5" />
                                {item.views_count.toLocaleString('id-ID')}
                            </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue">
                            Baca panduan <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function ArticleCard({ item }: { item: ResourceItem }) {
    const meta = metaFor(item.category);
    const Icon = meta.icon;

    return (
        <Link
            href={resourceShow(item.slug).url}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/5"
        >
            <span
                aria-hidden
                className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-0 transition-opacity group-hover:opacity-100"
            />
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-blue/15 via-brand-cyan/10 to-brand-navy/15">
                {item.thumbnail ? (
                    <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="block h-auto w-full"
                    />
                ) : (
                    <div className="relative aspect-[16/9] w-full">
                        <div
                            aria-hidden
                            className="absolute inset-0 opacity-50"
                            style={{
                                backgroundImage:
                                    'radial-gradient(circle, rgba(16,128,224,0.18) 1px, transparent 1px)',
                                backgroundSize: '20px 20px',
                            }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Icon className="size-12 text-brand-blue/40" strokeWidth={1.4} />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                    {item.category && (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                meta.tone,
                            )}
                        >
                            <Icon className="size-3" />
                            {(CATEGORY_META[item.category.toLowerCase()]?.label ?? item.category)}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <Clock3 className="size-3" />
                        {item.reading_minutes} menit
                    </span>
                </div>

                <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand-blue">
                    {item.title}
                </h3>

                {item.excerpt && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.excerpt}
                    </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2.5">
                        {item.published_at && (
                            <span className="inline-flex items-center gap-1">
                                <Calendar className="size-3" />
                                {formatDate(item.published_at)}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                            <Eye className="size-3" />
                            {item.views_count.toLocaleString('id-ID')}
                        </span>
                    </div>
                    <ArrowRight className="size-3.5 text-brand-blue opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
            </div>
        </Link>
    );
}
