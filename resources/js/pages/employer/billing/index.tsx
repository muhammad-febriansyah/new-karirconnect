import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, CreditCard, Sparkles } from 'lucide-react';
import BillingController from '@/actions/App/Http/Controllers/Employer/BillingController';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

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
                        <Card>
                            <CardContent className="flex flex-wrap items-center gap-6 p-4">
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
                            </CardContent>
                        </Card>
                    </Section>
                )}

                <Section title="Paket Tersedia">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {plans.map((plan) => (
                            <Card key={plan.id} className={plan.is_featured ? 'border-primary shadow-md' : ''}>
                                <CardContent className="space-y-3 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-lg font-bold">{plan.name}</div>
                                        {plan.is_featured && <Badge><Sparkles className="mr-1 size-3" /> Populer</Badge>}
                                    </div>
                                    <div className="text-2xl font-bold">{idr(plan.price_idr)}</div>
                                    <div className="text-xs text-muted-foreground">/ {plan.billing_period_days} hari</div>
                                    <ul className="space-y-1 text-sm">
                                        <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-green-600" /> {plan.job_post_quota} lowongan aktif</li>
                                        <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-green-600" /> {plan.featured_credits} boost</li>
                                        <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-green-600" /> {plan.ai_interview_credits} sesi AI Interview</li>
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-green-600" /> {f}</li>
                                        ))}
                                    </ul>
                                    <Button className="w-full" onClick={() => checkout(plan.slug)}>
                                        <CreditCard className="size-4" /> Pilih Paket
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </Section>

                <Section title="Riwayat Order">
                    <Card>
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
                                        <TableCell><Badge variant="secondary" className="capitalize">{order.status.replace('_', ' ')}</Badge></TableCell>
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
                    </Card>
                </Section>
            </div>
        </>
    );
}
