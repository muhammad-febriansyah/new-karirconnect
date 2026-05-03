import { Form, Head } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import CvUploadController from '@/actions/App/Http/Controllers/Employee/CvUploadController';
import { EmptyState } from '@/components/feedback/empty-state';
import { FileUploadField } from '@/components/form/file-upload-field';
import { InputField } from '@/components/form/input-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

type CvItem = {
    id: number;
    label: string;
    source: string;
    file_path: string | null;
    file_url: string | null;
    is_active: boolean;
    created_at: string;
};

export default function EmployeeCvIndex({
    items,
    primaryResumeId,
}: {
    items: CvItem[];
    primaryResumeId: number | null;
}) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<CvItem>[] = [
        {
            accessorKey: 'label',
            header: 'Label CV',
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-medium">{row.original.label}</div>
                    <div className="text-xs text-muted-foreground">Sumber: {row.original.source === 'upload' ? 'Upload' : row.original.source}</div>
                </div>
            ),
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            cell: ({ row }) => (
                row.original.is_active && primaryResumeId === row.original.id ? <Badge>Resume Utama</Badge> : <Badge variant="outline">Sekunder</Badge>
            ),
        },
        {
            accessorKey: 'file_url',
            header: 'File',
            cell: ({ row }) => row.original.file_url ? (
                <a href={row.original.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">Lihat file</a>
            ) : <span className="text-sm text-muted-foreground">-</span>,
        },
        {
            accessorKey: 'created_at',
            header: 'Dibuat',
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.created_at)}</span>,
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <EditCvDialog item={row.original} />
                    <DeleteCvDialog item={row.original} />
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: items,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.label, row.original.source, row.original.file_path ?? ''].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="CV Saya" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="CV Saya"
                    description="Unggah beberapa versi CV dan tandai satu versi sebagai resume utama."
                    actions={<UploadCvDialog />}
                />

                <Section>
                    {items.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6">
                            <EmptyState
                                title="Belum ada CV yang diunggah"
                                description="Unggah CV pertama Anda untuk mulai melamar pekerjaan."
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari label CV..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline">Kolom <ChevronDown className="ml-2 size-4" /></Button></DropdownMenuTrigger>
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
        </>
    );
}

function UploadCvDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>Unggah CV</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Unggah CV</DialogTitle>
                    <DialogDescription>
                        Simpan versi CV yang berbeda sesuai posisi yang Anda incar.
                    </DialogDescription>
                </DialogHeader>

                <Form {...CvUploadController.store.form()} className="space-y-5">
                    {({ processing, errors }) => (
                        <>
                            <InputField
                                name="label"
                                label="Label CV"
                                placeholder="CV Backend 2026"
                                required
                                error={errors.label}
                            />
                            <FileUploadField
                                id="file"
                                name="file"
                                label="File CV"
                                required
                                accept=".pdf,.doc,.docx"
                                error={errors.file}
                            />

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function EditCvDialog({ item }: { item: CvItem }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Ubah</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Ubah CV</DialogTitle>
                    <DialogDescription>
                        Perbarui label atau tandai CV ini sebagai resume utama.
                    </DialogDescription>
                </DialogHeader>

                <Form {...CvUploadController.update.form(item.id)} className="space-y-5">
                    {({ processing, errors }) => (
                        <>
                            <InputField
                                name="label"
                                label="Label CV"
                                defaultValue={item.label}
                                required
                                error={errors.label}
                            />
                            <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    defaultChecked={item.is_active}
                                    className="size-4 rounded border-input"
                                />
                                <span className="text-sm">Jadikan resume utama</span>
                            </label>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Perbarui
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteCvDialog({ item }: { item: CvItem }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive">Hapus</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus CV</DialogTitle>
                    <DialogDescription>
                        CV <span className="font-medium text-foreground">{item.label}</span> akan dihapus permanen.
                    </DialogDescription>
                </DialogHeader>

                <Form {...CvUploadController.destroy.form(item.id)}>
                    {({ processing }) => (
                        <DialogFooter>
                            <Button type="submit" variant="destructive" disabled={processing}>
                                Hapus
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

EmployeeCvIndex.layout = {
    breadcrumbs: [
        {
            title: 'CV Saya',
            href: CvUploadController.index().url,
        },
    ],
};
