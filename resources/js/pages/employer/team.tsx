import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Trash2, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { destroy as teamDestroy, store as teamStore } from '@/routes/employer/team';

type Member = {
    id: number;
    user_id: number;
    name: string | null;
    email: string | null;
    role: string;
    invited_at: string | null;
    joined_at: string | null;
};

type Props = {
    company: { id: number; name: string; owner_id: number } | null;
    members: Member[];
};

export default function TeamPage({ company, members }: Props) {
    const form = useForm({ email: '', role: 'recruiter' });
    const [deleting, setDeleting] = useState<Member | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.post(teamStore().url, {
            preserveScroll: true,
            onSuccess: () => form.reset('email'),
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(teamDestroy(deleting.id).url, {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    if (!company) {
        return (
            <>
                <Head title="Tim" />
                <div className="space-y-6 p-4 sm:p-6">
                    <PageHeader title="Tim Perusahaan" />
                    <EmptyState
                        title="Perusahaan belum terdaftar"
                        description="Daftarkan perusahaan Anda terlebih dahulu."
                    />
                </div>
            </>
        );
    }

    const columns: ColumnDef<Member>[] = [
        { accessorKey: 'name', header: 'Nama', cell: ({ row }) => <div className="font-medium">{row.original.name}</div> },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'role', header: 'Peran', cell: ({ row }) => <StatusBadge tone={row.original.role === 'owner' ? 'primary' : 'secondary'}>{row.original.role}</StatusBadge> },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    {row.original.user_id !== company.owner_id && (
                        <ActionButton intent="delete" onClick={() => setDeleting(row.original)}>
                            <Trash2 className="size-4" /> Hapus
                        </ActionButton>
                    )}
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: members,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.name ?? '', row.original.email ?? '', row.original.role].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Tim" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Tim Perusahaan"
                    description="Undang recruiter atau admin untuk membantu mengelola lowongan dan pelamar."
                />

                <Section title="Undang Anggota Baru">
                    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_200px_auto] md:items-end">
                        <InputField
                            label="Email Pengguna"
                            type="email"
                            required
                            placeholder="email@domain.com"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            error={form.errors.email}
                        />
                        <SelectField
                            label="Peran"
                            value={form.data.role}
                            onValueChange={(v) => form.setData('role', v)}
                            options={[
                                { value: 'recruiter', label: 'Recruiter' },
                                { value: 'admin', label: 'Admin Perusahaan' },
                            ]}
                            error={form.errors.role}
                        />
                        <ActionButton type="submit" intent="create" disabled={form.processing}>
                            <UserPlus className="size-4" /> Undang
                        </ActionButton>
                    </form>
                </Section>

                <Section title={`Anggota (${members.length})`}>
                    {members.length === 0 ? (
                        <EmptyState
                            title="Belum ada anggota"
                            description="Mulai bangun tim hiring dengan menambahkan recruiter."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari nama, email, role..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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
                                <Table className="min-w-[760px]">
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
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus anggota tim?"
                description={
                    deleting
                        ? `${deleting.name} akan kehilangan akses ke perusahaan ini.`
                        : ''
                }
                confirmLabel="Hapus"
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={confirmDelete}
            />
        </>
    );
}
