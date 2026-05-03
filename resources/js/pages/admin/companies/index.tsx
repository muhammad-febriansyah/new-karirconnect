import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { CheckCircle2, ChevronDown, ChevronsUpDown, Eye, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatStatus } from '@/lib/format-status';
import { approve as companyApprove, index as adminCompaniesIndex, show as companyShow, suspend as companySuspend } from '@/routes/admin/companies';

type Owner = { id: number; name: string; email: string };
type Company = {
    id: number;
    name: string;
    slug: string;
    status: string;
    verification_status: string;
    owner: Owner | null;
    members_count: number;
    created_at: string;
};

type Props = { companies: { data: Company[] } };

export default function AdminCompaniesIndex({ companies }: Props) {
    const [pendingAction, setPendingAction] = useState<{ type: 'approve' | 'suspend'; company: Company } | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const handleConfirm = () => {
        if (!pendingAction) return;
        const url = pendingAction.type === 'approve' ? companyApprove(pendingAction.company.id).url : companySuspend(pendingAction.company.id).url;
        router.post(url, {}, { preserveScroll: true, onFinish: () => setPendingAction(null) });
    };

    const columns: ColumnDef<Company>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Perusahaan
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
        },
        {
            accessorKey: 'owner',
            header: 'Owner',
            cell: ({ row }) => (
                <div>
                    <div className="text-sm">{row.original.owner?.name ?? '-'}</div>
                    <div className="text-xs text-muted-foreground">{row.original.owner?.email ?? '-'}</div>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <StatusBadge tone={row.original.status === 'approved' ? 'success' : row.original.status === 'suspended' ? 'destructive' : 'warning'}>
                    {formatStatus(row.original.status)}
                </StatusBadge>
            ),
        },
        {
            accessorKey: 'verification_status',
            header: 'Verifikasi',
            cell: ({ row }) => (
                <StatusBadge tone={row.original.verification_status === 'verified' ? 'success' : 'muted'}>
                    {formatStatus(row.original.verification_status)}
                </StatusBadge>
            ),
        },
        {
            accessorKey: 'members_count',
            header: 'Tim',
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <ActionGroup className="justify-end">
                    <ActionButton asChild intent="view">
                        <Link href={companyShow(row.original.id).url}>
                            <Eye className="size-4" /> Lihat
                        </Link>
                    </ActionButton>
                    {row.original.status !== 'approved' && (
                        <ActionButton intent="approve" onClick={() => setPendingAction({ type: 'approve', company: row.original })}>
                            <CheckCircle2 className="size-4" /> Setujui
                        </ActionButton>
                    )}
                    {row.original.status !== 'suspended' && (
                        <ActionButton intent="suspend" onClick={() => setPendingAction({ type: 'suspend', company: row.original })}>
                            <ShieldOff className="size-4" /> Suspend
                        </ActionButton>
                    )}
                </ActionGroup>
            ),
        },
    ];

    const table = useReactTable({
        data: companies.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.name, row.original.status, row.original.verification_status, row.original.owner?.name ?? '', row.original.owner?.email ?? '']
                .join(' ')
                .toLowerCase()
                .includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Manajemen Perusahaan" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Perusahaan" description="Setujui, lihat detail, dan nonaktifkan akun perusahaan di platform." />
                <Section>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Input className="sm:max-w-sm" placeholder="Cari perusahaan atau owner..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">Kolom <ChevronDown className="ml-2 size-4" /></Button>
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
                </Section>
            </div>

            <ConfirmDialog
                open={pendingAction !== null}
                onOpenChange={(open) => !open && setPendingAction(null)}
                title={pendingAction?.type === 'approve' ? 'Setujui perusahaan?' : 'Nonaktifkan perusahaan?'}
                description={pendingAction ? `${pendingAction.company.name} akan ${pendingAction.type === 'approve' ? 'dapat' : 'tidak dapat'} memposting lowongan.` : ''}
                confirmLabel={pendingAction?.type === 'approve' ? 'Setujui' : 'Nonaktifkan'}
                variant={pendingAction?.type === 'suspend' ? 'destructive' : 'default'}
                confirmIcon={pendingAction?.type === 'approve' ? CheckCircle2 : ShieldOff}
                onConfirm={handleConfirm}
            />
        </>
    );
}

AdminCompaniesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Perusahaan',
            href: adminCompaniesIndex().url,
        },
    ],
};
