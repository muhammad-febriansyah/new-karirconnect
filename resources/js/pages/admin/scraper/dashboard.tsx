import { Deferred, Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Building2,
    CircleAlert,
    CloudDownload,
    Plus,
    Radar,
    ShieldCheck,
} from 'lucide-react';
import CrawlErrorController from '@/actions/App/Http/Controllers/Admin/Scraper/CrawlErrorController';
import CrawlRunController from '@/actions/App/Http/Controllers/Admin/Scraper/CrawlRunController';
import JobSourceController from '@/actions/App/Http/Controllers/Admin/Scraper/JobSourceController';
import ScrapedJobListingController from '@/actions/App/Http/Controllers/Admin/Scraper/ScrapedJobListingController';
import ScraperDashboardController from '@/actions/App/Http/Controllers/Admin/Scraper/ScraperDashboardController';
import {
    formatDuration,
    StatCard,
    ToneBadge,
} from '@/components/admin/scraper/scraper-ui';
import { ApexChart } from '@/components/charts/apex-chart';
import { brandChartDefaults } from '@/components/charts/chart-theme';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format-date';
import type { RunRow, SourceRef } from '@/types/scraper';

type Stats = {
    sources_active: number;
    sources_pending: number;
    sources_disabled: number;
    listings_active: number;
    listings_stale: number;
    listings_total: number;
    companies: number;
    companies_with_logo: number;
    runs_24h: number;
    runs_failed_24h: number;
    runs_active: number;
    errors_24h: number;
};

type AttentionSource = SourceRef & {
    circuit_state: string;
    circuit_label: string;
    cooldown_until: string | null;
    consecutive_failures: number;
    last_run: RunRow | null;
};

type ActivityChart = {
    days: string[];
    succeeded: number[];
    partial: number[];
    failed: number[];
    items: number[];
};

type Props = {
    stats: Stats;
    recentRuns: RunRow[];
    attention?: AttentionSource[];
    activity?: ActivityChart;
};

