import { Head, router, useForm } from '@inertiajs/react';
import type { RowSelectionState } from '@tanstack/react-table';
import { CloudDownload, Search, Send, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import ScrapedJobListingController from '@/actions/App/Http/Controllers/Admin/Scraper/ScrapedJobListingController';
import { DataTable } from '@/components/admin/scraper/data-table';
import {
    canPublish,
    listingColumns,
} from '@/components/admin/scraper/listing-columns';
import type { ExternalListingRow } from '@/components/admin/scraper/listing-columns';
import { PublishPanel } from '@/components/admin/scraper/publish-panel';
import { ScrapeDialog } from '@/components/admin/scraper/scrape-dialog';
import {
    applyFilters,
    FilterSelect,
    PaginationBar,
} from '@/components/admin/scraper/scraper-ui';
import type { ScrapeSources } from '@/components/admin/scraper/source-picker';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Option, Paginator } from '@/types/scraper';

type Filters = {
    status: string;
    source: string;
    category: string;
    published: string;
    search: string;
    published_from: string;
    published_to: string;
};

type Props = {
    listings: Paginator<ExternalListingRow>;
    filters: Filters;
    statusOptions: Option[];
    sourceOptions: Option[];
    categoryOptions: Option[];
    publishableCount: number;
    deletableCount: number;
    scrapeSources: ScrapeSources;
};

const PUBLISHED_OPTIONS: Option[] = [
    { value: 'no', label: 'Belum dipublish' },
    { value: 'yes', label: 'Sudah dipublish' },
];

