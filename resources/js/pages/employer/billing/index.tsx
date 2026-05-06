import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Check, CheckCircle2, CreditCard, Receipt, Sparkles, TrendingUp, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import BillingController from '@/actions/App/Http/Controllers/Employer/BillingController';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { PricingCard } from '@/components/pricing/pricing-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';
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
    is_featured: boolean;
};

type Subscription = {
    plan_name: string | null;
    plan_tier: string | null;
    status: string | null;
    starts_at: string | null;
    ends_at: string | null;
    jobs_posted_count: number;
    featured_credits_remaining: number;
    ai_credits_remaining: number;
};

type Order = {
    reference: string;
    description: string;
    amount_idr: number;
    status: string;
    created_at: string | null;
    paid_at: string | null;
};

type Props = {
    plans: Plan[];
    currentSubscription: Subscription | null;
    orders: Order[];
};

const idr = (v: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(v);

const ORDER_STATUS_VARIANT: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
    paid: { variant: 'default', label: 'Lunas' },
    awaiting_payment: { variant: 'secondary', label: 'Menunggu Pembayaran' },
    pending: { variant: 'secondary', label: 'Pending' },
    failed: { variant: 'destructive', label: 'Gagal' },
    expired: { variant: 'outline', label: 'Kedaluwarsa' },
    cancelled: { variant: 'outline', label: 'Dibatalkan' },
    refunded: { variant: 'outline', label: 'Refund' },
};

const daysBetween = (start: string | null, end: string | null) => {
    if (!start || !end) return { total: 0, used: 0, remaining: 0, pct: 0 };
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = Date.now();
    const total = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
    const used = Math.max(0, Math.min(total, Math.round((now - s) / (1000 * 60 * 60 * 24))));
    const remaining = Math.max(0, total - used);
    return { total, used, remaining, pct: Math.round((used / total) * 100) };
};

