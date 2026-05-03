import { Head, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, Reply, Star } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/format-date';

type ReviewItem = {
    id: number;
    title: string;
    rating: number;
    pros: string | null;
    cons: string | null;
    advice_to_management: string | null;
    employment_status: string;
    job_title: string | null;
    would_recommend: boolean;
    is_anonymous: boolean;
    author_name: string | null;
    response_body: string | null;
    responded_at: string | null;
    created_at: string | null;
};

type Paginator<T> = { data: T[] };
type Props = { reviews: Paginator<ReviewItem> };

function ResponseForm({ reviewId }: { reviewId: number }) {
    const { data, setData, post, processing, reset } = useForm({ response_body: '' });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/employer/company-reviews/${reviewId}/respond`, { preserveScroll: true, onSuccess: () => reset() });
    };
    return (
        <form onSubmit={submit} className="space-y-2">
            <Textarea rows={3} value={data.response_body} onChange={(e) => setData('response_body', e.target.value)} placeholder="Tanggapan resmi dari perusahaan..." />
            <Button size="sm" type="submit" disabled={processing}><Reply className="size-4" /> Kirim Tanggapan</Button>
        </form>
    );
}

export default function EmployerCompanyReviewsIndex({ reviews }: Props) {
    const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<ReviewItem>[] = [
        {
            accessorKey: 'title',
            header: 'Review',
            cell: ({ row }) => (
                <div>
                    <div className="font-semibold">{row.original.title}</div>
                    <div className="text-sm text-muted-foreground">
                        {row.original.author_name ?? 'Anonim'} · {row.original.job_title ?? '-'} · {row.original.employment_status === 'current' ? 'Karyawan' : 'Mantan'}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'rating',
            header: 'Rating',
            cell: ({ row }) => (
                <div className="space-y-1">
                    <span className="flex items-center gap-1 text-sm"><Star className="size-3 text-yellow-500" /> {row.original.rating}/5</span>
                    {row.original.would_recommend && <Badge variant="secondary">Direkomendasikan</Badge>}
                </div>
            ),
        },
        {
            id: 'feedback',
            header: 'Isi Review',
            cell: ({ row }) => (
                <div className="space-y-1 text-sm">
                    {row.original.pros && <p><span className="font-semibold text-green-600">+ </span>{row.original.pros}</p>}
                    {row.original.cons && <p><span className="font-semibold text-red-600">- </span>{row.original.cons}</p>}
                    {row.original.advice_to_management && <p className="italic">Saran: {row.original.advice_to_management}</p>}
                </div>
            ),
        },
        {
            id: 'response',
            header: 'Tanggapan',
            cell: ({ row }) => (
                <div className="min-w-64">
                    {row.original.response_body ? (
                        <div className="rounded border-l-2 border-primary bg-primary/5 p-2 text-sm">
                            <div className="text-xs text-muted-foreground">Tanggapan resmi · {row.original.responded_at ? formatDateTime(row.original.responded_at) : ''}</div>
                            <p className="whitespace-pre-line">{row.original.response_body}</p>
                        </div>
                    ) : (
                        activeReplyId === row.original.id ? (
                            <ResponseForm reviewId={row.original.id} />
                        ) : (
                            <Button size="sm" variant="outline" onClick={() => setActiveReplyId(row.original.id)}>
                                <Reply className="size-4" /> Tanggapi
                            </Button>
                        )
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'created_at',
            header: 'Tanggal',
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.created_at ? formatDateTime(row.original.created_at) : '-'}</span>,
        },
    ];

    const table = useReactTable({
        data: reviews.data,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [
                row.original.title,
                row.original.author_name ?? '',
                row.original.job_title ?? '',
                row.original.pros ?? '',
                row.original.cons ?? '',
                row.original.advice_to_management ?? '',
                row.original.response_body ?? '',
            ].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Review Perusahaan" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Review Tentang Perusahaan Anda"
                    description="Tanggapi review secara profesional untuk membangun citra positif."
                />

                <Section>
                    {reviews.data.length === 0 ? (
                        <EmptyState
                            title="Belum ada review yang terpublikasi"
                            description="Review publik tentang perusahaan Anda akan muncul di sini."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari review, penulis, posisi..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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
                                <Table className="min-w-[1200px]">
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
