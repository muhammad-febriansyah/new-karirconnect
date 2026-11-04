import type {
    ColumnDef,
    OnChangeFn,
    RowSelectionState,
} from '@tanstack/react-table';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * shadcn/ui data table (TanStack Table) with optional checkbox selection.
 * Paging and filtering stay on the server; this only renders the rows.
 */
export function DataTable<T>({
    columns,
    data,
    getRowId,
    rowSelection,
    onRowSelectionChange,
    canSelect,
    emptyMessage = 'Tidak ada data.',
    minWidth = 900,
    className,
}: {
    columns: ColumnDef<T>[];
    data: T[];
    getRowId: (row: T) => string;
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    canSelect?: (row: T) => boolean;
    emptyMessage?: string;
    minWidth?: number;
    className?: string;
}) {
    const selectable =
        rowSelection !== undefined && onRowSelectionChange !== undefined;

    const table = useReactTable({
        data,
        columns: selectable ? [selectionColumn<T>(), ...columns] : columns,
        getRowId,
        state: selectable ? { rowSelection } : {},
        enableRowSelection: (row) =>
            canSelect ? canSelect(row.original) : true,
        onRowSelectionChange,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className={cn('overflow-x-auto rounded-md border', className)}>
            <Table style={{ minWidth }}>
                <TableHeader className="sticky top-0 z-10 bg-background">
                    {table.getHeaderGroups().map((group) => (
                        <TableRow key={group.id}>
                            {group.headers.map((header) => (
                                <TableHead
                                    key={header.id}
                                    style={
                                        header.column.columnDef.size
                                            ? {
                                                  width: header.column.columnDef
                                                      .size,
                                              }
                                            : undefined
                                    }
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                          )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={
                                    row.getIsSelected() ? 'selected' : undefined
                                }
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={table.getAllColumns().length}
                                className="h-24 text-center text-muted-foreground"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function selectionColumn<T>(): ColumnDef<T> {
    return {
        id: 'select',
        size: 40,
        header: ({ table }) => (
            <Checkbox
                aria-label="Pilih semua di halaman ini"
                checked={
                    table.getIsAllPageRowsSelected()
                        ? true
                        : table.getIsSomePageRowsSelected()
                          ? 'indeterminate'
                          : false
                }
                onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(value === true)
                }
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                aria-label="Pilih baris"
                checked={row.getIsSelected()}
                disabled={!row.getCanSelect()}
                onCheckedChange={(value) => row.toggleSelected(value === true)}
            />
        ),
        enableSorting: false,
        enableHiding: false,
    };
}
