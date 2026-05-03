import { Head, Link } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Bot, Calendar, ChevronDown, Eye, MapPin, Video } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type Interview = {
    id: number;
    title: string;
    stage: string | null;
    mode: string | null;
    status: string | null;
    scheduled_at: string | null;
    duration_minutes: number;
    meeting_url: string | null;
    job: { title: string | null; slug: string | null };
    company: { name: string | null; slug: string | null };
};

type Props = { interviews: { data: Interview[] } };

const modeIcon = (mode: string | null) => {
    switch (mode) {
        case 'ai': return <Bot className="size-4" />;
        case 'online': return <Video className="size-4" />;
        case 'onsite': return <MapPin className="size-4" />;
        default: return <Calendar className="size-4" />;
    }
};

const statusTone = (status: string | null) => {
    switch (status) {
        case 'scheduled':
        case 'rescheduled': return 'info';
        case 'ongoing': return 'primary';
        case 'completed': return 'success';
        case 'cancelled':
        case 'no_show':
        case 'expired': return 'destructive';
        default: return 'muted';
    }
};

export default function EmployeeInterviewsIndex({ interviews }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<Interview>[] = [
        {
            accessorKey: 'title',
            header: 'Interview',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md border bg-muted">{modeIcon(row.original.mode)}</div>
                    <div>
                        <div className="font-semibold">{row.original.title}</div>
                        <div className="text-xs text-muted-foreground">{formatStatus(row.original.mode)} · {formatStatus(row.original.stage)}</div>
                    </div>
                </div>
            ),
        },
        { accessorKey: 'job', header: 'Posisi & Perusahaan', cell: ({ row }) => <div><div className="font-medium">{row.original.job.title ?? '-'}</div><div className="text-xs text-muted-foreground">{row.original.company.name ?? '-'}</div></div> },
        { accessorKey: 'scheduled_at', header: 'Jadwal', cell: ({ row }) => <div><div className="text-sm">{row.original.scheduled_at ? formatDateTime(row.original.scheduled_at) : '-'}</div><Badge variant="secondary" className="mt-1">{row.original.duration_minutes} menit</Badge></div> },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge tone={statusTone(row.original.status) as never}>{formatStatus(row.original.status)}</StatusBadge> },
        { id: 'actions', enableHiding: false, header: () => <div className="text-right">Aksi</div>, cell: ({ row }) => <div className="text-right"><ActionButton asChild intent="detail"><Link href={`/employee/interviews/${row.original.id}`}><Eye className="size-4" /> Detail</Link></ActionButton></div> },
    ];

    const table = useReactTable({
        data: interviews.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.title, row.original.job.title ?? '', row.original.company.name ?? '', row.original.stage ?? '', row.original.status ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Interview Saya" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Interview Saya" description="Kelola jadwal interview Anda dari berbagai perusahaan." />
                <Section>
                    {interviews.data.length === 0 ? (
                        <EmptyState title="Belum ada interview terjadwal" description="Tunggu undangan dari recruiter setelah lamaran Anda di-shortlist." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari judul, posisi, perusahaan, status..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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
                    )}
                </Section>
            </div>
        </>
    );
}
