import { Head, Link, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Bot, Search } from 'lucide-react';
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

type LogRow = {
    id: number;
    user_name: string | null;
    user_email: string | null;
    feature: string | null;
    provider: string | null;
    model: string | null;
    status: string | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_cost_usd: string | null;
    latency_ms: number | null;
    error_message: string | null;
    created_at: string | null;
};

type Paginator<T> = { data: T[]; current_page: number; last_page: number };

type Props = {
    filters: { feature: string | null; status: string | null; provider: string | null; search: string | null };
    totals: {
        total: number;
        this_month: number;
        success: number;
        failed: number;
        total_cost_usd: number;
        total_tokens: number;
    };
    by_feature: Array<{ feature: string; count: number; cost: number }>;
    logs: Paginator<LogRow>;
};

export default function AdminAiAuditLogs({ filters, totals, by_feature, logs }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const { data, setData, get, processing } = useForm({
        feature: filters.feature ?? '',
        status: filters.status ?? '',
        provider: filters.provider ?? '',
        search: filters.search ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get('/admin/ai-audit-logs', { preserveState: true, preserveScroll: true });
    };

    const columns: ColumnDef<LogRow>[] = [
        { accessorKey: 'created_at', header: 'Waktu', cell: ({ row }) => <span className="text-xs">{row.original.created_at ? formatDateTime(row.original.created_at) : '-'}</span> },
        { accessorKey: 'user_name', header: 'User', cell: ({ row }) => <div><div className="text-sm">{row.original.user_name ?? '-'}</div><div className="text-xs text-muted-foreground">{row.original.user_email ?? ''}</div></div> },
        { accessorKey: 'feature', header: 'Feature', cell: ({ row }) => <Badge variant="secondary"><Bot className="mr-1 size-3" /> {formatStatus(row.original.feature)}</Badge> },
        { accessorKey: 'provider', header: 'Provider/Model', cell: ({ row }) => <div className="text-xs"><div>{row.original.provider}</div><div className="text-muted-foreground">{row.original.model}</div></div> },
        { accessorKey: 'tokens', header: 'Tokens', cell: ({ row }) => <span className="text-xs">{(row.original.prompt_tokens ?? 0) + (row.original.completion_tokens ?? 0)}</span> },
        { accessorKey: 'cost', header: 'Cost', cell: ({ row }) => <span className="text-xs">${row.original.total_cost_usd ?? '0'}</span> },
        { accessorKey: 'latency_ms', header: 'Latency', cell: ({ row }) => <span className="text-xs">{row.original.latency_ms ?? 0}ms</span> },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'success' ? 'default' : 'secondary'}>{formatStatus(row.original.status)}</Badge> },
        { id: 'actions', enableHiding: false, header: () => <div className="text-right">Aksi</div>, cell: ({ row }) => <div className="text-right"><ActionButton asChild intent="detail"><Link href={`/admin/ai-audit-logs/${row.original.id}`}>Detail</Link></ActionButton></div> },
    ];

    const table = useReactTable({
        data: logs.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.user_name ?? '', row.original.user_email ?? '', row.original.feature ?? '', row.original.provider ?? '', row.original.model ?? '', row.original.status ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="AI Audit Logs" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="AI Audit Logs"
                    description="Setiap panggilan ke model AI tercatat lengkap dengan input, output, token, dan biaya."
                />

                <div className="grid gap-3 md:grid-cols-4">
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Calls</div>
                        <div className="text-2xl font-bold">{totals.total}</div>
                        <div className="text-xs">{totals.this_month} bulan ini</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                        <div className="text-2xl font-bold">
                            {totals.total > 0 ? Math.round((totals.success / totals.total) * 100) : 0}%
                        </div>
                        <div className="text-xs">{totals.failed} gagal</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Token</div>
                        <div className="text-2xl font-bold">{totals.total_tokens.toLocaleString('id-ID')}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Cost (USD)</div>
                        <div className="text-2xl font-bold">${totals.total_cost_usd}</div>
                    </CardContent></Card>
                </div>

                {by_feature.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="mb-2 text-sm font-semibold">Breakdown per Feature</div>
                            <div className="grid gap-2 md:grid-cols-3">
                                {by_feature.map((f) => (
                                    <div key={f.feature} className="rounded border p-2">
                                        <div className="text-sm font-medium">{formatStatus(f.feature)}</div>
                                        <div className="text-xs text-muted-foreground">{f.count} calls · ${f.cost}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Section>
                    <form onSubmit={submit} className="flex flex-wrap gap-2">
                        <Input
                            placeholder="Cari user/model"
                            value={globalFilter || data.search}
                            onChange={(e) => { setData('search', e.target.value); setGlobalFilter(e.target.value); }}
                            className="flex-1 min-w-[180px]"
                        />
                        <Select value={data.feature} onValueChange={(v) => setData('feature', v)}>
                            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Feature" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ai_interview">AI Interview</SelectItem>
                                <SelectItem value="coach">Career Coach</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="success">Success</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="submit" disabled={processing}><Search className="size-4" /> Filter</Button>
                    </form>
                </Section>

                <Card>
                    <CardContent className="space-y-4 p-4">
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
                        <div className="rounded-md border">
                            <Table className="min-w-[1080px]">
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
                                        <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">Belum ada log.</TableCell></TableRow>
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
