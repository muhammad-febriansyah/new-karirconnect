import { Head, Link } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Bot, ChevronDown, Eye } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

type Session = {
    id: number;
    completed_at: string | null;
    duration_seconds: number | null;
    candidate_name: string | null;
    candidate_email: string | null;
    job_title: string | null;
    job_slug: string | null;
    overall_score: number | null;
    recommendation: string | null;
};

type Props = { sessions: { data: Session[] } };

export default function EmployerAiInterviewsIndex({ sessions }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<Session>[] = [
        { accessorKey: 'candidate_name', header: 'Kandidat', cell: ({ row }) => <div><div className="font-medium">{row.original.candidate_name}</div><div className="text-xs text-muted-foreground">{row.original.candidate_email}</div></div> },
        { accessorKey: 'job_title', header: 'Lowongan' },
        { accessorKey: 'overall_score', header: 'Skor', cell: ({ row }) => <span className="flex items-center gap-1.5 text-sm"><Bot className="size-3.5 text-primary" /><span className="font-semibold">{row.original.overall_score ?? '-'}</span></span> },
        { accessorKey: 'recommendation', header: 'Rekomendasi', cell: ({ row }) => <Badge variant="secondary">{row.original.recommendation ?? '-'}</Badge> },
        { accessorKey: 'completed_at', header: 'Selesai', cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.completed_at ? formatDateTime(row.original.completed_at) : '-'}</span> },
        { id: 'actions', enableHiding: false, header: () => <div className="text-right">Aksi</div>, cell: ({ row }) => <div className="text-right"><ActionButton asChild intent="detail"><Link href={`/employer/ai-interviews/${row.original.id}`}><Eye className="size-4" /> Detail</Link></ActionButton></div> },
    ];

    const table = useReactTable({
        data: sessions.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.candidate_name ?? '', row.original.candidate_email ?? '', row.original.job_title ?? '', row.original.recommendation ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Hasil AI Interview" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Hasil AI Interview" description="Tinjau hasil AI Interview dari kandidat untuk lowongan Anda." />
                <Section>
                    {sessions.data.length === 0 ? (
                        <EmptyState title="Belum ada hasil" description="Sesi AI Interview yang sudah selesai akan muncul di sini." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari kandidat, email, lowongan..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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
                                <Table className="min-w-[920px]">
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
                                            <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">Belum ada data.</TableCell></TableRow>
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
