import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Bot, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatDateTime } from '@/lib/format-date';

type Analysis = {
    overall_score: number;
    fit_score: number;
    recommendation: string;
    summary: string;
    strengths: string[] | null;
    weaknesses: string[] | null;
    skill_assessment: Record<string, number> | null;
    communication_score: number | null;
    technical_score: number | null;
    problem_solving_score: number | null;
    culture_fit_score: number | null;
    red_flags: string[] | null;
};

type Props = {
    session: {
        id: number;
        job_title: string | null;
        candidate_name: string | null;
        candidate_email: string | null;
        duration_seconds: number | null;
        completed_at: string | null;
    };
    analysis: Analysis | null;
    responses: Array<{
        order_number: number;
        category: string;
        question: string;
        answer: string | null;
        ai_score: number | null;
        sub_scores: Record<string, number> | null;
        ai_feedback: string | null;
    }>;
};

export default function EmployerAiInterviewShow({ session, analysis, responses }: Props) {
    return (
        <>
            <Head title={`AI Interview - ${session.candidate_name ?? '-'}`} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={`Hasil AI Interview: ${session.candidate_name ?? '-'}`}
                    description={`${session.job_title ?? '-'} · ${session.candidate_email ?? ''}`}
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/employer/ai-interviews">
                                <ArrowLeft className="size-4" /> Kembali
                            </Link>
                        </Button>
                    }
                />

                {analysis ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <Sparkles className="size-4 text-primary" /> Overall
                                    </div>
                                    <div className="text-3xl font-bold">{analysis.overall_score}</div>
                                    <Progress value={analysis.overall_score} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <div className="text-sm font-semibold">Fit Score</div>
                                    <div className="text-3xl font-bold">{analysis.fit_score}</div>
                                    <Progress value={analysis.fit_score} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <div className="text-sm font-semibold">Rekomendasi</div>
                                    <Badge className="text-sm">{analysis.recommendation.replace('_', ' ')}</Badge>
                                </CardContent>
                            </Card>
                        </div>

                        <Section title="Ringkasan">
                            <p className="text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
                        </Section>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Section title="Kekuatan">
                                <ul className="list-inside list-disc space-y-1 text-sm">
                                    {(analysis.strengths ?? []).map((s, i) => (<li key={i}>{s}</li>))}
                                </ul>
                            </Section>
                            <Section title="Area Pengembangan">
                                <ul className="list-inside list-disc space-y-1 text-sm">
                                    {(analysis.weaknesses ?? []).map((w, i) => (<li key={i}>{w}</li>))}
                                </ul>
                            </Section>
                        </div>

                        <Section title="Detail Per Pertanyaan">
                            <div className="space-y-3">
                                {responses.map((r) => (
                                    <Card key={r.order_number}>
                                        <CardContent className="space-y-2 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-semibold">
                                                    Q{r.order_number}
                                                    <Badge variant="secondary" className="ml-2">{r.category}</Badge>
                                                </div>
                                                {r.ai_score !== null && <Badge>{r.ai_score}/100</Badge>}
                                            </div>
                                            <p className="font-medium">{r.question}</p>
                                            {r.answer && <p className="rounded bg-muted/40 p-2 text-sm">{r.answer}</p>}
                                            {r.ai_feedback && <p className="text-xs text-muted-foreground">AI: {r.ai_feedback}</p>}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </Section>
                    </>
                ) : (
                    <Section><p className="text-sm text-muted-foreground">Analisis belum tersedia.</p></Section>
                )}

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Bot className="size-3" /> Selesai: {session.completed_at ? formatDateTime(session.completed_at) : '-'}
                </p>
            </div>
        </>
    );
}
