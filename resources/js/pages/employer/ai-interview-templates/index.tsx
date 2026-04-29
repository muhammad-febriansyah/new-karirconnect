import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Save, Star, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Option = { value: string; label: string };

type Template = {
    id: number;
    name: string;
    description: string | null;
    mode: string;
    language: string;
    duration_minutes: number;
    question_count: number;
    is_default: boolean;
    job_id: number | null;
    job?: { id: number; title: string } | null;
};

type Props = {
    templates: Template[];
    jobOptions: Option[];
    modeOptions: Option[];
};

export default function AiInterviewTemplatesIndex({ templates, jobOptions, modeOptions }: Props) {
    const [editing, setEditing] = useState<Template | null>(null);
    const [deleting, setDeleting] = useState<Template | null>(null);

    const form = useForm({
        name: '',
        description: '',
        mode: 'text',
        language: 'id',
        duration_minutes: 30,
        question_count: 8,
        system_prompt: '',
        job_id: null as number | null,
        is_default: false,
    });

    const startCreate = () => {
        form.reset();
        form.setData({
            name: '',
            description: '',
            mode: 'text',
            language: 'id',
            duration_minutes: 30,
            question_count: 8,
            system_prompt: '',
            job_id: null,
            is_default: false,
        });
        setEditing({ id: 0 } as Template);
    };

    const startEdit = (t: Template) => {
        form.setData({
            name: t.name,
            description: t.description ?? '',
            mode: t.mode,
            language: t.language,
            duration_minutes: t.duration_minutes,
            question_count: t.question_count,
            system_prompt: '',
            job_id: t.job_id,
            is_default: t.is_default,
        });
        setEditing(t);
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;

        if (editing.id === 0) {
            form.post('/employer/ai-interview-templates', {
                preserveScroll: true,
                onSuccess: () => setEditing(null),
            });
        } else {
            form.patch(`/employer/ai-interview-templates/${editing.id}`, {
                preserveScroll: true,
                onSuccess: () => setEditing(null),
            });
        }
    };

    const handleDelete = () => {
        if (!deleting) return;
        router.delete(`/employer/ai-interview-templates/${deleting.id}`, {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <>
            <Head title="Template AI Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Template AI Interview"
                    description="Buat template prompt + jumlah pertanyaan untuk AI Interview kandidat."
                    actions={
                        <Button onClick={startCreate}>
                            <Plus className="size-4" /> Template Baru
                        </Button>
                    }
                />

                <Section>
                    {templates.length === 0 ? (
                        <EmptyState
                            title="Belum ada template"
                            description="Mulai dengan membuat template default untuk peran-peran yang sering Anda interview."
                        />
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {templates.map((t) => (
                                <Card key={t.id} className="transition hover:shadow-sm">
                                    <CardContent className="space-y-2 p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold">{t.name}</h3>
                                                <p className="text-xs text-muted-foreground">{t.mode} · {t.language} · {t.duration_minutes} mnt · {t.question_count} pertanyaan</p>
                                            </div>
                                            {t.is_default && <Badge><Star className="mr-1 size-3" /> Default</Badge>}
                                        </div>
                                        {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setDeleting(t)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </Section>

                {editing && (
                    <Section title={editing.id === 0 ? 'Buat Template' : `Edit: ${editing.name}`}>
                        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                            <InputField
                                label="Nama"
                                required
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                error={form.errors.name}
                            />
                            <div>
                                <Label className="mb-1 block">Tipe</Label>
                                <Select value={form.data.mode} onValueChange={(v) => form.setData('mode', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {modeOptions.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <InputField
                                label="Durasi (menit)"
                                type="number"
                                min={10}
                                max={120}
                                value={form.data.duration_minutes}
                                onChange={(e) => form.setData('duration_minutes', Number(e.target.value))}
                                error={form.errors.duration_minutes}
                            />
                            <InputField
                                label="Jumlah Pertanyaan"
                                type="number"
                                min={3}
                                max={20}
                                value={form.data.question_count}
                                onChange={(e) => form.setData('question_count', Number(e.target.value))}
                                error={form.errors.question_count}
                            />
                            <div>
                                <Label className="mb-1 block">Bahasa</Label>
                                <Select value={form.data.language} onValueChange={(v) => form.setData('language', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1 block">Lowongan (opsional)</Label>
                                <Select
                                    value={String(form.data.job_id ?? '')}
                                    onValueChange={(v) => form.setData('job_id', v === 'all' ? null : Number(v))}
                                >
                                    <SelectTrigger><SelectValue placeholder="Tanpa kaitan lowongan" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tanpa kaitan lowongan</SelectItem>
                                        {jobOptions.map((j) => (
                                            <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-2">
                                <TextareaField
                                    label="Deskripsi (opsional)"
                                    rows={3}
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <TextareaField
                                    label="System Prompt Custom (opsional)"
                                    rows={5}
                                    placeholder="Override default prompt jika perlu instruksi khusus untuk AI."
                                    value={form.data.system_prompt}
                                    onChange={(e) => form.setData('system_prompt', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={form.data.is_default}
                                    onChange={(e) => form.setData('is_default', e.target.checked)}
                                />
                                <Label htmlFor="is_default" className="text-sm">Jadikan default untuk perusahaan</Label>
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    <Save className="size-4" /> Simpan
                                </Button>
                            </div>
                        </form>
                    </Section>
                )}
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus template?"
                description={deleting ? `Template "${deleting.name}" akan dihapus permanen.` : ''}
                confirmLabel="Hapus"
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={handleDelete}
            />
        </>
    );
}
