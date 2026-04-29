import { Head, Link } from '@inertiajs/react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';

type StatusLog = {
    id: number;
    from_status: string | null;
    to_status: string | null;
    changed_at: string | null;
    changed_by: string | null;
    note: string | null;
};

type Props = {
    application: {
        id: number;
        status: string | null;
        ai_match_score: number | null;
        cover_letter: string | null;
        expected_salary: number | null;
        applied_at: string | null;
        reviewed_at: string | null;
        job: { id: number; title: string; slug: string };
        company: { name: string | null; slug: string | null };
        status_logs: StatusLog[];
    };
};

const statusTone = (status: string | null) => {
    switch (status) {
        case 'submitted':
            return 'info';
        case 'reviewed':
        case 'shortlisted':
        case 'interview':
            return 'primary';
        case 'offered':
            return 'warning';
        case 'hired':
            return 'success';
        case 'rejected':
        case 'withdrawn':
            return 'destructive';
        default:
            return 'muted';
    }
};

export default function ApplicationShow({ application }: Props) {
    return (
        <>
            <Head title={application.job.title} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={application.job.title}
                    description={application.company.name ?? undefined}
                    actions={
                        <div className="flex gap-2">
                            <StatusBadge tone={statusTone(application.status) as never}>{application.status}</StatusBadge>
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/jobs/${application.job.slug}`}>
                                    <ExternalLink className="size-4" /> Lihat Lowongan
                                </Link>
                            </Button>
                        </div>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        {application.cover_letter && (
                            <Section title="Cover Letter Anda">
                                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{application.cover_letter}</p>
                            </Section>
                        )}

                        <Section title="Riwayat Status">
                            <ol className="relative ml-4 space-y-4 border-l">
                                {application.status_logs.map((log) => (
                                    <li key={log.id} className="ml-3">
                                        <span className="absolute -left-1.5 size-3 rounded-full bg-primary" />
                                        <div className="text-sm">
                                            <span className="font-medium">{log.from_status ?? 'baru'}</span>
                                            <span className="mx-1 text-muted-foreground">→</span>
                                            <span className="font-medium">{log.to_status}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {log.changed_at ? formatDateTime(log.changed_at) : '-'} {log.changed_by ? `oleh ${log.changed_by}` : ''}
                                        </div>
                                        {log.note && <p className="mt-1 text-sm text-muted-foreground">{log.note}</p>}
                                    </li>
                                ))}
                            </ol>
                        </Section>
                    </div>

                    <aside className="space-y-4">
                        <Card>
                            <CardContent className="space-y-2 p-4">
                                {application.ai_match_score !== null && (
                                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                                        <Sparkles className="size-4 text-primary" />
                                        <div className="text-xs">
                                            <div className="font-medium">Match Score</div>
                                            <div className="text-muted-foreground">{application.ai_match_score} / 100</div>
                                        </div>
                                    </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                    Dikirim: {application.applied_at ? formatDateTime(application.applied_at) : '-'}
                                </div>
                                {application.reviewed_at && (
                                    <div className="text-xs text-muted-foreground">
                                        Ditinjau: {formatDateTime(application.reviewed_at)}
                                    </div>
                                )}
                                {application.expected_salary && (
                                    <div className="text-xs text-muted-foreground">
                                        Ekspektasi Gaji: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(application.expected_salary)}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}
