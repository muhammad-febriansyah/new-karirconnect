import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, Download, Eye } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { MatchScoreBadge } from '@/components/shared/match-score-badge';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';
import { index as applicantsIndex } from '@/routes/employer/applicants';

type Option = { value: string; label: string };

type Applicant = {
    id: number;
    status: string | null;
    ai_match_score: number | null;
    expected_salary: number | null;
    applied_at: string | null;
    job: { id: number; title: string; slug: string };
    candidate: {
        id: number;
        name: string | null;
        email: string | null;
        city: string | null;
        avatar_url: string | null;
    };
    cv_url: string | null;
};

type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

type Props = {
    applicants: Pagination<Applicant>;
    filters: { job: number | null; status: string };
    jobOptions: Option[];
    statusOptions: Option[];
};

const statusTone = (status: string | null) => {
    switch (status) {
        case 'submitted':
            return 'info';
        case 'reviewed':
        case 'shortlisted':
        case 'interview':
            return 'primary';
        case 'offered':
            return 'warning';
        case 'hired':
            return 'success';
        case 'rejected':
        case 'withdrawn':
            return 'destructive';
        default:
            return 'muted';
    }
};

export default function ApplicantsIndex({ applicants, filters, jobOptions, statusOptions }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const apply = (next: Partial<Props['filters']>) => {
        router.get(applicantsIndex().url, { ...filters, ...next }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const columns: ColumnDef<Applicant>[] = [
        {
            accessorKey: 'candidate',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Kandidat
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.candidate.name}</div>
                    <div className="text-xs text-muted-foreground">{row.original.candidate.email}</div>
                    {row.original.candidate.city && <div className="text-xs text-muted-foreground">{row.original.candidate.city}</div>}
                </div>
            ),
        },
        { accessorKey: 'job', header: 'Lowongan', cell: ({ row }) => <Link href={`/jobs/${row.original.job.slug}`} className="text-sm font-medium hover:underline">{row.original.job.title}</Link> },
        { accessorKey: 'ai_match_score', header: 'Match', cell: ({ row }) => <MatchScoreBadge score={row.original.ai_match_score} size="sm" /> },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge tone={statusTone(row.original.status) as never}>{formatStatus(row.original.status)}</StatusBadge> },
        { accessorKey: 'applied_at', header: 'Dikirim', cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.applied_at ? formatDateTime(row.original.applied_at) : '-'}</span> },
        { id: 'actions', enableHiding: false, header: () => <div className="text-right">Aksi</div>, cell: ({ row }) => <div className="text-right"><ActionButton asChild intent="detail"><Link href={`/employer/applicants/${row.original.id}`}><Eye className="size-4" /> Detail</Link></ActionButton></div> },
    ];

    const table = useReactTable({
        data: applicants.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.candidate.name ?? '', row.original.candidate.email ?? '', row.original.candidate.city ?? '', row.original.job.title ?? '', row.original.status ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Pelamar" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Pelamar"
                    description="Tinjau lamaran yang masuk dan kelola statusnya."
                    actions={
                        <ActionButton asChild intent="download">
                            <a
                                href={`/employer/applicants/export?${new URLSearchParams({
                                    ...(filters.job ? { job: String(filters.job) } : {}),
                                    ...(filters.status ? { status: filters.status } : {}),
                                }).toString()}`}
                            >
                                <Download className="size-4" /> Export CSV
                            </a>
                        </ActionButton>
                    }
                />

                <Section>
                    <div className="mb-4 flex flex-wrap gap-2">
                        <Input className="min-w-[220px] flex-1 md:max-w-sm" placeholder="Cari kandidat, email, lowongan..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
                        <Select
                            value={String(filters.job ?? '')}
                            onValueChange={(v) => apply({ job: v === 'all' ? null : Number(v) })}
                        >
                            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Semua lowongan" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua lowongan</SelectItem>
                                {jobOptions.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.status}
                            onValueChange={(v) => apply({ status: v === 'all' ? '' : v })}
                        >
                            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semua status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua status</SelectItem>
                                {statusOptions.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline">Kolom <ChevronDown className="ml-2 size-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                                    <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}>{column.id}</DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {applicants.data.length === 0 ? (
                        <EmptyState
                            title="Belum ada pelamar"
                            description="Sebarkan lowongan Anda agar mendapatkan kandidat berkualitas."
                        />
                    ) : (
                        <div className="rounded-md border">
                            <Table className="min-w-[1020px]">
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
                                        <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">Belum ada pelamar.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{applicants.from ?? 0}–{applicants.to ?? 0} dari {applicants.total}</span>
                        <div className="flex gap-1">
                            {applicants.links.map((l, i) => (
                                <Button
                                    key={i}
                                    variant={l.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!l.url}
                                    onClick={() => l.url && router.get(l.url, undefined, { preserveScroll: true })}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    </div>
                </Section>
            </div>
        </>
    );
}
