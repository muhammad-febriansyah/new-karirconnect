import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { CheckCircle2, ChevronDown, ChevronsUpDown, Eye, Loader2, XCircle } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';
import { review as adminVerifReview } from '@/routes/admin/company-verifications';

type Item = {
    id: number;
    company: { id: number; name: string };
    document_type: string;
    original_name: string | null;
    status: string;
    uploaded_at: string;
    uploader_name: string | null;
    file_url: string | null;
};

type Props = {
    items: { data: Item[] };
};

export default function AdminVerificationsIndex({ items }: Props) {
    const [reviewing, setReviewing] = useState<{ item: Item; decision: 'approve' | 'reject' } | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const reviewForm = useForm({ decision: 'approve', note: '' });

    const columns: ColumnDef<Item>[] = [
        {
            accessorKey: 'company',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Perusahaan
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium">{row.original.company.name}</div>,
        },
        {
            accessorKey: 'document_type',
            header: 'Dokumen',
            cell: ({ row }) => (
                <div>
                    <div className="font-medium uppercase">{row.original.document_type}</div>
                    <div className="text-xs text-muted-foreground">{row.original.original_name ?? '-'}</div>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <StatusBadge tone={row.original.status === 'approved' ? 'success' : row.original.status === 'rejected' ? 'destructive' : 'warning'}>
                    {formatStatus(row.original.status)}
                </StatusBadge>
            ),
        },
        {
            accessorKey: 'uploaded_at',
            header: 'Diunggah',
            cell: ({ row }) => (
                <div>
                    <div className="text-sm">{formatDateTime(row.original.uploaded_at)}</div>
                    <div className="text-xs text-muted-foreground">{row.original.uploader_name ?? '-'}</div>
                </div>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <ActionGroup className="justify-end">
                    {row.original.file_url && (
                        <ActionButton asChild intent="view">
                            <a href={row.original.file_url} target="_blank" rel="noreferrer">
                                <Eye className="size-4" /> Lihat
                            </a>
                        </ActionButton>
                    )}
                    {row.original.status === 'pending' && (
                        <>
                            <ActionButton intent="approve" onClick={() => { reviewForm.setData({ decision: 'approve', note: '' }); setReviewing({ item: row.original, decision: 'approve' }); }}>
                                <CheckCircle2 className="size-4" /> Setujui
                            </ActionButton>
                            <ActionButton intent="reject" onClick={() => { reviewForm.setData({ decision: 'reject', note: '' }); setReviewing({ item: row.original, decision: 'reject' }); }}>
                                <XCircle className="size-4" /> Tolak
                            </ActionButton>
                        </>
                    )}
                </ActionGroup>
            ),
        },
    ];

    const table = useReactTable({
        data: items.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.company.name, row.original.document_type, row.original.status, row.original.original_name ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!reviewing) {
            return;
        }

        reviewForm.post(adminVerifReview(reviewing.item.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                reviewForm.reset();
                setReviewing(null);
            },
        });
    };

    return (
        <>
            <Head title="Verifikasi Perusahaan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Verifikasi Perusahaan"
                    description="Tinjau dokumen legal yang diunggah perusahaan untuk lencana 'Verified'."
                />

                <Section>
                    {items.data.length === 0 ? (
                        <EmptyState title="Belum ada dokumen" description="Tidak ada dokumen yang menunggu review." />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari perusahaan, dokumen, status..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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

            <Dialog open={reviewing !== null} onOpenChange={(open) => !open && setReviewing(null)}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>
                                {reviewing?.decision === 'approve' ? 'Setujui Dokumen' : 'Tolak Dokumen'}
                            </DialogTitle>
                            <DialogDescription>
                                {reviewing?.decision === 'approve'
                                    ? 'Perusahaan akan mendapatkan lencana Verified.'
                                    : 'Perusahaan akan diberitahu untuk mengunggah ulang dokumen yang valid.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="my-4">
                            <TextareaField
                                label="Catatan (opsional)"
                                rows={3}
                                placeholder="Tambahkan catatan untuk perusahaan…"
                                value={reviewForm.data.note}
                                onChange={(e) => reviewForm.setData('note', e.target.value)}
                                error={reviewForm.errors.note}
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button type="button" variant="outline" onClick={() => setReviewing(null)}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant={reviewing?.decision === 'reject' ? 'destructive' : 'default'}
                                disabled={reviewForm.processing}
                            >
                                {reviewForm.processing ? <Loader2 className="size-4 animate-spin" /> : (
                                    reviewing?.decision === 'approve' ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />
                                )}
                                {reviewing?.decision === 'approve' ? 'Setujui' : 'Tolak'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
