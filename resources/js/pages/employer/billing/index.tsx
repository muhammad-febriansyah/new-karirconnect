import { Head, Link, router } from '@inertiajs/react';
import { CreditCard } from 'lucide-react';
import BillingController from '@/actions/App/Http/Controllers/Employer/BillingController';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { PricingCard } from '@/components/pricing/pricing-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

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

const idr = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function EmployerBillingIndex({ plans, currentSubscription, orders }: Props) {
    const checkout = (slug: string) => {
        router.post(`/employer/billing/plans/${slug}/checkout`);
    };

    return (
        <>
            <Head title="Billing & Paket Langganan" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Billing & Langganan"
                    description="Pilih paket yang sesuai untuk perekrutan Anda. Pembayaran diproses melalui Duitku."
                />

                {currentSubscription && (
                    <Section title="Langganan Aktif">
                        <div className="flex flex-wrap items-center gap-6">
                            <div>
                                <div className="text-sm text-muted-foreground">Paket</div>
                                <div className="text-xl font-semibold">{currentSubscription.plan_name}</div>
                                <Badge variant="secondary" className="mt-1 capitalize">{currentSubscription.plan_tier}</Badge>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Periode</div>
                                <div className="text-sm">
                                    {currentSubscription.starts_at ? formatDateTime(currentSubscription.starts_at) : '-'}
                                    <br />
                                    s/d {currentSubscription.ends_at ? formatDateTime(currentSubscription.ends_at) : '-'}
                                </div>
                            </div>
                            <div className="text-sm">
                                <div>Lowongan: <span className="font-semibold">{currentSubscription.jobs_posted_count}</span></div>
                                <div>Boost tersisa: <span className="font-semibold">{currentSubscription.featured_credits_remaining}</span></div>
                                <div>AI Interview tersisa: <span className="font-semibold">{currentSubscription.ai_credits_remaining}</span></div>
                            </div>
                        </div>
                    </Section>
                )}

                <Section title="Paket Tersedia">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {plans.map((plan) => (
                            <PricingCard
                                key={plan.id}
                                name={plan.name}
                                priceIdr={plan.price_idr}
                                period={`/ ${plan.billing_period_days} hari`}
                                featured={plan.is_featured}
                                quotas={[
                                    { label: 'Lowongan aktif', value: String(plan.job_post_quota) },
                                    { label: 'Boost', value: String(plan.featured_credits) },
                                    { label: 'AI Interview', value: String(plan.ai_interview_credits) },
                                    { label: 'Tier', value: plan.tier },
                                ]}
                                features={plan.features}
                                ctaLabel="Pilih Paket"
                                cta={
                                    <Button
                                        className="w-full"
                                        variant={plan.is_featured ? 'default' : 'outline'}
                                        onClick={() => checkout(plan.slug)}
                                    >
                                        <CreditCard className="size-4" /> Pilih Paket
                                    </Button>
                                }
                            />
                        ))}
                    </div>
                </Section>

                <Section title="Riwayat Order">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Referensi</TableHead>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Dibuat</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                                        Belum ada order.
                                    </TableCell>
                                </TableRow>
                            )}
                            {orders.map((order) => (
                                <TableRow key={order.reference}>
                                    <TableCell className="font-mono text-xs">{order.reference}</TableCell>
                                    <TableCell>{order.description}</TableCell>
                                    <TableCell>{idr(order.amount_idr)}</TableCell>
                                    <TableCell><Badge variant="secondary">{formatStatus(order.status)}</Badge></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{order.created_at ? formatDateTime(order.created_at) : '-'}</TableCell>
                                    <TableCell>
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={BillingController.show({ order: order.reference }).url}>Detail</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Section>
            </div>
        </>
    );
}
