import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import MessageTemplateController from '@/actions/App/Http/Controllers/Employer/MessageTemplateController';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type Option = { value: string; label: string };

type Template = {
    id: number;
    name: string;
    category: string;
    category_label: string;
    body: string;
    is_active: boolean;
    sort_order: number;
    created_by: string | null;
    updated_at: string | null;
};

type Props = {
    templates: Template[];
    categories: Option[];
};

export default function EmployerMessageTemplatesIndex({ templates, categories }: Props) {
    const [editing, setEditing] = useState<Template | null>(null);
    const [deleting, setDeleting] = useState<Template | null>(null);

    const form = useForm({
        name: '',
        category: 'invitation',
        body: '',
        is_active: true,
        sort_order: 0,
    });

    const startCreate = () => {
        form.reset();
        form.setData({
            name: '',
            category: 'invitation',
            body: '',
            is_active: true,
            sort_order: 0,
        });
        setEditing({ id: 0 } as Template);
    };

    const startEdit = (t: Template) => {
        form.setData({
            name: t.name,
            category: t.category,
            body: t.body,
            is_active: t.is_active,
            sort_order: t.sort_order,
        });
        setEditing(t);
    };

    const closeDialog = () => {
        setEditing(null);
        form.clearErrors();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (editing === null) {
            return;
        }

        const isCreate = editing.id === 0;
        const url = isCreate
            ? MessageTemplateController.store().url
            : MessageTemplateController.update.url({ template: editing.id });
        const method = isCreate ? 'post' : 'patch';

        form.submit(method, url, {
            preserveScroll: true,
            onSuccess: () => closeDialog(),
        });
    };

    const handleDelete = () => {
        if (!deleting) {
            return;
        }
        router.delete(MessageTemplateController.destroy.url({ template: deleting.id }), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    const grouped = categories.map((cat) => ({
        ...cat,
        items: templates.filter((t) => t.category === cat.value),
    }));

    return (
        <>
            <Head title="Template Pesan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Template Pesan"
                    description="Simpan pesan siap-pakai untuk diundang interview, ditolak, di-follow up, atau ditawari posisi."
                    actions={
                        <Button onClick={startCreate}>
                            <Plus className="size-4" /> Tambah Template
                        </Button>
                    }
                />

                <Section>
                    {templates.length === 0 ? (
                        <EmptyState
                            title="Belum ada template"
                            description="Mulai dengan template undangan interview atau follow-up. Hemat waktu balas-balas calon karyawan."
                            actions={
                                <Button onClick={startCreate} variant="outline">
                                    <Plus className="size-4" /> Buat Template Pertama
                                </Button>
                            }
                        />
                    ) : (
                        <div className="space-y-6">
                            {grouped.map((group) => (
                                <div key={group.value}>
                                    <div className="mb-3 flex items-center gap-2">
                                        <h3 className="text-sm font-semibold">{group.label}</h3>
                                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                            {group.items.length}
                                        </Badge>
                                    </div>
                                    {group.items.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">Belum ada template di kategori ini.</p>
                                    ) : (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {group.items.map((t) => (
                                                <Card key={t.id} className="border-border/70">
                                                    <CardContent className="space-y-3 p-4">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="truncate text-sm font-semibold">{t.name}</span>
                                                                    {!t.is_active && (
                                                                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                                                            Nonaktif
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {t.created_by && (
                                                                    <p className="text-[11px] text-muted-foreground">oleh {t.created_by}</p>
                                                                )}
                                                            </div>
                                                            <ActionGroup>
                                                                <ActionButton intent="edit" onClick={() => startEdit(t)}>
                                                                    <Pencil className="size-3.5" /> Ubah
                                                                </ActionButton>
                                                                <ActionButton intent="delete" onClick={() => setDeleting(t)}>
                                                                    <Trash2 className="size-3.5" /> Hapus
                                                                </ActionButton>
                                                            </ActionGroup>
                                                        </div>
                                                        <p className="line-clamp-4 whitespace-pre-line text-xs text-muted-foreground">{t.body}</p>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Section>
            </div>

            <Dialog open={editing !== null} onOpenChange={(open) => !open && closeDialog()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing?.id === 0 ? 'Tambah Template' : 'Ubah Template'}</DialogTitle>
                        <DialogDescription>
                            Tulis pesan template yang sering dipakai. Variabel manual seperti {'{nama_kandidat}'} bisa ditulis langsung —
                            kamu edit sebelum kirim.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <InputField
                            label="Nama Template"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            error={form.errors.name}
                            placeholder="Contoh: Undangan Interview Tahap 1"
                            required
                        />
                        <div className="space-y-1.5">
                            <Label htmlFor="category">Kategori</Label>
                            <Select
                                value={form.data.category}
                                onValueChange={(value) => form.setData('category', value)}
                            >
                                <SelectTrigger id="category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>
                                            {c.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.category && (
                                <p className="text-xs text-destructive">{form.errors.category}</p>
                            )}
                        </div>
                        <TextareaField
                            label="Isi Pesan"
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            error={form.errors.body}
                            rows={8}
                            placeholder="Halo {nama_kandidat}, terima kasih sudah melamar di {nama_perusahaan}…"
                            required
                        />
                        <label className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
                            <div className="space-y-0.5">
                                <span className="text-sm font-medium">Aktifkan template</span>
                                <p className="text-xs text-muted-foreground">Template nonaktif tidak muncul di daftar quick-pick.</p>
                            </div>
                            <Switch
                                checked={form.data.is_active}
                                onCheckedChange={(checked) => form.setData('is_active', checked)}
                            />
                        </label>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                <Save className="size-4" /> Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus template?"
                description={deleting ? `"${deleting.name}" akan dihapus permanen.` : ''}
                confirmLabel="Hapus"
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={handleDelete}
            />
        </>
    );
}
