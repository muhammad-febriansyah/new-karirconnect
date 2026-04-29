import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatDateTime } from '@/lib/format-date';

type Props = {
    session: {
        id: number;
        job_title: string | null;
        is_practice: boolean;
        duration_seconds: number | null;
        completed_at: string | null;
    };
    analysis: {
        overall_score: number;
        fit_score: number;
        recommendation: string;
        summary: string;
        strengths: string[];
        weaknesses: string[];
        skill_assessment: Record<string, number>;
        communication_score: number | null;
        technical_score: number | null;
        problem_solving_score: number | null;
        culture_fit_score: number | null;
        red_flags: string[];
    } | null;
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

const recommendationTone = (rec: string) => {
    switch (rec) {
        case 'strong_hire':
            return 'success';
        case 'hire':
            return 'default';
        case 'no_hire':
        case 'strong_no_hire':
            return 'destructive';
        default:
            return 'secondary';
    }
};

export default function AiInterviewResult({ session, analysis, responses }: Props) {
    return (
        <>
            <Head title="Hasil AI Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={`Hasil AI Interview${session.is_practice ? ' (Latihan)' : ''}`}
                    description={session.job_title ?? '-'}
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/employee/ai-interviews">Kembali</Link>
                        </Button>
                    }
                />

                {!analysis ? (
                    <Section>
                        <p className="text-sm text-muted-foreground">Analisis sedang diproses, silakan refresh sebentar lagi.</p>
                    </Section>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <Sparkles className="size-4 text-primary" /> Overall Score
                                    </div>
                                    <div className="text-4xl font-bold">{analysis.overall_score}</div>
                                    <Progress value={analysis.overall_score} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <div className="text-sm font-semibold">Fit Score</div>
                                    <div className="text-4xl font-bold">{analysis.fit_score}</div>
                                    <Progress value={analysis.fit_score} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <div className="text-sm font-semibold">Rekomendasi AI</div>
                                    <Badge variant={recommendationTone(analysis.recommendation) as never} className="text-base">
                                        {analysis.recommendation.replace('_', ' ')}
                                    </Badge>
                                    {session.duration_seconds && (
                                        <p className="text-xs text-muted-foreground">Durasi {Math.round(session.duration_seconds / 60)} menit</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Section title="Ringkasan">
                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
                        </Section>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Section title="Kekuatan">
                                <ul className="space-y-1.5 text-sm">
                                    {analysis.strengths.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <ThumbsUp className="mt-0.5 size-4 shrink-0 text-success" />
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                            <Section title="Area Pengembangan">
                                <ul className="space-y-1.5 text-sm">
                                    {analysis.weaknesses.map((w, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <ThumbsDown className="mt-0.5 size-4 shrink-0 text-destructive" />
                                            <span>{w}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        </div>

                        <div className="grid gap-3 md:grid-cols-4">
                            {[
                                ['Komunikasi', analysis.communication_score],
                                ['Teknis', analysis.technical_score],
                                ['Problem Solving', analysis.problem_solving_score],
                                ['Culture Fit', analysis.culture_fit_score],
                            ].map(([label, value]) => (
                                <Card key={label as string}>
                                    <CardContent className="space-y-2 p-4">
                                        <div className="text-xs text-muted-foreground">{label as string}</div>
                                        <div className="text-2xl font-bold">{value ?? '-'}</div>
                                        <Progress value={Number(value ?? 0)} />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {analysis.red_flags.length > 0 && (
                            <Section title="Red Flags">
                                <ul className="space-y-1.5 text-sm">
                                    {analysis.red_flags.map((rf, i) => (
                                        <li key={i} className="flex items-start gap-2 text-destructive">
                                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                            <span>{rf}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        <Section title="Detail Per Pertanyaan">
                            <div className="space-y-3">
                                {responses.map((r) => (
                                    <Card key={r.order_number}>
                                        <CardContent className="space-y-2 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm">
                                                    <span className="font-semibold">Q{r.order_number}</span>
                                                    <Badge variant="secondary" className="ml-2">{r.category}</Badge>
                                                </div>
                                                {r.ai_score !== null && (
                                                    <Badge variant={r.ai_score >= 70 ? 'default' : 'secondary'}>{r.ai_score}/100</Badge>
                                                )}
                                            </div>
                                            <p className="font-medium">{r.question}</p>
                                            {r.answer && <p className="rounded bg-muted/40 p-2 text-sm">{r.answer}</p>}
                                            {r.ai_feedback && <p className="text-xs text-muted-foreground">Feedback: {r.ai_feedback}</p>}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </Section>
                    </>
                )}

                <p className="text-xs text-muted-foreground">Selesai pada: {session.completed_at ? formatDateTime(session.completed_at) : '-'}</p>
            </div>
        </>
    );
}
