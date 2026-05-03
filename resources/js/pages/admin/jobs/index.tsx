import { Head, Link } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, Eye } from 'lucide-react';
import { useState } from 'react';
import JobController from '@/actions/App/Http/Controllers/Admin/JobController';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type JobRow = {
    id: number;
    title: string;
    slug: string;
    status: string;
    is_featured: boolean;
    company: { id: number; name: string } | null;
    category: { id: number; name: string } | null;
    posted_by: { id: number; name: string; email: string } | null;
};

type Props = {
    jobs: { data: JobRow[] };
};

export default function AdminJobsIndex({ jobs }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<JobRow>[] = [
        {
            accessorKey: 'title',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Lowongan
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.title}</div>
                    <div className="text-xs text-muted-foreground">{row.original.category?.name ?? '-'}</div>
                </div>
            ),
        },
        {
            accessorKey: 'company',
            header: 'Perusahaan',
            cell: ({ row }) => row.original.company?.name ?? '-',
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <StatusBadge tone={row.original.status === 'published' ? 'success' : row.original.status === 'closed' ? 'warning' : 'secondary'}>
                        {row.original.status}
                    </StatusBadge>
                    {row.original.is_featured && <StatusBadge tone="primary">Featured</StatusBadge>}
                </div>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <ActionButton asChild intent="detail">
                        <Link href={JobController.show(row.original.slug).url}>
                            <Eye className="size-4" /> Detail
                        </Link>
                    </ActionButton>
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: jobs.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.title, row.original.slug, row.original.status, row.original.company?.name ?? '', row.original.category?.name ?? '']
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
            <Head title="Lowongan Admin" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Lowongan" description="Monitor lowongan dari seluruh employer dan lakukan moderasi ringan bila dibutuhkan." />

                <Section>
                    {jobs.data.length === 0 ? (
                        <EmptyState title="Belum ada lowongan" description="Tidak ada lowongan yang cocok dengan filter saat ini." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input
                                    className="sm:max-w-sm"
                                    value={globalFilter}
                                    onChange={(event) => setGlobalFilter(event.target.value)}
                                    placeholder="Cari lowongan, perusahaan, kategori..."
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            Kolom <ChevronDown className="ml-2 size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                                            <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}>
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="rounded-md border">
                                <Table className="min-w-[820px]">
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
                                <span>Menampilkan {table.getRowModel().rows.length} dari {jobs.data.length} data</span>
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
        </>
    );
}

AdminJobsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Lowongan',
            href: JobController.index().url,
        },
    ],
};
