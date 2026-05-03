import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import LegalPageController from '@/actions/App/Http/Controllers/Admin/LegalPageController';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { slugify } from '@/lib/slugify';

type Item = {
    id: number;
    slug: string;
    title: string;
    body: string;
};

type Props = { items: Item[] };

const defaults = {
    slug: '',
    title: '',
    body: '',
};

export default function LegalPageIndex({ items }: Props) {
    const [editing, setEditing] = useState<Item | null>(null);
    const [deleting, setDeleting] = useState<Item | null>(null);
    const [open, setOpen] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const form = useForm(defaults);
    const [slugTouched, setSlugTouched] = useState(false);

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
                    <div className="text-sm text-muted-foreground">/{row.original.slug}</div>
                    <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">{row.original.body.replace(/<[^>]+>/g, ' ')}</p>
                </div>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <ActionGroup className="justify-end">
                    <ActionButton type="button" intent="edit" onClick={() => openFor(row.original)}><Pencil className="size-4" /> Ubah</ActionButton>
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
            return [row.original.title, row.original.slug, row.original.body].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    const openFor = (item?: Item) => {
        setEditing(item ?? null);
        setSlugTouched(Boolean(item));
        form.setData(item ? { slug: item.slug, title: item.title, body: item.body } : defaults);
        setOpen(true);
    };

    const submit = () => {
        form.transform((data) => ({
            ...data,
            ...(editing ? { _method: 'put' } : {}),
        }));
        form.post(editing ? LegalPageController.update(editing.id).url : LegalPageController.store().url, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <Head title="Halaman Legal" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Halaman Legal"
                    description="Kelola Terms, Privacy, Cookie Policy, atau halaman legal lainnya."
                    actions={<ActionButton intent="create" onClick={() => openFor()}><Plus className="size-4" /> Tambah Halaman</ActionButton>}
                />

                <Section>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Input placeholder="Cari judul, slug, konten" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="sm:max-w-sm" />
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
                            <Table className="min-w-[860px]">
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
                </Section>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Ubah Halaman Legal' : 'Tambah Halaman Legal'}</DialogTitle>
                        <DialogDescription>Slug akan dipakai sebagai URL publik, misalnya `terms` atau `privacy`.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <InputField
                                label="Judul"
                                value={form.data.title}
                                onChange={(event) => {
                                    const nextTitle = event.target.value;
                                    form.setData('title', nextTitle);

                                    if (!slugTouched) {
                                        form.setData('slug', slugify(nextTitle));
                                    }
                                }}
                                error={form.errors.title}
                                required
                            />
                            <InputField
                                label="Slug"
                                value={form.data.slug}
                                onChange={(event) => {
                                    form.setData('slug', event.target.value);
                                    setSlugTouched(true);
                                }}
                                error={form.errors.slug}
                                required
                            />
                        </div>
                        <TextareaField label="Isi Halaman" rows={12} value={form.data.body} onChange={(event) => form.setData('body', event.target.value)} error={form.errors.body} required />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                        <Button type="button" onClick={submit} disabled={form.processing}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus halaman legal?"
                description={
                    deleting
                        ? `Halaman "${deleting.title}" akan dihapus permanen dari sistem.`
                        : ''
                }
                confirmLabel="Hapus"
                confirmIcon={Trash2}
                variant="destructive"
                onConfirm={() => {
                    if (!deleting) {
                        return;
                    }

                    form.delete(LegalPageController.destroy(deleting.id).url, {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    });
                }}
            />
        </>
    );
}

LegalPageIndex.layout = {
    breadcrumbs: [{ title: 'Halaman Legal', href: LegalPageController.index().url }],
};
