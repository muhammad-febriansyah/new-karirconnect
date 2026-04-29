import { Head, Link, router } from '@inertiajs/react';
import { Bot, Play, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';

type Session = {
    id: number;
    status: string | null;
    mode: string | null;
    is_practice: boolean;
    started_at: string | null;
    completed_at: string | null;
    job: { title: string | null; slug: string | null };
    analysis: { overall_score: number; recommendation: string } | null;
};

type Props = { sessions: Session[] };

const tone = (status: string | null) => {
    switch (status) {
        case 'pending':
        case 'invited':
            return 'info';
        case 'in_progress':
            return 'primary';
        case 'completed':
            return 'success';
        case 'expired':
        case 'cancelled':
            return 'destructive';
        default:
            return 'muted';
    }
};

export default function AiInterviewsIndex({ sessions }: Props) {
    const startPractice = () => {
        router.post('/employee/ai-interviews/practice', {});
    };

    return (
        <>
            <Head title="AI Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="AI Interview"
                    description="Latih kemampuan interview Anda dengan AI atau ikuti AI screening dari recruiter."
                    actions={
                        <Button onClick={startPractice}>
                            <Sparkles className="size-4" /> Mulai Latihan
                        </Button>
                    }
                />

                <Section>
                    {sessions.length === 0 ? (
                        <EmptyState
                            title="Belum ada sesi AI Interview"
                            description="Mulai latihan mock interview gratis untuk meningkatkan persiapan Anda."
                        />
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {sessions.map((s) => (
                                <Card key={s.id} className="transition hover:shadow-sm">
                                    <CardContent className="space-y-3 p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                    <Bot className="size-4 text-primary" />
                                                    {s.is_practice ? 'Practice Session' : (s.job.title ?? 'AI Interview')}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {s.completed_at ? `Selesai ${formatDateTime(s.completed_at)}` : s.started_at ? `Dimulai ${formatDateTime(s.started_at)}` : '-'}
                                                </div>
                                            </div>
                                            <StatusBadge tone={tone(s.status) as never}>{s.status}</StatusBadge>
                                        </div>
                                        {s.analysis && (
                                            <div className="rounded-md border bg-muted/40 p-2 text-sm">
                                                <span className="font-medium">Score: {s.analysis.overall_score}/100</span>
                                                <span className="ml-2 text-xs text-muted-foreground">{s.analysis.recommendation}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-end gap-2">
                                            {s.status === 'in_progress' || s.status === 'pending' ? (
                                                <Button asChild size="sm">
                                                    <Link href={`/employee/ai-interviews/${s.id}/run`}>
                                                        <Play className="size-4" /> Lanjutkan
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <Button asChild size="sm" variant="outline">
                                                    <Link href={`/employee/ai-interviews/${s.id}/result`}>
                                                        Lihat Hasil
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}
