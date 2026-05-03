import { Head, Link, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, Download, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type OrderRow = {
    reference: string;
    company_name: string | null;
    company_slug: string | null;
    user_name: string | null;
    user_email: string | null;
    description: string;
    amount_idr: number;
    item_type: string;
    status: string;
    payment_provider: string;
    payment_reference: string | null;
    paid_at: string | null;
    created_at: string | null;
};

type Paginator<T> = { data: T[] };

type Props = {
    filters: { status: string | null; search: string | null };
    totals: { total_count: number; paid_count: number; paid_amount: number; awaiting_count: number };
    orders: Paginator<OrderRow>;
};

const idr = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function AdminOrdersIndex({ filters, totals, orders }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const { data, setData, get, processing } = useForm({
        status: filters.status ?? '',
        search: filters.search ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get('/admin/orders', { preserveState: true, preserveScroll: true });
    };

    const columns: ColumnDef<OrderRow>[] = [
        {
            accessorKey: 'reference',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Referensi
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference}</span>,
        },
        { accessorKey: 'company_name', header: 'Perusahaan', cell: ({ row }) => row.original.company_name ?? '-' },
        {
            accessorKey: 'user_name',
            header: 'User',
            cell: ({ row }) => <div><div className="text-sm">{row.original.user_name}</div><div className="text-xs text-muted-foreground">{row.original.user_email}</div></div>,
        },
        { accessorKey: 'item_type', header: 'Tipe', cell: ({ row }) => <Badge variant="secondary">{formatStatus(row.original.item_type)}</Badge> },
        { accessorKey: 'amount_idr', header: 'Total', cell: ({ row }) => idr(row.original.amount_idr) },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge>{formatStatus(row.original.status)}</Badge> },
        { accessorKey: 'created_at', header: 'Dibuat', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.created_at ? formatDateTime(row.original.created_at) : '-'}</span> },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <ActionButton asChild intent="detail">
                        <Link href={`/admin/orders/${row.original.reference}`}>Detail</Link>
                    </ActionButton>
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: orders.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.reference, row.original.company_name ?? '', row.original.user_name ?? '', row.original.user_email ?? '', row.original.description, row.original.item_type, row.original.status]
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
            <Head title="Order Pembayaran" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Order & Pembayaran"
                    description="Pantau order langganan & boost dari semua perusahaan."
                    actions={
                        <ActionButton asChild intent="download">
                            <a
                                href={`/admin/orders/export?${new URLSearchParams({
                                    ...(filters.status ? { status: filters.status } : {}),
                                }).toString()}`}
                            >
                                <Download className="size-4" /> Export CSV
                            </a>
                        </ActionButton>
                    }
                />

                <div className="grid gap-3 md:grid-cols-4">
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Order</div>
                        <div className="text-2xl font-bold">{totals.total_count}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Paid</div>
                        <div className="text-2xl font-bold">{totals.paid_count}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Diterima</div>
                        <div className="text-xl font-semibold">{idr(totals.paid_amount)}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Menunggu Bayar</div>
                        <div className="text-2xl font-bold">{totals.awaiting_count}</div>
                    </CardContent></Card>
                </div>

                <Section>
                    <form onSubmit={submit} className="flex flex-wrap gap-2">
                        <Input
                            placeholder="Cari referensi/perusahaan/deskripsi"
                            value={globalFilter || data.search}
                            onChange={(e) => {
                                setData('search', e.target.value);
                                setGlobalFilter(e.target.value);
                            }}
                            className="flex-1 min-w-[200px]"
                        />
                        <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="submit" disabled={processing}><Search className="size-4" /> Filter</Button>
                    </form>
                </Section>

                <Card>
                    <CardContent className="space-y-4 p-4">
                        <div className="flex justify-end">
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
                            <Table className="min-w-[1040px]">
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
                                        <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">Belum ada order.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
