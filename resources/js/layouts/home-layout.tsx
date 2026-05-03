import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ChevronDown,
    Cookie,
    FileQuestion,
    Heart,
    HelpCircle,
    Info,
    Mail,
    MapPin,
    Menu,
    Phone,
    ScrollText,
    Shield,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';
import {
    about as aboutRoute,
    contact as contactRoute,
    faq as faqRoute,
    salaryInsight as salaryInsightRoute,
} from '@/routes/public';
import { index as jobsIndex } from '@/routes/public/jobs';
import { index as companiesIndex } from '@/routes/public/companies';
import { index as careerResourcesIndex } from '@/routes/public/career-resources';
import { show as legalShow } from '@/routes/public/legal';
import type { Auth, FeatureFlags } from '@/types';
import type { AppMeta, Branding } from '@/types/shared';

type HomeLayoutProps = {
    children: ReactNode;
};

type NavItem = {
    href: string;
    label: string;
};

type HelpItem = {
    href: string;
    label: string;
    description?: string;
    icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
    { href: '/jobs', label: 'Lowongan' },
    { href: '/companies', label: 'Perusahaan' },
    { href: '/salary-insight', label: 'Insight Gaji' },
    { href: '/career-resources', label: 'Tips Karier' },
];

const HELP_ITEMS: HelpItem[] = [
    { href: '/tentang-kami', label: 'Tentang Kami', description: 'Misi & tim di balik KarirConnect', icon: Info },
    { href: '/faq', label: 'FAQ', description: 'Pertanyaan yang sering diajukan', icon: FileQuestion },
    { href: '/contact', label: 'Kontak', description: 'Hubungi tim dukungan', icon: Phone },
    { href: '/legal/privacy', label: 'Privasi & Legal', description: 'Syarat layanan & kebijakan', icon: ShieldCheck },
];

