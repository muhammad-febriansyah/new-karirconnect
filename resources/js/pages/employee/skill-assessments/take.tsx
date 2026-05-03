import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Flag,
    GraduationCap,
    LayoutGrid,
    Lightbulb,
    RefreshCw,
    Target,
    Timer,
    Trophy,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { index as assessmentIndex, submit as submitAssessment } from '@/routes/employee/skill-assessments';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Question = {
    id: number;
    type: string;
    question: string;
    options: string[];
    difficulty: string;
    time_limit_seconds: number;
    answer: string;
    time_spent_seconds: number | null;
    is_correct: boolean | null;
    correct_answer: string | null;
};

type Props = {
    assessment: {
        id: number;
        status: string;
        score: number | null;
        skill: { id: number; name: string; category: string | null } | null;
        total_questions: number;
        correct_answers: number;
        started_at: string | null;
        completed_at: string | null;
        expires_at: string | null;
        duration_seconds: number | null;
        questions: Question[];
    };
};

const difficultyLabel = (key: string) => {
    switch (key) {
        case 'easy':
            return 'Mudah';
        case 'medium':
            return 'Menengah';
        case 'hard':
            return 'Sulit';
        default:
            return key;
    }
};

const difficultyTone = (key: string) => {
    switch (key) {
        case 'easy':
            return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
        case 'medium':
            return 'bg-amber-100 text-amber-700 ring-amber-200';
        case 'hard':
            return 'bg-rose-100 text-rose-700 ring-rose-200';
        default:
            return 'bg-slate-100 text-slate-700 ring-slate-200';
    }
};

