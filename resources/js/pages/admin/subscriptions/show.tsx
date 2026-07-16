import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
    BadgeCheck,
    Briefcase,
    Building2,
    Calendar,
    CalendarClock,
    CheckCircle2,
    CircleDollarSign,
    Crown,
    ExternalLink,
    Flame,
    Hash,
    MapPin,
    Receipt,
    Sparkles,
    Timer,
    Users,
    Wallet,
    XCircle,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { type ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

type Subscription = {
    id: number;
    status: string | null;
    starts_at: string | null;
    ends_at: string | null;
    cancelled_at: string | null;
    auto_renew: boolean;
    jobs_posted_count: number;
    featured_credits_remaining: number;
    ai_credits_remaining: number;
    is_active: boolean;
    created_at: string | null;
    updated_at: string | null;
};

type Company = {
    id: number | null;
    name: string | null;
    slug: string | null;
    logo_url: string | null;
    verification_status: string | null;
    industry: string | null;
    city: string | null;
    size: string | null;
};

type Plan = {
    id: number | null;
    name: string | null;
    slug: string | null;
    tier: string | null;
    price_idr: number | null;
    billing_period_days: number;
    job_post_quota: number;
    featured_credits: number;
    ai_interview_credits: number;
    features: string[];
} | null;

type UsageBlock = {
    used?: number;
    remaining?: number;
    quota?: number;
    percent: number;
};

type Order = {
    id: number;
    reference: string;
    description: string | null;
    amount_idr: number;
    status: string | null;
    payment_provider: string | null;
    paid_at: string | null;
    created_at: string | null;
};

type Props = {
    subscription: Subscription;
    company: Company;
    plan: Plan;
    usage: {
        jobs: UsageBlock;
        featured: UsageBlock;
        ai: UsageBlock;
        period: { total_days: number; elapsed_days: number; days_remaining: number; percent: number };
    };
    orders: Order[];
};

const idr = (v: number | null) =>
    v == null
        ? '-'
        : new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0,
          }).format(v);

const STATUS_META: Record<string, { label: string; tone: string; icon: LucideIcon }> = {
    active: { label: 'Aktif', tone: 'bg-emerald-100 text-emerald-700 ring-emerald-500/20', icon: CheckCircle2 },
    pending: { label: 'Menunggu', tone: 'bg-amber-100 text-amber-700 ring-amber-500/20', icon: Timer },
    cancelled: { label: 'Dibatalkan', tone: 'bg-rose-100 text-rose-700 ring-rose-500/20', icon: XCircle },
    expired: { label: 'Kedaluwarsa', tone: 'bg-slate-200 text-slate-700 ring-slate-500/20', icon: Calendar },
};

const TIER_META: Record<string, { label: string; tone: string; gradient: string }> = {
    free: { label: 'Free', tone: 'bg-slate-100 text-slate-700', gradient: 'from-slate-400 to-slate-500' },
    starter: { label: 'Starter', tone: 'bg-sky-100 text-sky-700', gradient: 'from-sky-400 to-brand-blue' },
    pro: { label: 'Pro', tone: 'bg-violet-100 text-violet-700', gradient: 'from-violet-400 to-fuchsia-500' },
    enterprise: { label: 'Enterprise', tone: 'bg-amber-100 text-amber-700', gradient: 'from-amber-400 to-orange-500' },
};

const ORDER_STATUS_META: Record<string, { label: string; tone: string }> = {
    paid: { label: 'Dibayar', tone: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'Menunggu', tone: 'bg-amber-100 text-amber-700' },
    failed: { label: 'Gagal', tone: 'bg-rose-100 text-rose-700' },
    expired: { label: 'Kedaluwarsa', tone: 'bg-slate-200 text-slate-700' },
    refunded: { label: 'Refund', tone: 'bg-purple-100 text-purple-700' },
};

