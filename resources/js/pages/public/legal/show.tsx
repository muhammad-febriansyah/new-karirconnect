import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock,
    Cookie,
    FileText,
    Hash,
    Mail,
    Printer,
    ScrollText,
    Share2,
    Shield,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format-date';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { home } from '@/routes';
import { contact } from '@/routes/public';
import { show as legalShow } from '@/routes/public/legal';

type RelatedPage = {
    slug: string;
    title: string;
};

type Props = {
    page: {
        slug: string;
        title: string;
        body: string;
        updated_at: string | null;
    };
    relatedPages: RelatedPage[];
};

const SLUG_META: Record<string, { icon: LucideIcon; tone: string; label: string; kicker: string }> = {
    privacy: {
        icon: Shield,
        tone: 'bg-brand-blue/10 text-brand-blue',
        label: 'Kebijakan Privasi',
        kicker: 'Privasi & Data',
    },
    terms: {
        icon: ScrollText,
        tone: 'bg-violet-100 text-violet-700',
        label: 'Syarat & Ketentuan',
        kicker: 'Ketentuan Layanan',
    },
    cookies: {
        icon: Cookie,
        tone: 'bg-amber-100 text-amber-700',
        label: 'Kebijakan Cookies',
        kicker: 'Cookies & Pelacakan',
    },
};

function metaFor(slug: string, title: string): { icon: LucideIcon; tone: string; label: string; kicker: string } {
    return (
        SLUG_META[slug.toLowerCase()] ?? {
            icon: FileText,
            tone: 'bg-muted text-muted-foreground',
            label: title,
            kicker: 'Dokumen Legal',
        }
    );
}

