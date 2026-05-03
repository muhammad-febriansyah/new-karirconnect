import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import FaqController from '@/actions/App/Http/Controllers/Admin/FaqController';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Item = {
    id: number;
    question: string;
    answer: string;
    category: string | null;
    order_number: number;
    is_published: boolean;
};

type Props = { items: Item[] };

const defaults = {
    question: '',
    answer: '',
    category: '',
    order_number: 0,
    is_published: true,
};

export default function FaqIndex({ items }: Props) {
    const [editing, setEditing] = useState<Item | null>(null);
    const [deleting, setDeleting] = useState<Item | null>(null);
    const [open, setOpen] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const form = useForm(defaults);

    const columns = useMemo<ColumnDef<Item>[]>(() => [
        {
            accessorKey: 'question',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Pertanyaan
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-semibold">{row.original.question}</div>
                    <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">{row.original.answer.replace(/<[^>]+>/g, ' ')}</p>
                </div>
            ),
        },
        { accessorKey: 'category', header: 'Kategori', cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.category || '-'}</span> },
        { accessorKey: 'order_number', header: 'Urutan' },
        {
            accessorKey: 'is_published',
            header: 'Status',
            cell: ({ row }) => <Badge variant={row.original.is_published ? 'default' : 'secondary'}>{row.original.is_published ? 'Published' : 'Draft'}</Badge>,
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
            return [row.original.question, row.original.answer, row.original.category].filter(Boolean).join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    const openFor = (item?: Item) => {
        setEditing(item ?? null);
        form.setData(item ? {
            question: item.question,
            answer: item.answer,
            category: item.category ?? '',
            order_number: item.order_number,
            is_published: item.is_published,
        } : defaults);
        setOpen(true);
    };

    const submit = () => {
        form.transform((data) => ({
            ...data,
            ...(editing ? { _method: 'put' } : {}),
        }));
        form.post(editing ? FaqController.update(editing.id).url : FaqController.store().url, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <Head title="FAQ" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="FAQ"
                    description="Susun jawaban cepat untuk pertanyaan yang paling sering muncul."
                    actions={<ActionButton intent="create" onClick={() => openFor()}><Plus className="size-4" /> Tambah FAQ</ActionButton>}
                />

                <Section>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Input placeholder="Cari pertanyaan, jawaban, kategori" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="sm:max-w-sm" />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">Kolom <ChevronDown className="ml-2 size-4" /></Button>
                                </DropdownMenuTrigger>
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
                            <Table className="min-w-[900px]">
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
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Ubah FAQ' : 'Tambah FAQ'}</DialogTitle>
                        <DialogDescription>Urutan kecil akan tampil lebih dulu di halaman publik.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <InputField label="Pertanyaan" value={form.data.question} onChange={(event) => form.setData('question', event.target.value)} error={form.errors.question} required />
                        <div className="grid gap-4 md:grid-cols-2">
                            <InputField label="Kategori" value={form.data.category} onChange={(event) => form.setData('category', event.target.value)} error={form.errors.category} />
                            <InputField label="Urutan" type="number" min={0} value={form.data.order_number} onChange={(event) => form.setData('order_number', Number(event.target.value))} error={form.errors.order_number} />
                        </div>
                        <TextareaField label="Jawaban" rows={8} value={form.data.answer} onChange={(event) => form.setData('answer', event.target.value)} error={form.errors.answer} required />
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={form.data.is_published} onChange={(event) => form.setData('is_published', event.target.checked)} />
                            Publish sekarang
                        </label>
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
                title="Hapus FAQ?"
                description={
                    deleting
                        ? `FAQ "${deleting.question}" akan dihapus permanen dari sistem.`
                        : ''
                }
                confirmLabel="Hapus"
                confirmIcon={Trash2}
                variant="destructive"
                onConfirm={() => {
                    if (!deleting) {
                        return;
                    }

                    form.delete(FaqController.destroy(deleting.id).url, {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    });
                }}
            />
        </>
    );
}

FaqIndex.layout = {
    breadcrumbs: [{ title: 'FAQ', href: FaqController.index().url }],
};
