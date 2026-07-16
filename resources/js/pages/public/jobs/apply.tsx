import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Lightbulb,
    Loader2,
    MessageSquare,
    Paperclip,
    Send,
    ShieldCheck,
    Wallet,
} from 'lucide-react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { MoneyInput } from '@/components/form/money-input';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { store as applyStore } from '@/routes/public/jobs/apply';

type Question = {
    id: number;
    question: string;
    type: string | null;
    options: string[];
    is_required: boolean;
};

type Props = {
    job: {
        id: number;
        slug: string;
        title: string;
        company: { id: number | null; name: string | null };
        screening_questions: Question[];
    };
    profile: {
        id: number;
        expected_salary: number | null;
        cvs: { id: number; label: string; source: string }[];
        primary_cv_id: number | null;
    };
    alreadyApplied: boolean;
};

const SALARY_RE = /gaji|salary|rupiah|idr|\brp\b/i;
// Detect salary intent from the question text alone — recruiters may configure
// the screening with type=text or type=number, so type isn't a reliable signal.
const isSalaryQuestion = (q: Question) => SALARY_RE.test(q.question);

const TIPS = [
    'Pilih CV yang paling relevan dengan posisi ini.',
    'Cover letter singkat & spesifik lebih efektif dari yang panjang.',
    'Jawab pertanyaan screening dengan jujur — jawaban dipakai recruiter untuk filter.',
];

