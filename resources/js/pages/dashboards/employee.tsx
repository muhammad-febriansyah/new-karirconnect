import { Head, Link } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import { Bookmark, Bot, BriefcaseBusiness, CalendarClock, Inbox, Send, Sparkles, TrendingUp } from 'lucide-react';
import { ApexChart } from '@/components/charts/apex-chart';
import { BRAND_COLORS, BRAND_PALETTE, brandChartDefaults, mergeChartOptions } from '@/components/charts/chart-theme';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type TrendPoint = { date: string; label: string; count: number };

type Props = {
    data: {
        profile: { completion: number; is_open_to_work: boolean; headline: string | null };
        applications: {
            total: number;
            in_progress: number;
            hired: number;
            rejected: number;
            by_status: Record<string, number>;
        };
        interviews: {
            upcoming_count: number;
            upcoming: Array<{ id: number; title: string; mode: string | null; status: string | null; scheduled_at: string | null; timezone: string | null }>;
        };
        ai_interviews: { total: number; completed: number; in_progress: number };
        saved_jobs_count: number;
        unread_messages: number;
        recommended_jobs: Array<{
            id: number;
            slug: string;
            title: string;
            company_name: string | null;
            company_slug: string | null;
            category: string | null;
            salary_min: number | null;
            salary_max: number | null;
            experience_level: string | null;
            score: number;
            explanation: string;
        }>;
        trend_applications: TrendPoint[];
    };
};