export default function EmployerBillingIndex({ plans, currentSubscription, orders }: Props) {
    const [activeTab, setActiveTab] = useState<'plans' | 'compare' | 'history'>('plans');

    const checkout = (slug: string) => {
        router.post(`/employer/billing/plans/${slug}/checkout`);
    };

    const periodInfo = useMemo(
        () => daysBetween(currentSubscription?.starts_at ?? null, currentSubscription?.ends_at ?? null),
        [currentSubscription?.starts_at, currentSubscription?.ends_at],
    );

    const currentPlanSlugMatch = useMemo(() => {
        if (!currentSubscription?.plan_name) return null;
        const found = plans.find((p) => p.name === currentSubscription.plan_name);
        return found?.slug ?? null;
    }, [plans, currentSubscription?.plan_name]);

    const sortedPlans = useMemo(
        () => [...plans].sort((a, b) => a.price_idr - b.price_idr),
        [plans],
    );

    const orderStats = useMemo(() => {
        const paid = orders.filter((o) => o.status === 'paid');
        const totalSpent = paid.reduce((sum, o) => sum + o.amount_idr, 0);
        return {
            totalOrders: orders.length,
            paidCount: paid.length,
            totalSpent,
        };
    }, [orders]);

    return (
        <>
            <Head title="Billing & Paket Langganan" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Billing & Langganan"
                    description="Pilih paket yang sesuai untuk perekrutan Anda. Pembayaran diproses melalui Midtrans."
                />

                {/* Active subscription overview */}
                {currentSubscription && (
                    <div
                        className="relative overflow-hidden rounded-2xl border border-slate-200/70 shadow-sm"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(16,128,224,0.05) 0%, rgba(16,192,224,0.05) 100%), white',
                        }}
                    >
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full opacity-20 blur-3xl"
                            style={{ background: 'radial-gradient(circle, #10C0E0, transparent)' }}
                        />
                        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.2fr_2fr]">
                            <div className="space-y-3">
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                                    Langganan Aktif
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Paket saat ini</div>
                                    <div className="text-2xl font-bold tracking-tight">
                                        {currentSubscription.plan_name ?? '—'}
                                    </div>
                                    <Badge variant="secondary" className="mt-1 capitalize">
                                        Tier {currentSubscription.plan_tier ?? '—'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="size-3.5" />
                                    {currentSubscription.starts_at ? formatDateTime(currentSubscription.starts_at) : '—'}{' '}
                                    s/d {currentSubscription.ends_at ? formatDateTime(currentSubscription.ends_at) : '—'}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Sisa periode</span>
                                        <span className="font-mono font-medium">
                                            {periodInfo.remaining} dari {periodInfo.total} hari
                                        </span>
                                    </div>
                                    <Progress value={periodInfo.pct} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <UsageStat
                                    label="Lowongan dipasang"
                                    value={currentSubscription.jobs_posted_count}
                                    accent="#1080E0"
                                />
                                <UsageStat
                                    label="Boost tersisa"
                                    value={currentSubscription.featured_credits_remaining}
                                    accent="#10C0E0"
                                />
                                <UsageStat
                                    label="AI Interview tersisa"
                                    value={currentSubscription.ai_credits_remaining}
                                    accent="#7B61FF"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs: Plans / Compare / History */}
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
                        <TabsTrigger value="plans">
                            <Sparkles className="size-4" />
                            Paket
                        </TabsTrigger>
                        <TabsTrigger value="compare">
                            <TrendingUp className="size-4" />
                            Banding Harga
                        </TabsTrigger>
                        <TabsTrigger value="history">
                            <Receipt className="size-4" />
                            Riwayat ({orders.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB: Plans */}
                    <TabsContent value="plans" className="mt-5">
                        <Section
                            title="Paket Tersedia"
                            description="Klik salah satu paket untuk berlangganan. Paket gratis langsung aktif tanpa pembayaran."
                        >
                            <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {sortedPlans.map((plan) => {
                                    const isCurrent = currentPlanSlugMatch === plan.slug;
                                    return (
                                        <div key={plan.id} className="relative flex">
                                            {isCurrent && (
                                                <div className="pointer-events-none absolute -inset-px z-10 rounded-xl ring-2 ring-emerald-400/60" />
                                            )}
                                            <PricingCard
                                                className="w-full"
                                                name={plan.name}
                                                tier={plan.tier}
                                                priceIdr={plan.price_idr}
                                                period={`/ ${plan.billing_period_days} hari`}
                                                featured={plan.is_featured}
                                                quotas={[
                                                    { label: 'Lowongan', value: String(plan.job_post_quota) },
                                                    { label: 'Boost', value: String(plan.featured_credits) },
                                                    { label: 'AI Interview', value: String(plan.ai_interview_credits) },
                                                ]}
                                                features={plan.features}
                                                ctaLabel={isCurrent ? 'Paket Aktif' : 'Pilih Paket'}
                                                cta={
                                                    isCurrent ? (
                                                        <Button className="w-full" variant="outline" disabled>
                                                            <CheckCircle2 className="size-4 text-emerald-600" />
                                                            Paket Aktif
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            className="w-full"
                                                            variant={plan.is_featured ? 'default' : 'outline'}
                                                            onClick={() => checkout(plan.slug)}
                                                        >
                                                            <CreditCard className="size-4" /> Pilih Paket
                                                        </Button>
                                                    )
                                                }
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>
                    </TabsContent>

                    {/* TAB: Compare */}
                    <TabsContent value="compare" className="mt-5">
                        <Section
                            title="Banding Harga & Fitur"
                            description="Tabel perbandingan kuota & fitur antar paket. Geser ke kanan jika tabel terpotong di mobile."
                        >
                            <div className="overflow-x-auto rounded-md border">
                                <Table className="min-w-[820px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-44 sticky left-0 bg-background">Fitur</TableHead>
                                            {sortedPlans.map((plan) => (
                                                <TableHead key={plan.id} className="text-center">
                                                    <div className="space-y-1.5 py-2">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <span className="font-semibold text-foreground">{plan.name}</span>
                                                            {plan.is_featured && (
                                                                <Sparkles className="size-3 text-[color:#1080E0]" />
                                                            )}
                                                        </div>
                                                        {plan.price_idr === 0 ? (
                                                            <div className="text-lg font-bold tracking-tight">Gratis</div>
                                                        ) : (
                                                            <div>
                                                                <span className="text-lg font-bold tracking-tight">
                                                                    {idr(plan.price_idr)}
                                                                </span>
                                                                <div className="text-[11px] font-normal text-muted-foreground">
                                                                    / {plan.billing_period_days} hari
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <ComparisonRow
                                            label="Tier"
                                            getValue={(p) => <Badge variant="outline" className="capitalize">{p.tier}</Badge>}
                                            plans={sortedPlans}
                                            currentSlug={currentPlanSlugMatch}
                                        />
                                        <ComparisonRow
                                            label="Lowongan Aktif"
                                            getValue={(p) => <span className="font-mono font-semibold">{p.job_post_quota}</span>}
                                            plans={sortedPlans}
                                            currentSlug={currentPlanSlugMatch}
                                        />
                                        <ComparisonRow
                                            label="Boost / Featured"
                                            getValue={(p) => <span className="font-mono font-semibold">{p.featured_credits}</span>}
                                            plans={sortedPlans}
                                            currentSlug={currentPlanSlugMatch}
                                        />
                                        <ComparisonRow
                                            label="Kredit AI Interview"
                                            getValue={(p) => <span className="font-mono font-semibold">{p.ai_interview_credits}</span>}
                                            plans={sortedPlans}
                                            currentSlug={currentPlanSlugMatch}
                                        />
                                        <ComparisonRow
                                            label="Periode Tagihan"
                                            getValue={(p) => `${p.billing_period_days} hari`}
                                            plans={sortedPlans}
                                            currentSlug={currentPlanSlugMatch}
                                        />
                                        <ComparisonRow
                                            label="Harga / hari"
                                            getValue={(p) =>
                                                p.price_idr === 0
                                                    ? <span className="text-muted-foreground">Gratis</span>
                                                    : <span className="font-mono">{idr(Math.round(p.price_idr / Math.max(1, p.billing_period_days)))}</span>
                                            }
                                            plans={sortedPlans}
                                            currentSlug={currentPlanSlugMatch}
                                        />
                                        {/* Feature rows from union of all features */}
                                        {Array.from(
                                            new Set(sortedPlans.flatMap((p) => p.features ?? [])),
                                        ).map((feature) => (
                                            <ComparisonRow
                                                key={feature}
                                                label={feature}
                                                getValue={(p) =>
                                                    p.features?.includes(feature) ? (
                                                        <Check className="mx-auto size-4 text-emerald-600" />
                                                    ) : (
                                                        <X className="mx-auto size-4 text-muted-foreground/40" />
                                                    )
                                                }
                                                plans={sortedPlans}
                                                currentSlug={currentPlanSlugMatch}
                                            />
                                        ))}
                                        <TableRow>
                                            <TableCell className="sticky left-0 bg-background" />
                                            {sortedPlans.map((plan) => {
                                                const isCurrent = currentPlanSlugMatch === plan.slug;
                                                return (
                                                    <TableCell key={plan.id} className="text-center">
                                                        {isCurrent ? (
                                                            <Button size="sm" variant="outline" disabled>
                                                                <CheckCircle2 className="size-4 text-emerald-600" /> Aktif
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant={plan.is_featured ? 'default' : 'outline'}
                                                                onClick={() => checkout(plan.slug)}
                                                            >
                                                                <CreditCard className="size-4" />
                                                                Pilih
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </Section>
                    </TabsContent>

                    {/* TAB: History */}
                    <TabsContent value="history" className="mt-5">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <StatCard
                                label="Total Order"
                                value={String(orderStats.totalOrders)}
                                icon={<Receipt className="size-5" />}
                            />
                            <StatCard
                                label="Order Lunas"
                                value={String(orderStats.paidCount)}
                                icon={<CheckCircle2 className="size-5 text-emerald-600" />}
                            />
                            <StatCard
                                label="Total Pembayaran"
                                value={idr(orderStats.totalSpent)}
                                icon={<CreditCard className="size-5 text-[color:#1080E0]" />}
                            />
                        </div>

                        <Section title="Riwayat Order" description="20 order terakhir." className="mt-4">
                            {orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-12 text-center">
                                    <Receipt className="size-8 text-muted-foreground/50" />
                                    <div className="text-sm font-medium">Belum ada order</div>
                                    <p className="max-w-md text-xs text-muted-foreground">
                                        Pilih paket di tab "Paket" untuk membuat order pertama. Riwayat pembayaran kamu akan muncul di sini.
                                    </p>
                                    <Button size="sm" variant="outline" onClick={() => setActiveTab('plans')}>
                                        <Sparkles className="size-4" /> Lihat Paket
                                    </Button>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Referensi</TableHead>
                                                <TableHead>Deskripsi</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Dibuat</TableHead>
                                                <TableHead className="text-right">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {orders.map((order) => {
                                                const meta = ORDER_STATUS_VARIANT[order.status] ?? {
                                                    variant: 'secondary' as const,
                                                    label: formatStatus(order.status),
                                                };
                                                return (
                                                    <TableRow key={order.reference}>
                                                        <TableCell className="font-mono text-xs">
                                                            {order.reference}
                                                        </TableCell>
                                                        <TableCell className="text-sm">{order.description}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">
                                                            {idr(order.amount_idr)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={meta.variant}>{meta.label}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {order.created_at ? formatDateTime(order.created_at) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button asChild size="sm" variant="outline">
                                                                <Link href={BillingController.show({ order: order.reference }).url}>
                                                                    Detail
                                                                </Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </Section>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

function UsageStat({ label, value, accent }: { label: string; value: number; accent: string }) {
    return (
        <Card className="border-slate-200/70">
            <CardContent className="space-y-1.5 p-4">
                <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: accent }} />
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
                </div>
                <div className="text-3xl font-bold tracking-tight">{value}</div>
            </CardContent>
        </Card>
    );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">{icon}</div>
                <div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-lg font-semibold tracking-tight">{value}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function ComparisonRow({
    label,
    getValue,
    plans,
    currentSlug,
}: {
    label: string;
    getValue: (plan: Plan) => React.ReactNode;
    plans: Plan[];
    currentSlug: string | null;
}) {
    return (
        <TableRow>
            <TableCell className="sticky left-0 bg-background text-sm font-medium">{label}</TableCell>
            {plans.map((plan) => (
                <TableCell
                    key={plan.id}
                    className={cn(
                        'text-center text-sm',
                        currentSlug === plan.slug && 'bg-emerald-50/40',
                    )}
                >
                    {getValue(plan)}
                </TableCell>
            ))}
        </TableRow>
    );
}
