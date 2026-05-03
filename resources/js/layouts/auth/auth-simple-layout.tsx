import { Link, usePage } from '@inertiajs/react';
import { Briefcase, Sparkles, ShieldCheck } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import type { AppMeta, Branding } from '@/types/shared';

const HIGHLIGHTS = [
    {
        icon: Briefcase,
        title: 'Lowongan Terkurasi',
        description: 'Akses ribuan posisi dari perusahaan terverifikasi.',
    },
    {
        icon: Sparkles,
        title: 'Pendamping AI',
        description: 'Coaching karier & simulasi wawancara berbasis AI.',
    },
    {
        icon: ShieldCheck,
        title: 'Aman & Terpercaya',
        description: 'Data terenkripsi dan akun terlindungi 2FA.',
    },
];

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const props = usePage().props as unknown as {
        app?: AppMeta;
        branding?: Branding;
    };
    const appName = props.app?.name ?? 'KarirConnect';
    const logoPath = props.branding?.logo_path;

    return (
        <div className="relative min-h-svh bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
            {/* ===== Brand panel (left, desktop only) ===== */}
            <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
                {/* Base gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-cyan" />

                {/* Mesh blobs */}
                <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-cyan/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-16 h-[26rem] w-[26rem] rounded-full bg-brand-blue/50 blur-3xl" />
                <div className="pointer-events-none absolute right-1/3 top-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

                {/* Dotted grid */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                        maskImage:
                            'radial-gradient(ellipse at top right, black 0%, transparent 70%)',
                        WebkitMaskImage:
                            'radial-gradient(ellipse at top right, black 0%, transparent 70%)',
                    }}
                />

                {/* Geometric accent ring */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-40 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full border border-white/15"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-24 top-1/2 h-[24rem] w-[24rem] -translate-y-1/2 rounded-full border border-white/20"
                />

                {/* Top: logo */}
                <Link href={home()} className="relative z-10 flex items-center gap-3 text-white">
                    {logoPath ? (
                        <img src={logoPath} alt={appName} className="h-10 w-auto" />
                    ) : (
                        <div className="relative flex aspect-square size-11 items-center justify-center overflow-hidden rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/30">
                            <AppLogoIcon className="size-6 fill-current text-white" />
                            <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/15 to-white/30" />
                        </div>
                    )}
                    <div className="flex flex-col leading-tight">
                        <span className="text-base font-bold tracking-tight">{appName}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                            Career Platform
                        </span>
                    </div>
                </Link>

                {/* Middle: hero copy */}
                <div className="relative z-10 max-w-md space-y-6 text-white">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest backdrop-blur">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Bangun karier impianmu
                    </span>
                    <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-[2.7rem]">
                        Satu langkah lebih dekat ke{' '}
                        <span className="relative inline-block">
                            <span className="relative bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                                pekerjaan idaman
                            </span>
                            <svg
                                aria-hidden
                                className="absolute -bottom-2 left-0 h-2 w-full text-cyan-300/70"
                                viewBox="0 0 200 8"
                                preserveAspectRatio="none"
                            >
                                <path
                                    d="M2 5 Q50 1 100 4 T198 5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    fill="none"
                                />
                            </svg>
                        </span>
                        .
                    </h2>
                    <p className="text-base leading-relaxed text-white/80">
                        Gabung dengan komunitas profesional, perekrut, dan AI coach yang siap membantu kamu naik level.
                    </p>

                    <ul className="space-y-3 pt-2">
                        {HIGHLIGHTS.map((item) => (
                            <li key={item.title} className="flex items-start gap-3.5">
                                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25 backdrop-blur">
                                    <item.icon className="size-4 text-white" strokeWidth={2} />
                                </span>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-semibold text-white">{item.title}</p>
                                    <p className="text-xs leading-relaxed text-white/70">{item.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Bottom: stat strip */}
                <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-6 text-white">
                    <div>
                        <p className="text-2xl font-bold leading-none">10K+</p>
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/60">
                            Lowongan aktif
                        </p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold leading-none">500+</p>
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/60">
                            Mitra perusahaan
                        </p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold leading-none">98%</p>
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/60">
                            Tingkat puas
                        </p>
                    </div>
                </div>
            </aside>

            {/* ===== Form panel (right) ===== */}
            <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 sm:p-10 lg:p-12">
                {/* mobile-only ambient blobs */}
                <div className="pointer-events-none absolute inset-0 lg:hidden">
                    <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand-blue/15 blur-3xl" />
                    <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-brand-cyan/20 blur-3xl" />
                </div>

                {/* mobile-only top brand bar */}
                <Link
                    href={home()}
                    className="relative z-10 mb-8 flex items-center gap-2.5 lg:hidden"
                >
                    {logoPath ? (
                        <img src={logoPath} alt={appName} className="h-9 w-auto" />
                    ) : (
                        <div className="relative flex aspect-square size-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-lg shadow-brand-blue/30">
                            <AppLogoIcon className="size-5 fill-current text-white" />
                        </div>
                    )}
                    <span className="text-base font-bold tracking-tight text-brand-navy">{appName}</span>
                </Link>

                <div className="relative z-10 w-full max-w-md">
                    <div className="mb-8 space-y-2.5 text-center lg:text-left">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-blue ring-1 ring-brand-blue/15">
                            <span className="size-1 rounded-full bg-brand-blue" />
                            Selamat datang
                        </span>
                        <h1 className="text-[1.7rem] font-bold tracking-tight text-brand-navy">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>

                    {children}
                </div>

                <p className="relative z-10 mt-8 text-center text-[11px] text-muted-foreground/70">
                    © {new Date().getFullYear()} {appName}. Semua hak dilindungi.
                </p>
            </main>
        </div>
    );
}