const idr = (v: number | null) => (v == null ? null : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v));

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
                    <div className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: accent }}>
                        <Icon className="size-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function EmployeeDashboard({ data }: Props) {
    const statusEntries = Object.entries(data.applications.by_status).filter(([, v]) => v > 0);

    const completion = Math.max(0, Math.min(100, data.profile.completion ?? 0));

    const completionOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'radialBar', height: 280 },
        colors: [BRAND_COLORS.primary],
        plotOptions: {
            radialBar: {
                hollow: { size: '60%' },
                track: { background: 'rgba(16,128,224,0.10)', strokeWidth: '100%' },
                dataLabels: {
                    name: { show: true, color: '#64748B', fontSize: '12px', offsetY: 12 },
                    value: { show: true, color: BRAND_COLORS.navy, fontSize: '28px', fontWeight: 700, offsetY: -22, formatter: (v) => `${Math.round(Number(v))}%` },
                },
            },
        },
        labels: ['Profil Lengkap'],
        fill: {
            type: 'gradient',
            gradient: { shade: 'light', type: 'horizontal', gradientToColors: [BRAND_COLORS.cyan], stops: [0, 100] },
        },
        stroke: { lineCap: 'round' },
    });

    const statusOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'donut', height: 280 },
        labels: statusEntries.map(([k]) => formatStatus(k)),
        colors: [...BRAND_PALETTE],
        plotOptions: { pie: { donut: { size: '70%' } } },
        stroke: { width: 0 },
        legend: { position: 'bottom' },
    });

    const trendOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'area', height: 280 },
        colors: [BRAND_COLORS.primary],
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] },
        },
        xaxis: { categories: data.trend_applications.map((p) => p.label) },
        markers: { size: 0, hover: { size: 5 } },
    });

    const aiTotal = Math.max(1, data.ai_interviews.total);
    const aiOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'donut', height: 220 },
        labels: ['Selesai', 'Berjalan', 'Belum dimulai'],
        colors: [BRAND_COLORS.primary, BRAND_COLORS.cyan, '#E2E8F0'],
        plotOptions: { pie: { donut: { size: '70%' } } },
        stroke: { width: 0 },
        legend: { position: 'bottom' },
    });
    const aiNotStarted = Math.max(0, aiTotal - data.ai_interviews.completed - data.ai_interviews.in_progress);

    return (
        <>
            <Head title="Dashboard" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Selamat datang!"
                    description={data.profile.headline ?? 'Lengkapi profil Anda untuk peluang kerja terbaik.'}
                />

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={TrendingUp}
                        label="Profil"
                        value={`${completion}%`}
                        sub={data.profile.is_open_to_work ? 'Open to Work · siap dilihat recruiter' : 'Lengkapi untuk peluang lebih baik'}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.cyan})`}
                    />
                    <StatCard
                        icon={Send}
                        label="Lamaran"
                        value={data.applications.total}
                        sub={`${data.applications.in_progress} berjalan · ${data.applications.hired} diterima`}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.cyan}, ${BRAND_COLORS.light})`}
                    />
                    <StatCard
                        icon={CalendarClock}
                        label="Interview"
                        value={data.interviews.upcoming_count}
                        sub="terjadwal mendatang"
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.navy}, ${BRAND_COLORS.primary})`}
                    />
                    <StatCard
                        icon={Bot}
                        label="AI Interview"
                        value={data.ai_interviews.completed}
                        sub={`${data.ai_interviews.in_progress} berjalan · ${data.ai_interviews.total} total`}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.dark}, ${BRAND_COLORS.accent})`}
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-1">
                                <div className="text-sm font-semibold text-slate-900">Kelengkapan Profil</div>
                                <div className="text-xs text-slate-500">Profil lengkap = match lebih akurat</div>
                            </div>
                            <ApexChart type="radialBar" height={280} options={completionOptions} series={[completion]} />
                            <div className="mt-2 flex justify-center">
                                {data.profile.is_open_to_work && (
                                    <Badge variant="secondary" className="gap-1"><Sparkles className="size-3" /> Open to Work</Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-1 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">Tren Lamaran</div>
                                    <div className="text-xs text-slate-500">14 hari terakhir</div>
                                </div>
                                <Badge variant="secondary">{data.applications.total} total</Badge>
                            </div>
                            <ApexChart type="area" height={280} options={trendOptions} series={[{ name: 'Lamaran', data: data.trend_applications.map((p) => p.count) }]} />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-1">
                                <div className="text-sm font-semibold text-slate-900">Status Lamaran</div>
                                <div className="text-xs text-slate-500">Posisi terkini di funnel</div>
                            </div>
                            {statusEntries.length > 0 ? (
                                <ApexChart type="donut" height={280} options={statusOptions} series={statusEntries.map(([, v]) => v)} />
                            ) : (
                                <EmptyState title="Belum ada lamaran" description="Mulai melamar untuk melihat status di sini." />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/70 shadow-sm">
                        <CardContent className="p-4">
                            <div className="mb-1">
                                <div className="text-sm font-semibold text-slate-900">Progres AI Interview</div>
                                <div className="text-xs text-slate-500">Latihan simulasi wawancara</div>
                            </div>
                            <ApexChart
                                type="donut"
                                height={220}
                                options={aiOptions}
                                series={[
                                    Math.max(0, data.ai_interviews.completed),
                                    Math.max(0, data.ai_interviews.in_progress),
                                    aiNotStarted,
                                ]}
                            />
                            <Button asChild size="sm" variant="outline" className="mt-2 w-full">
                                <Link href="/employee/ai-interviews">Buka Simulasi AI</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <Card className="border-slate-200/70 shadow-sm transition hover:shadow-md">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Inbox className="size-4 text-[color:var(--brand-primary)]" style={{ color: BRAND_COLORS.primary }} /> Pesan Recruiter</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">{data.unread_messages}</div>
                            <div className="text-xs text-slate-500">belum dibaca</div>
                            <Button asChild size="sm" variant="link" className="px-0">
                                <Link href="/employee/messages">Buka inbox →</Link>
                            </Button>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200/70 shadow-sm transition hover:shadow-md">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Bookmark className="size-4" style={{ color: BRAND_COLORS.cyan }} /> Lowongan Tersimpan</div>
                            <div className="mt-2 text-2xl font-bold text-slate-900">{data.saved_jobs_count}</div>
                            <Button asChild size="sm" variant="link" className="px-0">
                                <Link href="/employee/saved-jobs">Lihat semua →</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {data.interviews.upcoming.length > 0 && (
                    <Section title="Interview Mendatang">
                        <div className="space-y-2">
                            {data.interviews.upcoming.map((iv) => (
                                <Card key={iv.id} className="border-slate-200/70 shadow-sm">
                                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="font-semibold text-slate-900">{iv.title}</div>
                                            <div className="text-xs text-slate-500">
                                                {iv.scheduled_at ? formatDateTime(iv.scheduled_at) : '-'} · {formatStatus(iv.mode)}
                                            </div>
                                        </div>
                                        <Badge>{formatStatus(iv.status)}</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </Section>
                )}

                {data.recommended_jobs.length > 0 && (
                    <Section
                        title="Direkomendasikan untuk Anda"
                        actions={
                            <Link href="/employee/recommendations" className="text-sm hover:underline" style={{ color: BRAND_COLORS.primary }}>
                                Lihat semua →
                            </Link>
                        }
                    >
                        <div className="grid gap-3 md:grid-cols-3">
                            {data.recommended_jobs.map((j) => (
                                <Card key={j.id} className="border-slate-200/70 shadow-sm transition hover:shadow-md">
                                    <CardContent className="space-y-2 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <Link href={`/jobs/${j.slug}`} className="font-semibold text-slate-900 hover:underline">{j.title}</Link>
                                            <Badge
                                                className="shrink-0 text-white"
                                                style={{ background: `linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.cyan})` }}
                                            >
                                                {j.score}/100
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            <BriefcaseBusiness className="inline size-3" /> {j.company_name ?? '-'}
                                        </div>
                                        <div className="flex flex-wrap gap-1 text-xs">
                                            {j.category && <Badge variant="outline">{j.category}</Badge>}
                                            {j.experience_level && <Badge variant="secondary">{formatStatus(j.experience_level)}</Badge>}
                                        </div>
                                        {j.salary_min && (
                                            <div className="text-xs text-slate-500">
                                                {idr(j.salary_min)}{j.salary_max ? ` - ${idr(j.salary_max)}` : ''}
                                            </div>
                                        )}
                                        <div className="text-xs italic text-slate-500">{j.explanation}</div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </Section>
                )}
            </div>
        </>
    );
}
