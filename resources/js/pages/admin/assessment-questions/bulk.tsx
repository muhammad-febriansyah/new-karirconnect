import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Layers, Loader2, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import AssessmentQuestionController from '@/actions/App/Http/Controllers/Admin/AssessmentQuestionController';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type SkillProp = {
    id: number;
    name: string;
    category?: string | null;
};

type Props = {
    skill: SkillProp;
};

type BulkRow = {
    question: string;
    options: string[];
    correct_index: number;
    correct_text: string;
};

type FormShape = {
    type: 'multiple_choice' | 'text';
    difficulty: 'easy' | 'medium' | 'hard';
    time_limit_seconds: number;
    is_active: boolean;
    rows: BulkRow[];
};

const newRow = (): BulkRow => ({
    question: '',
    options: ['', '', '', ''],
    correct_index: 0,
    correct_text: '',
});

const defaultForm: FormShape = {
    type: 'multiple_choice',
    difficulty: 'medium',
    time_limit_seconds: 300,
    is_active: true,
    rows: [newRow(), newRow(), newRow()],
};

const parseBulkText = (text: string): BulkRow[] => {
    const blocks = text
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter(Boolean);

    const rows: BulkRow[] = [];

    for (const block of blocks) {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0) continue;

        const answerIndex = lines.findIndex((line) => /^jawaban\s*[:\-]/i.test(line));
        const answerLine = answerIndex >= 0 ? lines[answerIndex] : '';
        const beforeAnswer = answerIndex >= 0 ? lines.slice(0, answerIndex) : lines;

        const questionLine = beforeAnswer[0] ?? '';
        const optionLines = beforeAnswer.slice(1);

        const optionPattern = /^([A-Za-z])[\.\)]\s*(.+)$/;
        const parsed: { letter: string; text: string }[] = [];
        const loose: string[] = [];

        for (const line of optionLines) {
            const match = line.match(optionPattern);
            if (match) {
                parsed.push({ letter: match[1].toUpperCase(), text: match[2].trim() });
            } else {
                loose.push(line);
            }
        }

        const optionTexts = parsed.length > 0 ? parsed.map((p) => p.text) : loose;
        const padded = [...optionTexts];
        while (padded.length < 4) padded.push('');

        const rawAnswer = answerLine.replace(/^jawaban\s*[:\-]\s*/i, '').trim();
        let correctIndex = 0;

        if (rawAnswer.length > 0) {
            if (parsed.length > 0 && /^[A-Za-z]$/.test(rawAnswer)) {
                const letter = rawAnswer.toUpperCase();
                const found = parsed.findIndex((p) => p.letter === letter);
                correctIndex = found >= 0 ? found : 0;
            } else {
                const found = optionTexts.findIndex((opt) => opt.toLowerCase() === rawAnswer.toLowerCase());
                correctIndex = found >= 0 ? found : 0;
            }
        }

        rows.push({
            question: questionLine.replace(/^\d+\.\s*/, ''),
            options: padded.slice(0, Math.max(4, padded.length)),
            correct_index: correctIndex,
            correct_text: rawAnswer,
        });
    }

    return rows.length > 0 ? rows : [newRow()];
};

