import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { formatStatus } from '@/lib/format-status';

type ReviewItem = {
    id: number;
    company_name: string | null;
    company_slug: string | null;
    title: string;
    rating: number;
    status: string;
    created_at: string | null;
};

type Props = { reviews: { data: ReviewItem[] } };

export default function EmployeeCompanyReviewsIndex({ reviews }: Props) {
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const remove = (id: number) => {
        router.delete(`/employee/company-reviews/${id}`, { preserveScroll: true });
        setDeletingId(null);
    };

    const columns: ColumnDef<ReviewItem>[] = [
        {
            accessorKey: 'title',
            header: 'Review',
            cell: ({ row }) => (
                <div>
                    <div className="font-semibold">{row.original.title}</div>
                    <div className="text-sm text-muted-foreground">{row.original.company_name}</div>
                </div>
            ),
        },
        { accessorKey: 'rating', header: 'Rating', cell: ({ row }) => <span className="flex items-center gap-1 text-sm"><Star className="size-3 text-yellow-500" /> {row.original.rating}/5</span> },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant="secondary">{formatStatus(row.original.status)}</Badge> },
        { accessorKey: 'created_at', header: 'Dibuat', cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.created_at ? formatDateTime(row.original.created_at) : '-'}</span> },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <ActionGroup className="justify-end">
                    <ActionButton asChild intent="edit"><Link href={`/employee/company-reviews/${row.original.id}/edit`}><Pencil className="size-4" /> Ubah</Link></ActionButton>
                    <ActionButton intent="delete" onClick={() => setDeletingId(row.original.id)}><Trash2 className="size-4" /> Hapus</ActionButton>
                </ActionGroup>
            ),
        },
    ];

    const table = useReactTable({
        data: reviews.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.title, row.original.company_name ?? '', row.original.status].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Review Saya" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Review Perusahaan Saya" description="Review yang Anda tulis tentang perusahaan." />
                <Section>
                    {reviews.data.length === 0 ? (
                        <EmptyState title="Belum ada review" description="Review perusahaan yang Anda tulis akan tampil di sini." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari review, perusahaan, status..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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
                                <Table className="min-w-[900px]">
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

            <ConfirmDialog
                open={deletingId !== null}
                onOpenChange={(open) => !open && setDeletingId(null)}
                title="Hapus review?"
                description="Review perusahaan ini akan dihapus permanen dari akun Anda."
                confirmLabel="Hapus"
                confirmIcon={Trash2}
                variant="destructive"
                onConfirm={() => deletingId !== null && remove(deletingId)}
            />
        </>
    );
}
