import { Head, Link, router, useForm } from '@inertiajs/react';
import { Pencil, Play, Plus, Radar, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import CrawlRunController from '@/actions/App/Http/Controllers/Admin/Scraper/CrawlRunController';
import JobSourceController from '@/actions/App/Http/Controllers/Admin/Scraper/JobSourceController';
import {
    applyFilters,
    FilterSelect,
    formatInterval,
    PaginationBar,
    ToneBadge,
} from '@/components/admin/scraper/scraper-ui';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import type {
    Option,
    Paginator,
    RunRow,
    SourceRef,
    Tone,
} from '@/types/scraper';

type SourceRow = SourceRef & {
    base_url: string;
    status: string;
    status_label: string;
    status_tone: Tone;
    circuit_state: string;
    circuit_label: string;
    cooldown_until: string | null;
    schedule_minutes: number;
    last_run_at: string | null;
    last_success_at: string | null;
    listings_active_count: number;
    latest_run: RunRow | null;
    can_run: boolean;
};

type Props = {
    sources: Paginator<SourceRow>;
    filters: { status: string; type: string; search: string };
    statusOptions: Option[];
    typeOptions: Option[];
};

export default function JobSourcesIndex({
    sources,
    filters,
    statusOptions,
    typeOptions,
}: Props) {
    const form = useForm(filters);
    const [deleting, setDeleting] = useState<SourceRow | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const hasFilters =
        filters.status !== '' || filters.type !== '' || filters.search !== '';
    const indexUrl = JobSourceController.index().url;

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        applyFilters(indexUrl, form.data);
    };

    const changeFilter = (key: 'status' | 'type', value: string) => {
        form.setData(key, value);
        applyFilters(indexUrl, { ...form.data, [key]: value });
    };

    const runNow = (source: SourceRow) => {
        setBusyId(source.id);
        router.post(
            JobSourceController.run(source.id).url,
            {},
            { preserveScroll: true, onFinish: () => setBusyId(null) },
        );
    };

    const destroy = () => {
        if (!deleting) {
            return;
        }

        router.delete(JobSourceController.destroy(deleting.id).url, {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <>
            <Head title="Sumber Lowongan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Sumber Lowongan"
                    description="Sumber eksternal yang di-crawl. Hanya sumber berstatus Aktif yang dijalankan; platform tanpa izin tetap Menunggu Izin."
                    actions={
                        <Button asChild>
                            <Link href={JobSourceController.create().url}>
                                <Plus className="size-4" /> Tambah Sumber
                            </Link>
                        </Button>
                    }
                />

                <Section>
                    <div className="space-y-4">
                        <form
                            onSubmit={submitSearch}
                            className="flex flex-col gap-2 sm:flex-row sm:items-center"
                        >
                            <div className="relative sm:max-w-sm sm:flex-1">
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
                                    placeholder="Cari nama, slug, atau URL…"
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
                                value={form.data.type}
                                onChange={(value) =>
                                    changeFilter('type', value)
                                }
                                options={typeOptions}
                                allLabel="Semua tipe"
                            />
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

                        {sources.data.length === 0 ? (
                            <EmptyState
                                bare
                                icon={Radar}
                                title={
                                    hasFilters
                                        ? 'Tidak ada sumber yang cocok'
                                        : 'Belum ada sumber lowongan'
                                }
                                description={
                                    hasFilters
                                        ? 'Ubah atau reset filter pencarian.'
                                        : 'Mulai dari API resmi seperti Greenhouse Job Board atau Lever Postings.'
                                }
                            />
                        ) : (
                            <div className="overflow-x-auto rounded-md border">
                                <Table className="min-w-[960px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sumber</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Jadwal</TableHead>
                                            <TableHead>
                                                Crawl terakhir
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Lowongan aktif
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Aksi
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sources.data.map((source) => (
                                            <TableRow key={source.id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {source.name}
                                                    </div>
                                                    <div
                                                        className="max-w-[280px] truncate text-xs text-muted-foreground"
                                                        title={source.base_url}
                                                    >
                                                        {source.type_label} ·{' '}
                                                        {source.base_url}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        <ToneBadge
                                                            tone={
                                                                source.status_tone
                                                            }
                                                        >
                                                            {
                                                                source.status_label
                                                            }
                                                        </ToneBadge>
                                                        {source.circuit_state !==
                                                            'closed' && (
                                                            <ToneBadge tone="destructive">
                                                                Circuit{' '}
                                                                {
                                                                    source.circuit_label
                                                                }
                                                            </ToneBadge>
                                                        )}
                                                        {source.cooldown_until && (
                                                            <ToneBadge tone="warning">
                                                                Jeda
                                                            </ToneBadge>
                                                        )}
                                                    </div>
                                                    {source.cooldown_until && (
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            sampai{' '}
                                                            {formatDateTime(
                                                                source.cooldown_until,
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    tiap{' '}
                                                    {formatInterval(
                                                        source.schedule_minutes,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {source.latest_run ? (
                                                        <Link
                                                            href={
                                                                CrawlRunController.show(
                                                                    source
                                                                        .latest_run
                                                                        .id,
                                                                ).url
                                                            }
                                                            className="space-y-1"
                                                        >
                                                            <ToneBadge
                                                                tone={
                                                                    source
                                                                        .latest_run
                                                                        .status_tone
                                                                }
                                                            >
                                                                {
                                                                    source
                                                                        .latest_run
                                                                        .status_label
                                                                }
                                                            </ToneBadge>
                                                            <div className="text-xs text-muted-foreground">
                                                                {formatDateTime(
                                                                    source
                                                                        .latest_run
                                                                        .created_at,
                                                                )}
                                                            </div>
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            Belum pernah
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {
                                                        source.listings_active_count
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <ActionGroup className="justify-end">
                                                        <ActionButton
                                                            intent="approve"
                                                            disabled={
                                                                !source.can_run ||
                                                                busyId ===
                                                                    source.id
                                                            }
                                                            title={
                                                                source.can_run
                                                                    ? 'Jalankan crawl sekarang'
                                                                    : 'Hanya sumber aktif yang tidak sedang jeda yang bisa dijalankan'
                                                            }
                                                            onClick={() =>
                                                                runNow(source)
                                                            }
                                                        >
                                                            <Play className="size-4" />{' '}
                                                            Jalankan
                                                        </ActionButton>
                                                        <ActionButton
                                                            asChild
                                                            intent="edit"
                                                        >
                                                            <Link
                                                                href={
                                                                    JobSourceController.edit(
                                                                        source.id,
                                                                    ).url
                                                                }
                                                            >
                                                                <Pencil className="size-4" />{' '}
                                                                Ubah
                                                            </Link>
                                                        </ActionButton>
                                                        <ActionButton
                                                            intent="delete"
                                                            onClick={() =>
                                                                setDeleting(
                                                                    source,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />{' '}
                                                            Hapus
                                                        </ActionButton>
                                                    </ActionGroup>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        <PaginationBar paginator={sources} noun="sumber" />
                    </div>
                </Section>
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus sumber lowongan?"
                description={
                    deleting
                        ? `"${deleting.name}" tidak akan di-crawl lagi. Lowongan, profil perusahaan, dan riwayat crawl-nya tetap tersimpan.`
                        : ''
                }
                confirmLabel="Hapus sumber"
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={destroy}
            />
        </>
    );
}

JobSourcesIndex.layout = {
    breadcrumbs: [
        { title: 'Sumber Lowongan', href: JobSourceController.index().url },
    ],
};
