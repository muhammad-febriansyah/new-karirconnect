import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Building2, CheckCircle2, Clock, CreditCard, Search, TrendingUp, XCircle } from 'lucide-react';
import { type FormEvent } from 'react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

type Option = { value: string; label: string };

type Payment = {
    id: number;
    gateway_reference: string | null;
    provider: string | null;
    payment_method: string | null;
    amount_idr: number;
    status: string | null;
    settled_at: string | null;
    created_at: string | null;
    order: {
        id: number;
        merchant_order_id: string | null;
        company: { id: number; name: string; logo_url: string | null } | null;
    } | null;
};

type Paginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Props = {
    payments: Paginator<Payment>;
    filters: { status?: string; search?: string };
    statusOptions: Option[];
    totals: { total: number; success: number; failed: number; gross_idr: number };
};

const idr = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const statusBadge: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
    success: { label: 'Sukses', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
    pending: { label: 'Menunggu', icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
    failed: { label: 'Gagal', icon: XCircle, className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
    expired: { label: 'Kedaluwarsa', icon: Clock, className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export default function AdminPaymentsIndex({ payments, filters, statusOptions, totals }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const { data, setData, get, processing } = useForm({
        status: filters.status ?? '',
        search: filters.search ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get('/admin/payments', { preserveState: true, preserveScroll: true });
    };

    const columns: ColumnDef<Payment>[] = [
        {
            accessorKey: 'order',
            header: 'Order',
            cell: ({ row }) => (
                <div>
                    <div className="font-mono text-xs">{row.original.order?.merchant_order_id ?? '-'}</div>
                    {row.original.gateway_reference && <div className="mt-0.5 text-xs text-muted-foreground">Ref: {row.original.gateway_reference}</div>}
                </div>
            ),
        },
        {
            accessorKey: 'company',
            header: 'Perusahaan',
            cell: ({ row }) => row.original.order?.company ? (
                <div className="flex items-center gap-2">
                    <Avatar className="size-7"><AvatarImage src={row.original.order.company.logo_url ?? undefined} alt="" /><AvatarFallback><Building2 className="size-3" /></AvatarFallback></Avatar>
                    <span className="truncate text-sm font-medium">{row.original.order.company.name}</span>
                </div>
            ) : <span className="text-sm text-muted-foreground">-</span>,
        },
        {
            accessorKey: 'provider',
            header: 'Provider',
            cell: ({ row }) => <div className="text-sm"><div className="font-medium capitalize">{row.original.provider ?? '-'}</div>{row.original.payment_method && <div className="text-xs uppercase tracking-wide text-muted-foreground">{row.original.payment_method}</div>}</div>,
        },
        { accessorKey: 'amount_idr', header: () => <div className="text-right">Jumlah</div>, cell: ({ row }) => <div className="text-right font-semibold tabular-nums">{idr(row.original.amount_idr)}</div> },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = statusBadge[row.original.status ?? ''] ?? { label: row.original.status ?? '-', icon: Clock, className: 'bg-muted text-foreground' };
                const StatusIcon = status.icon;
                return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}><StatusIcon className="size-3" /> {status.label}</span>;
            },
        },
        {
            accessorKey: 'created_at',
            header: 'Waktu',
            cell: ({ row }) => <div className="text-xs tabular-nums"><div>{row.original.created_at ? formatDateTime(row.original.created_at) : '-'}</div>{row.original.settled_at && <div className="mt-0.5 text-emerald-600 dark:text-emerald-400">Settled: {formatDateTime(row.original.settled_at)}</div>}</div>,
        },
    ];

    const table = useReactTable({
        data: payments.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.order?.merchant_order_id ?? '', row.original.order?.company?.name ?? '', row.original.provider ?? '', row.original.status ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Pembayaran" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Riwayat Pembayaran"
                    description="Semua transaksi pembayaran dari gateway, termasuk yang gagal/expired."
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Total Transaksi" value={totals.total.toLocaleString('id-ID')} icon={CreditCard} tone="default" />
                    <StatCard label="Sukses" value={totals.success.toLocaleString('id-ID')} icon={CheckCircle2} tone="success" />
                    <StatCard label="Gagal" value={totals.failed.toLocaleString('id-ID')} icon={XCircle} tone="danger" />
                    <StatCard label="GMV Sukses" value={idr(totals.gross_idr)} icon={TrendingUp} tone="primary" />
                </div>

                <Section>
                    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                className="pl-8"
                                placeholder="Cari order ID atau perusahaan..."
                                value={globalFilter || data.search}
                                onChange={(e) => {
                                    setData('search', e.target.value);
                                    setGlobalFilter(e.target.value);
                                }}
                            />
                        </div>
                        <Select value={data.status} onValueChange={(v) => setData('status', v === 'all' ? '' : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Semua status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua status</SelectItem>
                                {statusOptions.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="submit" disabled={processing}>
                            <Search className="size-4" /> Cari
                        </Button>
                    </form>
                </Section>

                <Section title={`${payments.from ?? 0}–${payments.to ?? 0} dari ${payments.total}`}>
                    {payments.data.length === 0 ? (
                        <EmptyState
                            icon={CreditCard}
                            title="Belum ada pembayaran"
                            description="Riwayat transaksi akan muncul setelah ada pembayaran masuk."
                        />
                    ) : (
                        <div className="overflow-hidden rounded-md border">
                            <div className="overflow-x-auto">
                                <div className="space-y-4 p-4">
                                    <div className="flex justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="outline">Kolom</Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                                                    <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}>{column.id}</DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <Table className="min-w-[980px]">
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
                            {payments.last_page > 1 && (
                                <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                                    <span>Halaman {payments.current_page} dari {payments.last_page}</span>
                                    <div className="flex items-center gap-1">
                                        {payments.links.filter((l) => l.url).slice(1, -1).map((link) => (
                                            <Button
                                                key={link.label}
                                                size="sm"
                                                variant={link.active ? 'default' : 'ghost'}
                                                onClick={() => link.url && router.visit(link.url, { preserveScroll: true, preserveState: true })}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof CreditCard; tone: 'default' | 'success' | 'danger' | 'primary' }) {
    const toneClass = {
        default: 'bg-muted text-muted-foreground',
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
        primary: 'bg-primary/10 text-primary',
    }[tone];

    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex size-10 items-center justify-center rounded-lg ${toneClass}`}>
                    <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="truncate text-xl font-bold tabular-nums">{value}</div>
                </div>
            </CardContent>
        </Card>
    );
}