export default function PublicLegalShow({ page, relatedPages }: Props) {
    const [copied, setCopied] = useState(false);
    const [progress, setProgress] = useState(0);
    const meta = metaFor(page.slug, page.title);
    const Icon = meta.icon;

    // Estimated reading time (~220 wpm for legal/dense text)
    const readingMinutes = useMemo(() => {
        const text = page.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const words = text ? text.split(' ').length : 0;
        return Math.max(1, Math.ceil(words / 220));
    }, [page.body]);

    // Reading progress: % of viewport scrolled through document
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onScroll = () => {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (docHeight <= 0) {
                setProgress(0);
                return;
            }
            const pct = Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100));
            setProgress(pct);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const headings = useMemo(() => {
        if (typeof window === 'undefined') return [];
        const doc = new DOMParser().parseFromString(page.body, 'text/html');
        return Array.from(doc.querySelectorAll('h2, h3')).map((el, i) => ({
            id: el.id || `legal-heading-${i}`,
            text: el.textContent ?? '',
            level: el.tagName === 'H2' ? 2 : 3,
        }));
    }, [page.body]);

    const bodyWithIds = useMemo(() => {
        if (typeof window === 'undefined') return sanitizeHtml(page.body);
        const doc = new DOMParser().parseFromString(page.body, 'text/html');
        let i = 0;
        doc.querySelectorAll('h2, h3').forEach((el) => {
            if (!el.id) el.id = `legal-heading-${i}`;
            i += 1;
        });
        return sanitizeHtml(doc.body.innerHTML);
    }, [page.body]);

    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
            try {
                await navigator.share({ title: page.title, url });
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

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <>
            <Head title={page.title} />

            {/* Reading progress bar */}
            <div
                aria-hidden
                className="fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent print:hidden"
            >
                <div
                    className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan transition-[width] duration-100"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="space-y-6">
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
                            <BreadcrumbPage>Legal</BreadcrumbPage>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="line-clamp-1">{page.title}</BreadcrumbPage>
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
                    <div className="relative space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                                <Sparkles className="size-3" />
                                {meta.kicker}
                            </span>
                            {page.updated_at && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur">
                                    <Calendar className="size-3" />
                                    Diperbarui {formatDate(page.updated_at)}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur">
                                <Clock className="size-3" />
                                {readingMinutes} menit baca
                            </span>
                            {headings.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur">
                                    <Hash className="size-3" />
                                    {headings.filter((h) => h.level === 2).length} bagian
                                </span>
                            )}
                        </div>
                        <div className="flex items-start gap-4">
                            <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur sm:flex">
                                <Icon className="size-7" />
                            </span>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                                    {page.title}
                                </h1>
                                <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                                    Dokumen legal resmi KarirConnect. Mohon dibaca dengan teliti
                                    sebelum menggunakan layanan kami.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                                type="button"
                                onClick={handleShare}
                                size="sm"
                                className="h-9 rounded-xl bg-white px-4 text-brand-navy hover:bg-white/90"
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
                                type="button"
                                onClick={handlePrint}
                                size="sm"
                                variant="outline"
                                className="h-9 rounded-xl border-white/30 bg-white/10 px-4 text-white hover:bg-white/20"
                            >
                                <Printer className="size-4" /> Cetak
                            </Button>
                        </div>
                    </div>
                </section>

                {/* ===== Body grid ===== */}
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <article className="min-w-0">
                        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs sm:p-8">
                            <div
                                className={cn(
                                    'prose prose-neutral max-w-none dark:prose-invert',
                                    'prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-headings:text-foreground',
                                    'prose-h2:mt-10 prose-h2:text-2xl prose-h2:font-bold',
                                    'prose-h3:mt-8 prose-h3:text-xl prose-h3:font-semibold',
                                    'prose-p:leading-relaxed prose-p:text-foreground/85',
                                    'prose-a:font-medium prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline',
                                    'prose-strong:font-semibold prose-strong:text-foreground',
                                    'prose-blockquote:border-l-4 prose-blockquote:border-brand-blue prose-blockquote:bg-brand-blue/5 prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:text-foreground/85',
                                    'prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none',
                                    'prose-li:text-foreground/85 prose-li:marker:text-brand-blue',
                                )}
                                dangerouslySetInnerHTML={{ __html: bodyWithIds }}
                            />
                        </div>

                        {/* ===== Bottom CTA ===== */}
                        <section className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-xs sm:p-8">
                            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="max-w-xl">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                                        <Mail className="size-3" /> Butuh bantuan?
                                    </span>
                                    <h3 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                        Pertanyaan tentang dokumen ini?
                                    </h3>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                        Tim KarirConnect siap menjawab pertanyaan terkait privasi,
                                        ketentuan layanan, atau kebijakan cookies.
                                    </p>
                                </div>
                                <Button
                                    asChild
                                    className="h-10 rounded-xl bg-brand-blue px-5 hover:bg-brand-blue/90"
                                >
                                    <Link href={contact().url}>
                                        Hubungi Kami <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
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
                                        <li key={h.id} className={cn(h.level === 3 && 'pl-3')}>
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

                        {/* About this document */}
                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                    <Sparkles className="size-4" />
                                </span>
                                <h3 className="text-sm font-semibold">Tentang Dokumen</h3>
                            </div>
                            <ul className="mt-3 space-y-2.5 text-sm">
                                <li className="flex items-center justify-between text-foreground/85">
                                    <span className="text-muted-foreground">Jenis</span>
                                    <span className="font-medium">{meta.kicker}</span>
                                </li>
                                {page.updated_at && (
                                    <li className="flex items-center justify-between text-foreground/85">
                                        <span className="text-muted-foreground">Diperbarui</span>
                                        <span className="font-medium">
                                            {formatDate(page.updated_at)}
                                        </span>
                                    </li>
                                )}
                                <li className="flex items-center justify-between text-foreground/85">
                                    <span className="text-muted-foreground">Estimasi baca</span>
                                    <span className="font-medium">{readingMinutes} menit</span>
                                </li>
                                {headings.length > 0 && (
                                    <li className="flex items-center justify-between text-foreground/85">
                                        <span className="text-muted-foreground">Jumlah bagian</span>
                                        <span className="font-medium tabular-nums">
                                            {headings.filter((h) => h.level === 2).length}
                                        </span>
                                    </li>
                                )}
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
                                        <Share2 className="size-4" /> Bagikan Dokumen
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Other legal documents */}
                        {relatedPages.length > 0 && (
                            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <FileText className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-semibold">Dokumen Lainnya</h3>
                                </div>
                                <ul className="mt-3 space-y-2">
                                    {relatedPages.map((r) => {
                                        const rMeta = metaFor(r.slug, r.title);
                                        const RIcon = rMeta.icon;
                                        return (
                                            <li key={r.slug}>
                                                <Link
                                                    href={legalShow(r.slug).url}
                                                    className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-brand-blue/5"
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
                                                        <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand-blue">
                                                            {r.title}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {rMeta.kicker}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-blue" />
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
