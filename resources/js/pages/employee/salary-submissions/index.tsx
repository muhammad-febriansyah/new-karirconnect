import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatStatus } from '@/lib/format-status';

type SubmissionItem = {
    id: number;
    job_title: string;
    salary_idr: number;
    bonus_idr: number;
    experience_level: string | null;
    experience_years: number;
    employment_type: string;
    category: string | null;
    company: string | null;
    city: string | null;
    is_anonymous: boolean;
    status: string;
    created_at: string | null;
};

type Props = { submissions: { data: SubmissionItem[] } };

const idr = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function EmployeeSalarySubmissionsIndex({ submissions }: Props) {
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const remove = (id: number) => {
        router.delete(`/employee/salary-submissions/${id}`, { preserveScroll: true });
        setDeletingId(null);
    };

    const columns: ColumnDef<SubmissionItem>[] = [
        {
            accessorKey: 'job_title',
            header: 'Posisi',
            cell: ({ row }) => (
                <div>
                    <div className="font-semibold">{row.original.job_title}</div>
                    <div className="text-sm text-muted-foreground">{[row.original.category, row.original.company, row.original.city].filter(Boolean).join(' · ') || '-'}</div>
                </div>
            ),
        },
        {
            accessorKey: 'salary_idr',
            header: 'Gaji',
            cell: ({ row }) => (
                <div>
                    <div className="font-semibold">{idr(row.original.salary_idr)}</div>
                    {row.original.bonus_idr > 0 && <div className="text-xs text-muted-foreground">+ {idr(row.original.bonus_idr)}</div>}
                </div>
            ),
        },
        { accessorKey: 'experience_years', header: 'Level', cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatStatus(row.original.experience_level)} · {row.original.experience_years} thn · {formatStatus(row.original.employment_type)}</span> },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant="secondary">{formatStatus(row.original.status)}</Badge> },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => <div className="text-right"><ActionButton intent="delete" onClick={() => setDeletingId(row.original.id)}><Trash2 className="size-4" /> Hapus</ActionButton></div>,
        },
    ];

    const table = useReactTable({
        data: submissions.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.job_title, row.original.category ?? '', row.original.company ?? '', row.original.city ?? '', row.original.status].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Laporan Gaji Saya" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Laporan Gaji Saya" description="Bagikan data gaji secara anonim untuk membantu transparansi pasar." actions={<ActionButton asChild intent="create"><Link href="/employee/salary-submissions/create"><Plus className="size-4" /> Tambah</Link></ActionButton>} />
                <Section>
                    {submissions.data.length === 0 ? (
                        <EmptyState title="Belum ada laporan gaji" description="Tambahkan laporan pertama Anda untuk membantu transparansi pasar." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari posisi, kategori, perusahaan, kota..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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

            <ConfirmDialog
                open={deletingId !== null}
                onOpenChange={(open) => !open && setDeletingId(null)}
                title="Hapus laporan gaji?"
                description="Laporan gaji ini akan dihapus dan tidak lagi dihitung dalam data Anda."
                confirmLabel="Hapus"
                confirmIcon={Trash2}
                variant="destructive"
                onConfirm={() => deletingId !== null && remove(deletingId)}
            />
        </>
    );
}
