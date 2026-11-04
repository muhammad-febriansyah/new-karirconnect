import { Head, Link, router, usePoll } from '@inertiajs/react';
import { Activity, Eye, Loader2, X } from 'lucide-react';
import { useEffect } from 'react';
import CrawlRunController from '@/actions/App/Http/Controllers/Admin/Scraper/CrawlRunController';
import {
    applyFilters,
    FilterSelect,
    formatDuration,
    PaginationBar,
    ToneBadge,
} from '@/components/admin/scraper/scraper-ui';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import type { Option, Paginator, RunRow } from '@/types/scraper';

type Filters = { status: string; source: string };

type Props = {
    runs: Paginator<RunRow>;
    filters: Filters;
    statusOptions: Option[];
    sourceOptions: Option[];
    hasActiveRuns: boolean;
};

export default function CrawlRunsIndex({
    runs,
    filters,
    statusOptions,
    sourceOptions,
    hasActiveRuns,
}: Props) {
    const indexUrl = CrawlRunController.index().url;
    const hasFilters = filters.status !== '' || filters.source !== '';

    // Refresh only while something is queued or running.
    const { start, stop } = usePoll(
        5000,
        { only: ['runs', 'hasActiveRuns'] },
        { autoStart: false },
    );
    useEffect(() => {
        if (hasActiveRuns) {
            start();
        } else {
            stop();
        }

        return stop;
    }, [hasActiveRuns, start, stop]);

    return (
        <>
            <Head title="Monitoring Crawl" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Monitoring Crawl"
                    description="Riwayat setiap crawl: hasil, engine yang dipakai, dan jumlah lowongan."
                    actions={
                        hasActiveRuns ? (
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" /> Ada
                                crawl berjalan, diperbarui otomatis
                            </span>
                        ) : undefined
                    }
                />

                <Section>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <FilterSelect
                                value={filters.status}
                                onChange={(value) =>
                                    applyFilters(indexUrl, {
                                        ...filters,
                                        status: value,
                                    })
                                }
                                options={statusOptions}
                                allLabel="Semua status"
                            />
                            <FilterSelect
                                value={filters.source}
                                onChange={(value) =>
                                    applyFilters(indexUrl, {
                                        ...filters,
                                        source: value,
                                    })
                                }
                                options={sourceOptions}
                                allLabel="Semua sumber"
                            />
                            {hasFilters && (
                                <Button
                                    variant="ghost"
                                    onClick={() =>
                                        router.get(
                                            indexUrl,
                                            {},
                                            { replace: true },
                                        )
                                    }
                                >
                                    <X className="size-4" /> Reset
                                </Button>
                            )}
                        </div>

                        {runs.data.length === 0 ? (
                            <EmptyState
                                bare
                                icon={Activity}
                                title={
                                    hasFilters
                                        ? 'Tidak ada crawl yang cocok'
                                        : 'Belum ada crawl'
                                }
                                description={
                                    hasFilters
                                        ? 'Ubah atau reset filter.'
                                        : 'Crawl muncul di sini setelah dijalankan dari Sumber Lowongan atau oleh jadwal.'
                                }
                            />
                        ) : (
                            <div className="overflow-x-auto rounded-md border">
                                <Table className="min-w-[900px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sumber</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">
                                                Ditemukan
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Baru / diperbarui
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Ditolak
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Error
                                            </TableHead>
                                            <TableHead>Durasi</TableHead>
                                            <TableHead className="text-right">
                                                Aksi
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {runs.data.map((run) => (
                                            <TableRow key={run.id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {run.source?.name ??
                                                            'Sumber dihapus'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDateTime(
                                                            run.created_at,
                                                        )}{' '}
                                                        · {run.trigger_label}
                                                        {run.triggered_by &&
                                                            ` oleh ${run.triggered_by}`}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        {!run.is_finished && (
                                                            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                                                        )}
                                                        <ToneBadge
                                                            tone={
                                                                run.status_tone
                                                            }
                                                        >
                                                            {run.status_label}
                                                        </ToneBadge>
                                                    </div>
                                                    {run.engine_used && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            engine:{' '}
                                                            {run.engine_used}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {run.items_found}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {run.items_created} /{' '}
                                                    {run.items_updated}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {run.items_rejected}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {run.errors_count ?? 0}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDuration(
                                                        run.duration_ms,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <ActionButton
                                                        asChild
                                                        intent="detail"
                                                    >
                                                        <Link
                                                            href={
                                                                CrawlRunController.show(
                                                                    run.id,
                                                                ).url
                                                            }
                                                        >
                                                            <Eye className="size-4" />{' '}
                                                            Detail
                                                        </Link>
                                                    </ActionButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        <PaginationBar paginator={runs} noun="crawl" />
                    </div>
                </Section>
            </div>
        </>
    );
}

CrawlRunsIndex.layout = {
    breadcrumbs: [
        { title: 'Monitoring Crawl', href: CrawlRunController.index().url },
    ],
};