export default function ApplyForm({ job, profile, alreadyApplied }: Props) {
    const salaryQuestionIdx = useMemo(
        () => job.screening_questions.findIndex(isSalaryQuestion),
        [job.screening_questions],
    );
    const hasSalaryQuestion = salaryQuestionIdx >= 0;

    const form = useForm({
        cover_letter: '',
        expected_salary: profile.expected_salary ?? '',
        candidate_cv_id: profile.primary_cv_id ?? (profile.cvs[0]?.id ?? null),
        answers: job.screening_questions.map((q, i) => ({
            question_id: q.id,
            answer: i === salaryQuestionIdx && profile.expected_salary
                ? String(profile.expected_salary)
                : '',
        })),
    });

    // Mirror salary screening answer into expected_salary so backend keeps the
    // dedicated column populated even when only the screening question is shown.
    useEffect(() => {
        if (!hasSalaryQuestion) return;
        const ans = form.data.answers[salaryQuestionIdx]?.answer ?? '';
        if (String(form.data.expected_salary ?? '') !== ans) {
            form.setData('expected_salary', ans === '' ? '' : ans);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.answers, hasSalaryQuestion, salaryQuestionIdx]);

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post(applyStore({ job: job.slug }).url, { preserveScroll: true });
    };

    const completion = useMemo(() => {
        const checks = [
            Boolean(form.data.candidate_cv_id),
            Boolean(form.data.cover_letter && form.data.cover_letter.replace(/<[^>]+>/g, '').trim().length > 0),
            hasSalaryQuestion
                ? Boolean(form.data.answers[salaryQuestionIdx]?.answer)
                : Boolean(form.data.expected_salary),
            job.screening_questions.length === 0
                || job.screening_questions.every((q, idx) => {
                    if (!q.is_required) return true;
                    return Boolean(form.data.answers[idx]?.answer);
                }),
        ];
        const done = checks.filter(Boolean).length;
        return Math.round((done / checks.length) * 100);
    }, [form.data, job.screening_questions, hasSalaryQuestion, salaryQuestionIdx]);

    if (alreadyApplied) {
        return (
            <>
                <Head title={`Lamar - ${job.title}`} />
                <div className="mx-auto max-w-2xl space-y-6 py-10">
                    <EmptyState
                        title="Anda sudah melamar"
                        description={`Lamaran untuk ${job.title} di ${job.company.name ?? 'perusahaan ini'} sedang ditinjau oleh recruiter.`}
                    />
                    <div className="flex justify-center gap-2">
                        <Button asChild variant="outline">
                            <Link href={`/jobs/${job.slug}`}>
                                <ArrowLeft className="size-4" /> Kembali ke Lowongan
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/employee/applications">Lihat Status Lamaran</Link>
                        </Button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`Lamar - ${job.title}`} />

            <div className="space-y-6">
                {/* Compact header */}
                <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Link
                            href={`/jobs/${job.slug}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-blue"
                        >
                            <ArrowLeft className="size-3" /> Kembali ke detail lowongan
                        </Link>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                            Lamar: {job.title}
                        </h1>
                        {job.company.name && (
                            <p className="mt-0.5 text-sm text-muted-foreground">{job.company.name}</p>
                        )}
                    </div>
                    <Badge variant="secondary" className="self-start sm:self-end">
                        {completion}% lengkap
                    </Badge>
                </div>

                <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
                    {/* ===== Main column ===== */}
                    <div className="space-y-5">
                        {/* CV picker */}
                        <FormCard
                            icon={FileText}
                            title="CV yang Digunakan"
                            description="Pilih CV yang paling relevan dengan lowongan ini."
                        >
                            {profile.cvs.length === 0 ? (
                                <EmptyState
                                    title="Belum ada CV"
                                    description="Buat CV Anda di CV Builder atau unggah CV terlebih dahulu sebelum melamar."
                                />
                            ) : (
                                <RadioGroup
                                    value={String(form.data.candidate_cv_id ?? '')}
                                    onValueChange={(v) => form.setData('candidate_cv_id', Number(v))}
                                    className="grid gap-2 sm:grid-cols-2"
                                >
                                    {profile.cvs.map((cv) => {
                                        const checked = String(cv.id) === String(form.data.candidate_cv_id ?? '');
                                        return (
                                            <Label
                                                key={cv.id}
                                                htmlFor={`cv-${cv.id}`}
                                                className={cn(
                                                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all',
                                                    checked
                                                        ? 'border-brand-blue/50 bg-brand-blue/5 ring-1 ring-brand-blue/15'
                                                        : 'border-border/60 hover:border-brand-blue/30 hover:bg-muted/30',
                                                )}
                                            >
                                                <RadioGroupItem
                                                    value={String(cv.id)}
                                                    id={`cv-${cv.id}`}
                                                    className="mt-0.5"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Paperclip className="size-3.5 text-brand-blue" />
                                                        <span className="truncate text-sm font-semibold text-brand-navy">
                                                            {cv.label}
                                                        </span>
                                                    </div>
                                                    <span className="mt-0.5 inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                                        {cv.source}
                                                    </span>
                                                </div>
                                            </Label>
                                        );
                                    })}
                                </RadioGroup>
                            )}
                        </FormCard>

                        {/* Cover letter */}
                        <FormCard
                            icon={MessageSquare}
                            title="Cover Letter"
                            badge="Opsional"
                            description="Ceritakan kenapa Anda cocok untuk posisi ini."
                        >
                            <RichTextEditor
                                placeholder="Tulis pengantar singkat — pengalaman relevan, motivasi, atau pencapaian yang mendukung…"
                                value={form.data.cover_letter}
                                onChange={(html) => form.setData('cover_letter', html)}
                                error={form.errors.cover_letter}
                            />
                        </FormCard>

                        {/* Dedicated salary — hidden when screening already covers it */}
                        {!hasSalaryQuestion && (
                            <FormCard
                                icon={Wallet}
                                title="Ekspektasi Gaji"
                                description="Sebutkan ekspektasi gaji bulanan dalam Rupiah."
                            >
                                <MoneyInput
                                    value={form.data.expected_salary}
                                    onChange={(value) => form.setData('expected_salary', value ?? '')}
                                    placeholder="Rp 12.000.000"
                                />
                                {form.errors.expected_salary && (
                                    <p className="mt-1.5 text-xs text-destructive">{form.errors.expected_salary}</p>
                                )}
                            </FormCard>
                        )}

                        {/* Screening */}
                        {job.screening_questions.length > 0 && (
                            <FormCard
                                icon={ClipboardCheck}
                                title="Pertanyaan Screening"
                                description="Dijawab agar recruiter bisa menilai kecocokan lebih cepat."
                            >
                                <div className="space-y-4">
                                    {job.screening_questions.map((q, idx) => (
                                        <div
                                            key={q.id}
                                            className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3"
                                        >
                                            <Label className="text-sm font-medium leading-snug">
                                                {q.question}
                                                {q.is_required && <span className="ml-1 text-destructive">*</span>}
                                            </Label>
                                            {q.type === 'yes_no' ? (
                                                <RadioGroup
                                                    value={String(form.data.answers[idx]?.answer ?? '')}
                                                    onValueChange={(v) => {
                                                        const next = [...form.data.answers];
                                                        next[idx] = { question_id: q.id, answer: v };
                                                        form.setData('answers', next);
                                                    }}
                                                >
                                                    <div className="flex gap-2">
                                                        {[
                                                            { value: 'yes', label: 'Ya' },
                                                            { value: 'no', label: 'Tidak' },
                                                        ].map((opt) => {
                                                            const checked = form.data.answers[idx]?.answer === opt.value;
                                                            return (
                                                                <Label
                                                                    key={opt.value}
                                                                    htmlFor={`q-${q.id}-${opt.value}`}
                                                                    className={cn(
                                                                        'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
                                                                        checked
                                                                            ? 'border-brand-blue/50 bg-brand-blue/5 font-semibold text-brand-blue ring-1 ring-brand-blue/15'
                                                                            : 'border-border/60 hover:bg-muted/40',
                                                                    )}
                                                                >
                                                                    <RadioGroupItem
                                                                        value={opt.value}
                                                                        id={`q-${q.id}-${opt.value}`}
                                                                        className="size-3.5"
                                                                    />
                                                                    {opt.label}
                                                                </Label>
                                                            );
                                                        })}
                                                    </div>
                                                </RadioGroup>
                                            ) : SALARY_RE.test(q.question) ? (
                                                <MoneyInput
                                                    value={String(form.data.answers[idx]?.answer ?? '')}
                                                    onChange={(value) => {
                                                        const next = [...form.data.answers];
                                                        next[idx] = {
                                                            question_id: q.id,
                                                            answer: value === null ? '' : String(value),
                                                        };
                                                        form.setData('answers', next);
                                                    }}
                                                    placeholder="Rp 0"
                                                />
                                            ) : q.type === 'number' ? (
                                                <Input
                                                    type="number"
                                                    placeholder="Masukkan angka"
                                                    value={String(form.data.answers[idx]?.answer ?? '')}
                                                    onChange={(e) => {
                                                        const next = [...form.data.answers];
                                                        next[idx] = { question_id: q.id, answer: e.target.value };
                                                        form.setData('answers', next);
                                                    }}
                                                />
                                            ) : (
                                                <Input
                                                    placeholder="Tulis jawaban Anda…"
                                                    value={String(form.data.answers[idx]?.answer ?? '')}
                                                    onChange={(e) => {
                                                        const next = [...form.data.answers];
                                                        next[idx] = { question_id: q.id, answer: e.target.value };
                                                        form.setData('answers', next);
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </FormCard>
                        )}
                    </div>

                    {/* ===== Sidebar ===== */}
                    <aside className="space-y-4 lg:sticky lg:top-20">
                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-brand-navy">Ringkasan</h3>
                                <Badge variant="secondary" className="text-[10px]">
                                    {completion}%
                                </Badge>
                            </div>
                            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan transition-all"
                                    style={{ width: `${completion}%` }}
                                />
                            </div>
                            <ul className="space-y-2 text-xs">
                                <ChecklistItem done={Boolean(form.data.candidate_cv_id)} label="CV terpilih" />
                                <ChecklistItem
                                    done={Boolean(
                                        form.data.cover_letter
                                            && form.data.cover_letter.replace(/<[^>]+>/g, '').trim().length > 0,
                                    )}
                                    label="Cover letter (opsional)"
                                    optional
                                />
                                <ChecklistItem
                                    done={
                                        hasSalaryQuestion
                                            ? Boolean(form.data.answers[salaryQuestionIdx]?.answer)
                                            : Boolean(form.data.expected_salary)
                                    }
                                    label="Ekspektasi gaji"
                                />
                                {job.screening_questions.length > 0 && (
                                    <ChecklistItem
                                        done={job.screening_questions.every((q, idx) => {
                                            if (!q.is_required) return true;
                                            return Boolean(form.data.answers[idx]?.answer);
                                        })}
                                        label="Pertanyaan screening"
                                    />
                                )}
                            </ul>

                            <Button
                                type="submit"
                                disabled={form.processing || profile.cvs.length === 0}
                                size="lg"
                                className="mt-5 h-11 w-full rounded-xl bg-brand-blue hover:bg-brand-blue/90"
                            >
                                {form.processing ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Send className="size-4" />
                                )}
                                Kirim Lamaran
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="mt-1.5 h-9 w-full">
                                <Link href={`/jobs/${job.slug}`}>Batalkan</Link>
                            </Button>

                            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                                Data dikirim langsung ke recruiter. Profil & CV bisa diperbarui kapan saja.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    <Lightbulb className="size-4" />
                                </span>
                                <h3 className="text-sm font-bold text-brand-navy">Tips Cepat</h3>
                            </div>
                            <ul className="mt-3 space-y-2 text-xs">
                                {TIPS.map((tip, i) => (
                                    <li key={i} className="flex gap-2 text-foreground/80">
                                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                                        <span className="leading-relaxed">{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </form>
            </div>
        </>
    );
}

function FormCard({
    icon: Icon,
    title,
    description,
    badge,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    badge?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border/60 bg-card shadow-xs">
            <header className="flex items-start gap-3 border-b border-border/60 px-5 py-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                    <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold tracking-tight text-brand-navy">{title}</h2>
                        {badge && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
                                {badge}
                            </Badge>
                        )}
                    </div>
                    {description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                    )}
                </div>
            </header>
            <div className="p-5">{children}</div>
        </section>
    );
}

function ChecklistItem({
    done,
    label,
    optional = false,
}: {
    done: boolean;
    label: string;
    optional?: boolean;
}) {
    return (
        <li className="flex items-center gap-2">
            <span
                className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-emerald-500 text-white' : 'border border-border/60 bg-background',
                )}
            >
                {done && <CheckCircle2 className="size-3" />}
            </span>
            <span className={cn('flex-1', done ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
            </span>
            {optional && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    opsional
                </span>
            )}
        </li>
    );
}