function isActive(currentPath: string, href: string): boolean {
    if (href === '/') return currentPath === '/';
    return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function HomeLayout({ children }: HomeLayoutProps) {
    const props = usePage().props as unknown as {
        auth?: Auth;
        features?: FeatureFlags;
        app?: AppMeta;
        branding?: Branding;
    };
    const { url } = usePage();
    const auth = props.auth;
    const features = props.features ?? {};
    const appName = props.app?.name ?? 'KarirConnect';
    const logoPath = props.branding?.logo_path;

    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileHelpOpen, setMobileHelpOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const helpActive = HELP_ITEMS.some((item) => isActive(url, item.href));

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 4);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [mobileOpen]);

    useEffect(() => {
        setMobileOpen(false);
        setMobileHelpOpen(false);
    }, [url]);

    return (
        <div className="flex min-h-svh flex-col bg-background text-foreground">
            {/* ===== Top accent line ===== */}
            <div className="h-0.5 w-full bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue" />

            {/* ===== Header ===== */}
            <header
                className={cn(
                    'sticky top-0 z-40 w-full border-b transition-all duration-200',
                    scrolled
                        ? 'border-border/60 bg-background/85 shadow-[0_1px_0_0_rgba(0,0,0,0.02)] backdrop-blur-md'
                        : 'border-transparent bg-background/70 backdrop-blur',
                )}
            >
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:h-[72px] lg:px-8">
                    {/* Brand */}
                    <Link href="/" className="group flex items-center" prefetch aria-label={appName}>
                        {logoPath ? (
                            <img
                                src={logoPath}
                                alt={appName}
                                className="h-9 w-auto transition-transform group-hover:scale-[1.02]"
                            />
                        ) : (
                            <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-md shadow-brand-blue/25 transition-transform group-hover:scale-[1.04]">
                                <AppLogoIcon className="size-5 fill-current text-white" />
                                <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/30" />
                            </div>
                        )}
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(url, item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch
                                    className={cn(
                                        'group/nav relative rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        active
                                            ? 'text-brand-blue'
                                            : 'text-muted-foreground hover:text-brand-navy',
                                    )}
                                >
                                    {item.label}
                                    <span
                                        className={cn(
                                            'pointer-events-none absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan transition-all duration-200',
                                            active ? 'opacity-100' : 'opacity-0 group-hover/nav:opacity-60',
                                        )}
                                    />
                                </Link>
                            );
                        })}

                        {/* Bantuan dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        'group/nav relative inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        helpActive ? 'text-brand-blue' : 'text-muted-foreground hover:text-brand-navy',
                                    )}
                                >
                                    Bantuan
                                    <ChevronDown className="size-3.5 transition-transform group-data-[state=open]/nav:rotate-180" />
                                    <span
                                        className={cn(
                                            'pointer-events-none absolute -bottom-px left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan transition-all duration-200',
                                            helpActive ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" sideOffset={10} className="w-72 p-2">
                                {HELP_ITEMS.map((item) => {
                                    const active = isActive(url, item.href);
                                    return (
                                        <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                                            <Link
                                                href={item.href}
                                                prefetch
                                                className={cn(
                                                    'flex items-start gap-3 rounded-lg px-2.5 py-2',
                                                    active && 'bg-brand-blue/8 text-brand-blue',
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                                                        active
                                                            ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white'
                                                            : 'bg-muted text-brand-navy',
                                                    )}
                                                >
                                                    <item.icon
                                                        className={cn(
                                                            'size-4',
                                                            active ? 'text-white' : 'text-brand-navy',
                                                        )}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-brand-navy">{item.label}</div>
                                                    {item.description && (
                                                        <div className="text-[11px] text-muted-foreground">{item.description}</div>
                                                    )}
                                                </div>
                                            </Link>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </nav>

                    {/* Auth buttons */}
                    <div className="ml-auto flex items-center gap-2 lg:ml-0">
                        {auth?.user ? (
                            <Link
                                href={dashboard()}
                                prefetch
                                className="group/dash hidden h-10 items-center gap-1.5 rounded-full bg-brand-navy px-5 text-sm font-semibold text-white transition-all hover:bg-brand-blue hover:shadow-lg hover:shadow-brand-blue/30 sm:inline-flex"
                            >
                                Dashboard
                                <ArrowRight className="size-3.5 transition-transform group-hover/dash:translate-x-0.5" />
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    prefetch
                                    className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-brand-navy transition-colors hover:text-brand-blue sm:inline-flex"
                                >
                                    Masuk
                                </Link>
                                {features.registration_enabled !== false && (
                                    <Link
                                        href={register()}
                                        prefetch
                                        className="group/cta relative hidden h-10 items-center gap-1.5 overflow-hidden rounded-full bg-brand-navy px-5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-lg hover:shadow-brand-blue/30 sm:inline-flex"
                                    >
                                        {/* Animated gradient sheen on hover */}
                                        <span
                                            aria-hidden
                                            className="absolute inset-0 -z-0 bg-gradient-to-r from-brand-blue to-brand-cyan opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100"
                                        />
                                        <span className="relative z-10">Daftar Gratis</span>
                                        <ArrowRight className="relative z-10 size-3.5 transition-transform group-hover/cta:translate-x-0.5" />
                                    </Link>
                                )}
                            </>
                        )}

                        {/* Mobile toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileOpen((v) => !v)}
                            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
                            aria-expanded={mobileOpen}
                            className={cn(
                                'inline-flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-brand-navy transition-colors',
                                'hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-brand-blue',
                                'lg:hidden',
                            )}
                        >
                            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>

                {/* ===== Mobile drawer ===== */}
                <div
                    className={cn(
                        'lg:hidden',
                        'overflow-hidden border-t transition-[max-height,opacity] duration-300 ease-out',
                        mobileOpen
                            ? 'max-h-[36rem] border-border/60 bg-background/95 opacity-100 backdrop-blur'
                            : 'max-h-0 border-transparent opacity-0',
                    )}
                >
                    <div className="space-y-1 px-4 py-4 sm:px-6">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(url, item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch
                                    className={cn(
                                        'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                        active
                                            ? 'bg-brand-blue/8 text-brand-blue ring-1 ring-brand-blue/15'
                                            : 'text-brand-navy hover:bg-muted',
                                    )}
                                >
                                    {item.label}
                                    <ArrowRight
                                        className={cn(
                                            'size-4 transition-transform',
                                            active ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0',
                                        )}
                                    />
                                </Link>
                            );
                        })}

                        {/* Bantuan accordion (mobile) */}
                        <button
                            type="button"
                            onClick={() => setMobileHelpOpen((v) => !v)}
                            className={cn(
                                'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                helpActive ? 'bg-brand-blue/8 text-brand-blue ring-1 ring-brand-blue/15' : 'text-brand-navy hover:bg-muted',
                            )}
                            aria-expanded={mobileHelpOpen}
                        >
                            <span className="inline-flex items-center gap-2">
                                <HelpCircle className="size-4" /> Bantuan
                            </span>
                            <ChevronDown className={cn('size-4 transition-transform', mobileHelpOpen && 'rotate-180')} />
                        </button>
                        {mobileHelpOpen && (
                            <div className="ml-3 space-y-1 border-l border-border/50 pl-3">
                                {HELP_ITEMS.map((item) => {
                                    const active = isActive(url, item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            prefetch
                                            className={cn(
                                                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                                                active ? 'text-brand-blue' : 'text-muted-foreground hover:text-brand-navy',
                                            )}
                                        >
                                            <item.icon className="size-4" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        {!auth?.user && (
                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
                                <Link
                                    href={login()}
                                    prefetch
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-border/60 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                                >
                                    Masuk
                                </Link>
                                {features.registration_enabled !== false && (
                                    <Link
                                        href={register()}
                                        prefetch
                                        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-brand-navy text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-blue hover:shadow-md"
                                    >
                                        Daftar Gratis
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ===== Main ===== */}
            <main className="flex-1">{children}</main>

            {/* ===== Footer ===== */}
            <footer className="relative mt-20 overflow-hidden border-t bg-gradient-to-b from-background via-background to-muted/40">
                {/* Decorative brand wash */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -left-40 top-10 h-72 w-72 rounded-full bg-brand-blue/5 blur-3xl"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-brand-cyan/5 blur-3xl"
                />

                <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
                    {/* Brand col */}
                    <div className="space-y-5 sm:col-span-2 lg:col-span-4">
                        <Link href="/" className="inline-flex items-center gap-2.5" prefetch>
                            {logoPath ? (
                                <img src={logoPath} alt={appName} className="h-10 w-auto" />
                            ) : (
                                <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-md shadow-brand-blue/25">
                                    <AppLogoIcon className="size-5 fill-current text-white" />
                                </div>
                            )}
                            <span className="text-base font-bold tracking-tight text-foreground">
                                {appName}
                            </span>
                        </Link>
                        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                            Platform karier all-in-one yang mempertemukan kandidat dengan perusahaan
                            terbaik, didukung AI Coach, AI Interview, dan insight gaji riil dari
                            ribuan posisi.
                        </p>
                        <div className="flex flex-col gap-2.5 pt-1 text-xs text-muted-foreground">
                            <a
                                href="mailto:halo@karirconnect.id"
                                className="group inline-flex items-center gap-2 transition-colors hover:text-brand-blue"
                            >
                                <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue transition-colors group-hover:bg-brand-blue/15">
                                    <Mail className="size-3.5" />
                                </span>
                                halo@karirconnect.id
                            </a>
                            <span className="inline-flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                    <MapPin className="size-3.5" />
                                </span>
                                Jakarta, Indonesia
                            </span>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-blue">
                                <Sparkles className="size-3" />
                                Made in Indonesia
                            </span>
                        </div>
                    </div>

                    {/* Link columns */}
                    <div className="space-y-4 lg:col-span-2">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-navy">
                            <span className="size-1 rounded-full bg-brand-blue" />
                            Perusahaan
                        </h3>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li>
                                <Link
                                    href={aboutRoute().url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    Tentang Kami
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={contactRoute().url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    Kontak
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={faqRoute().url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    FAQ
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={careerResourcesIndex().url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    Tips Karier
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-navy">
                            <span className="size-1 rounded-full bg-brand-cyan" />
                            Cari Kerja
                        </h3>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li>
                                <Link
                                    href={jobsIndex().url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    Lowongan
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={companiesIndex().url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    Perusahaan
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={salaryInsightRoute().url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    Insight Gaji
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                            {!auth?.user && features.registration_enabled !== false && (
                                <li>
                                    <Link
                                        href={register().url}
                                        className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                    >
                                        Buat Akun
                                        <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>

                    <div className="space-y-4 lg:col-span-2">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-navy">
                            <span className="size-1 rounded-full bg-amber-400" />
                            Legal
                        </h3>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li>
                                <Link
                                    href={legalShow('terms').url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    Syarat & Ketentuan
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={legalShow('privacy').url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    Kebijakan Privasi
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={legalShow('cookies').url}
                                    className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                                >
                                    Kebijakan Cookies
                                    <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* CTA card */}
                    <div className="sm:col-span-2 lg:col-span-2">
                        <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy via-brand-blue to-brand-cyan p-5 text-white shadow-lg shadow-brand-blue/20">
                            <div
                                aria-hidden
                                className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/15 blur-2xl"
                            />
                            <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 opacity-15"
                                style={{
                                    backgroundImage:
                                        'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
                                    backgroundSize: '20px 20px',
                                }}
                            />
                            <div className="relative">
                                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">
                                    <Sparkles className="size-4" />
                                </span>
                                <h4 className="mt-3 text-sm font-bold leading-tight">
                                    Siap melangkah lebih jauh?
                                </h4>
                                <p className="mt-1.5 text-xs leading-relaxed text-white/80">
                                    Bergabung gratis dan dapatkan AI Coach pribadi.
                                </p>
                                {!auth?.user && features.registration_enabled !== false && (
                                    <Button
                                        asChild
                                        size="sm"
                                        className="mt-3 h-9 w-full rounded-lg bg-white text-brand-blue hover:bg-white/95"
                                    >
                                        <Link href={register()} prefetch>
                                            Mulai Sekarang
                                            <ArrowRight className="size-3.5" />
                                        </Link>
                                    </Button>
                                )}
                                {auth?.user && (
                                    <Button
                                        asChild
                                        size="sm"
                                        className="mt-3 h-9 w-full rounded-lg bg-white text-brand-blue hover:bg-white/95"
                                    >
                                        <Link href={dashboard()} prefetch>
                                            Buka Dashboard
                                            <ArrowRight className="size-3.5" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative border-t border-border/60">
                    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                        <div className="flex items-center gap-1.5">
                            <span>© {new Date().getFullYear()} {appName}. Dibuat dengan</span>
                            <Heart className="size-3.5 fill-rose-500 text-rose-500" />
                            <span>untuk Indonesia.</span>
                        </div>
                        <nav className="flex items-center gap-3" aria-label="Tautan legal">
                            <Link
                                href={legalShow('terms').url}
                                className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-blue"
                            >
                                <ScrollText className="size-3.5" />
                                Terms
                            </Link>
                            <span className="text-border">·</span>
                            <Link
                                href={legalShow('privacy').url}
                                className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-blue"
                            >
                                <Shield className="size-3.5" />
                                Privacy
                            </Link>
                            <span className="text-border">·</span>
                            <Link
                                href={legalShow('cookies').url}
                                className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-blue"
                            >
                                <Cookie className="size-3.5" />
                                Cookies
                            </Link>
                        </nav>
                    </div>
                </div>
            </footer>
        </div>
    );
}