export default function AdminSubscriptionShow({ subscription, company, plan, usage, orders }: Props) {
    const status = STATUS_META[subscription.status ?? ''] ?? {
        label: subscription.status ?? '-',
        tone: 'bg-muted text-foreground ring-border',
        icon: Activity,
    };
    const StatusIcon = status.icon;

    const tier = TIER_META[plan?.tier ?? ''] ?? {
        label: plan?.tier ?? '-',
        tone: 'bg-muted text-foreground',
        gradient: 'from-muted-foreground to-muted-foreground',
    };

    const verified = company.verification_status === 'verified';

    return (
        <>
            <Head title={`Langganan #${subscription.id} — ${company.name ?? ''}`} />

            <div className="space-y-6 p-4 sm:p-6">
                {/* ===== Breadcrumb ===== */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/admin">Admin</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/admin/subscriptions">Langganan</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>#{subscription.id}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* ===== Hero card ===== */}
                <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
                    <div className={cn('h-2 bg-gradient-to-r', tier.gradient)} />
                    <div className="p-5 sm:p-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-4">
                                <Avatar className="size-16 rounded-2xl border border-border/60 ring-1 ring-border/30">
                                    <AvatarImage src={company.logo_url ?? undefined} alt={company.name ?? ''} />
                                    <AvatarFallback className="rounded-2xl bg-brand-blue/10 text-brand-blue">
                                        <Building2 className="size-7" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                        <Hash className="size-3" />
                                        <span className="font-mono">SUB-{String(subscription.id).padStart(5, '0')}</span>
                                    </div>
                                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                        {company.name ?? 'Perusahaan tidak diketahui'}
                                        {verified && (
                                            <BadgeCheck
                                                className="size-5 fill-brand-blue text-white"
                                                aria-label="Verified"
                                            />
                                        )}
                                    </h1>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-foreground/80">
                                        {company.industry && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Sparkles className="size-3.5 text-muted-foreground" />
                                                {company.industry}
                                            </span>
                                        )}
                                        {company.city && (
                                            <>
                                                <span className="text-muted-foreground/50">·</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <MapPin className="size-3.5 text-muted-foreground" />
                                                    {company.city}
                                                </span>
                                            </>
                                        )}
                                        {company.size && (
                                            <>
                                                <span className="text-muted-foreground/50">·</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Users className="size-3.5 text-muted-foreground" />
                                                    {company.size}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <Badge
                                            className={cn(
                                                'gap-1 ring-1',
                                                status.tone,
                                            )}
                                        >
                                            <StatusIcon className="size-3" />
                                            {status.label}
                                        </Badge>
                                        <Badge className={cn('gap-1', tier.tone)}>
                                            <Crown className="size-3" />
                                            {plan?.name ?? '-'} · {tier.label}
                                        </Badge>
                                        {subscription.auto_renew ? (
                                            <Badge className="gap-1 bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                                                <Zap className="size-3" /> Auto-renew
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1 border-border/60 text-muted-foreground">
                                                Auto-renew off
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="h-10 rounded-xl border-border/60"
                                >
                                    <Link href="/admin/subscriptions">
                                        <ArrowLeft className="size-4" />
                                        <span className="hidden sm:inline">Kembali</span>
                                    </Link>
                                </Button>
                                {company.slug && (
                                    <Button
                                        asChild
                                        className="h-10 rounded-xl bg-brand-blue px-5 hover:bg-brand-blue/90"
                                    >
                                        <Link href={`/companies/${company.slug}`} target="_blank">
                                            <ExternalLink className="size-4" />
                                            Lihat Profil
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Quick info strip */}
                        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border/60 pt-5 lg:grid-cols-4">
                            <InfoTile
                                icon={Wallet}
                                label="Harga Paket"
                                value={idr(plan?.price_idr ?? 0)}
                                hint={`/ ${plan?.billing_period_days ?? 30} hari`}
                                tone="brand"
                            />
                            <InfoTile
                                icon={CalendarClock}
                                label="Mulai"
                                value={subscription.starts_at ? formatDate(subscription.starts_at) : '-'}
                                hint="Tanggal aktivasi"
                            />
                            <InfoTile
                                icon={Calendar}
                                label="Berakhir"
                                value={subscription.ends_at ? formatDate(subscription.ends_at) : '-'}
                                hint={
                                    usage.period.days_remaining > 0
                                        ? `${usage.period.days_remaining} hari lagi`
                                        : usage.period.days_remaining === 0
                                          ? 'Habis hari ini'
                                          : 'Kedaluwarsa'
                                }
                                tone={usage.period.days_remaining <= 7 ? 'warn' : 'default'}
                            />
                            <InfoTile
                                icon={Activity}
                                label="Status Akun"
                                value={subscription.is_active ? 'Operasional' : 'Tidak aktif'}
                                hint={
                                    subscription.cancelled_at
                                        ? `Dibatalkan ${formatDate(subscription.cancelled_at)}`
                                        : 'Semua fitur tersedia'
                                }
                                tone={subscription.is_active ? 'success' : 'danger'}
                            />
                        </div>
                    </div>
                </section>

                {/* ===== Body grid ===== */}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <main className="space-y-6">
                        {/* Usage panel */}
                        <ContentCard title="Penggunaan Kuota" icon={Activity} description="Sisa kuota dan pemakaian periode berjalan.">
                            <div className="space-y-5">
                                <UsageRow
                                    icon={Briefcase}
                                    label="Lowongan Diposting"
                                    used={usage.jobs.used ?? 0}
                                    quota={usage.jobs.quota ?? 0}
                                    percent={usage.jobs.percent}
                                    suffix="lowongan"
                                    accent="brand"
                                />
                                <UsageRow
                                    icon={Flame}
                                    label="Kredit Featured"
                                    used={usage.featured.used ?? 0}
                                    quota={usage.featured.quota ?? 0}
                                    percent={usage.featured.percent}
                                    suffix="kredit"
                                    accent="warn"
                                    remaining={usage.featured.remaining}
                                />
                                <UsageRow
                                    icon={Sparkles}
                                    label="Kredit AI Interview"
                                    used={usage.ai.used ?? 0}
                                    quota={usage.ai.quota ?? 0}
                                    percent={usage.ai.percent}
                                    suffix="kredit"
                                    accent="violet"
                                    remaining={usage.ai.remaining}
                                />
                                <UsageRow
                                    icon={CalendarClock}
                                    label="Periode Berlangganan"
                                    used={usage.period.elapsed_days}
                                    quota={usage.period.total_days}
                                    percent={usage.period.percent}
                                    suffix="hari"
                                    accent="emerald"
                                />
                            </div>
                        </ContentCard>

                        {/* Plan features */}
                        {plan && (
                            <ContentCard title="Fitur Paket" icon={Crown} description={`Fitur yang termasuk dalam paket ${plan.name}.`}>
                                {plan.features.length === 0 ? (
                                    <p className="text-sm italic text-muted-foreground">
                                        Belum ada deskripsi fitur untuk paket ini.
                                    </p>
                                ) : (
                                    <ul className="grid gap-2 sm:grid-cols-2">
                                        {plan.features.map((f, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm"
                                            >
                                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                                <span className="leading-relaxed text-foreground/85">{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </ContentCard>
                        )}

                        {/* Orders / Transactions */}
                        <ContentCard title="Riwayat Pesanan" icon={Receipt} description="10 transaksi terakhir untuk perusahaan ini.">
                            {orders.length === 0 ? (
                                <p className="text-sm italic text-muted-foreground">
                                    Belum ada transaksi pesanan.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {orders.map((o) => {
                                        const oStatus = ORDER_STATUS_META[o.status ?? ''] ?? {
                                            label: o.status ?? '-',
                                            tone: 'bg-muted text-foreground',
                                        };
                                        return (
                                            <li
                                                key={o.id}
                                                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:bg-muted/20"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {o.reference}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                                                oStatus.tone,
                                                            )}
                                                        >
                                                            {oStatus.label}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 line-clamp-1 text-sm font-medium text-foreground">
                                                        {o.description ?? '—'}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                                        {o.payment_provider && (
                                                            <span className="rounded bg-muted px-1.5 py-0.5 font-medium uppercase tracking-wider">
                                                                {o.payment_provider}
                                                            </span>
                                                        )}
                                                        {o.paid_at ? (
                                                            <span>Dibayar {formatDate(o.paid_at)}</span>
                                                        ) : (
                                                            o.created_at && <span>Dibuat {formatDate(o.created_at)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="shrink-0 text-right">
                                                    <span className="block text-base font-bold tabular-nums text-foreground">
                                                        {idr(o.amount_idr)}
                                                    </span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </ContentCard>
                    </main>

                    {/* ===== Sidebar ===== */}
                    <aside className="space-y-4">
                        {/* Plan summary */}
                        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
                            <div className={cn('h-1.5 bg-gradient-to-r', tier.gradient)} />
                            <div className="p-5">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <Crown className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-semibold">Paket Aktif</h3>
                                </div>
                                <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                                    {plan?.name ?? '-'}
                                </p>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                    {tier.label} tier
                                </p>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-brand-blue tabular-nums">
                                        {idr(plan?.price_idr ?? 0)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        / {plan?.billing_period_days ?? 30} hari
                                    </span>
                                </div>
                                <ul className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm">
                                    <SummaryRow
                                        label="Job Quota"
                                        value={`${plan?.job_post_quota ?? 0}`}
                                    />
                                    <SummaryRow
                                        label="Featured Credits"
                                        value={`${plan?.featured_credits ?? 0}`}
                                    />
                                    <SummaryRow
                                        label="AI Interview"
                                        value={`${plan?.ai_interview_credits ?? 0}`}
                                    />
                                </ul>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                    <Calendar className="size-4" />
                                </span>
                                <h3 className="text-sm font-semibold">Timeline</h3>
                            </div>
                            <ol className="mt-4 space-y-3 border-l border-border/60 pl-4">
                                <TimelineItem
                                    icon={Sparkles}
                                    label="Langganan dibuat"
                                    date={subscription.created_at}
                                    tone="brand"
                                />
                                {subscription.starts_at && (
                                    <TimelineItem
                                        icon={CheckCircle2}
                                        label="Aktivasi"
                                        date={subscription.starts_at}
                                        tone="success"
                                    />
                                )}
                                {subscription.cancelled_at && (
                                    <TimelineItem
                                        icon={XCircle}
                                        label="Dibatalkan"
                                        date={subscription.cancelled_at}
                                        tone="danger"
                                    />
                                )}
                                {subscription.ends_at && (
                                    <TimelineItem
                                        icon={Calendar}
                                        label="Tanggal berakhir"
                                        date={subscription.ends_at}
                                        tone="default"
                                    />
                                )}
                                {subscription.updated_at && (
                                    <TimelineItem
                                        icon={Activity}
                                        label="Update terakhir"
                                        date={subscription.updated_at}
                                        tone="default"
                                    />
                                )}
                            </ol>
                        </div>

                        {/* MRR contribution */}
                        <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue p-5 text-white shadow-xs">
                            <div className="flex items-center gap-2">
                                <CircleDollarSign className="size-5" />
                                <h3 className="text-sm font-semibold">Kontribusi MRR</h3>
                            </div>
                            <p className="mt-3 text-3xl font-bold tabular-nums">
                                {idr(plan?.price_idr ?? 0)}
                            </p>
                            <p className="text-xs text-white/70">
                                Per bulan saat auto-renew aktif
                            </p>
                            {subscription.auto_renew ? (
                                <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                                    <Zap className="size-3" /> Aktif sampai berakhir
                                </p>
                            ) : (
                                <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                                    <Timer className="size-3" /> Tidak akan diperpanjang
                                </p>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

function InfoTile({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'default',
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
    tone?: 'default' | 'brand' | 'warn' | 'success' | 'danger';
}) {
    const tones = {
        default: 'border-border/60 bg-card',
        brand: 'border-brand-blue/20 bg-brand-blue/5',
        warn: 'border-amber-500/30 bg-amber-50',
        success: 'border-emerald-500/30 bg-emerald-50',
        danger: 'border-rose-500/30 bg-rose-50',
    };
    const iconTones = {
        default: 'bg-muted text-foreground/70',
        brand: 'bg-brand-blue/15 text-brand-blue',
        warn: 'bg-amber-100 text-amber-700',
        success: 'bg-emerald-100 text-emerald-700',
        danger: 'bg-rose-100 text-rose-700',
    };

    return (
        <div className={cn('rounded-xl border p-3.5', tones[tone])}>
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        'flex size-7 items-center justify-center rounded-lg',
                        iconTones[tone],
                    )}
                >
                    <Icon className="size-3.5" />
                </span>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                </p>
            </div>
            <p className="mt-2 truncate text-sm font-bold tabular-nums text-foreground sm:text-base">
                {value}
            </p>
            {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function ContentCard({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string;
    description?: string;
    icon: LucideIcon;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs sm:p-6">
            <div className="mb-4 flex items-start gap-2">
                <span className="mt-0.5 flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                    <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                    {description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
            </div>
            {children}
        </section>
    );
}

function UsageRow({
    icon: Icon,
    label,
    used,
    quota,
    percent,
    suffix,
    accent,
    remaining,
}: {
    icon: LucideIcon;
    label: string;
    used: number;
    quota: number;
    percent: number;
    suffix: string;
    accent: 'brand' | 'warn' | 'violet' | 'emerald';
    remaining?: number;
}) {
    const accents = {
        brand: { bar: 'from-brand-blue to-brand-cyan', icon: 'bg-brand-blue/10 text-brand-blue' },
        warn: { bar: 'from-amber-500 to-orange-500', icon: 'bg-amber-100 text-amber-700' },
        violet: { bar: 'from-violet-500 to-fuchsia-500', icon: 'bg-violet-100 text-violet-700' },
        emerald: { bar: 'from-emerald-500 to-teal-500', icon: 'bg-emerald-100 text-emerald-700' },
    }[accent];

    const isUnlimited = quota === 0;
    const overQuota = !isUnlimited && used > quota;

    return (
        <div>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className={cn('flex size-8 items-center justify-center rounded-lg', accents.icon)}>
                        <Icon className="size-4" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">
                            {isUnlimited ? (
                                <>Unlimited · {used} {suffix} terpakai</>
                            ) : (
                                <>
                                    {used} dari {quota} {suffix} terpakai
                                    {remaining !== undefined && (
                                        <>
                                            {' · '}
                                            <span
                                                className={cn(
                                                    'font-medium',
                                                    remaining === 0
                                                        ? 'text-rose-600'
                                                        : remaining <= 2
                                                          ? 'text-amber-600'
                                                          : 'text-emerald-600',
                                                )}
                                            >
                                                {remaining} sisa
                                            </span>
                                        </>
                                    )}
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {isUnlimited ? '∞' : `${percent}%`}
                </span>
            </div>
            {!isUnlimited && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                        className={cn(
                            'h-full rounded-full bg-gradient-to-r transition-all',
                            overQuota ? 'from-rose-500 to-rose-600' : accents.bar,
                        )}
                        style={{ width: `${Math.min(100, percent)}%` }}
                    />
                </div>
            )}
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <li className="flex items-center justify-between text-foreground/85">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
        </li>
    );
}

function TimelineItem({
    icon: Icon,
    label,
    date,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    date: string | null;
    tone: 'brand' | 'success' | 'danger' | 'default';
}) {
    if (!date) return null;
    const tones = {
        brand: 'bg-brand-blue text-white',
        success: 'bg-emerald-500 text-white',
        danger: 'bg-rose-500 text-white',
        default: 'bg-muted text-foreground/70',
    };
    return (
        <li className="relative">
            <span
                className={cn(
                    'absolute -left-[26px] flex size-5 items-center justify-center rounded-full ring-2 ring-card',
                    tones[tone],
                )}
            >
                <Icon className="size-3" />
            </span>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
        </li>
    );
}
