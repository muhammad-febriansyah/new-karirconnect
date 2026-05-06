import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Check,
    ChevronDown,
    ChevronUp,
    ListChecks,
    Mic,
    Pencil,
    Plus,
    Save,
    Sparkles,
    Star,
    Trash2,
    Type,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string };

type Question = {
    id: number;
    order_number: number;
    category: string;
    question: string;
    context: string | null;
    expected_keywords: string[];
    max_duration_seconds: number;
};

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
    questions: Question[];
};

type Props = {
    templates: Template[];
    jobOptions: Option[];
    modeOptions: Option[];
    categoryOptions: Option[];
};

const MODE_META: Record<string, { label: string; icon: typeof Mic; chip: string }> = {
    voice: { label: 'Voice AI', icon: Mic, chip: 'bg-violet-100 text-violet-700' },
    text: { label: 'Mode Teks', icon: Type, chip: 'bg-sky-100 text-sky-700' },
};

const CATEGORY_CHIP: Record<string, string> = {
    opening: 'bg-violet-50 text-violet-700 ring-violet-200',
    technical: 'bg-sky-50 text-sky-700 ring-sky-200',
    behavioral: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    situational: 'bg-amber-50 text-amber-700 ring-amber-200',
    culture: 'bg-pink-50 text-pink-700 ring-pink-200',
    closing: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export default function AiInterviewTemplatesIndex({ templates, jobOptions, modeOptions, categoryOptions }: Props) {
    const [editing, setEditing] = useState<Template | null>(null);
    const [deleting, setDeleting] = useState<Template | null>(null);
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set(templates.filter((t) => t.questions.length === 0).map((t) => t.id)));
    const [search, setSearch] = useState('');

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

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (q === '') return templates;
        return templates.filter((t) =>
            [t.name, t.description ?? '', t.mode, t.language, t.job?.title ?? '']
                .join(' ')
                .toLowerCase()
                .includes(q),
        );
    }, [templates, search]);

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

    const toggle = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <>
            <Head title="Template AI Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Template AI Interview"
                    description="Susun bank pertanyaan untuk wawancara AI — recruiter wajib pilih template ini saat menjadwalkan."
                    actions={
                        <Button onClick={startCreate}>
                            <Plus className="size-4" /> Template Baru
                        </Button>
                    }
                />

                {/* Info card explaining the flow */}
                <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-white p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                            <Sparkles className="size-5" />
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="font-semibold text-slate-900">Cara kerja template AI Interview</div>
                            <ul className="space-y-1 text-slate-600">
                                <li>· Pilih <span className="font-medium">mode</span>: voice (kandidat ngomong, AI dengar) atau teks (kandidat ngetik).</li>
                                <li>· Tulis <span className="font-medium">bank pertanyaan</span> per kategori — pertanyaan inilah yang ditanyakan ke kandidat.</li>
                                <li>· Mode voice otomatis diawali sapaan ramah dari AI sebelum masuk ke pertanyaan.</li>
                                <li>· Recruiter pilih template ini saat membuka <span className="font-medium">Jadwalkan Interview</span> mode AI.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Inline create/edit form */}
                {editing && (
                    <Section title={editing.id === 0 ? 'Buat Template Baru' : `Edit: ${editing.name}`}>
                        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                            <InputField
                                label="Nama Template"
                                required
                                placeholder="cth. Senior Backend Engineer · Voice"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                error={form.errors.name}
                            />
                            <div>
                                <Label className="mb-1 block">Mode Wawancara</Label>
                                <Select value={form.data.mode} onValueChange={(v) => form.setData('mode', v)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih mode" /></SelectTrigger>
                                    <SelectContent>
                                        {modeOptions.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Voice AI: kandidat ngobrol langsung dengan AI (butuh mic). Teks: kandidat menjawab dengan ketikan.
                                </p>
                            </div>
                            <InputField
                                label="Durasi Sesi (menit)"
                                type="number"
                                min={10}
                                max={120}
                                value={form.data.duration_minutes}
                                onChange={(e) => form.setData('duration_minutes', Number(e.target.value))}
                                error={form.errors.duration_minutes}
                            />
                            <InputField
                                label="Target Jumlah Pertanyaan"
                                type="number"
                                min={3}
                                max={20}
                                value={form.data.question_count}
                                onChange={(e) => form.setData('question_count', Number(e.target.value))}
                                error={form.errors.question_count}
                                description="Jumlah pertanyaan ideal — diisi manual di bank pertanyaan setelah disimpan."
                            />
                            <div>
                                <Label className="mb-1 block">Bahasa</Label>
                                <Select value={form.data.language} onValueChange={(v) => form.setData('language', v)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih bahasa" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1 block">Lowongan (opsional)</Label>
                                <Select
                                    value={String(form.data.job_id ?? 'all')}
                                    onValueChange={(v) => form.setData('job_id', v === 'all' ? null : Number(v))}
                                >
                                    <SelectTrigger><SelectValue placeholder="Tanpa kaitan lowongan" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tanpa kaitan lowongan (umum)</SelectItem>
                                        {jobOptions.map((j) => (
                                            <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-2">
                                <TextareaField
                                    label="Deskripsi (opsional)"
                                    rows={2}
                                    placeholder="Penjelasan singkat untuk recruiter — kapan template ini cocok dipakai."
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <TextareaField
                                    label="Instruksi Khusus AI (opsional)"
                                    rows={4}
                                    placeholder="Override prompt default. Contoh: 'Gunakan bahasa santai. Tanya soal pengalaman kerja remote.'"
                                    value={form.data.system_prompt}
                                    onChange={(e) => form.setData('system_prompt', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={form.data.is_default}
                                    onChange={(e) => form.setData('is_default', e.target.checked)}
                                    className="size-4"
                                />
                                <Label htmlFor="is_default" className="cursor-pointer text-sm text-amber-900">
                                    <Star className="-mt-0.5 mr-1 inline size-3.5" />
                                    Jadikan template default perusahaan
                                </Label>
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    <Save className="size-4" /> Simpan Template
                                </Button>
                            </div>
                        </form>
                    </Section>
                )}

                <Section
                    title="Daftar Template"
                    description={`${templates.length} template tersimpan. Klik kartu untuk membuka bank pertanyaan.`}
                    actions={
                        <Input
                            placeholder="Cari template..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="sm:w-64"
                        />
                    }
                >
                    {templates.length === 0 ? (
                        <EmptyState
                            title="Belum ada template"
                            description="Mulai dengan membuat template untuk peran-peran yang sering diinterview. Tambahkan bank pertanyaannya sekalian."
                            actions={
                                <Button onClick={startCreate}>
                                    <Plus className="size-4" /> Buat Template Pertama
                                </Button>
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            {filtered.length === 0 ? (
                                <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                                    Tidak ada template yang cocok pencarianmu.
                                </p>
                            ) : (
                                filtered.map((t) => (
                                    <TemplateCard
                                        key={t.id}
                                        template={t}
                                        expanded={expanded.has(t.id)}
                                        onToggle={() => toggle(t.id)}
                                        onEdit={() => startEdit(t)}
                                        onDelete={() => setDeleting(t)}
                                        categoryOptions={categoryOptions}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </Section>
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus template?"
                description={deleting ? `Template "${deleting.name}" beserta semua pertanyaannya akan dihapus permanen.` : ''}
                confirmLabel="Hapus"
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={handleDelete}
            />
        </>
    );
}

type CardProps = {
    template: Template;
    expanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    categoryOptions: Option[];
};

function TemplateCard({ template, expanded, onToggle, onEdit, onDelete, categoryOptions }: CardProps) {
    const modeMeta = MODE_META[template.mode] ?? MODE_META.text;
    const ModeIcon = modeMeta.icon;
    const questionCount = template.questions.length;
    const targetMet = questionCount >= template.question_count;
    const hasNoQuestions = questionCount === 0;

    return (
        <Card className={cn('overflow-hidden transition', expanded && 'shadow-md ring-1 ring-sky-200')}>
            <CardContent className="p-0">
                {/* Header (clickable) */}
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
                >
                    <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', modeMeta.chip)}>
                        <ModeIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">{template.name}</h3>
                            {template.is_default && (
                                <Badge className="gap-1">
                                    <Star className="size-3" /> Default
                                </Badge>
                            )}
                            <Badge variant="outline" className={cn('gap-1', modeMeta.chip, 'border-transparent')}>
                                <ModeIcon className="size-3" /> {modeMeta.label}
                            </Badge>
                            {hasNoQuestions ? (
                                <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800">
                                    <ListChecks className="size-3" /> Belum ada pertanyaan
                                </Badge>
                            ) : (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'gap-1 border-transparent',
                                        targetMet ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700',
                                    )}
                                >
                                    {targetMet && <Check className="size-3" />}
                                    {questionCount}/{template.question_count} pertanyaan
                                </Badge>
                            )}
                        </div>
                        <p className="line-clamp-2 text-sm text-slate-600">
                            {template.description?.trim() || 'Tanpa deskripsi.'}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>· {template.duration_minutes} menit</span>
                            <span>· {template.language === 'id' ? 'Bahasa Indonesia' : 'English'}</span>
                            {template.job?.title && <span>· {template.job.title}</span>}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            aria-label={`Edit template ${template.name}`}
                        >
                            <Pencil className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            aria-label={`Hapus template ${template.name}`}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                        <div className="ml-1 flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </div>
                    </div>
                </button>

                {/* Expanded: question editor */}
                {expanded && (
                    <div className="border-t border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                        <QuestionEditor template={template} categoryOptions={categoryOptions} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

type EditorProps = {
    template: Template;
    categoryOptions: Option[];
};

function QuestionEditor({ template, categoryOptions }: EditorProps) {
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Question | null>(null);

    const move = (q: Question, direction: -1 | 1) => {
        const ordered = [...template.questions].sort((a, b) => a.order_number - b.order_number);
        const idx = ordered.findIndex((x) => x.id === q.id);
        const target = idx + direction;
        if (target < 0 || target >= ordered.length) return;
        const swapped = [...ordered];
        [swapped[idx], swapped[target]] = [swapped[target], swapped[idx]];

        router.post(
            `/employer/ai-interview-templates/${template.id}/questions/reorder`,
            { order: swapped.map((x) => x.id) },
            { preserveScroll: true },
        );
    };

    const handleDelete = () => {
        if (!confirmDelete) return;
        router.delete(`/employer/ai-interview-templates/${template.id}/questions/${confirmDelete.id}`, {
            preserveScroll: true,
            onFinish: () => setConfirmDelete(null),
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                    Bank Pertanyaan
                    <span className="ml-2 text-xs font-normal text-slate-500">
                        Pertanyaan akan diajukan urut ke kandidat
                    </span>
                </div>
                {editingId === null && (
                    <Button size="sm" onClick={() => setEditingId('new')}>
                        <Plus className="size-4" /> Tambah
                    </Button>
                )}
            </div>

            {/* Inline new-question form */}
            {editingId === 'new' && (
                <QuestionForm
                    template={template}
                    question={null}
                    categoryOptions={categoryOptions}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => setEditingId(null)}
                />
            )}

            {/* Question list */}
            {template.questions.length === 0 && editingId !== 'new' ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    Belum ada pertanyaan. Klik <span className="font-medium text-slate-700">Tambah</span> untuk mulai.
                </div>
            ) : (
                <ol className="space-y-2">
                    {template.questions.map((q, idx) => (
                        <li key={q.id}>
                            {editingId === q.id ? (
                                <QuestionForm
                                    template={template}
                                    question={q}
                                    categoryOptions={categoryOptions}
                                    onCancel={() => setEditingId(null)}
                                    onSaved={() => setEditingId(null)}
                                />
                            ) : (
                                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1',
                                                    CATEGORY_CHIP[q.category] ?? CATEGORY_CHIP.technical,
                                                )}
                                            >
                                                {categoryOptions.find((c) => c.value === q.category)?.label ?? q.category}
                                            </span>
                                            <span className="text-xs text-slate-500">{q.max_duration_seconds}s</span>
                                            {q.expected_keywords.length > 0 && (
                                                <span className="text-xs text-slate-500">
                                                    · {q.expected_keywords.length} kata kunci
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-800">{q.question}</p>
                                        {q.context && (
                                            <p className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-500">
                                                Catatan AI: {q.context}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={idx === 0}
                                            onClick={() => move(q, -1)}
                                            aria-label="Naik"
                                        >
                                            <ArrowUp className="size-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={idx === template.questions.length - 1}
                                            onClick={() => move(q, 1)}
                                            aria-label="Turun"
                                        >
                                            <ArrowDown className="size-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingId(q.id)}
                                            aria-label="Edit"
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setConfirmDelete(q)}
                                            aria-label="Hapus"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ol>
            )}

            <ConfirmDialog
                open={confirmDelete !== null}
                onOpenChange={(open) => !open && setConfirmDelete(null)}
                title="Hapus pertanyaan?"
                description={confirmDelete ? confirmDelete.question : ''}
                confirmLabel="Hapus"
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={handleDelete}
            />
        </div>
    );
}

type QuestionFormProps = {
    template: Template;
    question: Question | null;
    categoryOptions: Option[];
    onCancel: () => void;
    onSaved: () => void;
};

function QuestionForm({ template, question, categoryOptions, onCancel, onSaved }: QuestionFormProps) {
    const isEdit = question !== null;

    const form = useForm({
        category: question?.category ?? 'technical',
        question: question?.question ?? '',
        context: question?.context ?? '',
        expected_keywords_text: (question?.expected_keywords ?? []).join(', '),
        max_duration_seconds: question?.max_duration_seconds ?? 120,
    });

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        const payload = {
            category: form.data.category,
            question: form.data.question,
            context: form.data.context || null,
            expected_keywords: form.data.expected_keywords_text
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            max_duration_seconds: Number(form.data.max_duration_seconds) || 120,
        };

        if (isEdit) {
            router.patch(
                `/employer/ai-interview-templates/${template.id}/questions/${question.id}`,
                payload,
                {
                    preserveScroll: true,
                    onSuccess: () => onSaved(),
                    onError: (errors) => {
                        form.setError(errors as never);
                    },
                },
            );
        } else {
            router.post(
                `/employer/ai-interview-templates/${template.id}/questions`,
                payload,
                {
                    preserveScroll: true,
                    onSuccess: () => onSaved(),
                    onError: (errors) => {
                        form.setError(errors as never);
                    },
                },
            );
        }
    };

    return (
        <form
            onSubmit={onSubmit}
            className="space-y-3 rounded-lg border-2 border-sky-200 bg-white p-4 shadow-sm"
        >
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                    {isEdit ? `Edit Pertanyaan #${question.order_number}` : 'Pertanyaan Baru'}
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                    <X className="size-4" />
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <div>
                    <Label className="mb-1 block text-xs">Kategori</Label>
                    <Select value={form.data.category} onValueChange={(v) => form.setData('category', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {categoryOptions.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="mb-1 block text-xs">Durasi Maks. Jawaban (detik)</Label>
                    <Input
                        type="number"
                        min={30}
                        max={600}
                        value={form.data.max_duration_seconds}
                        onChange={(e) => form.setData('max_duration_seconds', Number(e.target.value))}
                    />
                </div>
            </div>

            <div>
                <Label className="mb-1 block text-xs">Pertanyaan untuk Kandidat</Label>
                <Textarea
                    rows={3}
                    placeholder="cth. Ceritakan kasus paling menantang yang pernah kamu selesaikan dengan Laravel di production."
                    value={form.data.question}
                    onChange={(e) => form.setData('question', e.target.value)}
                    required
                />
                {form.errors.question && <p className="mt-1 text-xs text-rose-600">{form.errors.question}</p>}
            </div>

            <div>
                <Label className="mb-1 block text-xs">Catatan Internal AI (opsional)</Label>
                <Textarea
                    rows={2}
                    placeholder="Petunjuk untuk AI: apa yang sebaiknya dieksplorasi follow-up-nya."
                    value={form.data.context}
                    onChange={(e) => form.setData('context', e.target.value)}
                />
            </div>

            <div>
                <Label className="mb-1 block text-xs">Kata Kunci Ekspektasi (opsional)</Label>
                <Input
                    placeholder="cth. caching, queue, n+1, observer"
                    value={form.data.expected_keywords_text}
                    onChange={(e) => form.setData('expected_keywords_text', e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                    Pisahkan dengan koma. AI akan mempertimbangkan kata-kata ini saat menilai jawaban.
                </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                    Batal
                </Button>
                <Button type="submit" size="sm" disabled={form.processing}>
                    <Save className="size-4" /> {isEdit ? 'Simpan' : 'Tambah Pertanyaan'}
                </Button>
            </div>
        </form>
    );
}
