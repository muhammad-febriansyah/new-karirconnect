import { Head, Link } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Building2, ChevronDown, ChevronsUpDown, Eye, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type Application = {
    id: number;
    status: string | null;
    ai_match_score: number | null;
    applied_at: string | null;
    job: { id: number; title: string; slug: string };
    company: { name: string | null; slug: string | null; logo_url: string | null };
};

type Props = { applications: { data: Application[] } };

const statusTone = (status: string | null) => {
    switch (status) {
        case 'submitted': return 'info';
        case 'reviewed':
        case 'shortlisted':
        case 'interview': return 'primary';
        case 'offered': return 'warning';
        case 'hired': return 'success';
        case 'rejected':
        case 'withdrawn': return 'destructive';
        default: return 'muted';
    }
};

export default function ApplicationsIndex({ applications }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<Application>[] = [
        {
            accessorKey: 'job',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Lowongan
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => <Link href={`/jobs/${row.original.job.slug}`} className="font-medium hover:underline">{row.original.job.title}</Link>,
        },
        {
            accessorKey: 'company',
            header: 'Perusahaan',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center overflow-hidden rounded border bg-muted">
                        {row.original.company.logo_url ? <img src={row.original.company.logo_url} alt={row.original.company.name ?? ''} className="size-full object-cover" /> : <Building2 className="size-4 text-muted-foreground" />}
                    </div>
                    <span className="text-sm">{row.original.company.name}</span>
                </div>
            ),
        },
        {
            accessorKey: 'ai_match_score',
            header: 'Match',
            cell: ({ row }) => row.original.ai_match_score !== null ? <div className="flex items-center gap-1"><Sparkles className="size-3.5 text-primary" /><span className="font-semibold">{row.original.ai_match_score}</span></div> : '-',
        },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge tone={statusTone(row.original.status) as never}>{formatStatus(row.original.status)}</StatusBadge> },
        { accessorKey: 'applied_at', header: 'Dikirim', cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.applied_at ? formatDateTime(row.original.applied_at) : '-'}</span> },
        { id: 'actions', enableHiding: false, header: () => <div className="text-right">Aksi</div>, cell: ({ row }) => <div className="text-right"><ActionButton asChild intent="detail"><Link href={`/employee/applications/${row.original.id}`}><Eye className="size-4" /> Detail</Link></ActionButton></div> },
    ];

    const table = useReactTable({
        data: applications.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.job.title, row.original.company.name ?? '', row.original.status ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Lamaran Saya" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Lamaran Saya" description="Pantau status lamaran yang sudah Anda kirim." />
                <Section>
                    {applications.data.length === 0 ? (
                        <EmptyState title="Belum ada lamaran" description="Telusuri lowongan dan kirim lamaran pertama Anda." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari lowongan, perusahaan, status..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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
                                <Table className="min-w-[960px]">
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
