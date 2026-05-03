import { Head, Link, router, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Activity, Building2, CheckCircle2, Crown, Search, XCircle } from 'lucide-react';
import { type FormEvent } from 'react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format-date';

type Option = { value: string; label: string };

type Subscription = {
    id: number;
    status: string | null;
    starts_at: string | null;
    ends_at: string | null;
    cancelled_at: string | null;
    auto_renew: boolean;
    jobs_posted_count: number;
    featured_credits_remaining: number;
    ai_credits_remaining: number;
    is_active: boolean;
    company: { id: number | null; name: string | null; slug: string | null; logo_url: string | null };
    plan: { id: number | null; name: string | null; slug: string | null; tier: string | null; price_idr: number | null };
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
    subscriptions: Paginator<Subscription>;
    filters: { status?: string; search?: string };
    statusOptions: Option[];
    totals: { total: number; active: number; cancelled: number; mrr: number };
};

const idr = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const statusBadge: Record<string, { label: string; className: string }> = {
    active: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
    pending: { label: 'Menunggu', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
    cancelled: { label: 'Dibatalkan', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
    expired: { label: 'Kedaluwarsa', className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

const tierBadge: Record<string, { label: string; className: string }> = {
    free: { label: 'Free', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
    starter: { label: 'Starter', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
    pro: { label: 'Pro', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
    enterprise: { label: 'Enterprise', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
};

export default function AdminSubscriptionsIndex({ subscriptions, filters, statusOptions, totals }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const { data, setData, get, processing } = useForm({
        status: filters.status ?? '',
        search: filters.search ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get('/admin/subscriptions', { preserveState: true, preserveScroll: true });
    };

    const columns: ColumnDef<Subscription>[] = [
        {
            accessorKey: 'company',
            header: 'Perusahaan',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                        <AvatarImage src={row.original.company.logo_url ?? undefined} alt="" />
                        <AvatarFallback><Building2 className="size-4" /></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium">{row.original.company.name ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">ID #{row.original.id}</div>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'plan',
            header: 'Paket',
            cell: ({ row }) => {
                const tier = tierBadge[row.original.plan.tier ?? ''] ?? { label: row.original.plan.tier ?? '-', className: 'bg-muted text-foreground' };
                return (
                    <div className="space-y-1">
                        <div className="font-medium">{row.original.plan.name ?? '-'}</div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${tier.className}`}>{tier.label}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = statusBadge[row.original.status ?? ''] ?? { label: row.original.status ?? '-', className: 'bg-muted text-foreground' };
                return (
                    <div>
                        <Badge className={`${status.className} border-0`}>{status.label}</Badge>
                        {row.original.auto_renew && <div className="mt-1 text-xs text-muted-foreground">Auto-renew aktif</div>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'jobs_posted_count',
            header: () => <div className="text-right">Sisa Kuota</div>,
            cell: ({ row }) => (
                <div className="text-right text-sm tabular-nums">
                    <div>Job: <span className="font-medium">{row.original.jobs_posted_count}</span></div>
                    <div className="text-xs text-muted-foreground">FT {row.original.featured_credits_remaining} · AI {row.original.ai_credits_remaining}</div>
                </div>
            ),
        },
        {
            accessorKey: 'starts_at',
            header: 'Periode',
            cell: ({ row }) => (
                <div className="text-sm tabular-nums">
                    <div className="text-xs text-muted-foreground">Mulai</div>
                    <div>{row.original.starts_at ? formatDate(row.original.starts_at) : '-'}</div>
                    {row.original.ends_at && (<><div className="mt-1 text-xs text-muted-foreground">Berakhir</div><div>{formatDate(row.original.ends_at)}</div></>)}
                </div>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    {row.original.company.slug && <Button asChild size="sm" variant="ghost"><Link href={`/admin/companies/${row.original.company.slug}`}>Detail</Link></Button>}
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: subscriptions.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.company.name ?? '', row.original.plan.name ?? '', row.original.plan.tier ?? '', row.original.status ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Langganan Aktif" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Langganan Aktif"
                    description="Daftar berlangganan perusahaan beserta sisa kuota dan status pembayaran."
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Total Langganan" value={totals.total.toLocaleString('id-ID')} icon={Activity} tone="default" />
                    <StatCard label="Aktif" value={totals.active.toLocaleString('id-ID')} icon={CheckCircle2} tone="success" />
                    <StatCard label="Dibatalkan" value={totals.cancelled.toLocaleString('id-ID')} icon={XCircle} tone="danger" />
                    <StatCard label="MRR (Bulanan)" value={idr(totals.mrr)} icon={Crown} tone="primary" />
                </div>

                <Section>
                    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                className="pl-8"
                                placeholder="Cari nama perusahaan..."
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

                <Section title={`${subscriptions.from ?? 0}–${subscriptions.to ?? 0} dari ${subscriptions.total}`}>
                    {subscriptions.data.length === 0 ? (
                        <EmptyState
                            icon={Activity}
                            title="Belum ada langganan"
                            description="Daftar langganan akan muncul di sini setelah perusahaan checkout sebuah paket."
                        />
                    ) : (
                        <div className="overflow-hidden rounded-md border">
                            <div className="overflow-x-auto">
                                <div className="space-y-4 p-4">
                                    <div className="flex justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline">Kolom</Button>
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
                                                <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            {subscriptions.last_page > 1 && (
                                <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                                    <span>Halaman {subscriptions.current_page} dari {subscriptions.last_page}</span>
                                    <div className="flex items-center gap-1">
                                        {subscriptions.links.filter((l) => l.url).slice(1, -1).map((link) => (
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

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Activity; tone: 'default' | 'success' | 'danger' | 'primary' }) {
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
