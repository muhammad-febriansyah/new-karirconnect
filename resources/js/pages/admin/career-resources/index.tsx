import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    BookOpen,
    CalendarClock,
    Eye,
    Pencil,
    Plus,
    Search,
    Timer,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import CareerResourceController from '@/actions/App/Http/Controllers/Admin/CareerResourceController';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/format-date';

type Status = 'draft' | 'scheduled' | 'live';

type Item = {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    category: string | null;
    reading_minutes: number;
    views_count: number;
    published_at: string | null;
    thumbnail_url: string | null;
    author: string | null;
    status: Status;
};

type Paginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Props = {
    items: Paginator<Item>;
    filters: { search: string; status: string; category: string };
    categoryOptions: string[];
    statusCounts: {
        all: number;
        live: number;
        scheduled: number;
        draft: number;
    };
};

const STATUS_LABEL: Record<Status, string> = {
    draft: 'Draft',
    scheduled: 'Terjadwal',
    live: 'Tayang',
};

function StatusBadge({ status }: { status: Status }) {
    // Scheduled articles are published rows that are not on the site yet, so a
    // two-state badge would show them as live and hide the mistake.
    if (status === 'scheduled') {
        return (
            <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <CalendarClock className="size-3" /> Terjadwal
            </Badge>
        );
    }

    return (
        <Badge variant={status === 'live' ? 'default' : 'secondary'}>
            {STATUS_LABEL[status]}
        </Badge>
    );
}

