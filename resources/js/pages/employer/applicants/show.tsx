import { Head, Link, router, useForm } from '@inertiajs/react';
import { ExternalLink, FileText, Mail, MapPin, Sparkles, User } from 'lucide-react';
import { type FormEvent } from 'react';
import { StatusBadge } from '@/components/feedback/status-badge';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/format-date';
import { status as applicantStatusRoute } from '@/routes/employer/applicants';

type Option = { value: string; label: string };

type StatusLog = {
    id: number;
    from_status: string | null;
    to_status: string | null;
    changed_at: string | null;
    changed_by: { id: number; name: string } | null;
    note: string | null;
};

type Application = {
    id: number;
    status: string | null;
    ai_match_score: number | null;
    expected_salary: number | null;
    cover_letter: string | null;
    applied_at: string | null;
    reviewed_at: string | null;
    job: { id: number; title: string; slug: string };
    candidate: {
        id: number;
        name: string | null;
        email: string | null;
        city: string | null;
        skills: string[];
    };
    cv: { id: number; label: string; url: string } | null;
    screening_answers: Array<{ id: number; question: string | null; type: string | null; answer: unknown }>;
    status_logs: StatusLog[];
};

type Props = {
    application: Application;
    statusOptions: Option[];
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

export default function ApplicantShow({ application, statusOptions }: Props) {
    const form = useForm({
        status: application.status ?? 'reviewed',
        note: '',
    });

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post(applicantStatusRoute(application.id).url, {
            preserveScroll: true,
            onSuccess: () => form.reset('note'),
        });
    };

    return (
        <>
            <Head title={application.candidate.name ?? 'Pelamar'} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={application.candidate.name ?? 'Pelamar'}
                    description={`Lamaran untuk ${application.job.title}`}
                    actions={
                        <Button asChild variant="outline">
                            <Link href={`/jobs/${application.job.slug}`}>
                                <ExternalLink className="size-4" /> Lihat Lowongan
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        <Section title="Profil Singkat">
                            <div className="grid gap-2 text-sm">
                                <div className="flex items-center gap-2"><User className="size-4 text-muted-foreground" /> {application.candidate.name}</div>
                                <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> {application.candidate.email}</div>
                                {application.candidate.city && (
                                    <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /> {application.candidate.city}</div>
                                )}
                                {application.candidate.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        {application.candidate.skills.map((s) => (
                                            <Badge key={s} variant="secondary">{s}</Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {application.cv && (
                                <div className="mt-3">
                                    <Button asChild size="sm" variant="outline">
                                        <a href={application.cv.url} target="_blank" rel="noreferrer">
                                            <FileText className="size-4" /> {application.cv.label}
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </Section>

                        {application.cover_letter && (
                            <Section title="Cover Letter">
                                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{application.cover_letter}</p>
                            </Section>
                        )}

                        {application.screening_answers.length > 0 && (
                            <Section title="Jawaban Screening">
                                <ul className="space-y-3">
                                    {application.screening_answers.map((a) => (
                                        <li key={a.id} className="space-y-1">
                                            <div className="text-sm font-medium">{a.question}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {typeof a.answer === 'object' && a.answer !== null
                                                    ? String((a.answer as Record<string, unknown>).value ?? JSON.stringify(a.answer))
                                                    : String(a.answer ?? '-')}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
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
                                            {log.changed_at ? formatDateTime(log.changed_at) : '-'} oleh {log.changed_by?.name ?? '-'}
                                        </div>
                                        {log.note && <p className="mt-1 text-sm text-muted-foreground">{log.note}</p>}
                                    </li>
                                ))}
                            </ol>
                        </Section>
                    </div>

                    <aside className="space-y-4">
                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">Status Saat Ini</span>
                                    <StatusBadge tone={statusTone(application.status) as never}>{application.status}</StatusBadge>
                                </div>
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
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <h3 className="text-sm font-semibold">Ubah Status</h3>
                                <form onSubmit={onSubmit} className="space-y-3">
                                    <Select
                                        value={form.data.status}
                                        onValueChange={(v) => form.setData('status', v)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((c) => (
                                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <TextareaField
                                        label="Catatan (opsional)"
                                        rows={3}
                                        placeholder="Pesan untuk kandidat…"
                                        value={form.data.note}
                                        onChange={(e) => form.setData('note', e.target.value)}
                                    />
                                    <Button type="submit" className="w-full" disabled={form.processing}>
                                        Perbarui Status
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}
