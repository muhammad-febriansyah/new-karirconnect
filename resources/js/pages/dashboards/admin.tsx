import { Head, Link } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import { Bot, Building2, BriefcaseBusiness, CreditCard, MessageSquare, ShieldCheck, TrendingUp, UserSearch, Users } from 'lucide-react';
import { ApexChart } from '@/components/charts/apex-chart';
import { BRAND_COLORS, BRAND_PALETTE, brandChartDefaults, mergeChartOptions } from '@/components/charts/chart-theme';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type TrendPoint = { date: string; label: string; count: number };

type Props = {
    data: {
        users: { total: number; admin: number; employer: number; employee: number };
        companies: { total: number; verified: number; pending_verification: number };
        jobs: { total: number; published: number };
        applications: { total: number; this_month: number };
        reviews: { pending: number; approved: number };
        orders: { paid_count: number; awaiting_count: number; paid_this_month: number };
        ai_usage: { total_calls: number; this_month: number; total_cost_usd: number };
        talent_searches: { total: number; this_month: number };
        recent_orders: Array<{ reference: string; company_name: string | null; amount_idr: number; status: string; created_at: string | null }>;
        recent_companies: Array<{ id: number; name: string; slug: string; verification_status: string; created_at: string | null }>;
        trend_applications: TrendPoint[];
        trend_revenue: TrendPoint[];
        trend_ai_calls: TrendPoint[];
    };
};

