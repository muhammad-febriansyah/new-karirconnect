import { Head, Link } from '@inertiajs/react';
import * as Icons from 'lucide-react';
import {
    ArrowRight,
    Award,
    Briefcase,
    Building2,
    Compass,
    Eye,
    Heart,
    Linkedin,
    MapPin,
    Rocket,
    Shield,
    Sparkles,
    Target,
    Users,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { type ComponentType, type ReactNode } from 'react';
import { SafeHtml } from '@/components/shared/safe-html';
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
import { home } from '@/routes';
import { index as jobsIndex } from '@/routes/public/jobs';

type ValueItem = { icon?: string | null; title: string; body?: string | null };
type StatItem = { number: string; label: string; description?: string | null };
type TeamItem = {
    name: string;
    role?: string | null;
    bio_short?: string | null;
    linkedin_url?: string | null;
    photo_url?: string | null;
};

type PageProps = {
    page: {
        hero_title: string | null;
        hero_subtitle: string | null;
        hero_image_url: string | null;
        story_body: string | null;
        vision: string | null;
        mission: string | null;
        values: ValueItem[];
        stats: StatItem[];
        team_members: TeamItem[];
        office_address: string | null;
        office_map_embed: string | null;
        seo_title: string | null;
        seo_description: string | null;
    };
};

const DEFAULT_HERO_TITLE = 'Mempertemukan talenta Indonesia dengan perusahaan terbaik';
const DEFAULT_HERO_SUBTITLE =
    'KarirConnect adalah platform karier all-in-one yang memadukan AI Coach, AI Interview, dan insight gaji riil — dirancang untuk pasar kerja Indonesia.';

const DEFAULT_STORY_BODY = `<p>KarirConnect lahir dari satu keyakinan sederhana: setiap orang Indonesia berhak mendapat akses ke peluang kerja terbaik, didukung perangkat yang transparan dan modern.</p><p>Kami melihat banyak pencari kerja kesulitan menavigasi pasar yang penuh dengan informasi gaji yang kabur, lowongan duplikat, dan proses lamaran yang panjang. Di sisi lain, perusahaan butuh cara yang lebih cepat dan akurat untuk menemukan kandidat yang benar-benar cocok.</p><p>Dengan teknologi AI yang menghubungkan profil, pengalaman, dan ekspektasi gaji, kami membangun platform di mana proses hiring berjalan lebih cepat, lebih jujur, dan lebih manusiawi.</p>`;

const DEFAULT_VISION =
    'Menjadi platform karier paling terpercaya di Indonesia dengan mengutamakan transparansi gaji, kualitas data, dan teknologi yang memberdayakan setiap pencari kerja maupun perusahaan.';

const DEFAULT_MISSION =
    'Menyediakan akses ke peluang kerja terbaik bagi setiap profesional Indonesia, didukung AI Coach yang membimbing perjalanan karier dan perangkat hiring yang membantu perusahaan bertemu kandidat yang tepat lebih cepat.';

const DEFAULT_VALUES: ValueItem[] = [
    {
        icon: 'eye',
        title: 'Transparansi',
        body: 'Data gaji riil, perusahaan terverifikasi, dan proses yang jelas dari awal hingga akhir.',
    },
    {
        icon: 'rocket',
        title: 'Pemberdayaan',
        body: 'Setiap fitur dirancang agar kandidat dan perusahaan punya kontrol penuh atas perjalanan mereka.',
    },
    {
        icon: 'zap',
        title: 'Inovasi',
        body: 'Kami terus menyematkan AI dan otomasi yang benar-benar bermanfaat, bukan sekadar tren.',
    },
    {
        icon: 'shield',
        title: 'Kepercayaan',
        body: 'Privasi pengguna kami jaga ketat, dan setiap perusahaan partner melalui proses verifikasi.',
    },
    {
        icon: 'users',
        title: 'Komunitas',
        body: 'Kami membangun ekosistem yang membantu sesama berkembang, bukan sekadar marketplace.',
    },
    {
        icon: 'award',
        title: 'Kualitas',
        body: 'Setiap lowongan dikurasi, setiap insight diverifikasi — kami menolak jadi platform "yang penting banyak".',
    },
];

const DEFAULT_STATS: StatItem[] = [
    { number: '10rb+', label: 'Pencari Kerja Aktif', description: 'Kandidat yang melamar setiap bulan' },
    { number: '500+', label: 'Perusahaan Mitra', description: 'Verified employer di Indonesia' },
    { number: '1.500+', label: 'Lowongan Terbuka', description: 'Diperbarui setiap hari' },
    { number: '95%', label: 'Tingkat Kepuasan', description: 'Berdasarkan survey pengguna' },
];

const VALUE_ICON_OVERRIDE: Record<string, LucideIcon> = {
    eye: Eye,
    rocket: Rocket,
    zap: Zap,
    shield: Shield,
    users: Users,
    award: Award,
    target: Target,
    sparkles: Sparkles,
    heart: Heart,
    compass: Compass,
};

const titleCase = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

function ValueIcon({ name, className }: { name?: string | null; className?: string }) {
    if (!name) {
        return <Sparkles className={className} />;
    }
    const lower = name.toLowerCase().replace(/[-_\s]+/g, '');
    if (VALUE_ICON_OVERRIDE[lower]) {
        const Component = VALUE_ICON_OVERRIDE[lower];
        return <Component className={className} />;
    }
    const componentName = titleCase(
        name
            .split(/[-_\s]+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(''),
    );
    const Component = (Icons as unknown as Record<string, ComponentType<{ className?: string }>>)[
        componentName
    ];
    return Component ? <Component className={className} /> : <Sparkles className={className} />;
}

export default function PublicAbout({ page }: PageProps) {
    const heroTitle = page.hero_title ?? DEFAULT_HERO_TITLE;
    const heroSubtitle = page.hero_subtitle ?? DEFAULT_HERO_SUBTITLE;
    const storyBody = page.story_body ?? DEFAULT_STORY_BODY;
    const vision = page.vision ?? DEFAULT_VISION;
    const mission = page.mission ?? DEFAULT_MISSION;
    const values = page.values.length > 0 ? page.values : DEFAULT_VALUES;
    const stats = page.stats.length > 0 ? page.stats : DEFAULT_STATS;

    return (
        <>
            <Head>
                <title>{page.seo_title ?? heroTitle ?? 'Tentang Kami'}</title>
                {page.seo_description && (
                    <meta name="description" content={page.seo_description} />
                )}
                <meta property="og:title" content={page.seo_title ?? heroTitle} />
                {page.seo_description && (
                    <meta property="og:description" content={page.seo_description} />
                )}
                {page.hero_image_url && <meta property="og:image" content={page.hero_image_url} />}
            </Head>

            <div className="space-y-16 sm:space-y-20">
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
                            <BreadcrumbPage>Tentang Kami</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* ===== Hero ===== */}
                <section className="relative -mt-10">
                    <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                        <div className="space-y-6">
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                                <Sparkles className="size-3" />
                                Tentang KarirConnect
                            </span>
                            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                                {heroTitle}
                            </h1>
                            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                                {heroSubtitle}
                            </p>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-11 rounded-xl bg-brand-blue px-6 hover:bg-brand-blue/90"
                                >
                                    <Link href={jobsIndex().url}>
                                        <Briefcase className="size-4" /> Lihat Lowongan
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    size="lg"
                                    className="h-11 rounded-xl border-border/60"
                                >
                                    <a href="#story">
                                        Cerita Kami <ArrowRight className="size-4" />
                                    </a>
                                </Button>
                            </div>
                        </div>

                        {/* Hero visual */}
                        <div className="relative">
                            <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xl shadow-brand-blue/5">
                                {page.hero_image_url ? (
                                    <img
                                        src={page.hero_image_url}
                                        alt={heroTitle ?? 'KarirConnect'}
                                        className="aspect-[4/5] w-full object-cover"
                                    />
                                ) : (
                                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-brand-navy via-brand-blue to-brand-cyan">
                                        <div
                                            aria-hidden
                                            className="absolute inset-0 opacity-30"
                                            style={{
                                                backgroundImage:
                                                    'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
                                                backgroundSize: '28px 28px',
                                            }}
                                        />
                                        {/* Decorative cards */}
                                        <div className="absolute inset-0 flex items-center justify-center p-8">
                                            <div className="grid w-full max-w-xs gap-3">
                                                <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-2xl shadow-brand-navy/30 backdrop-blur">
                                                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue">
                                                        <Sparkles className="size-5" />
                                                    </span>
                                                    <div className="text-left">
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            AI Coach
                                                        </p>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            Bimbingan personal
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="ml-6 flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-2xl shadow-brand-navy/30 backdrop-blur">
                                                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                                        <Briefcase className="size-5" />
                                                    </span>
                                                    <div className="text-left">
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            1.500+ Lowongan
                                                        </p>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            Verified Employer
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-2xl shadow-brand-navy/30 backdrop-blur">
                                                    <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                                        <Award className="size-5" />
                                                    </span>
                                                    <div className="text-left">
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            Insight Gaji
                                                        </p>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            Data riil
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Floating badge */}
                            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-border/70 bg-card p-3 shadow-lg sm:flex sm:items-center sm:gap-2">
                                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                                    <Heart className="size-4" />
                                </span>
                                <div>
                                    <p className="text-xs text-muted-foreground">Dibuat untuk</p>
                                    <p className="text-sm font-semibold text-foreground">
                                        Indonesia
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== Stats strip ===== */}
                <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue p-6 shadow-xl shadow-brand-navy/10 sm:p-10">
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
                    <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {stats.map((s, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur transition-transform hover:-translate-y-0.5"
                            >
                                <p className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                                    {s.number}
                                </p>
                                <p className="mt-1.5 text-sm font-semibold">{s.label}</p>
                                {s.description && (
                                    <p className="mt-1 text-xs text-white/70">{s.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* ===== Story ===== */}
                <section id="story" className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
                    <SectionHeading
                        kicker="Cerita Kami"
                        title="Kenapa KarirConnect ada"
                        description="Sebuah perjalanan singkat dari ide ke platform yang dipakai ribuan profesional."
                    />
                    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
                        <SafeHtml
                            html={storyBody}
                            className="prose prose-neutral max-w-none prose-headings:text-foreground prose-p:leading-relaxed prose-p:text-foreground/85 prose-strong:text-foreground"
                        />
                    </div>
                </section>

                {/* ===== Vision & Mission ===== */}
                <section className="grid gap-6 lg:grid-cols-2">
                    <FocusCard
                        kicker="Visi"
                        icon={Eye}
                        tone="brand"
                        title="Apa yang ingin kami capai"
                    >
                        <SafeHtml
                            html={vision}
                            className="prose prose-sm max-w-none text-foreground/85 prose-p:leading-relaxed"
                        />
                    </FocusCard>
                    <FocusCard
                        kicker="Misi"
                        icon={Target}
                        tone="navy"
                        title="Bagaimana kami mewujudkannya"
                    >
                        <SafeHtml
                            html={mission}
                            className="prose prose-sm max-w-none text-foreground/85 prose-p:leading-relaxed"
                        />
                    </FocusCard>
                </section>

                {/* ===== Values ===== */}
                <section className="space-y-8">
                    <div className="text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                            <Sparkles className="size-3" /> Nilai Inti
                        </span>
                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            Yang kami pegang teguh
                        </h2>
                        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            Prinsip-prinsip yang membentuk setiap fitur, setiap keputusan, dan setiap
                            interaksi di platform kami.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {values.map((v, i) => (
                            <ValueCard key={i} value={v} index={i} />
                        ))}
                    </div>
                </section>

                {/* ===== Team ===== */}
                {page.team_members.length > 0 && (
                    <section className="space-y-8">
                        <div className="text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                                <Users className="size-3" /> Tim Kami
                            </span>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                Orang di balik KarirConnect
                            </h2>
                            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                                Tim kecil yang percaya bahwa pengalaman karier yang baik dimulai dari
                                produk yang benar-benar dipikirkan.
                            </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {page.team_members.map((m, i) => (
                                <TeamCard key={i} member={m} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ===== Office ===== */}
                {(page.office_address || page.office_map_embed) && (
                    <section className="space-y-6">
                        <div className="text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                                <MapPin className="size-3" /> Lokasi
                            </span>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                Datang berkunjung
                            </h2>
                        </div>
                        <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
                            {page.office_address && (
                                <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                                        <Building2 className="size-5" />
                                    </span>
                                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                                        Kantor Pusat
                                    </h3>
                                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                        {page.office_address}
                                    </p>
                                </div>
                            )}
                            {page.office_map_embed && (
                                <div className="aspect-video overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                                    <iframe
                                        src={page.office_map_embed}
                                        title="Lokasi Kantor"
                                        className="size-full"
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* ===== Bottom CTA ===== */}
                <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue p-8 text-white shadow-xl shadow-brand-navy/10 sm:p-12">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-12 -top-12 size-72 rounded-full bg-brand-cyan/30 blur-3xl"
                    />
                    <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                Mulai perjalanan karier Anda hari ini
                            </h2>
                            <p className="mt-3 text-base text-white/80 sm:text-lg">
                                Bergabung gratis, dapatkan AI Coach pribadi, dan lihat insight gaji
                                untuk peran impian Anda.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                asChild
                                size="lg"
                                className="h-12 rounded-xl bg-white px-6 text-brand-navy hover:bg-white/90"
                            >
                                <Link href="/register">Daftar Gratis</Link>
                            </Button>
                            <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="h-12 rounded-xl border-white/30 bg-white/10 px-6 text-white hover:bg-white/20"
                            >
                                <Link href={jobsIndex().url}>
                                    Telusuri Lowongan <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

function SectionHeading({
    kicker,
    title,
    description,
}: {
    kicker: string;
    title: string;
    description?: string;
}) {
    return (
        <div className="lg:sticky lg:top-20">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                <Sparkles className="size-3" /> {kicker}
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {title}
            </h2>
            {description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {description}
                </p>
            )}
        </div>
    );
}

function FocusCard({
    kicker,
    title,
    icon: Icon,
    tone,
    children,
}: {
    kicker: string;
    title: string;
    icon: LucideIcon;
    tone: 'brand' | 'navy';
    children: ReactNode;
}) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8',
                tone === 'brand'
                    ? 'border-brand-blue/20 bg-gradient-to-br from-brand-blue/8 via-brand-cyan/5 to-transparent'
                    : 'border-border/70 bg-card',
            )}
        >
            {tone === 'brand' && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-brand-blue/10 blur-2xl"
                />
            )}
            <div className="relative">
                <span
                    className={cn(
                        'flex size-10 items-center justify-center rounded-xl',
                        tone === 'brand'
                            ? 'bg-brand-blue/15 text-brand-blue'
                            : 'bg-brand-navy/10 text-brand-navy',
                    )}
                >
                    <Icon className="size-5" />
                </span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {kicker}
                </p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h3>
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}

function ValueCard({ value, index }: { value: ValueItem; index: number }) {
    const tones = [
        { iconBg: 'bg-brand-blue/10', iconText: 'text-brand-blue' },
        { iconBg: 'bg-emerald-100', iconText: 'text-emerald-700' },
        { iconBg: 'bg-amber-100', iconText: 'text-amber-700' },
        { iconBg: 'bg-violet-100', iconText: 'text-violet-700' },
        { iconBg: 'bg-rose-100', iconText: 'text-rose-600' },
        { iconBg: 'bg-sky-100', iconText: 'text-sky-700' },
    ];
    const tone = tones[index % tones.length];

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-lg hover:shadow-brand-blue/5">
            <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-0 transition-opacity group-hover:opacity-100"
            />
            <span
                className={cn(
                    'flex size-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110',
                    tone.iconBg,
                    tone.iconText,
                )}
            >
                <ValueIcon name={value.icon} className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                {value.title}
            </h3>
            {value.body && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
            )}
        </div>
    );
}

function TeamCard({ member }: { member: TeamItem }) {
    const initials =
        member.name
            .split(' ')
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-lg hover:shadow-brand-blue/5">
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-brand-blue/10 via-brand-cyan/5 to-transparent">
                {member.photo_url ? (
                    <img
                        src={member.photo_url}
                        alt={member.name}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="relative size-full">
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
                            <span className="text-4xl font-bold text-brand-blue/40">{initials}</span>
                        </div>
                    </div>
                )}
                {member.linkedin_url && (
                    <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="LinkedIn"
                        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl bg-card/95 text-brand-blue opacity-0 shadow-md backdrop-blur transition-all hover:bg-brand-blue hover:text-white group-hover:opacity-100"
                    >
                        <Linkedin className="size-4" />
                    </a>
                )}
            </div>
            <div className="p-4">
                <h3 className="text-base font-semibold text-foreground">{member.name}</h3>
                {member.role && (
                    <p className="mt-0.5 text-sm font-medium text-brand-blue">{member.role}</p>
                )}
                {member.bio_short && (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {member.bio_short}
                    </p>
                )}
            </div>
        </div>
    );
}
