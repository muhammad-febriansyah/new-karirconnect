import { Head, router } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { CheckCircle2, ChevronDown, ChevronsUpDown, ShieldOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import ReportController from '@/actions/App/Http/Controllers/Admin/ReportController';
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
import { formatStatus } from '@/lib/format-status';

type Item = {
    id: number;
    reporter_name: string | null;
    reporter_email: string | null;
    reportable_type: string;
    reportable_label: string;
    reason: string;
    description: string | null;
    status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string | null;
};

type Props = {
    items: Item[];
};

export default function ReportsIndex({ items }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const review = (id: number, status: 'reviewed' | 'dismissed') => {
        router.post(ReportController.review(id).url, { status }, { preserveScroll: true });
    };

    const columns = useMemo<ColumnDef<Item>[]>(() => [
        {
            accessorKey: 'reportable_label',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Objek
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-semibold">{row.original.reportable_label}</div>
                    <div className="text-xs text-muted-foreground">{formatStatus(row.original.reportable_type)}</div>
                    <div className="text-xs text-muted-foreground">{row.original.reporter_name || '-'} {row.original.reporter_email ? `(${row.original.reporter_email})` : ''}</div>
                </div>
            ),
        },
        {
            accessorKey: 'reason',
            header: 'Alasan',
            cell: ({ row }) => (
                <div className="max-w-md space-y-1">
                    <div className="text-sm">{row.original.reason}</div>
                    {row.original.description && <div className="line-clamp-2 text-xs text-muted-foreground">{row.original.description}</div>}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <Badge variant={row.original.status === 'pending' ? 'secondary' : 'default'}>{formatStatus(row.original.status)}</Badge>,
        },
        {
            accessorKey: 'created_at',
            header: 'Dibuat',
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.created_at ? formatDateTime(row.original.created_at) : '-'}</span>,
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => row.original.status === 'pending' ? (
                <ActionGroup className="justify-end">
                    <ActionButton type="button" intent="approve" onClick={() => review(row.original.id, 'reviewed')}>
                        <CheckCircle2 className="size-4" />
                        Tandai Ditinjau
                    </ActionButton>
                    <ActionButton type="button" intent="reject" onClick={() => review(row.original.id, 'dismissed')}>
                        <ShieldOff className="size-4" />
                        Dismiss
                    </ActionButton>
                </ActionGroup>
            ) : <div className="text-right text-xs text-muted-foreground">{row.original.reviewed_at ? formatDateTime(row.original.reviewed_at) : '-'}</div>,
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
            return [row.original.reportable_label, row.original.reportable_type, row.original.reason, row.original.description, row.original.status]
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
            <Head title="Reports" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Reports"
                    description="Tinjau laporan user terhadap konten atau entitas yang dianggap bermasalah."
                />

                <Section>
                    {items.length === 0 ? (
                        <EmptyState title="Belum ada laporan" description="Semua laporan user akan muncul di sini." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input placeholder="Cari objek, alasan, status" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="sm:max-w-sm" />
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
                                <Table className="min-w-[980px]">
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
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [{ title: 'Reports', href: ReportController.index().url }],
};
