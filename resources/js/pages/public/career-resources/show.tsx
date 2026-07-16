import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Calendar,
    CheckCircle2,
    Clock3,
    Compass,
    DollarSign,
    Eye,
    FileText,
    Lightbulb,
    Link as LinkIcon,
    MessagesSquare,
    Rocket,
    Share2,
    Sparkles,
    Tag
    
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format-date';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as resourceIndex, show as resourceShow } from '@/routes/public/career-resources';

type RelatedItem = {
    id: number;
    title: string;
    slug: string;
    category: string | null;
    reading_minutes: number;
    thumbnail?: string | null;
};

type Props = {
    item: {
        id: number;
        title: string;
        slug: string;
        excerpt: string | null;
        body: string;
        category: string | null;
        tags: string[];
        reading_minutes: number;
        views_count: number;
        published_at: string | null;
        thumbnail: string | null;
    };
    related: RelatedItem[];
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

function metaFor(category: string | null): { icon: LucideIcon; tone: string; label: string } {
    if (!category) {
return { icon: BookOpen, tone: 'bg-muted text-muted-foreground', label: 'General' };
}

    const lower = category.toLowerCase();

    return CATEGORY_META[lower] ?? {
        icon: Compass,
        tone: 'bg-brand-blue/10 text-brand-blue',
        label: category,
    };
}

export default function CareerResourceShow({ item, related }: Props) {
    const [copied, setCopied] = useState(false);
    const [thumbBroken, setThumbBroken] = useState(false);
    const meta = metaFor(item.category);
    const Icon = meta.icon;
    const logoPath = (usePage().props as unknown as { branding?: { logo_path?: string | null } }).branding?.logo_path ?? null;
    const hasThumb = !!item.thumbnail && !thumbBroken;

    // Extract h2 headings from body for table of contents
    const headings = useMemo(() => {
        if (typeof window === 'undefined') {
return [];
}

        const doc = new DOMParser().parseFromString(item.body, 'text/html');

        return Array.from(doc.querySelectorAll('h2, h3')).map((el, i) => ({
            id: el.id || `heading-${i}`,
            text: el.textContent ?? '',
            level: el.tagName === 'H2' ? 2 : 3,
        }));
    }, [item.body]);

    // Inject ids for headings in the rendered HTML
    const bodyWithIds = useMemo(() => {
        if (typeof window === 'undefined') {
return sanitizeHtml(item.body);
}

        const doc = new DOMParser().parseFromString(item.body, 'text/html');
        let i = 0;
        doc.querySelectorAll('h2, h3').forEach((el) => {
            if (!el.id) {
el.id = `heading-${i}`;
}

            i += 1;
        });

        return sanitizeHtml(doc.body.innerHTML);
    }, [item.body]);

    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';

        if (typeof navigator !== 'undefined' && 'share' in navigator) {
            try {
                await navigator.share({ title: item.title, url });

                return;
            } catch {
                // user dismissed
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
            <Head title={item.title} />

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
                                <Link href={resourceIndex().url}>Tips Karier</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="line-clamp-1">{item.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* ===== Article hero ===== */}
                <section className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                        {item.category && (
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                                    meta.tone,
                                )}
                            >
                                <Icon className="size-3" />
                                {meta.label}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <Clock3 className="size-3" />
                            {item.reading_minutes} menit baca
                        </span>
                    </div>

                    <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                        {item.title}
                    </h1>

                    {item.excerpt && (
                        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                            {item.excerpt}
                        </p>
                    )}

                    {/* Meta + actions row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border/60 py-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {item.published_at && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="size-4" />
                                    {formatDate(item.published_at)}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                                <Eye className="size-4" />
                                {item.views_count.toLocaleString('id-ID')} views
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleShare}
                                className="h-9 rounded-xl border-border/60"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 className="size-4 text-emerald-600" /> Tersalin
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="size-4" /> Bagikan
                                    </>
                                )}
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="h-9 rounded-xl border-border/60"
                            >
                                <Link href={resourceIndex().url}>
                                    <ArrowLeft className="size-4" />
                                    <span className="hidden sm:inline">Semua Artikel</span>
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Cover */}
                    {hasThumb ? (
                        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
                            <img
                                src={item.thumbnail!}
                                alt={item.title}
                                onError={() => setThumbBroken(true)}
                                onLoad={(e) => {
                                    if (e.currentTarget.naturalWidth < 64 || e.currentTarget.naturalHeight < 64) {
                                        setThumbBroken(true);
                                    }
                                }}
                                className="aspect-[16/8] w-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="relative flex aspect-[16/8] w-full items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/40 shadow-xs">
                            {logoPath ? (
                                <img src={logoPath} alt="KarirConnect" className="h-16 w-auto opacity-90 sm:h-20" />
                            ) : (
                                <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-md">
                                    <AppLogoIcon className="size-10 fill-current text-white" />
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* ===== Body grid ===== */}
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <article className="min-w-0">
                        <div
                            className={cn(
                                'prose prose-neutral max-w-none',
                                'prose-headings:scroll-mt-20 prose-headings:tracking-tight prose-headings:text-foreground',
                                'prose-h2:mt-10 prose-h2:text-2xl prose-h2:font-bold',
                                'prose-h3:mt-8 prose-h3:text-xl prose-h3:font-semibold',
                                'prose-p:leading-relaxed prose-p:text-foreground/85',
                                'prose-a:font-medium prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline',
                                'prose-strong:font-semibold prose-strong:text-foreground',
                                'prose-blockquote:border-l-4 prose-blockquote:border-brand-blue prose-blockquote:bg-brand-blue/5 prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:text-foreground/85',
                                'prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none',
                                'prose-pre:rounded-xl prose-pre:bg-brand-navy',
                                'prose-img:rounded-xl prose-img:border prose-img:border-border/60',
                                'prose-li:text-foreground/85 prose-li:marker:text-brand-blue',
                            )}
                            dangerouslySetInnerHTML={{ __html: bodyWithIds }}
                        />

                        {/* Tags */}
                        {item.tags.length > 0 && (
                            <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border/60 pt-6">
                                <Tag className="size-4 text-muted-foreground" />
                                {item.tags.map((tag) => (
                                    <Link
                                        key={tag}
                                        href={resourceIndex().url}
                                        className="inline-flex items-center rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-brand-blue"
                                    >
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Bottom navigation CTA */}
                        <section className="mt-10 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue p-6 text-white shadow-xs sm:p-8">
                            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="max-w-xl">
                                    <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                                        Selesai membaca?
                                    </h3>
                                    <p className="mt-1 text-sm text-white/80">
                                        Jelajahi panduan lain atau coba AI Career Coach untuk insight
                                        yang lebih personal.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        asChild
                                        variant="secondary"
                                        className="h-10 rounded-xl bg-white px-5 text-brand-navy hover:bg-white/90"
                                    >
                                        <Link href={resourceIndex().url}>Artikel Lain</Link>
                                    </Button>
                                    <Button
                                        asChild
                                        className="h-10 rounded-xl bg-amber-400 px-5 text-brand-navy hover:bg-amber-300"
                                    >
                                        <Link href="/employee/career-coach">
                                            AI Coach <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </section>
                    </article>

                    {/* ===== Sidebar ===== */}
                    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                        {headings.length > 0 && (
                            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <BookOpen className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-semibold">Daftar Isi</h3>
                                </div>
                                <ul className="mt-3 space-y-1.5 text-sm">
                                    {headings.map((h) => (
                                        <li
                                            key={h.id}
                                            className={cn(h.level === 3 && 'pl-3')}
                                        >
                                            <a
                                                href={`#${h.id}`}
                                                className="block rounded-md px-2 py-1 text-foreground/75 transition-colors hover:bg-brand-blue/5 hover:text-brand-blue"
                                            >
                                                {h.text}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Reading info */}
                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                    <Sparkles className="size-4" />
                                </span>
                                <h3 className="text-sm font-semibold">Tentang Artikel</h3>
                            </div>
                            <ul className="mt-3 space-y-2.5 text-sm">
                                <li className="flex items-center justify-between text-foreground/85">
                                    <span className="text-muted-foreground">Kategori</span>
                                    <span className="font-medium">{meta.label}</span>
                                </li>
                                <li className="flex items-center justify-between text-foreground/85">
                                    <span className="text-muted-foreground">Waktu baca</span>
                                    <span className="font-medium">{item.reading_minutes} menit</span>
                                </li>
                                {item.published_at && (
                                    <li className="flex items-center justify-between text-foreground/85">
                                        <span className="text-muted-foreground">Diterbitkan</span>
                                        <span className="font-medium">
                                            {formatDate(item.published_at)}
                                        </span>
                                    </li>
                                )}
                                <li className="flex items-center justify-between text-foreground/85">
                                    <span className="text-muted-foreground">Views</span>
                                    <span className="font-medium tabular-nums">
                                        {item.views_count.toLocaleString('id-ID')}
                                    </span>
                                </li>
                            </ul>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleShare}
                                className="mt-4 h-9 w-full rounded-xl border-border/60"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 className="size-4 text-emerald-600" /> Tersalin
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="size-4" /> Bagikan Artikel
                                    </>
                                )}
                            </Button>
                        </div>

                        {related.length > 0 && (
                            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <BookOpen className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-semibold">Artikel Terkait</h3>
                                </div>
                                <ul className="mt-3 space-y-2">
                                    {related.map((r) => {
                                        const rMeta = metaFor(r.category);
                                        const RIcon = rMeta.icon;

                                        return (
                                            <li key={r.id}>
                                                <Link
                                                    href={resourceShow(r.slug).url}
                                                    className="group flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-brand-blue/5"
                                                >
                                                    <span
                                                        className={cn(
                                                            'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                                            rMeta.tone,
                                                        )}
                                                    >
                                                        <RIcon className="size-4" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-brand-blue">
                                                            {r.title}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {rMeta.label} · {r.reading_minutes} menit
                                                        </p>
                                                    </div>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}
