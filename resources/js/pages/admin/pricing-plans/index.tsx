import { Head, Link, router } from '@inertiajs/react';
import {
    BadgeCheck,
    Briefcase,
    CheckCircle2,
    Coins,
    CreditCard,
    Crown,
    Pencil,
    Plus,
    Sparkles,
    Star,
    Trash2,
    XCircle,
    Zap,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Plan = {
    id: number;
    name: string;
    slug: string;
    tier: string;
    price_idr: number;
    billing_period_days: number;
    job_post_quota: number;
    featured_credits: number;
    ai_interview_credits: number;
    features: string[];
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
};

type Props = {
    plans: Plan[];
    totals: { plans: number; active: number; featured: number };
};

const idr = (v: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(v);

type TierMeta = {
    label: string;
    icon: ComponentType<{ className?: string }>;
    chipClass: string;
    accentClass: string;
};

const TIER_META: Record<string, TierMeta> = {
    free: {
        label: 'Free',
        icon: Zap,
        chipClass: 'bg-slate-100 text-slate-700',
        accentClass: 'from-slate-500/10 to-slate-500/0',
    },
    starter: {
        label: 'Starter',
        icon: Sparkles,
        chipClass: 'bg-brand-cyan/15 text-brand-blue',
        accentClass: 'from-brand-cyan/20 to-brand-cyan/0',
    },
    pro: {
        label: 'Pro',
        icon: BadgeCheck,
        chipClass: 'bg-brand-blue/15 text-brand-blue',
        accentClass: 'from-brand-blue/20 to-brand-blue/0',
    },
    enterprise: {
        label: 'Enterprise',
        icon: Crown,
        chipClass: 'bg-amber-100 text-amber-800',
        accentClass: 'from-amber-500/20 to-amber-500/0',
    },
};

export default function AdminPricingPlansIndex({ plans, totals }: Props) {
    const [pendingDelete, setPendingDelete] = useState<Plan | null>(null);

    const remove = () => {
        if (!pendingDelete) return;
        router.delete(`/admin/pricing-plans/${pendingDelete.id}`, {
            preserveScroll: true,
            onFinish: () => setPendingDelete(null),
        });
    };

    return (
        <>
            <Head title="Pricing Plans" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Pricing Plans"
                    description="Kelola paket berlangganan yang ditawarkan ke perusahaan."
                    actions={
                        <Button asChild className="bg-gradient-to-r from-brand-blue to-brand-cyan shadow-md shadow-brand-blue/25 hover:from-brand-blue hover:to-brand-blue">
                            <Link href="/admin/pricing-plans/create">
                                <Plus className="size-4" /> Tambah Paket
                            </Link>
                        </Button>
                    }
                />

                {/* Stats row */}
                <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard
                        label="Total Paket"
                        value={totals.plans}
                        icon={CreditCard}
                        gradient="from-brand-blue to-brand-cyan"
                    />
                    <StatCard
                        label="Aktif"
                        value={totals.active}
                        icon={CheckCircle2}
                        gradient="from-emerald-500 to-emerald-400"
                    />
                    <StatCard
                        label="Ditandai Unggulan"
                        value={totals.featured}
                        icon={Star}
                        gradient="from-amber-500 to-amber-400"
                    />
                </div>

                <Section>
                    {plans.length === 0 ? (
                        <EmptyState
                            bare
                            icon={CreditCard}
                            title="Belum ada paket berlangganan"
                            description="Mulai dengan membuat paket Free + paket berbayar pertama."
                            actions={
                                <Button asChild className="bg-gradient-to-r from-brand-blue to-brand-cyan">
                                    <Link href="/admin/pricing-plans/create">
                                        <Plus className="size-4" /> Buat Paket
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {plans.map((plan) => {
                                const meta = TIER_META[plan.tier] ?? TIER_META.free;
                                const TierIcon = meta.icon;
                                return (
                                    <article
                                        key={plan.id}
                                        className={cn(
                                            'group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300',
                                            'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-blue/10',
                                            plan.is_featured
                                                ? 'border-brand-blue/40 shadow-lg shadow-brand-blue/15 ring-1 ring-brand-blue/20'
                                                : 'border-border/60 shadow-sm',
                                            !plan.is_active && 'opacity-70',
                                        )}
                                    >
                                        {/* Decorative accent gradient */}
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b opacity-90',
                                                meta.accentClass,
                                            )}
                                        />

                                        {/* Featured ribbon */}
                                        {plan.is_featured && (
                                            <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-brand-blue to-brand-cyan px-12 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                                                Unggulan
                                            </div>
                                        )}

                                        <div className="relative space-y-5 p-6">
                                            {/* Header: tier + name */}
                                            <header className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider', meta.chipClass)}>
                                                        <TierIcon className="size-3" />
                                                        {meta.label}
                                                    </span>
                                                    <Badge
                                                        variant={plan.is_active ? 'default' : 'secondary'}
                                                        className={cn(
                                                            'gap-1 px-1.5 py-0 text-[10px]',
                                                            plan.is_active && 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15',
                                                        )}
                                                    >
                                                        {plan.is_active ? (
                                                            <CheckCircle2 className="size-2.5" />
                                                        ) : (
                                                            <XCircle className="size-2.5" />
                                                        )}
                                                        {plan.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold tracking-tight text-brand-navy">
                                                        {plan.name}
                                                    </h3>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">{plan.slug}</p>
                                                </div>
                                            </header>

                                            {/* Price */}
                                            <div className="flex items-baseline gap-1.5 border-b border-dashed border-border/60 pb-4">
                                                {plan.price_idr === 0 ? (
                                                    <>
                                                        <span className="text-4xl font-bold tracking-tight text-brand-navy tabular-nums">
                                                            Gratis
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">selamanya</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-3xl font-bold tracking-tight tabular-nums text-brand-navy">
                                                            {idr(plan.price_idr)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            / {plan.billing_period_days} hari
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Quotas */}
                                            <div className="space-y-2.5">
                                                <Quota
                                                    label="Job posts"
                                                    value={plan.job_post_quota}
                                                    icon={Briefcase}
                                                />
                                                <Quota
                                                    label="Featured credits"
                                                    value={plan.featured_credits}
                                                    icon={Star}
                                                />
                                                <Quota
                                                    label="AI interview"
                                                    value={plan.ai_interview_credits}
                                                    icon={Sparkles}
                                                />
                                            </div>

                                            {/* Features */}
                                            {plan.features.length > 0 && (
                                                <div className="space-y-2 border-t border-border/60 pt-4">
                                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                        Termasuk
                                                    </div>
                                                    <ul className="space-y-1.5 text-sm">
                                                        {plan.features.map((f, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                                                                    <CheckCircle2 className="size-3" />
                                                                </span>
                                                                <span className="leading-snug">{f}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer actions */}
                                        <footer className="relative mt-auto flex items-center justify-between gap-2 border-t bg-gradient-to-b from-transparent to-muted/20 px-6 py-3">
                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Coins className="size-3" />
                                                Urutan: {plan.sort_order}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 border-brand-blue/20 bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10 hover:text-brand-blue"
                                                >
                                                    <Link href={`/admin/pricing-plans/${plan.id}/edit`} aria-label={`Edit ${plan.name}`}>
                                                        <Pencil className="size-3.5" /> Ubah
                                                    </Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setPendingDelete(plan)}
                                                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    aria-label={`Hapus ${plan.name}`}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </footer>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </Section>
            </div>

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title="Hapus paket?"
                description={`Paket "${pendingDelete?.name ?? ''}" akan dihapus permanen. Pelanggan yang sudah berlangganan tidak terpengaruh, tapi paket ini tidak akan tersedia untuk pelanggan baru.`}
                confirmLabel="Hapus paket"
                variant="destructive"
                onConfirm={remove}
            />
        </>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    gradient,
}: {
    label: string;
    value: number;
    icon: ComponentType<{ className?: string }>;
    gradient: string;
}) {
    return (
        <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
                <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', gradient)}>
                    <Icon className="size-6" />
                </div>
                <div className="min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">{label}</div>
                    <div className="text-2xl font-bold tabular-nums text-brand-navy">{value}</div>
                </div>
            </div>
            <span className={cn('pointer-events-none absolute -bottom-8 -right-8 size-24 rounded-full bg-gradient-to-br opacity-10 transition-opacity group-hover:opacity-20', gradient)} />
        </div>
    );
}

function Quota({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: ComponentType<{ className?: string }>;
}) {
    const isUnlimited = value === 0;
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5" />
                {label}
            </span>
            <span className={cn('font-bold tabular-nums', isUnlimited ? 'text-muted-foreground/60 italic' : 'text-brand-navy')}>
                {isUnlimited ? '—' : value.toLocaleString('id-ID')}
            </span>
        </div>
    );
}