const idr = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
const idrCompact = (v: number) => {
    if (v >= 1_000_000_000) return `Rp${(v / 1_000_000_000).toFixed(1)}M`;
    if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1)}jt`;
    if (v >= 1_000) return `Rp${(v / 1_000).toFixed(0)}rb`;
    return `Rp${v}`;
};

type StatCardProps = {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    sub?: string;
    accent: string;
};

function StatCard({ icon: Icon, label, value, sub, accent }: StatCardProps) {
    return (
        <Card className="relative overflow-hidden border-slate-200/70 shadow-sm transition hover:shadow-md">
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
                        <div className="text-2xl font-bold text-slate-900">{value}</div>
                        {sub && <div className="text-xs text-slate-500">{sub}</div>}
                    </div>
                    <div
                        className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{ background: accent }}
                    >
                        <Icon className="size-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdminDashboard({ data }: Props) {
    const revenueOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'area', height: 280, sparkline: { enabled: false } },
        colors: [BRAND_COLORS.primary],
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] },
        },
        xaxis: { categories: data.trend_revenue.map((p) => p.label) },
        yaxis: { labels: { formatter: (v) => idrCompact(Number(v)) } },
        tooltip: { y: { formatter: (v) => idr(Number(v)) } },
        markers: { size: 0, hover: { size: 5 } },
    });

    const applicationsOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'area', height: 280 },
        colors: [BRAND_COLORS.cyan],
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] },
        },
        xaxis: { categories: data.trend_applications.map((p) => p.label) },
        markers: { size: 0, hover: { size: 5 } },
    });

    const aiOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'bar', height: 280 },
        colors: [BRAND_COLORS.navy],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
        xaxis: { categories: data.trend_ai_calls.map((p) => p.label) },
    });

    const userMix = [data.users.employee, data.users.employer, data.users.admin];
    const userMixOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'donut', height: 280 },
        labels: ['Kandidat', 'Employer', 'Admin'],
        colors: [BRAND_COLORS.primary, BRAND_COLORS.cyan, BRAND_COLORS.navy],
        plotOptions: { pie: { donut: { size: '70%' } } },
        stroke: { width: 0 },
        legend: { position: 'bottom' },
    });

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Operasi Platform" description="Kondisi kesehatan KarirConnect secara keseluruhan." />

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={Users}
                        label="Pengguna"
                        value={data.users.total}
                        sub={`${data.users.employee} kandidat · ${data.users.employer} employer`}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.cyan})`}
                    />
                    <StatCard
                        icon={Building2}
                        label="Perusahaan"
                        value={data.companies.total}
                        sub={`${data.companies.verified} verified · ${data.companies.pending_verification} menunggu`}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.cyan}, ${BRAND_COLORS.light})`}
                    />
                    <StatCard
                        icon={BriefcaseBusiness}
                        label="Lowongan"
                        value={data.jobs.published}
                        sub={`${data.applications.total} lamaran · ${data.applications.this_month} bulan ini`}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.navy}, ${BRAND_COLORS.primary})`}
                    />
                    <StatCard
                        icon={CreditCard}
                        label="Revenue Bulan Ini"
                        value={idrCompact(data.orders.paid_this_month)}
                        sub={`${data.orders.paid_count} paid · ${data.orders.awaiting_count} menunggu`}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.dark}, ${BRAND_COLORS.accent})`}
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2 border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-1 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">Tren Pendapatan</div>
                                    <div className="text-xs text-slate-500">14 hari terakhir · order paid</div>
                                </div>
                                <Badge variant="secondary" className="gap-1"><TrendingUp className="size-3" /> {idrCompact(data.orders.paid_this_month)}</Badge>
                            </div>
                            <ApexChart type="area" height={280} options={revenueOptions} series={[{ name: 'Revenue', data: data.trend_revenue.map((p) => p.count) }]} />
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-1">
                                <div className="text-sm font-semibold text-slate-900">Komposisi Pengguna</div>
                                <div className="text-xs text-slate-500">Distribusi role saat ini</div>
                            </div>
                            <ApexChart type="donut" height={280} options={userMixOptions} series={userMix} />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-1 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">Lamaran Masuk</div>
                                    <div className="text-xs text-slate-500">14 hari terakhir</div>
                                </div>
                                <Badge variant="secondary">{data.applications.this_month} bulan ini</Badge>
                            </div>
                            <ApexChart type="area" height={280} options={applicationsOptions} series={[{ name: 'Lamaran', data: data.trend_applications.map((p) => p.count) }]} />
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-1 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">Penggunaan AI</div>
                                    <div className="text-xs text-slate-500">Panggilan model 14 hari · ${data.ai_usage.total_cost_usd}</div>
                                </div>
                                <Badge variant="secondary" className="gap-1"><Bot className="size-3" /> {data.ai_usage.this_month}</Badge>
                            </div>
                            <ApexChart type="bar" height={280} options={aiOptions} series={[{ name: 'AI Calls', data: data.trend_ai_calls.map((p) => p.count) }]} />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <StatCard
                        icon={UserSearch}
                        label="Talent Search"
                        value={data.talent_searches.this_month}
                        sub={`${data.talent_searches.total} total pencarian`}
                        accent={BRAND_PALETTE[3]}
                    />
                    <StatCard
                        icon={MessageSquare}
                        label="Review Menunggu"
                        value={data.reviews.pending}
                        sub={`${data.reviews.approved} disetujui`}
                        accent={BRAND_PALETTE[4]}
                    />
                    <StatCard
                        icon={Bot}
                        label="AI Cost (USD)"
                        value={`$${data.ai_usage.total_cost_usd}`}
                        sub={`${data.ai_usage.total_calls} total call`}
                        accent={BRAND_PALETTE[5]}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="text-sm font-semibold text-slate-900">Order Terbaru</div>
                                <Button asChild size="sm" variant="link"><Link href="/admin/orders">Lihat semua</Link></Button>
                            </div>
                            <div className="space-y-2">
                                {data.recent_orders.length === 0 && (
                                    <EmptyState title="Belum ada order" description="Order terbaru akan tampil di sini." />
                                )}
                                {data.recent_orders.map((o) => (
                                    <div key={o.reference} className="flex items-center justify-between rounded-lg border border-slate-200/60 bg-slate-50/50 p-3 text-sm transition hover:bg-slate-50">
                                        <div>
                                            <div className="font-mono text-xs text-slate-700">{o.reference}</div>
                                            <div className="text-xs text-slate-500">{o.company_name ?? '-'} · {o.created_at ? formatDateTime(o.created_at) : ''}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold text-slate-900">{idr(o.amount_idr)}</div>
                                            <Badge variant="secondary">{formatStatus(o.status)}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="text-sm font-semibold text-slate-900">Perusahaan Baru</div>
                                <Button asChild size="sm" variant="link"><Link href="/admin/companies">Lihat semua</Link></Button>
                            </div>
                            <div className="space-y-2">
                                {data.recent_companies.length === 0 && (
                                    <EmptyState title="Belum ada perusahaan baru" description="Perusahaan yang baru terdaftar akan muncul di sini." />
                                )}
                                {data.recent_companies.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200/60 bg-slate-50/50 p-3 text-sm transition hover:bg-slate-50">
                                        <div>
                                            <Link href={`/companies/${c.slug}`} className="font-medium text-slate-900 hover:underline">{c.name}</Link>
                                            <div className="text-xs text-slate-500">{c.created_at ? formatDateTime(c.created_at) : ''}</div>
                                        </div>
                                        <Badge variant="secondary"><ShieldCheck className="mr-1 size-3" /> {formatStatus(c.verification_status)}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
