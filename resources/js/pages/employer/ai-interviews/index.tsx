import { Head, Link, router } from '@inertiajs/react';
import { Bot, Eye } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

type Session = {
    id: number;
    completed_at: string | null;
    duration_seconds: number | null;
    candidate_name: string | null;
    candidate_email: string | null;
    job_title: string | null;
    job_slug: string | null;
    overall_score: number | null;
    recommendation: string | null;
};

type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

type Props = { sessions: Pagination<Session> };

export default function EmployerAiInterviewsIndex({ sessions }: Props) {
    return (
        <>
            <Head title="Hasil AI Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Hasil AI Interview"
                    description="Tinjau hasil AI Interview dari kandidat untuk lowongan Anda."
                />

                <Section>
                    {sessions.data.length === 0 ? (
                        <EmptyState title="Belum ada hasil" description="Sesi AI Interview yang sudah selesai akan muncul di sini." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kandidat</TableHead>
                                    <TableHead>Lowongan</TableHead>
                                    <TableHead>Skor</TableHead>
                                    <TableHead>Rekomendasi</TableHead>
                                    <TableHead>Selesai</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.data.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell>
                                            <div className="font-medium">{s.candidate_name}</div>
                                            <div className="text-xs text-muted-foreground">{s.candidate_email}</div>
                                        </TableCell>
                                        <TableCell className="text-sm">{s.job_title}</TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1.5 text-sm">
                                                <Bot className="size-3.5 text-primary" />
                                                <span className="font-semibold">{s.overall_score ?? '-'}</span>
                                            </span>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{s.recommendation ?? '-'}</Badge></TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {s.completed_at ? formatDateTime(s.completed_at) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild size="sm" variant="ghost">
                                                <Link href={`/employer/ai-interviews/${s.id}`}>
                                                    <Eye className="size-4" /> Detail
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{sessions.from ?? 0}–{sessions.to ?? 0} dari {sessions.total}</span>
                        <div className="flex gap-1">
                            {sessions.links.map((l, i) => (
                                <Button
                                    key={i}
                                    size="sm"
                                    variant={l.active ? 'default' : 'outline'}
                                    disabled={!l.url}
                                    onClick={() => l.url && router.get(l.url, undefined, { preserveScroll: true })}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    </div>
                </Section>
            </div>
        </>
    );
}
