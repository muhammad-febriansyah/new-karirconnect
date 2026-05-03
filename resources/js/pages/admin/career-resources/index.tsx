import { Head, Link, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import CareerResourceController from '@/actions/App/Http/Controllers/Admin/CareerResourceController';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

type Item = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    thumbnail_path: string | null;
    category: string | null;
    tags: string[];
    reading_minutes: number;
    is_published: boolean;
    published_at: string | null;
    views_count: number;
    author?: { name?: string | null } | null;
};

type Props = { items: Item[] };

export default function CareerResourceIndex({ items }: Props) {
    const [deleting, setDeleting] = useState<Item | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const form = useForm({});

    const columns = useMemo<ColumnDef<Item>[]>(() => [
        {
            accessorKey: 'title',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Judul
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-semibold">{row.original.title}</div>
                    <div className="text-xs text-muted-foreground">{row.original.slug}</div>
                    <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">{row.original.excerpt || row.original.body.replace(/<[^>]+>/g, ' ')}</p>
                </div>
            ),
        },
        { accessorKey: 'category', header: 'Kategori', cell: ({ row }) => row.original.category ? <Badge variant="outline">{row.original.category}</Badge> : '-' },
        { accessorKey: 'is_published', header: 'Status', cell: ({ row }) => <Badge variant={row.original.is_published ? 'default' : 'secondary'}>{row.original.is_published ? 'Published' : 'Draft'}</Badge> },
        { accessorKey: 'views_count', header: 'Views' },
        { accessorKey: 'reading_minutes', header: 'Durasi', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.reading_minutes} menit</span> },
        { accessorKey: 'published_at', header: 'Publikasi', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.published_at ? formatDateTime(row.original.published_at) : 'Belum dipublikasikan'}</span> },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <ActionGroup className="justify-end">
                    <ActionButton asChild type="button" intent="edit">
                        <Link href={CareerResourceController.edit(row.original.id).url}><Pencil className="size-4" /> Ubah</Link>
                    </ActionButton>
                    <ActionButton type="button" intent="delete" onClick={() => setDeleting(row.original)}><Trash2 className="size-4" /> Hapus</ActionButton>
                </ActionGroup>
            ),
        },
    ], []);

    const table = useReactTable({
        data: items,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.title, row.original.slug, row.original.excerpt, row.original.body, row.original.category]
                .filter(Boolean).join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Career Resources" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Career Resources"
                    description="Kelola artikel, panduan, dan materi publik untuk kandidat."
                    actions={(
                        <ActionButton asChild intent="create">
                            <Link href={CareerResourceController.create().url}>
                                <Plus className="size-4" /> Tambah Resource
                            </Link>
                        </ActionButton>
                    )}
                />

                <Section>
                    {items.length === 0 ? (
                        <EmptyState
                            title="Belum ada resource"
                            description="Tambahkan resource pertama untuk mulai menampilkan artikel karier ke halaman publik."
                            actions={(
                                <ActionButton asChild intent="create">
                                    <Link href={CareerResourceController.create().url}>
                                        <Plus className="size-4" /> Tambah Resource
                                    </Link>
                                </ActionButton>
                            )}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input placeholder="Cari judul, slug, kategori" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="sm:max-w-sm" />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline">Kolom <ChevronDown className="ml-2 size-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                                            <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}>
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="rounded-md border">
                                <Table className="min-w-[1100px]">
                                    <TableHeader>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                <span>Menampilkan {table.getRowModel().rows.length} dari {items.length} data</span>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Sebelumnya</Button>
                                    <span className="text-xs">Halaman {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
                                    <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Berikutnya</Button>
                                </div>
                            </div>
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

                    form.delete(CareerResourceController.destroy(deleting.id).url, {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    });
                }}
            />
        </>
    );
}

CareerResourceIndex.layout = {
    breadcrumbs: [{ title: 'Career Resources', href: CareerResourceController.index().url }],
};
