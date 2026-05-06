import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Home, LayoutDashboard, RefreshCw } from 'lucide-react';
import { Spotlight } from '@/components/aceternity/spotlight';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import type { SharedPageProps } from '@/types';
import { cn } from '@/lib/utils';

type ErrorStatus = 403 | 404 | 419 | 429 | 500 | 503;

type ErrorContent = {
    badge: string;
    title: string;
    description: string;
    showRefresh?: boolean;
};

const FALLBACK_CONTENT: ErrorContent = {
    badge: 'Error',
    title: 'Ada yang tidak beres',
    description: 'Sesuatu yang tidak terduga terjadi. Silakan coba lagi atau kembali ke halaman utama.',
};

const CONTENT_MAP: Record<ErrorStatus, ErrorContent> = {
    403: {
        badge: '403 · Akses Ditolak',
        title: 'Kamu tidak memiliki akses',
        description: 'Halaman ini hanya bisa diakses oleh pengguna tertentu. Pastikan kamu masuk dengan akun yang tepat.',
    },
    404: {
        badge: '404 · Tidak Ditemukan',
        title: 'Halaman yang dicari tidak ada',
        description: 'Halaman mungkin sudah dipindahkan, dihapus, atau tautan yang kamu ikuti salah.',
    },
    419: {
        badge: '419 · Sesi Berakhir',
        title: 'Sesi kamu sudah habis',
        description: 'Untuk alasan keamanan, sesi telah berakhir. Silakan muat ulang halaman lalu coba lagi.',
        showRefresh: true,
    },
    429: {
        badge: '429 · Terlalu Banyak Permintaan',
        title: 'Tunggu sebentar ya',
        description: 'Kamu mengirim terlalu banyak permintaan dalam waktu singkat. Coba lagi dalam beberapa saat.',
        showRefresh: true,
    },
    500: {
        badge: '500 · Server Error',
        title: 'Ada gangguan di server kami',
        description: 'Tim teknis sudah otomatis diberitahu dan sedang mengatasinya. Silakan coba beberapa saat lagi.',
        showRefresh: true,
    },
    503: {
        badge: '503 · Pemeliharaan',
        title: 'Sedang melakukan perbaikan',
        description: 'Kami sedang memperbarui sistem agar lebih baik. Silakan kembali sebentar lagi.',
        showRefresh: true,
    },
};

type Props = {
    status: number;
    message?: string | null;
};

function dashboardHref(role?: string | null): string {
    switch (role) {
        case 'admin':
            return '/admin';
        case 'employer':
            return '/employer';
        case 'employee':
            return '/dashboard';
        default:
            return '/';
    }
}

function dashboardLabel(role?: string | null): string {
    switch (role) {
        case 'admin':
            return 'Buka Admin Panel';
        case 'employer':
            return 'Buka Dashboard Perekrut';
        case 'employee':
            return 'Buka Dashboard';
        default:
            return 'Ke Beranda';
    }
}

export default function ErrorPage({ status, message }: Props) {
    const { auth, app, branding } = usePage<SharedPageProps>().props;
    const content = (CONTENT_MAP[status as ErrorStatus] ?? FALLBACK_CONTENT) as ErrorContent;
    const role = auth?.user?.role ?? null;
    const isLoggedIn = Boolean(auth?.user);
    const logoSrc = branding?.logo_path ?? null;
    const appName = app?.name ?? 'KarirConnect';

    const handleBack = () => {
        if (typeof window === 'undefined') return;
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    };

    const handleRefresh = () => {
        if (typeof window === 'undefined') return;
        window.location.reload();
    };

    return (
        <>
            <SeoHead title={`${status} · ${content.title}`} description={content.description} robots="noindex, nofollow" />

            <main className="relative min-h-svh overflow-hidden bg-background">
                {/* Backdrop — soft radial wash + grid mask, sama seperti hero homepage */}
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

                <div className="relative z-10 mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-20 lg:py-24">
                    {/* Brand logo from settings */}
                    <Link href="/" className="inline-flex items-center gap-2" aria-label={appName}>
                        {logoSrc ? (
                            <img src={logoSrc} alt={appName} className="h-10 w-auto sm:h-12" />
                        ) : (
                            <span className="text-lg font-bold text-brand-navy sm:text-xl">{appName}</span>
                        )}
                    </Link>

                    {/* Status pill */}
                    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-1 py-1 pr-4 text-xs shadow-sm backdrop-blur">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                            {content.badge}
                        </span>
                        <span className="font-medium text-brand-navy">{appName}</span>
                    </div>

                    {/* Big status number with gradient */}
                    <div
                        aria-hidden
                        className="relative mt-8 select-none text-7xl font-extrabold leading-none tracking-tight sm:mt-10 sm:text-8xl lg:text-[9rem]"
                    >
                        <span
                            aria-hidden
                            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-blue/25 via-brand-cyan/15 to-transparent blur-3xl sm:size-72"
                        />
                        <span className="bg-gradient-to-br from-brand-blue via-brand-blue to-brand-cyan bg-clip-text text-transparent">
                            {status}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="mt-6 max-w-xl text-2xl font-bold leading-tight tracking-tight text-brand-navy sm:text-3xl lg:text-4xl">
                        {content.title}
                    </h1>

                    {/* Description */}
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {message?.trim() ? message : content.description}
                    </p>

                    {/* CTAs */}
                    <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
                        <Button
                            asChild
                            size="lg"
                            className={cn(
                                'rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan px-6 font-semibold shadow-md shadow-brand-blue/20 hover:brightness-105 hover:shadow-lg hover:shadow-brand-blue/30',
                            )}
                        >
                            <Link href={isLoggedIn ? dashboardHref(role) : '/'}>
                                {isLoggedIn ? <LayoutDashboard className="size-4" /> : <Home className="size-4" />}
                                {isLoggedIn ? dashboardLabel(role) : 'Kembali ke Beranda'}
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>

                        {content.showRefresh ? (
                            <Button
                                type="button"
                                size="lg"
                                variant="outline"
                                onClick={handleRefresh}
                                className="rounded-full border-border/60 bg-background/70 px-6 font-medium backdrop-blur hover:border-brand-blue/40 hover:bg-background"
                            >
                                <RefreshCw className="size-4" />
                                Muat Ulang
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="lg"
                                variant="outline"
                                onClick={handleBack}
                                className="rounded-full border-border/60 bg-background/70 px-6 font-medium backdrop-blur hover:border-brand-blue/40 hover:bg-background"
                            >
                                <ArrowLeft className="size-4" />
                                Halaman Sebelumnya
                            </Button>
                        )}
                    </div>

                    {/* Footer help link */}
                    <p className="mt-10 text-xs text-muted-foreground">
                        Butuh bantuan?{' '}
                        <Link
                            href="/contact"
                            className="font-semibold text-brand-navy underline-offset-4 hover:text-brand-blue hover:underline"
                        >
                            Hubungi tim kami
                        </Link>
                    </p>
                </div>
            </main>
        </>
    );
}
