import { Head, router, useForm } from '@inertiajs/react';
import { Bot, CheckCircle2, Loader2, Send } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Question = {
    id: number;
    order_number: number;
    category: string;
    question: string;
    max_duration_seconds: number;
    answered: boolean;
};

type Props = {
    session: {
        id: number;
        status: string | null;
        job_title: string | null;
        is_practice: boolean;
        total_questions: number;
        current_index: number;
    };
    questions: Question[];
    currentQuestion: {
        id: number;
        order_number: number;
        category: string;
        question: string;
        max_duration_seconds: number;
    } | null;
};

export default function AiInterviewRun({ session, questions, currentQuestion }: Props) {
    const [submitting, setSubmitting] = useState(false);
    const form = useForm({ answer: '', duration_seconds: 0 });

    const onSubmit = (e: FormEvent) => {
        if (!currentQuestion) return;
        e.preventDefault();
        setSubmitting(true);
        form.post(`/employee/ai-interviews/${session.id}/questions/${currentQuestion.id}/answer`, {
            preserveScroll: true,
            onFinish: () => {
                setSubmitting(false);
                form.reset('answer');
            },
        });
    };

    const completeNow = () => {
        router.post(`/employee/ai-interviews/${session.id}/complete`, {});
    };

    const progressValue = (session.current_index / Math.max(session.total_questions, 1)) * 100;

    return (
        <>
            <Head title="Sesi AI Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={session.is_practice ? 'Latihan AI Interview' : `AI Interview: ${session.job_title ?? '-'}`}
                    description={`Pertanyaan ${session.current_index + 1} dari ${session.total_questions}`}
                    actions={
                        session.current_index >= session.total_questions ? (
                            <Button onClick={completeNow}>
                                <CheckCircle2 className="size-4" /> Selesaikan & Lihat Hasil
                            </Button>
                        ) : null
                    }
                />

                <Progress value={progressValue} />

                {currentQuestion ? (
                    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                        <Section>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Bot className="size-5 text-primary" />
                                    <Badge variant="secondary">{currentQuestion.category}</Badge>
                                    <Badge variant="outline">Maks {currentQuestion.max_duration_seconds}s</Badge>
                                </div>
                                <h2 className="text-xl font-semibold leading-relaxed">{currentQuestion.question}</h2>
                            </div>

                            <form onSubmit={onSubmit} className="mt-6 space-y-4">
                                <TextareaField
                                    label="Jawaban Anda"
                                    rows={8}
                                    placeholder="Tulis jawaban Anda di sini. Pikirkan dengan tenang — AI akan mengevaluasi struktur, kedalaman, dan relevansi."
                                    value={form.data.answer}
                                    onChange={(e) => form.setData('answer', e.target.value)}
                                    error={form.errors.answer}
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">{form.data.answer.length} karakter</span>
                                    <Button type="submit" disabled={submitting || form.data.answer.trim().length === 0}>
                                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                        Kirim Jawaban
                                    </Button>
                                </div>
                            </form>
                        </Section>

                        <aside className="space-y-3">
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <h3 className="text-sm font-semibold">Daftar Pertanyaan</h3>
                                    <ol className="space-y-1 text-sm">
                                        {questions.map((q) => (
                                            <li key={q.id} className="flex items-center gap-2">
                                                {q.answered ? (
                                                    <CheckCircle2 className="size-3.5 text-success" />
                                                ) : (
                                                    <span className="size-3.5 rounded-full border border-muted-foreground/40" />
                                                )}
                                                <span className={q.answered ? 'text-muted-foreground line-through' : ''}>
                                                    {q.order_number}. {q.category}
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                </CardContent>
                            </Card>
                        </aside>
                    </div>
                ) : (
                    <Section>
                        <div className="text-center">
                            <CheckCircle2 className="mx-auto size-10 text-success" />
                            <h2 className="mt-3 text-lg font-semibold">Semua pertanyaan selesai!</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Klik tombol di bawah untuk melihat analisis lengkap dari AI.</p>
                            <Button className="mt-4" onClick={completeNow}>
                                <CheckCircle2 className="size-4" /> Selesaikan & Lihat Hasil
                            </Button>
                        </div>
                    </Section>
                )}
            </div>
        </>
    );
}
