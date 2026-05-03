import { Head, Link } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, Eye, Plus } from 'lucide-react';
import { useState } from 'react';
import JobController from '@/actions/App/Http/Controllers/Employer/JobController';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type JobRow = {
    id: number;
    title: string;
    slug: string;
    status: string;
    applications_count: number;
    views_count: number;
    published_at: string | null;
    category: { id: number; name: string } | null;
    city: { id: number; name: string } | null;
    skills: Array<{ id: number; name: string }>;
    screening_questions_count: number;
};

type Props = {
    company: { id: number; name: string };
    jobs: { data: JobRow[]; total: number };
};

export default function EmployerJobsIndex({ company, jobs }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<JobRow>[] = [
        {
            accessorKey: 'title',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Lowongan
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.title}</div>
                    <div className="text-xs text-muted-foreground">{row.original.category?.name ?? '-'} • {row.original.city?.name ?? 'Lokasi fleksibel'}</div>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <StatusBadge tone={row.original.status === 'published' ? 'success' : row.original.status === 'closed' ? 'warning' : 'secondary'}>{row.original.status}</StatusBadge>,
        },
        {
            accessorKey: 'applications_count',
            header: 'Statistik',
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.views_count} views • {row.original.applications_count} aplikasi</span>,
        },
        { accessorKey: 'screening_questions_count', header: 'Screening' },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <ActionGroup className="justify-end">
                    <ActionButton asChild intent="edit"><Link href={JobController.edit(row.original.slug).url}>Ubah</Link></ActionButton>
                    <ActionButton asChild intent="detail"><Link href={JobController.show(row.original.slug).url}><Eye className="size-4" /> Detail</Link></ActionButton>
                </ActionGroup>
            ),
        },
    ];

    const table = useReactTable({
        data: jobs.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.title, row.original.status, row.original.category?.name ?? '', row.original.city?.name ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Lowongan" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Lowongan" description={`Kelola lowongan aktif untuk ${company.name}.`} actions={<ActionButton asChild intent="create"><Link href={JobController.create().url}><Plus className="size-4" /> Buat Lowongan</Link></ActionButton>} />
                <Section>
                    {jobs.data.length === 0 ? (
                        <EmptyState title="Belum ada lowongan" description="Mulai dengan membuat lowongan pertama Anda." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Cari judul, kategori, kota..." />
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

EmployerJobsIndex.layout = {
    breadcrumbs: [{ title: 'Lowongan', href: JobController.index().url }],
};
