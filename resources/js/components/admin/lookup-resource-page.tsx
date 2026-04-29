import { Form, Head } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormField } from '@/components/form/form-field';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
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
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="border-b text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-3 font-medium">Nama</th>
                                        {fields.some((field) => field.name === 'category') && (
                                            <th className="px-3 py-3 font-medium">Kategori</th>
                                        )}
                                        {fields.some((field) => field.name === 'employee_range') && (
                                            <th className="px-3 py-3 font-medium">Rentang</th>
                                        )}
                                        <th className="px-3 py-3 font-medium">Slug</th>
                                        <th className="px-3 py-3 font-medium">Status</th>
                                        <th className="px-3 py-3 font-medium">Urutan</th>
                                        <th className="px-3 py-3 font-medium text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.id} className="border-b align-top last:border-0">
                                            <td className="px-3 py-4">
                                                <div className="font-medium text-foreground">{item.name}</div>
                                                {item.description && (
                                                    <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </td>
                                            {fields.some((field) => field.name === 'category') && (
                                                <td className="px-3 py-4 text-muted-foreground">
                                                    {item.category || '-'}
                                                </td>
                                            )}
                                            {fields.some((field) => field.name === 'employee_range') && (
                                                <td className="px-3 py-4 text-muted-foreground">
                                                    {item.employee_range || '-'}
                                                </td>
                                            )}
                                            <td className="px-3 py-4 text-muted-foreground">{item.slug}</td>
                                            <td className="px-3 py-4">
                                                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-4 text-muted-foreground">
                                                {item.sort_order ?? 0}
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <LookupEditDialog
                                                        title={title}
                                                        item={item}
                                                        fields={fields}
                                                        action={controller.update}
                                                    />
                                                    <LookupDeleteDialog
                                                        title={title}
                                                        item={item}
                                                        action={controller.destroy}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                <Button>
                    <Plus className="size-4" />
                    Tambah Data
                </Button>
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
                <Button variant="outline" size="icon-sm" aria-label={`Ubah ${item.name}`}>
                    <Pencil className="size-4" />
                </Button>
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
                <Button variant="destructive" size="icon-sm" aria-label={`Hapus ${item.name}`}>
                    <Trash2 className="size-4" />
                </Button>
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
                            <Button type="submit" variant="destructive" disabled={processing}>
                                Hapus Data
                            </Button>
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
}: {
    field: LookupField;
    item?: LookupItem;
    error?: string;
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
        <InputField
            {...commonProps}
            defaultValue={(item?.[field.name] as string | null | undefined) ?? ''}
        />
    );
}
