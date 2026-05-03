import { Form, Head } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormField } from '@/components/form/form-field';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
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

type FieldOption = {
    value: string;
    label: string;
};

type FieldConfig = {
    name: string;
    label: string;
    type?: 'text' | 'textarea' | 'date' | 'number' | 'url' | 'checkbox' | 'select';
    placeholder?: string;
    required?: boolean;
    description?: string;
    options?: FieldOption[];
};

type ResourceAction<TArgs extends unknown[] = []> = {
    form: (...args: TArgs) => {
        action: string;
        method: 'get' | 'post';
    };
};

type ControllerActions = {
    index: () => { url: string };
    store: ResourceAction;
    update: ResourceAction<[number]>;
    destroy: ResourceAction<[number]>;
};

type ResourceItem = Record<string, string | number | boolean | null> & {
    id: number;
};

type Props = {
    title: string;
    description: string;
    items: ResourceItem[];
    fields: FieldConfig[];
    actions: ControllerActions;
    emptyMessage: string;
    topContent?: React.ReactNode;
};

export function ProfileRecordPage({
    title,
    description,
    items,
    fields,
    actions,
    emptyMessage,
    topContent,
}: Props) {
    return (
        <>
            <Head title={title} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={title}
                    description={description}
                    actions={
                        <EditDialog
                            title={title}
                            fields={fields}
                            submitLabel="Simpan"
                            action={actions.store}
                        />
                    }
                />
                {topContent}

                <Section>
                    {items.length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {fields.map((field) => (
                                            <TableHead key={field.name}>{field.label}</TableHead>
                                        ))}
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            {fields.map((field) => (
                                                <TableCell key={`${item.id}-${field.name}`} className="align-top">
                                                    <span className="block max-w-xs whitespace-normal text-sm font-medium text-foreground">
                                                        {formatValue(item[field.name], field)}
                                                    </span>
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <EditDialog
                                                        title={title}
                                                        fields={fields}
                                                        submitLabel="Perbarui"
                                                        action={actions.update}
                                                        item={item}
                                                    />
                                                    <DeleteDialog
                                                        title={title}
                                                        item={item}
                                                        action={actions.destroy}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}

function EditDialog({
    title,
    fields,
    submitLabel,
    action,
    item,
}: {
    title: string;
    fields: FieldConfig[];
    submitLabel: string;
    action: ResourceAction | ResourceAction<[number]>;
    item?: ResourceItem;
}) {
    const form = item
        ? (action as ResourceAction<[number]>).form(item.id)
        : (action as ResourceAction).form();

    return (
        <Dialog>
            <DialogTrigger asChild>
                {item ? (
                    <Button variant="outline" size="icon-sm">
                        <Pencil className="size-4" />
                    </Button>
                ) : (
                    <Button>
                        <Plus className="size-4" />
                        Tambah Data
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{item ? `Ubah ${title}` : `Tambah ${title}`}</DialogTitle>
                    <DialogDescription>
                        {item ? 'Perbarui data yang sudah ada.' : 'Tambahkan data baru ke profil Anda.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form} className="space-y-5">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                {fields.map((field) => (
                                    <FieldInput
                                        key={field.name}
                                        field={field}
                                        item={item}
                                        error={errors[field.name]}
                                    />
                                ))}
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    {submitLabel}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteDialog({
    title,
    item,
    action,
}: {
    title: string;
    item: ResourceItem;
    action: ResourceAction<[number]>;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive" size="icon-sm">
                    <Trash2 className="size-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus {title}</DialogTitle>
                    <DialogDescription>
                        Data ini akan dihapus permanen dari profil Anda.
                    </DialogDescription>
                </DialogHeader>

                <Form {...action.form(item.id)}>
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

function FieldInput({
    field,
    item,
    error,
}: {
    field: FieldConfig;
    item?: ResourceItem;
    error?: string;
}) {
    const value = item?.[field.name];

    if (field.type === 'textarea') {
        return (
            <div className="md:col-span-2">
                <TextareaField
                    name={field.name}
                    label={field.label}
                    description={field.description}
                    placeholder={field.placeholder}
                    required={field.required}
                    defaultValue={typeof value === 'string' ? value : ''}
                    error={error}
                    rows={4}
                />
            </div>
        );
    }

    if (field.type === 'checkbox') {
        return (
            <div className="md:col-span-2">
                <FormField label={field.label} description={field.description} error={error}>
                    <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                        <input
                            type="checkbox"
                            name={field.name}
                            defaultChecked={Boolean(value)}
                            className="size-4 rounded border-input"
                        />
                        <span className="text-sm">Aktifkan</span>
                    </label>
                </FormField>
            </div>
        );
    }

    if (field.type === 'select') {
        return (
            <FormField
                label={field.label}
                description={field.description}
                error={error}
                required={field.required}
            >
                <select
                    name={field.name}
                    defaultValue={typeof value === 'string' ? value : ''}
                    className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                    <option value="">Pilih...</option>
                    {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </FormField>
        );
    }

    return (
        <InputField
            name={field.name}
            label={field.label}
            description={field.description}
            placeholder={field.placeholder}
            required={field.required}
            error={error}
            type={field.type ?? 'text'}
            defaultValue={value === null || value === undefined ? '' : String(value)}
        />
    );
}

function formatValue(value: string | number | boolean | null | undefined, field: FieldConfig): string {
    if (field.type === 'checkbox') {
        return value ? 'Ya' : 'Tidak';
    }

    if (value === null || value === undefined || value === '') {
        return '-';
    }

    if (field.type === 'select') {
        return field.options?.find((option) => option.value === value)?.label ?? String(value);
    }

    return String(value);
}
