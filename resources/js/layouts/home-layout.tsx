import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ChevronDown,
    Cookie,
    FileQuestion,
    Heart,
    HelpCircle,
    Info,
    Facebook,
    Instagram,
    Linkedin,
    Menu,
    Music2,
    Phone,
    ScrollText,
    Shield,
    ShieldCheck,
    Sparkles,
    Twitter,
    X,
    Youtube,
} from 'lucide-react';
import { useEffect, useState  } from 'react';
import type {ReactNode} from 'react';
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
import { index as careerResourcesIndex } from '@/routes/public/career-resources';
import { index as companiesIndex } from '@/routes/public/companies';
import { index as jobsIndex } from '@/routes/public/jobs';
import { show as legalShow } from '@/routes/public/legal';
import type { Auth, FeatureFlags } from '@/types';
import type { AppMeta, Branding, SocialLinks } from '@/types/shared';

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
    if (href === '/') {
return currentPath === '/';
}

    return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function HomeLayout({ children }: HomeLayoutProps) {
    const props = usePage().props as unknown as {
        auth?: Auth;
        features?: FeatureFlags;
        app?: AppMeta;
        branding?: Branding;
        social?: SocialLinks;
    };
    const { url } = usePage();
    const auth = props.auth;
    const features = props.features ?? {};
    const appName = props.app?.name ?? 'KarirConnect';
    const logoPath = props.branding?.logo_path;
    const social = props.social ?? {};

    const socialLinks: { href: string; icon: typeof Linkedin; label: string }[] = [
        { href: social.linkedin ?? '', icon: Linkedin, label: 'LinkedIn' },
        { href: social.instagram ?? '', icon: Instagram, label: 'Instagram' },
        { href: social.twitter ?? '', icon: Twitter, label: 'Twitter / X' },
        { href: social.facebook ?? '', icon: Facebook, label: 'Facebook' },
        { href: social.youtube ?? '', icon: Youtube, label: 'YouTube' },
        { href: social.tiktok ?? '', icon: Music2, label: 'TikTok' },
    ].filter((s) => s.href.trim().length > 0);

    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileHelpOpen, setMobileHelpOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const helpActive = HELP_ITEMS.some((item) => isActive(url, item.href));
    // Landing hero: transparant + teks putih saat di paling atas, jadi solid setelah scroll.
    const isLanding = url === '/';
    const onHero = isLanding && !scrolled;
    // Banner "Siap melangkah lebih jauh?" disembunyikan sementara — set true untuk tampilkan lagi.
    const showFooterCta = false;

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
            {/* ===== Header ===== */}
            <header
                className={cn(
                    'sticky top-0 z-40 w-full border-b transition-all duration-200',
                    isLanding && '-mb-[65px] lg:-mb-[73px]',
                    scrolled
                        ? 'border-border/60 bg-background/85 shadow-[0_1px_0_0_rgba(0,0,0,0.02)] backdrop-blur-md'
                        : onHero
                          ? 'border-transparent bg-transparent'
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
                                            ? onHero
                                                ? 'text-white'
                                                : 'text-brand-blue'
                                            : onHero
                                              ? 'text-white/80 hover:text-white'
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
                                        helpActive
                                            ? onHero
                                                ? 'text-white'
                                                : 'text-brand-blue'
                                            : onHero
                                              ? 'text-white/80 hover:text-white'
                                              : 'text-muted-foreground hover:text-brand-navy',
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
                                className={cn(
                                    'group/dash hidden h-10 items-center gap-1.5 rounded-full px-5 text-sm font-semibold transition-all hover:shadow-lg sm:inline-flex',
                                    onHero
                                        ? 'bg-white text-brand-blue hover:shadow-black/10'
                                        : 'bg-brand-navy text-white hover:bg-brand-blue hover:shadow-brand-blue/30',
                                )}
                            >
                                Dashboard
                                <ArrowRight className="size-3.5 transition-transform group-hover/dash:translate-x-0.5" />
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    prefetch
                                    className={cn(
                                        'hidden h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors sm:inline-flex',
                                        onHero ? 'text-white hover:text-white/80' : 'text-brand-navy hover:text-brand-blue',
                                    )}
                                >
                                    Masuk
                                </Link>
                                {features.registration_enabled !== false && (
                                    <Link
                                        href={register()}
                                        prefetch
                                        className={cn(
                                            'group/cta relative hidden h-10 items-center gap-1.5 overflow-hidden rounded-full px-5 text-sm font-semibold shadow-sm transition-all hover:shadow-lg sm:inline-flex',
                                            onHero
                                                ? 'bg-white text-brand-blue hover:shadow-black/10'
                                                : 'bg-brand-navy text-white hover:shadow-brand-blue/30',
                                        )}
                                    >
                                        {/* Animated gradient sheen on hover — non-aktif saat di hero (tombol putih) */}
                                        {!onHero && (
                                            <span
                                                aria-hidden
                                                className="absolute inset-0 -z-0 bg-gradient-to-r from-brand-blue to-brand-cyan opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100"
                                            />
                                        )}
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
                                'inline-flex size-10 items-center justify-center rounded-xl border transition-colors lg:hidden',
                                onHero
                                    ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                                    : 'border-border/60 bg-muted/30 text-brand-navy hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-brand-blue',
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

                {/* ── Top CTA banner (full-width) — hidden for now ── */}
                {showFooterCta && (
                <div className="relative mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-brand-blue to-brand-cyan p-6 text-white shadow-xl shadow-brand-blue/20 sm:p-8">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-white/15 blur-3xl"
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-brand-cyan/40 blur-3xl"
                        />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 opacity-[0.12]"
                            style={{
                                backgroundImage:
                                    'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
                                backgroundSize: '22px 22px',
                            }}
                        />
                        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-4">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                                    <Sparkles className="size-5" />
                                </span>
                                <div>
                                    <h4 className="text-lg font-bold leading-tight tracking-tight sm:text-xl">
                                        Siap melangkah lebih jauh?
                                    </h4>
                                    <p className="mt-1 max-w-md text-sm text-white/85">
                                        {auth?.user
                                            ? 'Lanjutkan perjalanan karier Anda — buka dashboard untuk akses penuh ke fitur AI.'
                                            : 'Bergabung gratis dan dapatkan AI Coach pribadi, AI Interview, dan rekomendasi lowongan personal.'}
                                    </p>
                                </div>
                            </div>
                            {!auth?.user && features.registration_enabled !== false && (
                                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="h-11 rounded-xl bg-white px-5 text-brand-blue shadow-md shadow-brand-navy/20 hover:bg-white/95"
                                    >
                                        <Link href={register()} prefetch>
                                            Mulai Sekarang
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        size="lg"
                                        variant="outline"
                                        className="h-11 rounded-xl border-white/30 bg-white/10 px-5 text-white backdrop-blur hover:bg-white/15 hover:text-white"
                                    >
                                        <Link href={login().url} prefetch>
                                            Masuk
                                        </Link>
                                    </Button>
                                </div>
                            )}
                            {auth?.user && (
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-11 shrink-0 rounded-xl bg-white px-5 text-brand-blue shadow-md shadow-brand-navy/20 hover:bg-white/95"
                                >
                                    <Link href={dashboard()} prefetch>
                                        Buka Dashboard
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                )}

                {/* ── Main grid ── */}
                <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:px-8">
                    {/* Brand col */}
                    <div className="space-y-5 md:col-span-2 lg:col-span-5">
                        <Link href="/" className="inline-flex items-center" prefetch aria-label={appName}>
                            {logoPath ? (
                                <img src={logoPath} alt={appName} className="h-10 w-auto" />
                            ) : (
                                <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-md shadow-brand-blue/25">
                                    <AppLogoIcon className="size-5 fill-current text-white" />
                                </div>
                            )}
                        </Link>
                        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                            Platform karier all-in-one yang mempertemukan kandidat dengan perusahaan
                            terbaik, didukung AI Coach, AI Interview, dan insight gaji riil dari
                            ribuan posisi.
                        </p>

                        <address className="text-sm not-italic leading-relaxed text-muted-foreground sm:max-w-sm">
                            Menara Cakrawala 12th Floor Unit 5A,
                            <br />
                            Jl. M.H. Thamrin Kav. 9, Kb. Sirih, Kec. Menteng,
                            <br />
                            Jakarta Pusat 10340, Indonesia
                        </address>

                        {socialLinks.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    {socialLinks.map(({ href, icon: Icon, label }) => (
                                        <a
                                            key={label}
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={label}
                                            title={label}
                                            className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-brand-blue/40 hover:bg-brand-blue/5 hover:text-brand-blue"
                                        >
                                            <Icon className="size-4" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Link columns */}
                    <FooterLinkColumn
                        accent="bg-brand-blue"
                        title="Perusahaan"
                        links={[
                            { href: aboutRoute().url, label: 'Tentang Kami' },
                            { href: contactRoute().url, label: 'Kontak' },
                            { href: faqRoute().url, label: 'FAQ' },
                            { href: careerResourcesIndex().url, label: 'Tips Karier' },
                        ]}
                    />

                    <FooterLinkColumn
                        accent="bg-brand-cyan"
                        title="Cari Kerja"
                        links={[
                            { href: jobsIndex().url, label: 'Lowongan' },
                            { href: companiesIndex().url, label: 'Perusahaan' },
                            { href: salaryInsightRoute().url, label: 'Insight Gaji' },
                            ...(!auth?.user && features.registration_enabled !== false
                                ? [{ href: register().url, label: 'Buat Akun' }]
                                : []),
                        ]}
                    />

                    <FooterLinkColumn
                        accent="bg-amber-400"
                        title="Legal"
                        links={[
                            { href: legalShow('terms').url, label: 'Syarat & Ketentuan' },
                            { href: legalShow('privacy').url, label: 'Kebijakan Privasi' },
                            { href: legalShow('cookies').url, label: 'Kebijakan Cookies' },
                        ]}
                    />
                </div>

                {/* ── Bottom bar ── */}
                <div className="relative border-t border-border/60 bg-muted/30">
                    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <span className="inline-flex items-center gap-1.5">
                                <span>© {new Date().getFullYear()} {appName}. Dibuat dengan</span>
                                <Heart className="size-3.5 fill-rose-500 text-rose-500" />
                                <span>untuk Indonesia.</span>
                            </span>
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

function FooterLinkColumn({
    title,
    accent,
    links,
}: {
    title: string;
    accent: string;
    links: { href: string; label: string }[];
}) {
    return (
        <div className="space-y-4 lg:col-span-2">
            <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-navy">
                <span className={cn('h-3 w-0.5 rounded-full', accent)} />
                {title}
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
                {links.map((link) => (
                    <li key={link.href}>
                        <Link
                            href={link.href}
                            className="group inline-flex items-center gap-1 transition-colors hover:text-brand-blue"
                        >
                            <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
