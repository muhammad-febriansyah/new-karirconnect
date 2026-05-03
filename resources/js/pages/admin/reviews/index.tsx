import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Check, ChevronDown, ChevronsUpDown, Star, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type ReviewItem = {
    id: number;
    title: string;
    rating: number;
    pros: string | null;
    cons: string | null;
    company_name: string | null;
    company_slug: string | null;
    author_name: string | null;
    author_email: string | null;
    employment_status: string;
    created_at: string | null;
    status: string;
};

type Props = {
    status: string;
    reviews: { data: ReviewItem[] };
};

export default function AdminReviewsIndex({ status, reviews }: Props) {
    const tabs = [
        { value: 'pending', label: 'Menunggu' },
        { value: 'approved', label: 'Disetujui' },
        { value: 'rejected', label: 'Ditolak' },
    ];
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const approve = (id: number) => router.post(`/admin/reviews/${id}/approve`, {}, { preserveScroll: true });
    const reject = (id: number) => router.post(`/admin/reviews/${id}/reject`, {}, { preserveScroll: true });

    const columns: ColumnDef<ReviewItem>[] = [
        {
            accessorKey: 'title',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Review
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-semibold">{row.original.title}</div>
                    <div className="text-sm text-muted-foreground">{row.original.company_name} · oleh {row.original.author_name} ({row.original.author_email})</div>
                    {row.original.pros && <p className="line-clamp-1 text-sm"><span className="font-semibold text-green-600">+ </span>{row.original.pros}</p>}
                    {row.original.cons && <p className="line-clamp-1 text-sm"><span className="font-semibold text-red-600">- </span>{row.original.cons}</p>}
                </div>
            ),
        },
        {
            accessorKey: 'rating',
            header: 'Rating',
            cell: ({ row }) => <span className="flex items-center gap-1 text-sm"><Star className="size-3 text-yellow-500" /> {row.original.rating}/5</span>,
        },
        {
            accessorKey: 'employment_status',
            header: 'Status Karyawan',
            cell: ({ row }) => <Badge variant="secondary">{formatStatus(row.original.employment_status)}</Badge>,
        },
        {
            accessorKey: 'created_at',
            header: 'Dikirim',
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.created_at ? formatDateTime(row.original.created_at) : '-'}</span>,
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    {status === 'pending' ? (
                        <>
                            <Button size="sm" variant="default" onClick={() => approve(row.original.id)}><Check className="size-4" /> Setujui</Button>
                            <Button size="sm" variant="destructive" onClick={() => reject(row.original.id)}><X className="size-4" /> Tolak</Button>
                        </>
                    ) : (
                        <Badge variant="outline">{formatStatus(row.original.status)}</Badge>
                    )}
                </div>
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
            return [row.original.title, row.original.company_name ?? '', row.original.author_name ?? '', row.original.author_email ?? '', row.original.pros ?? '', row.original.cons ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Moderasi Review" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Moderasi Review Perusahaan" description="Tinjau review yang dikirim user." />

                <div className="flex gap-2">
                    {tabs.map((t) => (
                        <Button key={t.value} asChild variant={status === t.value ? 'default' : 'outline'} size="sm">
                            <Link href={`/admin/reviews?status=${t.value}`}>{t.label}</Link>
                        </Button>
                    ))}
                </div>

                <Section>
                    {reviews.data.length === 0 ? (
                        <EmptyState title="Tidak ada review" description="Belum ada review pada status moderasi ini." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari judul, perusahaan, user, isi review..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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
                                <Table className="min-w-[1200px]">
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
