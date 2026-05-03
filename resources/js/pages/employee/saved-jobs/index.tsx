import { Form, Head, Link } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import SavedJobController from '@/actions/App/Http/Controllers/Employee/SavedJobController';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type Item = {
    id: number;
    job: {
        id: number;
        slug: string;
        title: string;
        status: string | null;
        employment_type: string | null;
        work_arrangement: string | null;
        company_name: string | null;
        category_name: string | null;
        city_name: string | null;
        application_deadline: string | null;
    };
    saved_at: string | null;
};

type Props = { items: { data: Item[] } };

export default function EmployeeSavedJobsIndex({ items }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<Item>[] = [
        { accessorKey: 'job.title', header: 'Lowongan', cell: ({ row }) => <div><div className="font-medium">{row.original.job.title}</div><div className="text-xs text-muted-foreground">{row.original.job.category_name ?? '-'} • {row.original.job.city_name ?? 'Lokasi fleksibel'}</div></div> },
        { accessorKey: 'job.company_name', header: 'Perusahaan', cell: ({ row }) => row.original.job.company_name ?? 'Perusahaan anonim' },
        { accessorKey: 'job.employment_type', header: 'Tipe', cell: ({ row }) => <div className="flex flex-wrap gap-2">{row.original.job.employment_type && <StatusBadge tone="primary">{formatStatus(row.original.job.employment_type)}</StatusBadge>}{row.original.job.work_arrangement && <StatusBadge tone="info">{formatStatus(row.original.job.work_arrangement)}</StatusBadge>}</div> },
        { accessorKey: 'job.status', header: 'Status', cell: ({ row }) => <StatusBadge tone={row.original.job.status === 'published' ? 'success' : 'secondary'}>{formatStatus(row.original.job.status)}</StatusBadge> },
        { accessorKey: 'job.application_deadline', header: 'Deadline', cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.job.application_deadline) || '-'}</span> },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <ActionGroup className="justify-end">
                    <ActionButton asChild type="button" intent="view"><Link href={`/jobs/${row.original.job.slug}`}><Eye className="size-4" /> Lihat</Link></ActionButton>
                    <Form {...SavedJobController.destroy.form(row.original.job.slug)}>
                        {({ processing }) => <ActionButton type="submit" intent="delete" disabled={processing}><Trash2 className="size-4" /> Hapus</ActionButton>}
                    </Form>
                </ActionGroup>
            ),
        },
    ];

    const table = useReactTable({
        data: items.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.job.title, row.original.job.company_name ?? '', row.original.job.category_name ?? '', row.original.job.city_name ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Lowongan Tersimpan" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Lowongan Tersimpan" description="Kumpulan lowongan yang Anda tandai untuk ditinjau atau dilamar nanti." />
                <Section>
                    {items.data.length === 0 ? (
                        <EmptyState title="Belum ada lowongan tersimpan" description="Simpan lowongan yang relevan dari halaman publik saat modul browse sudah aktif." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari judul, perusahaan, kategori, kota..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline">Kolom <ChevronDown className="ml-2 size-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                                            <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}>{column.id}</DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="rounded-md border">
                                <Table className="min-w-[1020px]">
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
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}

EmployeeSavedJobsIndex.layout = { breadcrumbs: [{ title: 'Lowongan Tersimpan', href: SavedJobController.index().url }] };