export default function ExternalJobsIndex({
    listings,
    filters,
    statusOptions,
    sourceOptions,
    categoryOptions,
    publishableCount,
    deletableCount,
    scrapeSources,
}: Props) {
    const form = useForm<Filters>(filters);
    const indexUrl = ScrapedJobListingController.index().url;
    const hasFilters = Object.values(filters).some((value) => value !== '');
    const [selection, setSelection] = useState<RowSelectionState>({});
    const [scrapeOpen, setScrapeOpen] = useState(false);
    const [publishTarget, setPublishTarget] = useState<
        'selected' | 'all' | null
    >(null);
    const [deleting, setDeleting] = useState<ExternalListingRow | null>(null);
    const [bulkDelete, setBulkDelete] = useState<'selected' | 'all' | null>(
        null,
    );
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const columns = useMemo(
        () => listingColumns({ onDelete: setDeleting }),
        [],
    );

    const destroy = () => {
        if (!deleting) {
            return;
        }

        router.delete(ScrapedJobListingController.destroy(deleting.id).url, {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };
    const selectedIds = Object.keys(selection)
        .filter((key) => selection[key])
        .map(Number);

    const destroyMany = () => {
        if (bulkDelete === null) {
            return;
        }

        router.post(
            ScrapedJobListingController.bulkDestroy().url,
            bulkDelete === 'all'
                ? { all_matching: true, filters }
                : { listing_ids: selectedIds },
            {
                preserveScroll: true,
                onStart: () => setBulkDeleting(true),
                onSuccess: () => setSelection({}),
                onFinish: () => {
                    setBulkDeleting(false);
                    setBulkDelete(null);
                },
            },
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setSelection({});
        applyFilters(indexUrl, form.data);
    };

    const changeFilter = (key: keyof Filters, value: string) => {
        form.setData(key, value);
        setSelection({});
        applyFilters(indexUrl, { ...form.data, [key]: value });
    };

    const afterPublish = () => {
        setPublishTarget(null);
        setSelection({});
        router.reload({
            only: ['listings', 'publishableCount', 'deletableCount'],
        });
    };

    return (
        <>
            <Head title="Jobs Eksternal" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Jobs Eksternal"
                    description="Lowongan dari sumber eksternal yang diizinkan. Scrap untuk mengambil yang terbaru, lalu publish ke portal; setiap lowongan hanya bisa dipublish sekali."
                    actions={
                        <Button onClick={() => setScrapeOpen(true)}>
                            <CloudDownload className="size-4" /> Scrap
                        </Button>
                    }
                />

                <Section>
                    <div className="space-y-4">
                        <form
                            onSubmit={submit}
                            className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center"
                        >
                            <div className="relative lg:max-w-xs lg:flex-1">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    value={form.data.search}
                                    onChange={(event) =>
                                        form.setData(
                                            'search',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Cari judul, lokasi, perusahaan…"
                                />
                            </div>
                            <FilterSelect
                                value={form.data.status}
                                onChange={(value) =>
                                    changeFilter('status', value)
                                }
                                options={statusOptions}
                                allLabel="Semua status"
                            />
                            <FilterSelect
                                value={form.data.published}
                                onChange={(value) =>
                                    changeFilter('published', value)
                                }
                                options={PUBLISHED_OPTIONS}
                                allLabel="Semua publikasi"
                            />
                            <FilterSelect
                                value={form.data.source}
                                onChange={(value) =>
                                    changeFilter('source', value)
                                }
                                options={sourceOptions}
                                allLabel="Semua sumber"
                            />
                            <FilterSelect
                                value={form.data.category}
                                onChange={(value) =>
                                    changeFilter('category', value)
                                }
                                options={categoryOptions}
                                allLabel="Semua kategori"
                            />
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    aria-label="Tayang dari tanggal"
                                    title="Tayang dari tanggal"
                                    className="w-auto"
                                    value={form.data.published_from}
                                    max={form.data.published_to || undefined}
                                    onChange={(event) =>
                                        changeFilter(
                                            'published_from',
                                            event.target.value,
                                        )
                                    }
                                />
                                <span className="text-sm text-muted-foreground">
                                    s/d
                                </span>
                                <Input
                                    type="date"
                                    aria-label="Tayang sampai tanggal"
                                    title="Tayang sampai tanggal"
                                    className="w-auto"
                                    value={form.data.published_to}
                                    min={form.data.published_from || undefined}
                                    onChange={(event) =>
                                        changeFilter(
                                            'published_to',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            <Button type="submit" variant="outline">
                                Cari
                            </Button>
                            {hasFilters && (
                                <Button
                                    type="button"
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
                        </form>

                        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm text-muted-foreground">
                                {selectedIds.length > 0
                                    ? `${selectedIds.length} lowongan dipilih`
                                    : `${publishableCount} lowongan aktif belum dipublish sesuai filter`}
                            </span>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    disabled={selectedIds.length === 0}
                                    onClick={() => setBulkDelete('selected')}
                                >
                                    <Trash2 className="size-4" /> Hapus terpilih
                                    ({selectedIds.length})
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    disabled={deletableCount === 0}
                                    onClick={() => setBulkDelete('all')}
                                >
                                    <Trash2 className="size-4" /> Hapus semua (
                                    {deletableCount})
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={selectedIds.length === 0}
                                    onClick={() => setPublishTarget('selected')}
                                >
                                    <Send className="size-4" /> Publish terpilih
                                    ({selectedIds.length})
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={publishableCount === 0}
                                    onClick={() => setPublishTarget('all')}
                                >
                                    <Send className="size-4" /> Publish semua (
                                    {publishableCount})
                                </Button>
                            </div>
                        </div>

                        {listings.data.length === 0 ? (
                            <EmptyState
                                bare
                                icon={CloudDownload}
                                title={
                                    hasFilters
                                        ? 'Tidak ada lowongan yang cocok'
                                        : 'Belum ada lowongan eksternal'
                                }
                                description={
                                    hasFilters
                                        ? 'Ubah atau reset filter.'
                                        : 'Klik Scrap untuk mengambil lowongan dari sumber yang aktif.'
                                }
                                actions={
                                    !hasFilters && (
                                        <Button
                                            onClick={() => setScrapeOpen(true)}
                                        >
                                            <CloudDownload className="size-4" />{' '}
                                            Scrap
                                        </Button>
                                    )
                                }
                            />
                        ) : (
                            <DataTable
                                columns={columns}
                                data={listings.data}
                                getRowId={(row) => String(row.id)}
                                rowSelection={selection}
                                onRowSelectionChange={setSelection}
                                canSelect={canPublish}
                                minWidth={1040}
                            />
                        )}

                        <PaginationBar paginator={listings} noun="lowongan" />
                    </div>
                </Section>
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus lowongan ini?"
                description={
                    deleting
                        ? `"${deleting.title}" dihapus dari Jobs Eksternal${deleting.published_job ? ' beserta lowongannya di portal (hanya bila belum ada pelamar)' : ''}. Jika lowongan ini masih ada di sumbernya, crawl berikutnya akan mengambilnya lagi — pakai Sembunyikan di halaman detail agar tidak muncul lagi.`
                        : ''
                }
                confirmLabel="Hapus"
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={destroy}
            />

            <ConfirmDialog
                open={bulkDelete !== null}
                onOpenChange={(open) => !open && setBulkDelete(null)}
                title={
                    bulkDelete === 'all'
                        ? `Hapus ${deletableCount} lowongan?`
                        : `Hapus ${selectedIds.length} lowongan terpilih?`
                }
                description={
                    bulkDelete === 'all'
                        ? `${hasFilters ? 'Semua lowongan yang cocok dengan filter saat ini' : 'Semua lowongan'} dihapus dari Jobs Eksternal, termasuk lowongan portalnya bila sudah dipublish. Lowongan yang sudah dilamar kandidat tetap disimpan. Scrap ulang akan mengambil lowongan yang masih ada di sumbernya.`
                        : 'Lowongan terpilih dihapus dari Jobs Eksternal, termasuk lowongan portalnya bila sudah dipublish. Lowongan yang sudah dilamar kandidat tetap disimpan. Scrap ulang akan mengambil lowongan yang masih ada di sumbernya.'
                }
                confirmLabel="Hapus"
                loading={bulkDeleting}
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={destroyMany}
            />

            <ScrapeDialog
                key={scrapeOpen ? 'open' : 'closed'}
                open={scrapeOpen}
                onOpenChange={setScrapeOpen}
                sources={scrapeSources}
            />

            <Dialog
                open={publishTarget !== null}
                onOpenChange={(open) => !open && setPublishTarget(null)}
            >
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>
                            {publishTarget === 'all'
                                ? `Publish semua (${publishableCount})`
                                : `Publish ${selectedIds.length} lowongan terpilih`}
                        </DialogTitle>
                        <DialogDescription>
                            Lowongan menjadi job publik dengan nama dan logo
                            perusahaannya.
                        </DialogDescription>
                    </DialogHeader>
                    {publishTarget !== null && (
                        <PublishPanel
                            target={
                                publishTarget === 'all'
                                    ? {
                                          allMatching: true,
                                          filters,
                                          count: publishableCount,
                                      }
                                    : { listingIds: selectedIds }
                            }
                            onPublished={afterPublish}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

ExternalJobsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Jobs Eksternal',
            href: ScrapedJobListingController.index().url,
        },
    ],
};
