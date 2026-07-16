import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Briefcase,
    HelpCircle,
    LifeBuoy,
    Mail,
    MessagesSquare,
    Search,
    Sparkles,
    Tag,
    Wallet,
    X,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { home } from '@/routes';
import { contact } from '@/routes/public';

type FaqItem = {
    id: number;
    question: string;
    answer: string;
    category: string | null;
};

type Props = {
    items: FaqItem[];
};

const CATEGORY_META: Record<
    string,
    { icon: LucideIcon; tone: string; label: string; description: string }
> = {
    general: {
        icon: HelpCircle,
        tone: 'bg-brand-blue/10 text-brand-blue',
        label: 'Umum',
        description: 'Pertanyaan dasar tentang KarirConnect.',
    },
    pricing: {
        icon: Wallet,
        tone: 'bg-amber-100 text-amber-700',
        label: 'Harga & Pembayaran',
        description: 'Paket berbayar, tagihan, dan refund.',
    },
    jobs: {
        icon: Briefcase,
        tone: 'bg-emerald-100 text-emerald-700',
        label: 'Lowongan & Lamaran',
        description: 'Cara melamar, status lamaran, dan verifikasi employer.',
    },
    ai: {
        icon: Zap,
        tone: 'bg-violet-100 text-violet-700',
        label: 'AI Coach & Interview',
        description: 'Fitur AI untuk persiapan karier dan latihan interview.',
    },
};

function metaFor(category: string | null): { icon: LucideIcon; tone: string; label: string; description: string } {
    if (!category) {
        return {
            icon: Tag,
            tone: 'bg-muted text-muted-foreground',
            label: 'Lainnya',
            description: 'Pertanyaan lain seputar KarirConnect.',
        };
    }
    return (
        CATEGORY_META[category.toLowerCase()] ?? {
            icon: Tag,
            tone: 'bg-muted text-muted-foreground',
            label: category,
            description: '',
        }
    );
}