const formatHMS = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatMs = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return '—';
    if (seconds < 60) return `${seconds} dtk`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}d` : `${m}m`;
};

export default function SkillAssessmentTake({ assessment }: Props) {
    const isCompleted = assessment.status === 'completed';

    return (
        <>
            <Head title={`Assessment ${assessment.skill?.name ?? ''}`} />
            {isCompleted ? <ResultMode assessment={assessment} /> : <ExamMode assessment={assessment} />}
        </>
    );
}

/* -------------------------------------------------------------------------- */
/*                                  EXAM MODE                                 */
/* -------------------------------------------------------------------------- */

function ExamMode({ assessment }: Props) {
    const form = useForm({
        answers: assessment.questions.reduce<Record<string, { value: string; time_spent_seconds: number }>>((carry, question) => {
            carry[String(question.id)] = { value: question.answer ?? '', time_spent_seconds: question.time_spent_seconds ?? 0 };
            return carry;
        }, {}),
    });

    const [currentIndex, setCurrentIndex] = useState(0);
    const [flagged, setFlagged] = useState<Set<number>>(new Set());
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [showGridSheet, setShowGridSheet] = useState(false);
    const startedAtRef = useRef<number>(Date.now());
    const questionStartRef = useRef<number>(Date.now());

    const total = assessment.questions.length;
    const current = assessment.questions[currentIndex];

    /* Time per question is measured when navigating away */
    useEffect(() => {
        questionStartRef.current = Date.now();
    }, [currentIndex]);

    /* Countdown */
    const expiresAt = assessment.expires_at ? new Date(assessment.expires_at).getTime() : null;
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(t);
    }, []);
    const remaining = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null;
    const isExpired = remaining !== null && remaining === 0;

    const answeredCount = Object.values(form.data.answers).filter((a) => (a.value ?? '').trim() !== '').length;
    const progress = total === 0 ? 0 : Math.round((answeredCount / total) * 100);

    const setAnswerForCurrent = (value: string) => {
        if (!current) return;
        const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
        const prev = form.data.answers[String(current.id)] ?? { value: '', time_spent_seconds: 0 };
        form.setData('answers', {
            ...form.data.answers,
            [String(current.id)]: {
                value,
                time_spent_seconds: prev.time_spent_seconds + elapsed,
            },
        });
        questionStartRef.current = Date.now();
    };

    const toggleFlag = () => {
        if (!current) return;
        setFlagged((prev) => {
            const next = new Set(prev);
            if (next.has(current.id)) next.delete(current.id);
            else next.add(current.id);
            return next;
        });
    };

    const goTo = (index: number) => {
        if (index < 0 || index >= total) return;
        if (current) {
            const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
            const prev = form.data.answers[String(current.id)] ?? { value: '', time_spent_seconds: 0 };
            form.setData('answers', {
                ...form.data.answers,
                [String(current.id)]: {
                    value: prev.value,
                    time_spent_seconds: prev.time_spent_seconds + elapsed,
                },
            });
        }
        setCurrentIndex(index);
        setShowGridSheet(false);
    };

    const submit = () => {
        form.post(submitAssessment(assessment.id).url, { preserveScroll: true });
    };

    if (isExpired) {
        // auto-submit when expired
        if (!form.processing) submit();
    }

    const skill = assessment.skill;
    const unanswered = total - answeredCount;
    const ringColor = remaining !== null && remaining < 60 ? 'text-rose-600' : remaining !== null && remaining < 300 ? 'text-amber-600' : 'text-slate-700';

    return (
        <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-slate-50">
            {/* Top bar */}
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
                    <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                    >
                        <GraduationCap className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                                {skill?.name ?? 'Skill Assessment'}
                            </h1>
                            {skill?.category && (
                                <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 sm:inline">
                                    {skill.category}
                                </span>
                            )}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                            Soal {currentIndex + 1} dari {total} · {answeredCount} terjawab
                        </div>
                    </div>

                    {remaining !== null && (
                        <div className={`flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 ${ringColor}`}>
                            <Timer className="size-4" />
                            <div className="font-mono text-sm font-semibold tabular-nums">{formatHMS(remaining)}</div>
                        </div>
                    )}

                    <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => setShowGridSheet(true)}>
                        <LayoutGrid className="size-4" />
                        Grid
                    </Button>
                    <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setShowGridSheet(true)} aria-label="Lihat semua soal">
                        <LayoutGrid className="size-4" />
                    </Button>
                </div>
                <div className="h-1 w-full bg-slate-100">
                    <div
                        className="h-1 transition-all"
                        style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #1080E0, #10C0E0)' }}
                    />
                </div>
            </header>

            {/* Main */}
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                    {/* Question card */}
                    <div className="space-y-4">
                        {current ? (
                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                                        Soal {currentIndex + 1}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${difficultyTone(current.difficulty)}`}>
                                        <Target className="size-3" /> {difficultyLabel(current.difficulty)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                                        <Clock className="size-3" /> {current.time_limit_seconds} detik
                                    </span>
                                    <button
                                        type="button"
                                        onClick={toggleFlag}
                                        className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
                                            flagged.has(current.id)
                                                ? 'bg-amber-100 text-amber-700 ring-amber-300'
                                                : 'bg-slate-50 text-slate-600 ring-slate-200 hover:bg-amber-50 hover:text-amber-700'
                                        }`}
                                    >
                                        <Flag className="size-3" /> {flagged.has(current.id) ? 'Ditandai' : 'Tandai'}
                                    </button>
                                </div>

                                <h2 className="mb-6 text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl">
                                    {current.question}
                                </h2>

                                {current.type === 'multiple_choice' && current.options.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {current.options.map((option, idx) => {
                                            const selected = form.data.answers[String(current.id)]?.value === option;
                                            const letter = String.fromCharCode(65 + idx);
                                            return (
                                                <label
                                                    key={option}
                                                    className={`group flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-sm transition ${
                                                        selected
                                                            ? 'border-[color:#1080E0] bg-[color:#1080E0]/5 shadow-sm'
                                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        className="sr-only"
                                                        name={`question-${current.id}`}
                                                        checked={selected}
                                                        onChange={() => setAnswerForCurrent(option)}
                                                    />
                                                    <span
                                                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition ${
                                                            selected
                                                                ? 'bg-[color:#1080E0] text-white'
                                                                : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {letter}
                                                    </span>
                                                    <span className={selected ? 'font-medium text-slate-900' : 'text-slate-700'}>
                                                        {option}
                                                    </span>
                                                    {selected && <Check className="ml-auto size-4 text-[color:#1080E0]" />}
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : current.type === 'code' ? (
                                    <textarea
                                        rows={10}
                                        value={form.data.answers[String(current.id)]?.value ?? ''}
                                        onChange={(event) => setAnswerForCurrent(event.target.value)}
                                        placeholder="Tulis jawaban Anda di sini..."
                                        className="block w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-900 outline-none transition focus:border-[color:#1080E0] focus:bg-white focus:ring-2 focus:ring-[color:#1080E0]/20"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={form.data.answers[String(current.id)]?.value ?? ''}
                                        onChange={(event) => setAnswerForCurrent(event.target.value)}
                                        placeholder="Tulis jawaban Anda..."
                                        className="block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[color:#1080E0] focus:ring-2 focus:ring-[color:#1080E0]/20"
                                    />
                                )}
                            </article>
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                                Tidak ada soal.
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex items-center justify-between gap-3">
                            <Button variant="outline" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
                                <ChevronLeft className="size-4" /> Sebelumnya
                            </Button>
                            <div className="hidden text-xs text-slate-500 sm:block">
                                {answeredCount}/{total} terjawab
                            </div>
                            {currentIndex < total - 1 ? (
                                <Button onClick={() => goTo(currentIndex + 1)} className="bg-slate-900 text-white hover:bg-slate-800">
                                    Berikutnya <ChevronRight className="size-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setShowSubmitConfirm(true)}
                                    className="text-white"
                                    style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                >
                                    <CheckCircle2 className="size-4" /> Selesai & Kirim
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Sidebar — desktop */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-900">Daftar Soal</h3>
                                    <span className="text-xs text-slate-500">{answeredCount}/{total}</span>
                                </div>
                                <QuestionGrid
                                    assessment={assessment}
                                    answers={form.data.answers}
                                    flagged={flagged}
                                    currentIndex={currentIndex}
                                    onSelect={goTo}
                                />
                                <Legend />
                            </div>
                            <Button
                                onClick={() => setShowSubmitConfirm(true)}
                                className="w-full text-white shadow-sm"
                                style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                            >
                                <CheckCircle2 className="size-4" /> Selesai & Kirim
                            </Button>
                            <Button asChild variant="outline" className="w-full">
                                <Link href={assessmentIndex().url}>Keluar Tanpa Kirim</Link>
                            </Button>
                        </div>
                    </aside>
                </div>
            </main>

            {/* Mobile grid sheet */}
            {showGridSheet && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                    onClick={() => setShowGridSheet(false)}
                >
                    <div
                        className="fixed inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Daftar Soal</h3>
                            <Button variant="ghost" size="icon" onClick={() => setShowGridSheet(false)} aria-label="Tutup">
                                <X className="size-4" />
                            </Button>
                        </div>
                        <QuestionGrid
                            assessment={assessment}
                            answers={form.data.answers}
                            flagged={flagged}
                            currentIndex={currentIndex}
                            onSelect={goTo}
                        />
                        <Legend />
                    </div>
                </div>
            )}

            {/* Submit confirmation */}
            <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Kirim assessment?</DialogTitle>
                        <DialogDescription>
                            Setelah dikirim Anda tidak bisa mengubah jawaban. Pastikan semua soal sudah terjawab.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <span className="text-slate-600">Total soal</span>
                            <span className="font-semibold text-slate-900">{total}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                            <span className="text-emerald-700">Terjawab</span>
                            <span className="font-semibold text-emerald-700">{answeredCount}</span>
                        </div>
                        {unanswered > 0 && (
                            <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-sm">
                                <span className="text-rose-700">Belum terjawab</span>
                                <span className="font-semibold text-rose-700">{unanswered}</span>
                            </div>
                        )}
                        {flagged.size > 0 && (
                            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                                <span className="text-amber-700">Ditandai untuk review</span>
                                <span className="font-semibold text-amber-700">{flagged.size}</span>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={submit}
                            disabled={form.processing}
                            className="text-white"
                            style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                        >
                            {form.processing ? 'Mengirim...' : 'Ya, Kirim Assessment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function QuestionGrid({
    assessment,
    answers,
    flagged,
    currentIndex,
    onSelect,
}: {
    assessment: Props['assessment'];
    answers: Record<string, { value: string; time_spent_seconds: number }>;
    flagged: Set<number>;
    currentIndex: number;
    onSelect: (index: number) => void;
}) {
    return (
        <div className="grid grid-cols-5 gap-2">
            {assessment.questions.map((q, idx) => {
                const answered = (answers[String(q.id)]?.value ?? '').trim() !== '';
                const isCurrent = idx === currentIndex;
                const isFlagged = flagged.has(q.id);

                let style = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                if (isCurrent) style = 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900';
                else if (answered) style = 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';

                return (
                    <button
                        key={q.id}
                        type="button"
                        onClick={() => onSelect(idx)}
                        className={`relative flex aspect-square items-center justify-center rounded-lg text-sm font-semibold transition ${style}`}
                    >
                        {idx + 1}
                        {isFlagged && (
                            <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-white">
                                <Flag className="size-2" />
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function Legend() {
    return (
        <div className="mt-4 grid grid-cols-1 gap-1.5 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
                <span className="size-3 rounded bg-slate-900" /> Soal saat ini
            </div>
            <div className="flex items-center gap-2">
                <span className="size-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Sudah terjawab
            </div>
            <div className="flex items-center gap-2">
                <span className="size-3 rounded bg-slate-100 ring-1 ring-slate-300" /> Belum terjawab
            </div>
            <div className="flex items-center gap-2">
                <Flag className="size-3 text-amber-500" /> Ditandai
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                                 RESULT MODE                                */
/* -------------------------------------------------------------------------- */

function ResultMode({ assessment }: Props) {
    const score = assessment.score ?? 0;
    const total = assessment.total_questions || assessment.questions.length || 1;
    const correct = assessment.correct_answers;
    const wrong = total - correct;
    const passed = score >= 60;

    const grade = useMemo(() => {
        if (score >= 90) return { label: 'Luar Biasa', tone: 'text-emerald-700', bg: 'bg-emerald-100' };
        if (score >= 75) return { label: 'Bagus', tone: 'text-blue-700', bg: 'bg-blue-100' };
        if (score >= 60) return { label: 'Cukup', tone: 'text-amber-700', bg: 'bg-amber-100' };
        return { label: 'Perlu Latihan Lagi', tone: 'text-rose-700', bg: 'bg-rose-100' };
    }, [score]);

    /* Aggregate by difficulty */
    const byDifficulty = useMemo(() => {
        const buckets: Record<string, { total: number; correct: number; avgTime: number; totalTime: number }> = {};
        for (const q of assessment.questions) {
            const key = q.difficulty;
            if (!buckets[key]) buckets[key] = { total: 0, correct: 0, avgTime: 0, totalTime: 0 };
            buckets[key].total += 1;
            if (q.is_correct) buckets[key].correct += 1;
            buckets[key].totalTime += q.time_spent_seconds ?? 0;
        }
        Object.values(buckets).forEach((b) => {
            b.avgTime = b.total > 0 ? Math.round(b.totalTime / b.total) : 0;
        });
        return buckets;
    }, [assessment.questions]);

    /* Improvements list — generated from data */
    const improvements = useMemo(() => {
        const list: string[] = [];
        if (wrong === 0) {
            list.push('Sempurna! Pertahankan dengan mencoba skill atau level yang lebih sulit.');
            return list;
        }
        if (score < 60) {
            list.push(`Nilai Anda ${score}, di bawah passing grade. Pelajari ulang konsep dasar ${assessment.skill?.name ?? 'skill ini'}.`);
        }
        const weakDifficulties = Object.entries(byDifficulty)
            .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5)
            .map(([k]) => difficultyLabel(k).toLowerCase());
        if (weakDifficulties.length > 0) {
            list.push(`Fokuskan latihan pada soal level ${weakDifficulties.join(', ')} — akurasi Anda di bawah 50%.`);
        }
        const slowQs = assessment.questions.filter(
            (q) => (q.time_spent_seconds ?? 0) > q.time_limit_seconds && !q.is_correct,
        );
        if (slowQs.length > 0) {
            list.push(`Ada ${slowQs.length} soal yang melewati batas waktu — latih kecepatan dengan timer.`);
        }
        const wrongMc = assessment.questions.filter((q) => q.is_correct === false && q.type === 'multiple_choice');
        if (wrongMc.length > 0) {
            list.push(`Review ${wrongMc.length} soal pilihan ganda yang salah di bagian "Pembahasan" untuk memahami jawaban benar.`);
        }
        if (list.length === 0) {
            list.push('Hasil cukup baik. Coba skill lain untuk memperluas portofolio kompetensi Anda.');
        }
        return list;
    }, [assessment, byDifficulty, score, wrong]);

    return (
        <div className="min-h-[calc(100dvh-4rem)] bg-slate-50 pb-12">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
                    <Button asChild variant="ghost" size="icon" aria-label="Kembali">
                        <Link href={assessmentIndex().url}>
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Hasil Assessment</div>
                        <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                            {assessment.skill?.name ?? 'Skill Assessment'}
                        </h1>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href={assessmentIndex().url}>
                            <RefreshCw className="size-3.5" /> <span className="hidden sm:inline">Coba Skill Lain</span>
                        </Link>
                    </Button>
                </div>
            </header>

            <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
                {/* Score hero */}
                <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[color:#0a3a8a] to-[color:#1080E0] p-6 text-white shadow-xl sm:p-8">
                    <div className="grid items-center gap-6 lg:grid-cols-[auto_1fr]">
                        <ScoreGauge score={score} passed={passed} />
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${grade.bg} ${grade.tone}`}>
                                    <Trophy className="size-3.5" /> {grade.label}
                                </span>
                                {passed ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
                                        <CheckCircle2 className="size-3.5" /> Lulus passing grade
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100 ring-1 ring-rose-300/30">
                                        <XCircle className="size-3.5" /> Belum lulus (min. 60)
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-semibold sm:text-3xl">
                                Anda menjawab {correct} dari {total} soal dengan benar
                            </h2>
                            <p className="text-sm text-white/80">
                                {passed
                                    ? 'Selamat! Hasil ini akan ditampilkan di profil Anda dan terlihat oleh perekrut.'
                                    : 'Jangan menyerah — ulangi pembahasan di bawah dan coba lagi setelah belajar.'}
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                                <StatTile label="Skor" value={`${score}`} suffix="/100" />
                                <StatTile label="Benar" value={String(correct)} suffix={`/${total}`} />
                                <StatTile label="Salah" value={String(wrong)} suffix={`/${total}`} />
                                <StatTile label="Durasi" value={formatMs(assessment.duration_seconds)} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Difficulty breakdown */}
                <section className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <BookOpen className="size-4 text-slate-500" />
                            <h3 className="font-semibold text-slate-900">Akurasi per Tingkat Kesulitan</h3>
                        </div>
                        <div className="space-y-4">
                            {(['easy', 'medium', 'hard'] as const).map((key) => {
                                const data = byDifficulty[key];
                                if (!data || data.total === 0) return null;
                                const pct = Math.round((data.correct / data.total) * 100);
                                const tone =
                                    pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                                return (
                                    <div key={key}>
                                        <div className="mb-1.5 flex items-center justify-between text-sm">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${difficultyTone(key)}`}>
                                                {difficultyLabel(key)}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {data.correct}/{data.total} benar · avg {formatMs(data.avgTime)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={`h-full rounded-full ${tone} transition-all`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="w-12 text-right text-sm font-semibold tabular-nums text-slate-900">
                                                {pct}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Improvements */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <Lightbulb className="size-4 text-amber-500" />
                            <h3 className="font-semibold text-slate-900">Yang Perlu Ditingkatkan</h3>
                        </div>
                        <ul className="space-y-3">
                            {improvements.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                        <span className="text-xs font-semibold">{i + 1}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-slate-700">{item}</p>
                                </li>
                            ))}
                        </ul>
                        <Button asChild variant="outline" className="mt-4 w-full">
                            <Link href={assessmentIndex().url}>
                                <RefreshCw className="size-4" /> Coba Skill Lain
                            </Link>
                        </Button>
                    </div>
                </section>

                {/* Per-question review */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen className="size-4 text-slate-500" />
                            <h3 className="font-semibold text-slate-900">Pembahasan Jawaban</h3>
                        </div>
                        <span className="text-xs text-slate-500">{total} soal</span>
                    </div>
                    <div className="space-y-3">
                        {assessment.questions.map((q, idx) => (
                            <ReviewItem key={q.id} index={idx} question={q} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

function ScoreGauge({ score, passed }: { score: number; passed: boolean }) {
    const r = 64;
    const c = 2 * Math.PI * r;
    const offset = c - (score / 100) * c;
    return (
        <div className="relative mx-auto flex size-44 shrink-0 items-center justify-center">
            <svg className="-rotate-90" viewBox="0 0 160 160" width="176" height="176">
                <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
                <circle
                    cx="80"
                    cy="80"
                    r={r}
                    fill="none"
                    stroke={passed ? '#34d399' : '#fb7185'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold tabular-nums">{score}</div>
                <div className="text-xs text-white/70">dari 100</div>
            </div>
        </div>
    );
}

function StatTile({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
    return (
        <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/20 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-wide text-white/70">{label}</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">
                {value}
                {suffix && <span className="text-xs font-normal text-white/60">{suffix}</span>}
            </div>
        </div>
    );
}

function ReviewItem({ index, question }: { index: number; question: Question }) {
    const [expanded, setExpanded] = useState(false);
    const userAnswer = question.answer || '';
    const isCorrect = question.is_correct === true;
    const noAnswer = userAnswer.trim() === '';

    return (
        <div
            className={`overflow-hidden rounded-xl border transition ${
                isCorrect ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
            }`}
        >
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-start gap-3 p-4 text-left"
            >
                <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    }`}
                >
                    {isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-700">Soal {index + 1}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ${difficultyTone(question.difficulty)}`}>
                            {difficultyLabel(question.difficulty)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                            <Clock className="size-3" /> {formatMs(question.time_spent_seconds)}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{question.question}</p>
                    {!expanded && (
                        <p className="mt-1 text-xs text-slate-500">
                            {isCorrect ? 'Jawaban benar' : noAnswer ? 'Tidak dijawab' : 'Jawaban salah'} · klik untuk pembahasan
                        </p>
                    )}
                </div>
                <ArrowRight className={`mt-1 size-4 shrink-0 text-slate-400 transition ${expanded ? 'rotate-90' : ''}`} />
            </button>

            {expanded && (
                <div className="space-y-2 border-t border-slate-200 bg-white p-4">
                    {question.type === 'multiple_choice' && question.options.length > 0 ? (
                        <div className="space-y-2">
                            {question.options.map((option, idx) => {
                                const letter = String.fromCharCode(65 + idx);
                                const isCorrectOption = option === question.correct_answer;
                                const isUserPick = option === userAnswer;
                                let cls = 'border-slate-200 bg-white text-slate-700';
                                if (isCorrectOption) cls = 'border-emerald-300 bg-emerald-50 text-emerald-900';
                                else if (isUserPick) cls = 'border-rose-300 bg-rose-50 text-rose-900';
                                return (
                                    <div
                                        key={option}
                                        className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${cls}`}
                                    >
                                        <span
                                            className={`flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                                                isCorrectOption
                                                    ? 'bg-emerald-500 text-white'
                                                    : isUserPick
                                                        ? 'bg-rose-500 text-white'
                                                        : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {letter}
                                        </span>
                                        <span className="flex-1">{option}</span>
                                        {isCorrectOption && (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                                <Check className="size-3.5" /> Benar
                                            </span>
                                        )}
                                        {isUserPick && !isCorrectOption && (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
                                                <X className="size-3.5" /> Jawaban Anda
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-2 text-sm">
                            <div className={`rounded-lg p-3 ring-1 ${
                                isCorrect ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'
                            }`}>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jawaban Anda</div>
                                <div className={`mt-1 ${isCorrect ? 'text-emerald-900' : 'text-rose-900'}`}>
                                    {noAnswer ? <em className="text-slate-500">Tidak dijawab</em> : userAnswer}
                                </div>
                            </div>
                            {!isCorrect && question.correct_answer && (
                                <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Jawaban Benar</div>
                                    <div className="mt-1 text-emerald-900">{question.correct_answer}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {!isCorrect && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
                            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                                Catat poin ini untuk dipelajari ulang. Topik {difficultyLabel(question.difficulty).toLowerCase()} sering muncul di assessment lanjutan.
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