export default function CareerResourceIndex({
    items,
    filters,
    categoryOptions,
    statusCounts,
}: Props) {
    const [deleting, setDeleting] = useState<Item | null>(null);
    const deleteForm = useForm({});

    const form = useForm({
        search: filters.search,
        status: filters.status,
        category: filters.category,
    });

    const hasActiveFilter =
        filters.search !== '' ||
        filters.status !== '' ||
        filters.category !== '';

    const submit = (event: FormEvent) => {
        event.preventDefault();

        // The page number is dropped on purpose so a new search lands on page 1.
        form.get(CareerResourceController.index().url, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        router.get(
            CareerResourceController.index().url,
            {},
            { preserveScroll: true, replace: true },
        );
    };

    /** Status chips double as counts, so the split is visible without filtering. */
    const applyStatus = (status: string) => {
        form.setData('status', status);
        router.get(
            CareerResourceController.index().url,
            { search: form.data.search, category: form.data.category, status },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Career Resources" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Career Resources"
                    description="Kelola artikel, panduan, dan materi publik untuk kandidat."
                    actions={
                        <ActionButton asChild intent="create">
                            <Link href={CareerResourceController.create().url}>
                                <Plus className="size-4" /> Tambah Resource
                            </Link>
                        </ActionButton>
                    }
                />

                <Section>
                    <div className="space-y-4">
                        <form
                            onSubmit={submit}
                            className="grid gap-3 md:grid-cols-[1fr_200px_auto]"
                        >
                            <Input
                                value={form.data.search}
                                onChange={(event) =>
                                    form.setData('search', event.target.value)
                                }
                                placeholder="Cari judul, slug, atau kategori..."
                                aria-label="Cari artikel"
                            />
                            <Select
                                value={form.data.category || 'all'}
                                onValueChange={(value) =>
                                    form.setData(
                                        'category',
                                        value === 'all' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger aria-label="Kategori">
                                    <SelectValue placeholder="Semua kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Semua kategori
                                    </SelectItem>
                                    {categoryOptions.map((category) => (
                                        <SelectItem
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    <Search className="size-4" /> Cari
                                </Button>
                                {hasActiveFilter && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={resetFilters}
                                    >
                                        <X className="size-4" /> Reset
                                    </Button>
                                )}
                            </div>
                        </form>

                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    ['', 'Semua', statusCounts.all],
                                    ['live', 'Tayang', statusCounts.live],
                                    [
                                        'scheduled',
                                        'Terjadwal',
                                        statusCounts.scheduled,
                                    ],
                                    ['draft', 'Draft', statusCounts.draft],
                                ] as Array<[string, string, number]>
                            ).map(([value, label, count]) => (
                                <Button
                                    key={label}
                                    type="button"
                                    size="sm"
                                    variant={
                                        filters.status === value
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => applyStatus(value)}
                                >
                                    {label}
                                    <span className="ml-1 tabular-nums opacity-70">
                                        {count}
                                    </span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </Section>

                <Section
                    title={
                        items.total === 0
                            ? 'Tidak ada artikel'
                            : `${items.from ?? 0}–${items.to ?? 0} dari ${items.total} artikel`
                    }
                >
                    {items.data.length === 0 ? (
                        <EmptyState
                            bare
                            icon={BookOpen}
                            title={
                                hasActiveFilter
                                    ? 'Tidak ada artikel yang cocok'
                                    : 'Belum ada resource'
                            }
                            description={
                                hasActiveFilter
                                    ? 'Coba ubah kata kunci atau kosongkan filternya.'
                                    : 'Tambahkan resource pertama untuk mulai menampilkan artikel karier ke halaman publik.'
                            }
                            actions={
                                hasActiveFilter ? (
                                    <Button
                                        variant="outline"
                                        onClick={resetFilters}
                                    >
                                        <X className="size-4" /> Reset filter
                                    </Button>
                                ) : (
                                    <ActionButton asChild intent="create">
                                        <Link
                                            href={
                                                CareerResourceController.create()
                                                    .url
                                            }
                                        >
                                            <Plus className="size-4" /> Tambah
                                            Resource
                                        </Link>
                                    </ActionButton>
                                )
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {items.data.map((item) => (
                                    <article
                                        key={item.id}
                                        className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-md"
                                    >
                                        {item.thumbnail_url ? (
                                            <img
                                                src={item.thumbnail_url}
                                                alt=""
                                                className="h-36 w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-36 w-full items-center justify-center bg-muted">
                                                <BookOpen className="size-8 text-muted-foreground/50" />
                                            </div>
                                        )}

                                        <div className="flex flex-1 flex-col gap-3 p-4">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <StatusBadge
                                                    status={item.status}
                                                />
                                                {item.category && (
                                                    <Badge variant="outline">
                                                        {item.category}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <Link
                                                    href={
                                                        CareerResourceController.edit(
                                                            item.id,
                                                        ).url
                                                    }
                                                    className="line-clamp-2 font-semibold hover:underline"
                                                >
                                                    {item.title}
                                                </Link>
                                                <p className="font-mono text-xs text-muted-foreground">
                                                    {item.slug}
                                                </p>
                                            </div>

                                            <p className="line-clamp-3 text-sm text-muted-foreground">
                                                {item.excerpt}
                                            </p>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Eye className="size-3.5 shrink-0" />
                                                    {item.views_count} views
                                                </span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Timer className="size-3.5 shrink-0" />
                                                    {item.reading_minutes} menit
                                                </span>
                                            </div>

                                            <p className="text-xs text-muted-foreground">
                                                {item.published_at
                                                    ? `${item.status === 'scheduled' ? 'Terbit ' : ''}${formatDateTime(item.published_at)}`
                                                    : 'Belum dipublikasikan'}
                                                {item.author
                                                    ? ` · ${item.author}`
                                                    : ''}
                                            </p>

                                            <ActionGroup className="mt-auto pt-1">
                                                <ActionButton
                                                    asChild
                                                    type="button"
                                                    intent="edit"
                                                >
                                                    <Link
                                                        href={
                                                            CareerResourceController.edit(
                                                                item.id,
                                                            ).url
                                                        }
                                                    >
                                                        <Pencil className="size-4" />{' '}
                                                        Ubah
                                                    </Link>
                                                </ActionButton>
                                                <ActionButton
                                                    type="button"
                                                    intent="delete"
                                                    onClick={() =>
                                                        setDeleting(item)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />{' '}
                                                    Hapus
                                                </ActionButton>
                                            </ActionGroup>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {items.last_page > 1 && (
                                <div className="flex flex-col gap-2 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                    <span>
                                        Halaman {items.current_page} dari{' '}
                                        {items.last_page}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {items.links.map((link) => (
                                            <Button
                                                key={link.label}
                                                size="sm"
                                                variant={
                                                    link.active
                                                        ? 'default'
                                                        : 'ghost'
                                                }
                                                disabled={!link.url}
                                                onClick={() =>
                                                    link.url &&
                                                    router.visit(link.url, {
                                                        preserveScroll: true,
                                                        preserveState: true,
                                                    })
                                                }
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Section>
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus resource?"
                description={
                    deleting
                        ? `Resource "${deleting.title}" akan dihapus permanen dari sistem.`
                        : ''
                }
                confirmLabel="Hapus"
                confirmIcon={Trash2}
                variant="destructive"
                onConfirm={() => {
                    if (!deleting) {
                        return;
                    }

                    deleteForm.delete(
                        CareerResourceController.destroy(deleting.id).url,
                        {
                            preserveScroll: true,
                            onFinish: () => setDeleting(null),
                        },
                    );
                }}
            />
        </>
    );
}

CareerResourceIndex.layout = {
    breadcrumbs: [
        {
            title: 'Career Resources',
            href: CareerResourceController.index().url,
        },
    ],
};
