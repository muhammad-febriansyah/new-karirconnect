import { Head, Link, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Search, UserSearch } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

type LogRow = {
    id: number;
    company_name: string | null;
    company_slug: string | null;
    user_name: string | null;
    user_email: string | null;
    filters_json: Record<string, unknown> | null;
    result_count: number;
    searched_at: string | null;
};

type Paginator<T> = { data: T[]; current_page: number; last_page: number };

type Props = {
    filters: { company_id: number | null; range: string | null };
    totals: { total: number; today: number; this_week: number; this_month: number };
    top_companies: Array<{ company_name: string; company_slug: string; searches: number; total_results: number }>;
    logs: Paginator<LogRow>;
};

const summarizeFilters = (filters: Record<string, unknown> | null): string => {
    if (!filters) return '-';
    const entries = Object.entries(filters).filter(([_, v]) => v !== null && v !== '' && (!Array.isArray(v) || v.length > 0));
    if (entries.length === 0) return 'tanpa filter';
    return entries.map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : String(v)}`).join(' · ');
};

export default function AdminTalentSearchLogs({ filters, totals, top_companies, logs }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const { data, setData, get, processing } = useForm({
        range: filters.range ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get('/admin/talent-search-logs', { preserveState: true, preserveScroll: true });
    };

    const columns: ColumnDef<LogRow>[] = [
        { accessorKey: 'searched_at', header: 'Waktu', cell: ({ row }) => <span className="text-xs">{row.original.searched_at ? formatDateTime(row.original.searched_at) : '-'}</span> },
        { accessorKey: 'company_name', header: 'Perusahaan', cell: ({ row }) => row.original.company_name ?? '-' },
        { accessorKey: 'user_name', header: 'User', cell: ({ row }) => <div><div className="text-sm">{row.original.user_name ?? '-'}</div><div className="text-xs text-muted-foreground">{row.original.user_email ?? ''}</div></div> },
        { accessorKey: 'filters_json', header: 'Filter', cell: ({ row }) => <span className="text-xs text-muted-foreground">{summarizeFilters(row.original.filters_json)}</span> },
        { accessorKey: 'result_count', header: 'Hasil', cell: ({ row }) => <Badge>{row.original.result_count}</Badge> },
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
            return [row.original.company_name ?? '', row.original.user_name ?? '', row.original.user_email ?? '', summarizeFilters(row.original.filters_json)].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Talent Search Logs" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Talent Search Logs"
                    description="Setiap pencarian kandidat oleh employer tercatat untuk audit privasi & analisis pemakaian."
                />

                <div className="grid gap-3 md:grid-cols-4">
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Pencarian</div>
                        <div className="text-2xl font-bold">{totals.total}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Hari Ini</div>
                        <div className="text-2xl font-bold">{totals.today}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Minggu Ini</div>
                        <div className="text-2xl font-bold">{totals.this_week}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Bulan Ini</div>
                        <div className="text-2xl font-bold">{totals.this_month}</div>
                    </CardContent></Card>
                </div>

                {top_companies.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="mb-2 text-sm font-semibold">Top Perusahaan</div>
                            <div className="grid gap-2 md:grid-cols-2">
                                {top_companies.map((c, i) => (
                                    <Link
                                        key={i}
                                        href={`/admin/talent-search-logs?company_id=${c.company_slug}`}
                                        className="flex items-center justify-between rounded border p-2 hover:bg-muted/40"
                                    >
                                        <div>
                                            <div className="font-medium">{c.company_name}</div>
                                            <div className="text-xs text-muted-foreground">{c.total_results} hasil dikembalikan</div>
                                        </div>
                                        <Badge variant="secondary"><UserSearch className="mr-1 size-3" /> {c.searches}</Badge>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Section>
                    <form onSubmit={submit} className="flex flex-wrap gap-2">
                        <Input placeholder="Cari perusahaan, user, filter..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="min-w-[220px] flex-1" />
                        <Select value={data.range} onValueChange={(v) => setData('range', v)}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Periode" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Hari Ini</SelectItem>
                                <SelectItem value="week">7 Hari</SelectItem>
                                <SelectItem value="month">Bulan Ini</SelectItem>
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
                                        <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">Belum ada pencarian.</TableCell></TableRow>
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
