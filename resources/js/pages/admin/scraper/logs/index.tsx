import { Head, router } from '@inertiajs/react';
import { ScrollText, X } from 'lucide-react';
import CrawlErrorController from '@/actions/App/Http/Controllers/Admin/Scraper/CrawlErrorController';
import { ErrorTable } from '@/components/admin/scraper/error-table';
import {
    applyFilters,
    ErrorCategoryBadge,
    FilterSelect,
    PaginationBar,
} from '@/components/admin/scraper/scraper-ui';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import type { ErrorRow, Option, Paginator } from '@/types/scraper';

type Filters = { category: string; source: string; run: string };

type Props = {
    logs: Paginator<ErrorRow>;
    filters: Filters;
    categoryOptions: Option[];
    sourceOptions: Option[];
    categoryCounts: Record<string, number>;
};

export default function CrawlLogsIndex({
    logs,
    filters,
    categoryOptions,
    sourceOptions,
    categoryCounts,
}: Props) {
    const indexUrl = CrawlErrorController.index().url;
    const hasFilters = Object.values(filters).some((value) => value !== '');
    const counted = categoryOptions.filter(
        (option) => (categoryCounts[option.value] ?? 0) > 0,
    );

    return (
        <>
            <Head title="Log Crawl" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Log Crawl"
                    description="Error dan peringatan dari setiap crawl. Baris pudar adalah masalah tidak fatal, misalnya halaman profil perusahaan yang gagal dibaca."
                />

                {counted.length > 0 && (
                    <Section title="7 hari terakhir">
                        <div className="flex flex-wrap gap-2">
                            {counted.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                        applyFilters(indexUrl, {
                                            ...filters,
                                            category: option.value,
                                        })
                                    }
                                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                                >
                                    <ErrorCategoryBadge
                                        category={option.value}
                                        label={option.label}
                                    />
                                    <span className="font-semibold tabular-nums">
                                        {categoryCounts[option.value]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Section>
                )}

                <Section>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <FilterSelect
                                value={filters.category}
                                onChange={(value) =>
                                    applyFilters(indexUrl, {
                                        ...filters,
                                        category: value,
                                    })
                                }
                                options={categoryOptions}
                                allLabel="Semua kategori"
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
                            {filters.run !== '' && (
                                <span className="text-sm text-muted-foreground">
                                    Crawl #{filters.run}
                                </span>
                            )}
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

                        {logs.data.length === 0 ? (
                            <EmptyState
                                bare
                                icon={ScrollText}
                                title={
                                    hasFilters
                                        ? 'Tidak ada log yang cocok'
                                        : 'Belum ada log'
                                }
                                description={
                                    hasFilters
                                        ? 'Ubah atau reset filter.'
                                        : 'Semua crawl sejauh ini berjalan tanpa error.'
                                }
                            />
                        ) : (
                            <ErrorTable errors={logs.data} />
                        )}

                        <PaginationBar paginator={logs} noun="log" />
                    </div>
                </Section>
            </div>
        </>
    );
}

CrawlLogsIndex.layout = {
    breadcrumbs: [
        { title: 'Log Crawl', href: CrawlErrorController.index().url },
    ],
};