export default function AssessmentQuestionsBulk({ skill }: Props) {
    const form = useForm<FormShape>(defaultForm);
    const [pasteOpen, setPasteOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');

    const fieldErrors = form.errors as Record<string, string | undefined>;

    const updateRow = (index: number, patch: Partial<BulkRow>) => {
        form.setData(
            'rows',
            form.data.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
        );
    };

    const updateOption = (rowIndex: number, optionIndex: number, value: string) => {
        const next = form.data.rows.map((row, i) => {
            if (i !== rowIndex) return row;
            const options = [...row.options];
            options[optionIndex] = value;
            return { ...row, options };
        });
        form.setData('rows', next);
    };

    const addOption = (rowIndex: number) => {
        const next = form.data.rows.map((row, i) => {
            if (i !== rowIndex) return row;
            if (row.options.length >= 6) return row;
            return { ...row, options: [...row.options, ''] };
        });
        form.setData('rows', next);
    };

    const removeOption = (rowIndex: number, optionIndex: number) => {
        const next = form.data.rows.map((row, i) => {
            if (i !== rowIndex) return row;
            if (row.options.length <= 2) return row;
            const options = row.options.filter((_, j) => j !== optionIndex);
            const correct_index = row.correct_index >= options.length ? 0 : row.correct_index;
            return { ...row, options, correct_index };
        });
        form.setData('rows', next);
    };

    const addRow = () => form.setData('rows', [...form.data.rows, newRow()]);

    const removeRow = (index: number) => {
        if (form.data.rows.length <= 1) {
            form.setData('rows', [newRow()]);
            return;
        }
        form.setData('rows', form.data.rows.filter((_, i) => i !== index));
    };

    const applyPaste = () => {
        if (pasteText.trim().length === 0) return;
        form.setData('rows', parseBulkText(pasteText));
        setPasteText('');
        setPasteOpen(false);
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        form.transform((data) => ({
            skill_id: skill.id,
            type: data.type,
            difficulty: data.difficulty,
            time_limit_seconds: Number(data.time_limit_seconds),
            is_active: data.is_active,
            questions: data.rows
                .filter((row) => row.question.trim().length > 0)
                .map((row) => {
                    if (data.type === 'multiple_choice') {
                        const cleanOptions = row.options.map((opt) => opt.trim()).filter(Boolean);
                        const correctValue = row.options[row.correct_index]?.trim() ?? '';
                        return {
                            question: row.question.trim(),
                            options: cleanOptions,
                            correct_answer: correctValue,
                        };
                    }
                    return {
                        question: row.question.trim(),
                        options: [],
                        correct_answer: row.correct_text.trim(),
                    };
                })
                .filter((row) => row.correct_answer.length > 0),
        }));

        form.post('/admin/assessment-questions/bulk', {
            preserveScroll: false,
        });
    };

    return (
        <>
            <Head title={`Tambah Banyak Soal — ${skill.name}`} />

            <form onSubmit={submit} className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={`Tambah Banyak Soal — ${skill.name}`}
                    description="Atur metadata sekali, lalu isi banyak pertanyaan dalam satu kali simpan. Baris kosong otomatis diabaikan."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={AssessmentQuestionController.showSkill(skill.id).url}>
                                    <ArrowLeft className="size-4" /> Kembali
                                </Link>
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Simpan Semua
                            </Button>
                        </div>
                    }
                />

                <Section
                    title="Metadata Umum"
                    description="Berlaku untuk semua soal yang ditambahkan dalam halaman ini."
                >
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <SelectField
                            label="Tipe Soal"
                            value={form.data.type}
                            onValueChange={(value) => form.setData('type', value as FormShape['type'])}
                            options={[
                                { value: 'multiple_choice', label: 'Pilihan Ganda' },
                                { value: 'text', label: 'Teks' },
                            ]}
                        />
                        <SelectField
                            label="Kesulitan"
                            value={form.data.difficulty}
                            onValueChange={(value) => form.setData('difficulty', value as FormShape['difficulty'])}
                            options={[
                                { value: 'easy', label: 'Easy' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'hard', label: 'Hard' },
                            ]}
                        />
                        <InputField
                            label="Batas Waktu (detik)"
                            type="number"
                            min={30}
                            max={3600}
                            value={form.data.time_limit_seconds}
                            onChange={(event) =>
                                form.setData('time_limit_seconds', Number(event.target.value))
                            }
                            error={form.errors.time_limit_seconds}
                        />
                        <div className="flex flex-col justify-end pb-1">
                            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                <div>
                                    <Label className="text-sm">Aktifkan Soal</Label>
                                    <p className="text-xs text-muted-foreground">Tampilkan ke kandidat segera.</p>
                                </div>
                                <Switch
                                    checked={form.data.is_active}
                                    onCheckedChange={(value) => form.setData('is_active', value)}
                                />
                            </div>
                        </div>
                    </div>
                </Section>

                <Section
                    title="Tempel Massal (Opsional)"
                    description="Punya soal di Word/Notepad? Tempel di sini, lalu klik Parse untuk otomatis isi semua baris."
                    actions={
                        <Button type="button" variant="outline" onClick={() => setPasteOpen((value) => !value)}>
                            <Wand2 className="size-4" />
                            {pasteOpen ? 'Tutup' : 'Buka Tempel'}
                        </Button>
                    }
                >
                    {pasteOpen ? (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Format: baris pertama pertanyaan, lalu opsi (<code className="rounded bg-muted px-1">A. Opsi pertama</code>), lalu{' '}
                                <code className="rounded bg-muted px-1">Jawaban: A</code>. Pisahkan tiap soal dengan baris kosong.
                            </p>
                            <textarea
                                rows={10}
                                value={pasteText}
                                onChange={(event) => setPasteText(event.target.value)}
                                className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                placeholder="Tempel teks soal di sini, lalu klik Parse & Isi…"
                            />
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() =>
                                        setPasteText(
                                            'Apa kepanjangan dari HTML?\n' +
                                                'A. Hyper Text Markup Language\n' +
                                                'B. High Text Make Language\n' +
                                                'C. Hyperlink Tool Markup\n' +
                                                'D. Home Tool Markup Language\n' +
                                                'Jawaban: A\n\n' +
                                                'Apa fungsi tag <a> di HTML?\n' +
                                                'A. Membuat link\n' +
                                                'B. Menampilkan gambar\n' +
                                                'C. Membuat tabel\n' +
                                                'D. Mengatur warna\n' +
                                                'Jawaban: A',
                                        )
                                    }
                                >
                                    Pakai Contoh
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        setPasteText('');
                                        setPasteOpen(false);
                                    }}
                                >
                                    Batal
                                </Button>
                                <Button type="button" onClick={applyPaste} disabled={pasteText.trim().length === 0}>
                                    <Wand2 className="size-4" /> Parse & Isi
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Klik <strong>Buka Tempel</strong> untuk menampilkan area paste, atau tambah baris secara manual di bawah.
                        </p>
                    )}
                </Section>

                <Section
                    title={`Daftar Pertanyaan (${form.data.rows.length} baris)`}
                    description={
                        form.data.type === 'multiple_choice'
                            ? 'Pilih satu opsi sebagai jawaban benar dengan radio di sebelah kiri.'
                            : 'Tipe teks: tulis pertanyaan dan jawaban referensi.'
                    }
                    actions={
                        <Button type="button" variant="outline" onClick={addRow}>
                            <Plus className="size-4" /> Tambah Baris
                        </Button>
                    }
                >
                    <div className="space-y-4">
                        {form.data.rows.map((row, index) => {
                            const questionError = fieldErrors[`questions.${index}.question`];
                            const optionsError = fieldErrors[`questions.${index}.options`];
                            const answerError = fieldErrors[`questions.${index}.correct_answer`];

                            return (
                                <Card key={index}>
                                    <CardContent className="space-y-4 p-4 sm:p-5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-sm font-semibold text-muted-foreground">Soal #{index + 1}</div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeRow(index)}
                                            >
                                                <Trash2 className="size-4 text-destructive" /> Hapus
                                            </Button>
                                        </div>

                                        <TextareaField
                                            label="Pertanyaan"
                                            rows={2}
                                            value={row.question}
                                            onChange={(event) => updateRow(index, { question: event.target.value })}
                                            error={questionError}
                                            placeholder="Contoh: Apa kepanjangan dari HTML?"
                                        />

                                        {form.data.type === 'multiple_choice' ? (
                                            <div className="space-y-2">
                                                <Label className="text-sm">
                                                    Opsi Jawaban
                                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                        Pilih radio di kiri untuk menandai jawaban benar.
                                                    </span>
                                                </Label>
                                                <div className="space-y-2">
                                                    {row.options.map((option, optionIndex) => (
                                                        <div key={optionIndex} className="flex items-center gap-2">
                                                            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-xs font-medium">
                                                                <input
                                                                    type="radio"
                                                                    name={`correct-${index}`}
                                                                    checked={row.correct_index === optionIndex}
                                                                    onChange={() =>
                                                                        updateRow(index, { correct_index: optionIndex })
                                                                    }
                                                                    className="size-4"
                                                                />
                                                                {String.fromCharCode(65 + optionIndex)}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={option}
                                                                onChange={(event) =>
                                                                    updateOption(index, optionIndex, event.target.value)
                                                                }
                                                                className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
                                                                placeholder={`Opsi ${String.fromCharCode(65 + optionIndex)}`}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeOption(index, optionIndex)}
                                                                disabled={row.options.length <= 2}
                                                                aria-label="Hapus opsi"
                                                            >
                                                                <Trash2 className="size-4 text-muted-foreground" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                                {row.options.length < 6 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => addOption(index)}
                                                    >
                                                        <Plus className="size-4" /> Tambah Opsi
                                                    </Button>
                                                )}
                                                {(optionsError || answerError) && (
                                                    <p className="text-xs text-destructive">
                                                        {optionsError ?? answerError}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <TextareaField
                                                label="Jawaban Referensi"
                                                rows={2}
                                                value={row.correct_text}
                                                onChange={(event) =>
                                                    updateRow(index, { correct_text: event.target.value })
                                                }
                                                error={answerError}
                                                placeholder="Tulis jawaban acuan untuk soal teks."
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                            Tip: kosongkan baris yang tidak terpakai — sistem akan mengabaikannya saat simpan.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" onClick={addRow}>
                                <Plus className="size-4" /> Tambah Baris
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Layers className="size-4" />}
                                Simpan Semua
                            </Button>
                        </div>
                    </div>
                </Section>
            </form>
        </>
    );
}

AssessmentQuestionsBulk.layout = {
    breadcrumbs: [
        {
            title: 'Assessment Questions',
            href: AssessmentQuestionController.index().url,
        },
        {
            title: 'Tambah Banyak Soal',
            href: '#',
        },
    ],
};