export default function ScraperDashboard({
    stats,
    recentRuns,
    attention,
    activity,
}: Props) {
    const isEmpty =
        stats.sources_active +
            stats.sources_pending +
            stats.sources_disabled ===
        0;

    return (
        <>
            <Head title="Ringkasan Scraper" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Ringkasan Scraper"
                    description="Kondisi sumber lowongan eksternal, hasil crawl, dan masalah yang perlu ditangani."
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link href={CrawlRunController.index().url}>
                                    <Activity className="size-4" /> Monitoring
                                    Crawl
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={JobSourceController.create().url}>
                                    <Plus className="size-4" /> Tambah Sumber
                                </Link>
                            </Button>
                        </>
                    }
                />

                {isEmpty ? (
                    <EmptyState
                        icon={Radar}
                        title="Belum ada sumber lowongan"
                        description="Tambahkan sumber resmi seperti Greenhouse Job Board atau Lever Postings untuk mulai mengumpulkan lowongan."
                        actions={
                            <Button asChild>
                                <Link href={JobSourceController.create().url}>
                                    <Plus className="size-4" /> Tambah Sumber
                                </Link>
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                icon={Radar}
                                label="Sumber aktif"
                                value={stats.sources_active}
                                hint={`${stats.sources_pending} menunggu izin · ${stats.sources_disabled} nonaktif`}
                            />
                            <StatCard
                                icon={CloudDownload}
                                label="Lowongan aktif"
                                value={stats.listings_active}
                                hint={`${stats.listings_stale} tidak terlihat lagi · ${stats.listings_total} total`}
                                tone="success"
                            />
                            <StatCard
                                icon={Building2}
                                label="Perusahaan"
                                value={stats.companies}
                                hint={`${stats.companies_with_logo} dengan logo tersimpan`}
                            />
                            <StatCard
                                icon={
                                    stats.runs_failed_24h > 0
                                        ? AlertTriangle
                                        : ShieldCheck
                                }
                                label="Crawl 24 jam"
                                value={stats.runs_24h}
                                hint={`${stats.runs_failed_24h} gagal · ${stats.errors_24h} log error · ${stats.runs_active} berjalan`}
                                tone={
                                    stats.runs_failed_24h > 0
                                        ? 'danger'
                                        : 'default'
                                }
                            />
                        </div>

                        <div className="grid gap-6 xl:grid-cols-3">
                            <Section
                                title="Aktivitas 14 hari"
                                description="Jumlah crawl per hari menurut hasilnya."
                                className="xl:col-span-2"
                            >
                                <Deferred
                                    data="activity"
                                    fallback={
                                        <Skeleton className="h-[280px] w-full" />
                                    }
                                >
                                    <ActivityChartView activity={activity} />
                                </Deferred>
                            </Section>

                            <Section
                                title="Perlu perhatian"
                                description="Sumber aktif yang sedang jeda, terputus, atau crawl terakhirnya tidak berhasil."
                            >
                                <Deferred
                                    data="attention"
                                    fallback={
                                        <div className="space-y-2">
                                            {Array.from({ length: 3 }).map(
                                                (_, index) => (
                                                    <Skeleton
                                                        key={index}
                                                        className="h-14 w-full"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    }
                                >
                                    <AttentionList
                                        attention={attention ?? []}
                                    />
                                </Deferred>
                            </Section>
                        </div>

                        <Section
                            title="Crawl terbaru"
                            actions={
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={CrawlRunController.index().url}>
                                        Lihat semua
                                    </Link>
                                </Button>
                            }
                        >
                            {recentRuns.length === 0 ? (
                                <EmptyState
                                    bare
                                    icon={Activity}
                                    title="Belum ada crawl"
                                    description="Jalankan crawl dari halaman Sumber Lowongan atau tunggu jadwal berikutnya."
                                />
                            ) : (
                                <ul className="divide-y">
                                    {recentRuns.map((run) => (
                                        <li key={run.id}>
                                            <Link
                                                href={
                                                    CrawlRunController.show(
                                                        run.id,
                                                    ).url
                                                }
                                                className="flex flex-col gap-1 py-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:px-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">
                                                        {run.source?.name ??
                                                            'Sumber dihapus'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDateTime(
                                                            run.created_at,
                                                        )}{' '}
                                                        · {run.trigger_label} ·{' '}
                                                        {formatDuration(
                                                            run.duration_ms,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span>
                                                        {run.items_found}{' '}
                                                        ditemukan ·{' '}
                                                        {run.items_created} baru
                                                    </span>
                                                    {(run.errors_count ?? 0) >
                                                        0 && (
                                                        <span className="inline-flex items-center gap-1 text-amber-700">
                                                            <CircleAlert className="size-3.5" />{' '}
                                                            {run.errors_count}
                                                        </span>
                                                    )}
                                                    <ToneBadge
                                                        tone={run.status_tone}
                                                    >
                                                        {run.status_label}
                                                    </ToneBadge>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>

                        <div className="flex flex-wrap gap-2 text-sm">
                            <Button variant="outline" size="sm" asChild>
                                <Link
                                    href={
                                        ScrapedJobListingController.index().url
                                    }
                                >
                                    Hasil scrape
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={CrawlErrorController.index().url}>
                                    Log crawl
                                </Link>
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

function ActivityChartView({ activity }: { activity?: ActivityChart }) {
    if (!activity) {
        return null;
    }

    const total =
        activity.succeeded.reduce((sum, value) => sum + value, 0) +
        activity.partial.reduce((sum, value) => sum + value, 0) +
        activity.failed.reduce((sum, value) => sum + value, 0);

    if (total === 0) {
        return (
            <EmptyState
                bare
                icon={Activity}
                title="Belum ada aktivitas"
                description="Grafik muncul setelah crawl pertama berjalan."
            />
        );
    }

    const defaults = brandChartDefaults();

    return (
        <ApexChart
            type="bar"
            height={280}
            series={[
                { name: 'Berhasil', data: activity.succeeded },
                { name: 'Sebagian', data: activity.partial },
                { name: 'Gagal', data: activity.failed },
            ]}
            options={{
                ...defaults,
                chart: { ...defaults.chart, stacked: true },
                colors: ['#10b981', '#f59e0b', '#ef4444'],
                xaxis: { categories: activity.days },
                yaxis: {
                    labels: {
                        formatter: (value: number) => String(Math.round(value)),
                    },
                },
                plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
                legend: { position: 'top', horizontalAlign: 'left' },
            }}
        />
    );
}

function AttentionList({ attention }: { attention: AttentionSource[] }) {
    if (attention.length === 0) {
        return (
            <EmptyState
                bare
                icon={ShieldCheck}
                title="Semua sumber sehat"
                description="Tidak ada sumber aktif yang bermasalah."
            />
        );
    }

    return (
        <ul className="space-y-2">
            {attention.map((source) => (
                <li key={source.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                        <Link
                            href={JobSourceController.edit(source.id).url}
                            className="font-medium hover:underline"
                        >
                            {source.name}
                        </Link>
                        {source.last_run && (
                            <ToneBadge tone={source.last_run.status_tone}>
                                {source.last_run.status_label}
                            </ToneBadge>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {source.cooldown_until && (
                            <>
                                Jeda sampai{' '}
                                {formatDateTime(source.cooldown_until)}.{' '}
                            </>
                        )}
                        {source.circuit_state !== 'closed' && (
                            <>
                                Circuit: {source.circuit_label} (
                                {source.consecutive_failures}× gagal).{' '}
                            </>
                        )}
                        {source.last_run && (
                            <Link
                                href={
                                    CrawlRunController.show(source.last_run.id)
                                        .url
                                }
                                className="underline"
                            >
                                Lihat crawl terakhir
                            </Link>
                        )}
                    </p>
                </li>
            ))}
        </ul>
    );
}

ScraperDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Ringkasan Scraper',
            href: ScraperDashboardController.index().url,
        },
    ],
};
