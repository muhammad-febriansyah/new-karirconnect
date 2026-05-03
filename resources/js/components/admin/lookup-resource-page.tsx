import { Form, Head } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FormField } from '@/components/form/form-field';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { slugify } from '@/lib/slugify';
import type { BreadcrumbItem } from '@/types';

type LookupAction<TArgs extends unknown[] = []> = {
    form: (...args: TArgs) => {
        action: string;
        method: 'get' | 'post';
    };
};

type LookupController = {
    index: () => { url: string; method: string };
    store: LookupAction;
    update: LookupAction<[number]>;
    destroy: LookupAction<[number]>;
};

type LookupField = {
    name: 'name' | 'slug' | 'description' | 'category' | 'employee_range' | 'sort_order';
    label: string;
    type?: 'text' | 'textarea' | 'number';
    placeholder?: string;
    required?: boolean;
    description?: string;
};

type LookupItem = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    category?: string | null;
    employee_range?: string | null;
    sort_order?: number | null;
    is_active: boolean;
};

type Props = {
    title: string;
    description: string;
    items: LookupItem[];
    fields: LookupField[];
    controller: LookupController;
    emptyMessage: string;
};

export function LookupResourcePage({
    title,
    description,
    items,
    fields,
    controller,
    emptyMessage,
}: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<LookupItem>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-2 h-auto px-2" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Nama
                    <ChevronsUpDown className="ml-1 size-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div>
                    <div className="font-medium text-foreground">{row.original.name}</div>
                    {row.original.description && <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{row.original.description}</p>}
                </div>
            ),
        },
        ...(fields.some((field) => field.name === 'category')
            ? [{
                accessorKey: 'category',
                header: 'Kategori',
                cell: ({ row }: { row: { original: LookupItem } }) => <span className="text-muted-foreground">{row.original.category || '-'}</span>,
            } satisfies ColumnDef<LookupItem>]
            : []),
        ...(fields.some((field) => field.name === 'employee_range')
            ? [{
                accessorKey: 'employee_range',
                header: 'Rentang',
                cell: ({ row }: { row: { original: LookupItem } }) => <span className="text-muted-foreground">{row.original.employee_range || '-'}</span>,
            } satisfies ColumnDef<LookupItem>]
            : []),
        {
            accessorKey: 'slug',
            header: 'Slug',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.slug}</span>,
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
                    {row.original.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
            ),
        },
        {
            accessorKey: 'sort_order',
            header: 'Urutan',
            cell: ({ row }) => <span className="text-muted-foreground">{row.original.sort_order ?? 0}</span>,
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <ActionGroup>
                        <LookupEditDialog
                            title={title}
                            item={row.original}
                            fields={fields}
                            action={controller.update}
                        />
                        <LookupDeleteDialog
                            title={title}
                            item={row.original}
                            action={controller.destroy}
                        />
                    </ActionGroup>
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
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.name, row.original.slug, row.original.description, row.original.category, row.original.employee_range]
                .filter(Boolean)
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
            <Head title={title} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={title}
                    description={description}
                    actions={
                        <LookupCreateDialog
                            title={title}
                            fields={fields}
                            action={controller.store}
                        />
                    }
                />

                <Section
                    title={`Daftar ${title}`}
                    description="Perubahan akan langsung dipakai oleh modul lain yang bergantung pada master data ini."
                >
                    {items.length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input
                                    placeholder="Cari nama, slug, kategori, deskripsi"
                                    value={globalFilter}
                                    onChange={(event) => setGlobalFilter(event.target.value)}
                                    className="sm:max-w-sm"
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            Kolom <ChevronDown className="ml-2 size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                                            >
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="rounded-md border">
                                <Table className="min-w-[860px]">
                                    <TableHeader>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead key={header.id}>
                                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows.length > 0 ? (
                                            table.getRowModel().rows.map((row) => (
                                                <TableRow key={row.id}>
                                                    {row.getVisibleCells().map((cell) => (
                                                        <TableCell key={cell.id}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">
                                                    Tidak ada data.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                <span>Menampilkan {table.getRowModel().rows.length} dari {items.length} data</span>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Sebelumnya</Button>
                                    <span className="text-xs">Halaman {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
                                    <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Berikutnya</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}

LookupResourcePage.layout = {
    breadcrumbs: [] as BreadcrumbItem[],
};

function LookupCreateDialog({
    title,
    fields,
    action,
}: {
    title: string;
    fields: LookupField[];
    action: LookupAction;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <ActionButton intent="create">
                    <Plus className="size-4" />
                    Tambah Data
                </ActionButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Tambah {title}</DialogTitle>
                    <DialogDescription>
                        Tambahkan entri baru untuk master data ini.
                    </DialogDescription>
                </DialogHeader>

                <LookupForm action={action} fields={fields} submitLabel="Simpan" />
            </DialogContent>
        </Dialog>
    );
}

function LookupEditDialog({
    title,
    item,
    fields,
    action,
}: {
    title: string;
    item: LookupItem;
    fields: LookupField[];
    action: LookupAction<[number]>;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <ActionButton intent="edit" aria-label={`Ubah ${item.name}`}>
                    <Pencil className="size-4" />
                    Ubah
                </ActionButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Ubah {title}</DialogTitle>
                    <DialogDescription>
                        Perbarui detail untuk {item.name}.
                    </DialogDescription>
                </DialogHeader>

                <LookupForm
                    action={action}
                    actionArgs={[item.id]}
                    fields={fields}
                    item={item}
                    submitLabel="Perbarui"
                />
            </DialogContent>
        </Dialog>
    );
}

function LookupDeleteDialog({
    title,
    item,
    action,
}: {
    title: string;
    item: LookupItem;
    action: LookupAction<[number]>;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <ActionButton intent="delete" aria-label={`Hapus ${item.name}`}>
                    <Trash2 className="size-4" />
                    Hapus
                </ActionButton>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus {title}</DialogTitle>
                    <DialogDescription>
                        Data <span className="font-medium text-foreground">{item.name}</span> akan dihapus permanen.
                    </DialogDescription>
                </DialogHeader>

                <Form {...action.form(item.id)} className="space-y-4">
                    {({ processing }) => (
                        <DialogFooter>
                            <ActionButton type="submit" intent="delete" disabled={processing}>
                                Hapus Data
                            </ActionButton>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function LookupForm({
    action,
    actionArgs = [],
    fields,
    item,
    submitLabel,
}: {
    action: LookupAction | LookupAction<[number]>;
    actionArgs?: [] | [number];
    fields: LookupField[];
    item?: LookupItem;
    submitLabel: string;
}) {
    const [name, setName] = useState((item?.name as string | undefined) ?? '');
    const [slug, setSlug] = useState((item?.slug as string | undefined) ?? '');
    const [slugTouched, setSlugTouched] = useState(Boolean(item));

    const form =
        actionArgs.length === 0
            ? (action as LookupAction).form()
            : (action as LookupAction<[number]>).form(actionArgs[0]);

    return (
        <Form {...form} className="space-y-5">
            {({ processing, errors }) => (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        {fields.map((field) => (
                            <LookupFieldInput
                                key={field.name}
                                field={field}
                                item={item}
                                error={errors[field.name]}
                                value={field.name === 'name' ? name : field.name === 'slug' ? slug : undefined}
                                onChange={
                                    field.name === 'name'
                                        ? (value) => {
                                            setName(value);

                                            if (!slugTouched) {
                                                setSlug(slugify(value));
                                            }
                                        }
                                        : field.name === 'slug'
                                          ? (value) => {
                                              setSlug(value);
                                              setSlugTouched(true);
                                          }
                                          : undefined
                                }
                            />
                        ))}

                        <div className="md:col-span-2">
                            <FormField
                                label="Status"
                                description="Nonaktifkan jika data ini tidak boleh dipakai di form lain."
                                error={errors.is_active}
                            >
                                <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        defaultChecked={item?.is_active ?? true}
                                        className="size-4 rounded border-input"
                                    />
                                    <span className="text-sm">Aktif</span>
                                </label>
                            </FormField>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={processing}>
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </>
            )}
        </Form>
    );
}

function LookupFieldInput({
    field,
    item,
    error,
    value,
    onChange,
}: {
    field: LookupField;
    item?: LookupItem;
    error?: string;
    value?: string;
    onChange?: (value: string) => void;
}) {
    const commonProps = {
        name: field.name,
        label: field.label,
        description: field.description,
        placeholder: field.placeholder,
        required: field.required,
        error,
    };

    if (field.type === 'textarea') {
        return (
            <div className="md:col-span-2">
                <TextareaField
                    {...commonProps}
                    rows={4}
                    defaultValue={(item?.[field.name] as string | null | undefined) ?? ''}
                />
            </div>
        );
    }

    if (field.type === 'number') {
        return (
            <InputField
                {...commonProps}
                type="number"
                min={0}
                defaultValue={(item?.[field.name] as number | null | undefined) ?? 0}
            />
        );
    }

    return (
        value !== undefined ? (
            <InputField
                {...commonProps}
                value={value}
                onChange={onChange ? (event) => onChange(event.target.value) : undefined}
            />
        ) : (
            <InputField
                {...commonProps}
                defaultValue={(item?.[field.name] as string | null | undefined) ?? ''}
            />
        )
    );
}
