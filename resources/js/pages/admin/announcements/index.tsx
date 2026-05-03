import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import AnnouncementController from '@/actions/App/Http/Controllers/Admin/AnnouncementController';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { slugify } from '@/lib/slugify';

type Item = {
    id: number;
    title: string;
    slug: string;
    body: string;
    audience: string;
    is_published: boolean;
    published_at: string | null;
    author?: { name?: string | null } | null;
};

type Props = { items: Item[] };

const defaults = {
    title: '',
    slug: '',
    audience: 'all',
    body: '',
    is_published: true,
};

export default function AnnouncementIndex({ items }: Props) {
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
                    <div className="text-xs text-muted-foreground">{row.original.slug}</div>
                    <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">{row.original.body.replace(/<[^>]+>/g, ' ')}</p>
                </div>
            ),
        },
        {
            accessorKey: 'audience',
            header: 'Audience',
            cell: ({ row }) => <Badge variant="outline">{row.original.audience}</Badge>,
        },
        {
            accessorKey: 'is_published',
            header: 'Status',
            cell: ({ row }) => <Badge variant={row.original.is_published ? 'default' : 'secondary'}>{row.original.is_published ? 'Published' : 'Draft'}</Badge>,
        },
        {
            accessorKey: 'published_at',
            header: 'Publikasi',
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.published_at ? formatDateTime(row.original.published_at) : 'Belum dipublikasikan'}</span>,
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
            return [row.original.title, row.original.slug, row.original.body, row.original.audience]
                .join(' ')
                .toLowerCase()
                .includes(keyword);
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
        form.setData(item ? {
            title: item.title,
            slug: item.slug,
            audience: item.audience,
            body: item.body,
            is_published: item.is_published,
        } : defaults);
        setOpen(true);
    };

    const submit = () => {
        form.transform((data) => ({
            ...data,
            ...(editing ? { _method: 'put' } : {}),
        }));
        form.post(editing ? AnnouncementController.update(editing.id).url : AnnouncementController.store().url, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <>
            <Head title="Pengumuman" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Pengumuman"
                    description="Publikasikan update penting untuk employer, kandidat, atau semua pengguna."
                    actions={<ActionButton intent="create" onClick={() => openFor()}><Plus className="size-4" /> Tambah Pengumuman</ActionButton>}
                />

                <Section>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Input placeholder="Cari judul, slug, audience" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="sm:max-w-sm" />
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
                            <Table className="min-w-[920px]">
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                            ))}
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                                    )}
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
                        <DialogTitle>{editing ? 'Ubah Pengumuman' : 'Tambah Pengumuman'}</DialogTitle>
                        <DialogDescription>Konten akan tampil sesuai audience yang dipilih saat status published aktif.</DialogDescription>
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
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Audience</Label>
                            <Select value={form.data.audience} onValueChange={(value) => form.setData('audience', value)}>
                                <SelectTrigger><SelectValue placeholder="Pilih audiens" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    <SelectItem value="employee">Employee</SelectItem>
                                    <SelectItem value="employer">Employer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <TextareaField label="Isi Pengumuman" rows={8} value={form.data.body} onChange={(event) => form.setData('body', event.target.value)} error={form.errors.body} required />
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
                title="Hapus pengumuman?"
                description={
                    deleting
                        ? `Pengumuman "${deleting.title}" akan dihapus permanen dari sistem.`
                        : ''
                }
                confirmLabel="Hapus"
                confirmIcon={Trash2}
                variant="destructive"
                onConfirm={() => {
                    if (!deleting) {
                        return;
                    }

                    form.delete(AnnouncementController.destroy(deleting.id).url, {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    });
                }}
            />
        </>
    );
}

AnnouncementIndex.layout = {
    breadcrumbs: [{ title: 'Pengumuman', href: AnnouncementController.index().url }],
};