export default function PublicFaq({ items }: Props) {
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const categories = useMemo(() => {
        const set = new Map<string, number>();
        items.forEach((item) => {
            const key = item.category?.toLowerCase() ?? 'lainnya';
            set.set(key, (set.get(key) ?? 0) + 1);
        });
        return Array.from(set.entries()).map(([key, count]) => ({
            key,
            count,
            ...metaFor(key === 'lainnya' ? null : key),
        }));
    }, [items]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items.filter((item) => {
            const matchesQuery =
                !q ||
                item.question.toLowerCase().includes(q) ||
                item.answer.toLowerCase().includes(q);
            const matchesCategory =
                !activeCategory ||
                (item.category?.toLowerCase() ?? 'lainnya') === activeCategory;
            return matchesQuery && matchesCategory;
        });
    }, [items, query, activeCategory]);

    const grouped = useMemo(() => {
        const map = new Map<string, FaqItem[]>();
        filtered.forEach((item) => {
            const key = item.category?.toLowerCase() ?? 'lainnya';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(item);
        });
        return Array.from(map.entries());
    }, [filtered]);

    const totalCount = items.length;
    const filteredCount = filtered.length;

    return (
        <>
            <Head title="FAQ" />

            <div className="space-y-10 sm:space-y-12">
                {/* ===== Breadcrumb ===== */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href={home().url}>Beranda</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>FAQ</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* ===== Hero ===== */}
                <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue p-6 text-white shadow-xl shadow-brand-navy/10 sm:p-10">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-20"
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
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-12 -top-12 size-72 rounded-full bg-brand-cyan/30 blur-3xl"
                    />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                                <Sparkles className="size-3" />
                                Pusat Bantuan
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur">
                                <HelpCircle className="size-3" />
                                {totalCount} pertanyaan
                            </span>
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                                Pertanyaan yang Sering Ditanyakan
                            </h1>
                            <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                                Jawaban singkat untuk hal-hal yang paling sering ditanyakan kandidat
                                dan employer. Tidak menemukan jawabannya? Hubungi tim kami langsung.
                            </p>
                        </div>

                        {/* Search */}
                        <div className="relative max-w-xl">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Cari pertanyaan, kata kunci, atau topik..."
                                className="h-11 w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-10 text-sm text-white placeholder:text-white/50 backdrop-blur focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
                                    aria-label="Reset pencarian"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* ===== Category chips ===== */}
                <section className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveCategory(null)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                activeCategory === null
                                    ? 'border-brand-blue bg-brand-blue text-white'
                                    : 'border-border/60 bg-card text-foreground/75 hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-brand-blue',
                            )}
                        >
                            Semua
                            <span
                                className={cn(
                                    'rounded-full px-1.5 text-[10px] font-semibold',
                                    activeCategory === null
                                        ? 'bg-white/20 text-white'
                                        : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {totalCount}
                            </span>
                        </button>
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const isActive = activeCategory === cat.key;
                            return (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() =>
                                        setActiveCategory(isActive ? null : cat.key)
                                    }
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                        isActive
                                            ? 'border-brand-blue bg-brand-blue text-white'
                                            : 'border-border/60 bg-card text-foreground/75 hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-brand-blue',
                                    )}
                                >
                                    <Icon className="size-3.5" />
                                    {cat.label}
                                    <span
                                        className={cn(
                                            'rounded-full px-1.5 text-[10px] font-semibold',
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {cat.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Result counter */}
                    {(query || activeCategory) && (
                        <p className="text-sm text-muted-foreground">
                            Menampilkan{' '}
                            <span className="font-semibold text-foreground">{filteredCount}</span>{' '}
                            dari {totalCount} pertanyaan
                            {query && (
                                <>
                                    {' '}
                                    untuk <span className="font-semibold text-foreground">"{query}"</span>
                                </>
                            )}
                        </p>
                    )}
                </section>

                {/* ===== FAQ list ===== */}
                {grouped.length === 0 ? (
                    <section className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center shadow-xs">
                        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                            <Search className="size-5" />
                        </span>
                        <h3 className="mt-4 text-lg font-semibold text-foreground">
                            Tidak ada hasil
                        </h3>
                        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
                            Coba kata kunci lain atau hapus filter kategori. Anda juga bisa
                            menghubungi tim kami untuk bantuan langsung.
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setQuery('');
                                    setActiveCategory(null);
                                }}
                                className="h-10 rounded-xl border-border/60"
                            >
                                Reset Filter
                            </Button>
                            <Button
                                asChild
                                className="h-10 rounded-xl bg-brand-blue hover:bg-brand-blue/90"
                            >
                                <Link href={contact().url}>
                                    Hubungi Kami <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        </div>
                    </section>
                ) : (
                    <section className="space-y-8">
                        {grouped.map(([key, list]) => {
                            const cat = metaFor(key === 'lainnya' ? null : key);
                            const Icon = cat.icon;
                            return (
                                <div key={key} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={cn(
                                                'flex size-10 items-center justify-center rounded-xl',
                                                cat.tone,
                                            )}
                                        >
                                            <Icon className="size-5" />
                                        </span>
                                        <div>
                                            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                                                {cat.label}
                                            </h2>
                                            {cat.description && (
                                                <p className="text-xs text-muted-foreground sm:text-sm">
                                                    {cat.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-border/60 bg-card shadow-xs">
                                        <Accordion
                                            type="single"
                                            collapsible
                                            className="w-full divide-y divide-border/60"
                                        >
                                            {list.map((item) => (
                                                <AccordionItem
                                                    key={item.id}
                                                    value={`faq-${item.id}`}
                                                    className="border-0 px-5"
                                                >
                                                    <AccordionTrigger className="py-5 text-left hover:no-underline">
                                                        <span className="flex items-start gap-3 pr-4 text-sm font-semibold text-foreground sm:text-base">
                                                            <span
                                                                className={cn(
                                                                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg',
                                                                    cat.tone,
                                                                )}
                                                            >
                                                                <HelpCircle className="size-3.5" />
                                                            </span>
                                                            {item.question}
                                                        </span>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pb-5">
                                                        <div
                                                            className={cn(
                                                                'prose prose-sm max-w-none pl-9 dark:prose-invert',
                                                                'prose-p:leading-relaxed prose-p:text-foreground/80',
                                                                'prose-a:font-medium prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline',
                                                                'prose-strong:font-semibold prose-strong:text-foreground',
                                                                'prose-li:text-foreground/80 prose-li:marker:text-brand-blue',
                                                            )}
                                                            dangerouslySetInnerHTML={{
                                                                __html: sanitizeHtml(item.answer),
                                                            }}
                                                        />
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}

                {/* ===== Bottom CTA ===== */}
                <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue p-6 text-white shadow-xl shadow-brand-navy/10 sm:p-10">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -left-12 -bottom-12 size-72 rounded-full bg-brand-cyan/30 blur-3xl"
                    />
                    <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur sm:flex">
                                <LifeBuoy className="size-6" />
                            </span>
                            <div className="max-w-xl">
                                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                    Masih punya pertanyaan?
                                </h2>
                                <p className="mt-2 text-sm text-white/80 sm:text-base">
                                    Tim KarirConnect siap membantu Anda dengan jawaban yang lebih
                                    personal dan mendetail.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                asChild
                                size="lg"
                                className="h-11 rounded-xl bg-white px-5 text-brand-navy hover:bg-white/90"
                            >
                                <Link href={contact().url}>
                                    <Mail className="size-4" /> Hubungi Tim
                                </Link>
                            </Button>
                            <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="h-11 rounded-xl border-white/30 bg-white/10 px-5 text-white hover:bg-white/20"
                            >
                                <Link href="/employee/career-coach">
                                    <MessagesSquare className="size-4" /> Tanya AI Coach
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
