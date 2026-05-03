import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import SalaryInsightController from '@/actions/App/Http/Controllers/Admin/SalaryInsightController';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InputField } from '@/components/form/input-field';
import { MoneyInput } from '@/components/form/money-input';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatRupiah } from '@/lib/format-rupiah';
import { formatStatus } from '@/lib/format-status';

type City = { id: number; name: string };
type ExperienceLevel = { value: string; label: string };
type Item = {
    id: number;
    job_title: string;
    role_category: string;
    city_id: number | null;
    city_name: string | null;
    experience_level: string | null;
    min_salary: number;
    median_salary: number;
    max_salary: number;
    sample_size: number;
    source: string;
    last_updated_at: string | null;
};

type Props = {
    items: Item[];
    cities: City[];
    experienceLevels: ExperienceLevel[];
};

const defaults = {
    job_title: '',
    role_category: '',
    city_id: '',
    experience_level: 'mid',
    min_salary: 0,
    median_salary: 0,
    max_salary: 0,
    sample_size: 10,
    source: 'manual',
};

export default function SalaryInsightsIndex({ items, cities, experienceLevels }: Props) {
    const [editing, setEditing] = useState<Item | null>(null);
    const [deleting, setDeleting] = useState<Item | null>(null);
    const [open, setOpen] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const form = useForm(defaults);

    const openFor = (item?: Item) => {
        setEditing(item ?? null);
        form.setData(item ? {
            job_title: item.job_title,
            role_category: item.role_category,
            city_id: item.city_id ? String(item.city_id) : '',
            experience_level: item.experience_level ?? 'mid',
            min_salary: item.min_salary,
            median_salary: item.median_salary,
            max_salary: item.max_salary,
            sample_size: item.sample_size,
            source: item.source,
        } : defaults);
        setOpen(true);
    };

    const submit = () => {
        form.transform((data) => ({
            ...data,
            city_id: data.city_id === '' ? null : Number(data.city_id),
            ...(editing ? { _method: 'put' } : {}),
        }));
        form.post(editing ? SalaryInsightController.update(editing.id).url : SalaryInsightController.store().url, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    const columns: ColumnDef<Item>[] = [
        {
            accessorKey: 'job_title',
            header: 'Posisi',
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-semibold">{row.original.job_title}</div>
                    <div className="text-sm text-muted-foreground">{row.original.role_category} · {row.original.city_name || 'Indonesia'} · {formatStatus(row.original.experience_level)}</div>
                </div>
            ),
        },
        {
            accessorKey: 'min_salary',
            header: 'Rentang Gaji',
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {formatRupiah(row.original.min_salary)} - {formatRupiah(row.original.max_salary)}
                    <div>median {formatRupiah(row.original.median_salary)}</div>
                </div>
            ),
        },
        {
            accessorKey: 'sample_size',
            header: 'Meta',
            cell: ({ row }) => (
                <div className="text-xs text-muted-foreground">
                    {row.original.sample_size} sample · {row.original.source} · {row.original.last_updated_at ? formatDateTime(row.original.last_updated_at) : '-'}
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
    ];

    const table = useReactTable({
        data: items,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [
                row.original.job_title,
                row.original.role_category,
                row.original.city_name ?? '',
                row.original.experience_level ?? '',
                row.original.source,
            ]
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

    return (
        <>
            <Head title="Salary Insights" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Salary Insights"
                    description="Kelola data salary benchmark manual yang bisa dipakai tim admin sebagai referensi editorial."
                    actions={<ActionButton intent="create" onClick={() => openFor()}><Plus className="size-4" /> Tambah Insight</ActionButton>}
                />

                <Section>
                    <Card>
                        <CardContent className="space-y-4 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari posisi, kategori, kota, sumber..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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
                        </CardContent>
                    </Card>
                </Section>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Ubah Salary Insight' : 'Tambah Salary Insight'}</DialogTitle>
                        <DialogDescription>Data ini bersifat kurasi manual untuk benchmark dan pelaporan internal.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <InputField label="Judul Pekerjaan" value={form.data.job_title} onChange={(event) => form.setData('job_title', event.target.value)} error={form.errors.job_title} required />
                            <InputField label="Kategori Role" value={form.data.role_category} onChange={(event) => form.setData('role_category', event.target.value)} error={form.errors.role_category} required />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Kota</Label>
                                <Select value={String(form.data.city_id)} onValueChange={(value) => form.setData('city_id', value === 'all' ? '' : value)}>
                                    <SelectTrigger><SelectValue placeholder="Semua kota" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Nasional</SelectItem>
                                        {cities.map((city) => (
                                            <SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Level Pengalaman</Label>
                                <Select value={form.data.experience_level} onValueChange={(value) => form.setData('experience_level', value)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih level pengalaman" /></SelectTrigger>
                                    <SelectContent>
                                        {experienceLevels.map((level) => (
                                            <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <MoneyInput label="Gaji Minimum" value={form.data.min_salary} onChange={(value) => form.setData('min_salary', value ?? 0)} error={form.errors.min_salary} placeholder="Rp 7.000.000" required />
                            <MoneyInput label="Median" value={form.data.median_salary} onChange={(value) => form.setData('median_salary', value ?? 0)} error={form.errors.median_salary} placeholder="Rp 10.000.000" required />
                            <MoneyInput label="Gaji Maksimum" value={form.data.max_salary} onChange={(value) => form.setData('max_salary', value ?? 0)} error={form.errors.max_salary} placeholder="Rp 14.000.000" required />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <InputField label="Jumlah Sample" type="number" min={1} value={form.data.sample_size} onChange={(event) => form.setData('sample_size', Number(event.target.value))} error={form.errors.sample_size} required />
                            <InputField label="Sumber" value={form.data.source} onChange={(event) => form.setData('source', event.target.value)} error={form.errors.source} required />
                        </div>
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
                title="Hapus salary insight?"
                description={
                    deleting
                        ? `Insight untuk ${deleting.job_title} akan dihapus permanen dari panel admin.`
                        : ''
                }
                confirmLabel="Hapus"
                confirmIcon={Trash2}
                variant="destructive"
                onConfirm={() => {
                    if (!deleting) {
                        return;
                    }

                    form.delete(SalaryInsightController.destroy(deleting.id).url, {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    });
                }}
            />
        </>
    );
}

SalaryInsightsIndex.layout = {
    breadcrumbs: [{ title: 'Salary Insights', href: SalaryInsightController.index().url }],
};
