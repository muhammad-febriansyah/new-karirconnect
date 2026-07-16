import { Head, Link } from '@inertiajs/react';
import type { ApexOptions } from 'apexcharts';
import { ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2, Clock, CreditCard, ShieldCheck, Sparkles, UserCheck, UserSearch } from 'lucide-react';
import { ApexChart } from '@/components/charts/apex-chart';
import { BRAND_COLORS, BRAND_PALETTE, brandChartDefaults, mergeChartOptions } from '@/components/charts/chart-theme';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type TrendPoint = { date: string; label: string; count: number };

type MissingItem = { key: string; label: string; href: string };

type Props = {
    data: {
        has_company: boolean;
        company?: {
            id: number;
            name: string;
            slug: string;
            status: string | null;
            verification_status: string | null;
            missing_items: MissingItem[];
        };
        jobs?: { total: number; published: number; draft: number };
        applicants?: {
            total: number;
            this_month: number;
            shortlisted: number;
            hired: number;
            by_status: Record<string, number>;
        };
        interviews?: { upcoming: number; ai_completed: number };
        billing?: {
            plan_name: string | null;
            plan_tier: string | null;
            starts_at: string | null;
            ends_at: string | null;
            jobs_quota: number;
            jobs_used: number;
            featured_remaining: number;
            ai_remaining: number;
            paid_this_month: number;
        };
        talent_search?: { searches_this_month: number };
        recent_applicants?: Array<{
            id: number;
            candidate_name: string | null;
            job_title: string | null;
            job_slug: string | null;
            status: string | null;
            created_at: string | null;
        }>;
        trend_applicants?: TrendPoint[];
        trend_interviews?: TrendPoint[];
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
        <Card className="relative overflow-hidden border-slate-200/70 shadow-xs transition hover:shadow-md">
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
                        <div className="text-2xl font-bold text-slate-900">{value}</div>
                        {sub && <div className="text-xs text-slate-500">{sub}</div>}
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-xl text-white shadow-xs" style={{ background: accent }}>
                        <Icon className="size-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function EmployerDashboard({ data }: Props) {
    if (!data.has_company) {
        return (
            <>
                <Head title="Dashboard" />
                <div className="space-y-6 p-4 sm:p-6">
                    <Card>
                        <CardContent className="space-y-2 p-10 text-center">
                            <div className="text-lg font-semibold">Lengkapi profil perusahaan</div>
                            <p className="text-sm text-muted-foreground">Anda perlu membuat profil perusahaan untuk mulai memposting lowongan.</p>
                            <Button asChild><Link href="/employer/company/edit">Buat Profil Perusahaan</Link></Button>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    const billing = data.billing!;
    const jobUsagePct = billing.jobs_quota > 0 ? Math.min(100, Math.round((billing.jobs_used / billing.jobs_quota) * 100)) : 0;

    const applicantsTrend = data.trend_applicants ?? [];
    const interviewsTrend = data.trend_interviews ?? [];

    const applicantsOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'area', height: 280 },
        colors: [BRAND_COLORS.primary],
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] },
        },
        xaxis: { categories: applicantsTrend.map((p) => p.label) },
        markers: { size: 0, hover: { size: 5 } },
    });

    const interviewsOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'bar', height: 280 },
        colors: [BRAND_COLORS.cyan],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
        xaxis: { categories: interviewsTrend.map((p) => p.label) },
    });

    const statusEntries = Object.entries(data.applicants!.by_status).filter(([, v]) => v > 0);
    const statusDonutOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'donut', height: 300 },
        labels: statusEntries.map(([k]) => formatStatus(k)),
        colors: [...BRAND_PALETTE],
        plotOptions: { pie: { donut: { size: '70%' } } },
        stroke: { width: 0 },
        legend: { position: 'bottom' },
    });

    const funnelOptions: ApexOptions = mergeChartOptions(brandChartDefaults(), {
        chart: { type: 'bar', height: 300 },
        colors: [BRAND_COLORS.navy],
        plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '60%', distributed: true } },
        legend: { show: false },
        dataLabels: { enabled: true, style: { colors: ['#fff'], fontSize: '11px' } },
        xaxis: { categories: statusEntries.map(([k]) => formatStatus(k)) },
    });

    return (
        <>
            <Head title="Dashboard" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={data.company!.name}
                    description={`Verifikasi: ${data.company!.verification_status ?? '—'}`}
                />

                <CompanyStatusBanner status={data.company!.status} verificationStatus={data.company!.verification_status} />

                {data.company!.missing_items.length > 0 && (
                    <Card className="border-amber-200 bg-amber-50/40 shadow-xs">
                        <CardContent className="space-y-3 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                                        <Sparkles className="size-4" /> Lengkapi profil perusahaan
                                    </div>
                                    <div className="text-xs text-amber-800/80">
                                        Profil yang lengkap meningkatkan kepercayaan kandidat & SEO halaman karier.
                                    </div>
                                </div>
                                <span className="rounded-full bg-amber-200/70 px-2.5 py-1 text-xs font-bold text-amber-900">
                                    {data.company!.missing_items.length} hal
                                </span>
                            </div>
                            <ul className="grid gap-2 sm:grid-cols-2">
                                {data.company!.missing_items.map((item) => (
                                    <li key={item.key}>
                                        <Link
                                            href={item.href}
                                            className="group flex items-center justify-between gap-2 rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2 text-sm text-amber-900 transition-colors hover:border-amber-400 hover:bg-white"
                                        >
                                            <span className="flex items-center gap-2">
                                                <CheckCircle2 className="size-4 text-amber-400" />
                                                {item.label}
                                            </span>
                                            <ArrowRight className="size-3.5 text-amber-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={BriefcaseBusiness}
                        label="Lowongan"
                        value={data.jobs!.published}
                        sub={`${data.jobs!.draft} draft · ${data.jobs!.total} total`}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.cyan})`}
                    />
                    <StatCard
                        icon={UserCheck}
                        label="Pelamar"
                        value={data.applicants!.total}
                        sub={`${data.applicants!.this_month} bulan ini · ${data.applicants!.hired} diterima`}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.cyan}, ${BRAND_COLORS.light})`}
                    />
                    <StatCard
                        icon={CalendarClock}
                        label="Interview"
                        value={data.interviews!.upcoming}
                        sub={`${data.interviews!.ai_completed} sesi AI selesai`}
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.navy}, ${BRAND_COLORS.primary})`}
                    />
                    <StatCard
                        icon={UserSearch}
                        label="Talent Search"
                        value={data.talent_search!.searches_this_month}
                        sub="pencarian bulan ini"
                        accent={`linear-gradient(135deg, ${BRAND_COLORS.dark}, ${BRAND_COLORS.accent})`}
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2 border-slate-200/70 shadow-xs">
                        <CardContent className="p-4">
                            <div className="mb-1 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">Tren Pelamar</div>
                                    <div className="text-xs text-slate-500">14 hari terakhir</div>
                                </div>
                                <Badge variant="secondary">{data.applicants!.this_month} bulan ini</Badge>
                            </div>
                            <ApexChart type="area" height={280} options={applicantsOptions} series={[{ name: 'Pelamar', data: applicantsTrend.map((p) => p.count) }]} />
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/70 shadow-xs">
                        <CardContent className="space-y-3 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CreditCard className="size-4" /> Langganan</div>
                                {billing.plan_tier && <Badge variant="secondary" className="capitalize">{billing.plan_tier}</Badge>}
                            </div>
                            {billing.plan_name ? (
                                <>
                                    <div className="text-xl font-bold text-slate-900">{billing.plan_name}</div>
                                    <div className="text-xs text-slate-500">
                                        Aktif sampai: {billing.ends_at ? formatDateTime(billing.ends_at) : '-'}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs"><span className="text-slate-600">Lowongan ({billing.jobs_used}/{billing.jobs_quota})</span><span className="font-semibold">{jobUsagePct}%</span></div>
                                        <Progress value={jobUsagePct} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="rounded-lg bg-slate-50 p-2">
                                            <div className="text-xs text-slate-500">Boost tersisa</div>
                                            <div className="font-semibold text-slate-900">{billing.featured_remaining}</div>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-2">
                                            <div className="text-xs text-slate-500">AI tersisa</div>
                                            <div className="font-semibold text-slate-900">{billing.ai_remaining}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-700">Dibayar bulan ini: <span className="font-semibold">{idrCompact(billing.paid_this_month)}</span></div>
                                </>
                            ) : (
                                <>
                                    <EmptyState
                                        title="Belum ada langganan aktif"
                                        description="Pilih paket untuk mulai menggunakan fitur premium employer."
                                    />
                                    <Button asChild size="sm"><Link href="/employer/billing">Pilih Paket</Link></Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-slate-200/70 shadow-xs">
                        <CardContent className="p-4">
                            <div className="mb-1">
                                <div className="text-sm font-semibold text-slate-900">Jadwal Interview</div>
                                <div className="text-xs text-slate-500">14 hari terakhir</div>
                            </div>
                            <ApexChart type="bar" height={280} options={interviewsOptions} series={[{ name: 'Interview', data: interviewsTrend.map((p) => p.count) }]} />
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/70 shadow-xs">
                        <CardContent className="p-4">
                            <div className="mb-1">
                                <div className="text-sm font-semibold text-slate-900">Distribusi Status Lamaran</div>
                                <div className="text-xs text-slate-500">Posisi setiap kandidat dalam funnel</div>
                            </div>
                            {statusEntries.length > 0 ? (
                                <ApexChart
                                    type="donut"
                                    height={300}
                                    options={statusDonutOptions}
                                    series={statusEntries.map(([, v]) => v)}
                                />
                            ) : (
                                <EmptyState title="Belum ada lamaran" description="Status lamaran akan tampil setelah kandidat mulai melamar." />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {statusEntries.length > 0 && (
                    <Card className="border-slate-200/70 shadow-xs">
                        <CardContent className="p-4">
                            <div className="mb-1">
                                <div className="text-sm font-semibold text-slate-900">Funnel Hiring</div>
                                <div className="text-xs text-slate-500">Volume per tahap rekrutmen</div>
                            </div>
                            <ApexChart
                                type="bar"
                                height={300}
                                options={funnelOptions}
                                series={[{ name: 'Pelamar', data: statusEntries.map(([, v]) => v) }]}
                            />
                        </CardContent>
                    </Card>
                )}

                {(data.recent_applicants ?? []).length > 0 && (
                    <Section title="Pelamar Terbaru">
                        <div className="rounded-md border">
                            <Table className="min-w-[760px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Kandidat</TableHead>
                                        <TableHead>Lowongan</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.recent_applicants!.map((a) => (
                                        <TableRow key={a.id}>
                                            <TableCell className="font-medium text-slate-900">{a.candidate_name ?? 'Anonim'}</TableCell>
                                            <TableCell className="text-muted-foreground">{a.job_title ?? '-'}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {a.created_at ? formatDateTime(a.created_at) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="secondary">{formatStatus(a.status)}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Section>
                )}

                {data.company!.verification_status !== 'verified' && (
                    <Card className="border-amber-200 bg-amber-50/50 shadow-xs">
                        <CardContent className="flex items-center justify-between gap-3 p-4">
                            <div>
                                <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-amber-600" /> Verifikasi Perusahaan</div>
                                <div className="text-sm text-slate-600">Verifikasi membantu meningkatkan kepercayaan kandidat.</div>
                            </div>
                            <Button asChild size="sm"><Link href="/employer/company/verification">Verifikasi</Link></Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

function CompanyStatusBanner({ status, verificationStatus }: { status: string | null; verificationStatus: string | null }) {
    if (status === 'suspended') {
        return (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                    <ShieldCheck className="size-5" />
                </span>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-rose-900">Akun perusahaan dinonaktifkan</p>
                    <p className="text-xs text-rose-800/80">
                        Hubungi admin KarirConnect untuk informasi lebih lanjut atau peninjauan ulang.
                    </p>
                </div>
            </div>
        );
    }

    // A verified company is approved by the same admin review, so it has full
    // recruiter access even if its status column still reads "pending".
    if (status === 'approved' || verificationStatus === 'verified') {
        return null;
    }

    return (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/60 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-amber-800">
                <Clock className="size-5" />
            </span>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-bold text-amber-900">Perusahaan menunggu persetujuan admin</p>
                <p className="text-xs text-amber-800/80">
                    Anda belum bisa posting lowongan & akses talent search hingga admin meng-approve. Estimasi review 1×24 jam.
                </p>
            </div>
            <Link
                href="/employer/company/verification"
                className="hidden shrink-0 items-center gap-1 self-start text-xs font-semibold text-amber-900 underline-offset-4 hover:underline sm:inline-flex"
            >
                Cek status <ArrowRight className="size-3.5" />
            </Link>
        </div>
    );
}
