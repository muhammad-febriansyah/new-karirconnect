import { Head, Link, router, useForm } from '@inertiajs/react';
import { Calendar, CheckCircle2, Download, ExternalLink, MapPin, Save, Video, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { StatusBadge } from '@/components/feedback/status-badge';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/format-date';

type Participant = {
    id: number;
    role: string;
    response: string;
    attended: boolean | null;
    name: string | null;
    email: string | null;
};

type RescheduleRequest = {
    id: number;
    reason: string;
    proposed_slots: string[];
    status: string;
    requested_by: string | null;
    created_at: string | null;
};

type Scorecard = {
    id: number;
    reviewer: string | null;
    overall_score: number;
    recommendation: string;
    comments: string | null;
    submitted_at: string | null;
};

type Interview = {
    id: number;
    title: string;
    stage: string | null;
    mode: string | null;
    status: string | null;
    scheduled_at: string | null;
    duration_minutes: number;
    timezone: string;
    meeting_url: string | null;
    meeting_passcode: string | null;
    location_name: string | null;
    location_address: string | null;
    location_map_url: string | null;
    candidate_instructions: string | null;
    internal_notes: string | null;
    application: {
        id: number;
        job_title: string | null;
        job_slug: string | null;
        candidate_name: string | null;
        candidate_email: string | null;
    };
    participants: Participant[];
    reschedule_requests: RescheduleRequest[];
    scorecards: Scorecard[];
};

type Props = {
    interview: Interview;
    myScorecard: { overall_score?: number; recommendation?: string; comments?: string } | null;
};

const statusTone = (status: string | null) => {
    switch (status) {
        case 'scheduled':
        case 'rescheduled':
            return 'info';
        case 'ongoing':
            return 'primary';
        case 'completed':
            return 'success';
        case 'cancelled':
        case 'no_show':
        case 'expired':
            return 'destructive';
        default:
            return 'muted';
    }
};

export default function InterviewShow({ interview, myScorecard }: Props) {
    const [cancelling, setCancelling] = useState(false);

    const scorecard = useForm({
        overall_score: myScorecard?.overall_score ?? 3,
        recommendation: myScorecard?.recommendation ?? 'yes',
        criteria_scores: { technical: 3, communication: 3, culture: 3 },
        strengths: '',
        weaknesses: '',
        comments: myScorecard?.comments ?? '',
    });

    const onScorecardSubmit = (e: FormEvent) => {
        e.preventDefault();
        scorecard.post(`/employer/interviews/${interview.id}/scorecard`, { preserveScroll: true });
    };

    const handleCancel = () => {
        router.post(`/employer/interviews/${interview.id}/cancel`, {}, {
            preserveScroll: true,
            onFinish: () => setCancelling(false),
        });
    };

    const handleComplete = () => {
        router.post(`/employer/interviews/${interview.id}/complete`, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title={interview.title} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={interview.title}
                    description={`Untuk ${interview.application.candidate_name} — ${interview.application.job_title}`}
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <StatusBadge tone={statusTone(interview.status) as never}>{interview.status}</StatusBadge>
                            <Button asChild variant="outline" size="sm">
                                <a href={`/employer/interviews/${interview.id}/ics`}>
                                    <Download className="size-4" /> .ics
                                </a>
                            </Button>
                            {interview.status === 'scheduled' && (
                                <>
                                    <Button variant="outline" size="sm" onClick={handleComplete}>
                                        <CheckCircle2 className="size-4" /> Tandai Selesai
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => setCancelling(true)}>
                                        <X className="size-4" /> Batalkan
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        <Section title="Detail">
                            <dl className="grid grid-cols-2 gap-3 text-sm">
                                <dt className="text-muted-foreground">Jadwal</dt>
                                <dd className="flex items-center gap-2">
                                    <Calendar className="size-4" />
                                    {interview.scheduled_at ? formatDateTime(interview.scheduled_at) : '-'} ({interview.timezone})
                                </dd>
                                <dt className="text-muted-foreground">Durasi</dt>
                                <dd>{interview.duration_minutes} menit</dd>
                                <dt className="text-muted-foreground">Tahap</dt>
                                <dd>{interview.stage}</dd>
                                <dt className="text-muted-foreground">Mode</dt>
                                <dd className="flex items-center gap-1">
                                    {interview.mode === 'online' ? <Video className="size-4" /> : interview.mode === 'onsite' ? <MapPin className="size-4" /> : null}
                                    {interview.mode}
                                </dd>
                            </dl>
                        </Section>

                        {interview.mode === 'online' && interview.meeting_url && (
                            <Section title="Online Meeting">
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <a href={interview.meeting_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                            {interview.meeting_url}
                                        </a>
                                        <ExternalLink className="size-3.5" />
                                    </div>
                                    {interview.meeting_passcode && (
                                        <div className="text-muted-foreground">Passcode: {interview.meeting_passcode}</div>
                                    )}
                                </div>
                            </Section>
                        )}

                        {interview.mode === 'onsite' && (
                            <Section title="Lokasi Onsite">
                                <div className="space-y-1 text-sm">
                                    <div className="font-medium">{interview.location_name}</div>
                                    <div className="text-muted-foreground">{interview.location_address}</div>
                                    {interview.location_map_url && (
                                        <a href={interview.location_map_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                            Lihat di peta
                                        </a>
                                    )}
                                </div>
                            </Section>
                        )}

                        {interview.candidate_instructions && (
                            <Section title="Instruksi untuk Kandidat">
                                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{interview.candidate_instructions}</p>
                            </Section>
                        )}

                        {interview.reschedule_requests.length > 0 && (
                            <Section title="Permintaan Reschedule">
                                <ul className="space-y-3">
                                    {interview.reschedule_requests.map((r) => (
                                        <li key={r.id} className="rounded-md border p-3 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{r.requested_by}</span>
                                                <Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>{r.status}</Badge>
                                            </div>
                                            <p className="mt-1 text-muted-foreground">{r.reason}</p>
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                Slot diusulkan: {r.proposed_slots.map((s) => formatDateTime(s)).join(' · ')}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        <Section title="Scorecard Anda">
                            <form onSubmit={onScorecardSubmit} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <Label className="mb-1 block">Skor Keseluruhan (1-5)</Label>
                                        <Select
                                            value={String(scorecard.data.overall_score)}
                                            onValueChange={(v) => scorecard.setData('overall_score', Number(v))}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5].map((n) => (
                                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="mb-1 block">Rekomendasi</Label>
                                        <Select
                                            value={scorecard.data.recommendation}
                                            onValueChange={(v) => scorecard.setData('recommendation', v)}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="strong_yes">Strong Yes</SelectItem>
                                                <SelectItem value="yes">Yes</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                                <SelectItem value="strong_no">Strong No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <TextareaField
                                    label="Komentar"
                                    rows={4}
                                    value={scorecard.data.comments}
                                    onChange={(e) => scorecard.setData('comments', e.target.value)}
                                />
                                <Button type="submit" disabled={scorecard.processing}>
                                    <Save className="size-4" /> Simpan Scorecard
                                </Button>
                            </form>
                        </Section>
                    </div>

                    <aside className="space-y-4">
                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <h3 className="text-sm font-semibold">Kandidat</h3>
                                <div className="text-sm">
                                    <div className="font-medium">{interview.application.candidate_name}</div>
                                    <div className="text-muted-foreground">{interview.application.candidate_email}</div>
                                </div>
                                <Button asChild variant="outline" size="sm" className="w-full">
                                    <Link href={`/employer/applicants/${interview.application.id}`}>Profil Pelamar</Link>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <h3 className="text-sm font-semibold">Peserta</h3>
                                <ul className="space-y-2 text-sm">
                                    {interview.participants.map((p) => (
                                        <li key={p.id} className="flex items-center justify-between">
                                            <div>
                                                <div>{p.name}</div>
                                                <div className="text-xs text-muted-foreground">{p.role}</div>
                                            </div>
                                            <Badge variant={p.response === 'accepted' ? 'default' : 'secondary'} className="text-xs">
                                                {p.response}
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {interview.scorecards.length > 0 && (
                            <Card>
                                <CardContent className="space-y-3 p-4">
                                    <h3 className="text-sm font-semibold">Semua Scorecard</h3>
                                    <ul className="space-y-2 text-sm">
                                        {interview.scorecards.map((s) => (
                                            <li key={s.id} className="rounded border p-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{s.reviewer}</span>
                                                    <Badge variant="secondary">{s.overall_score}/5</Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground">{s.recommendation}</div>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </aside>
                </div>
            </div>

            <ConfirmDialog
                open={cancelling}
                onOpenChange={(open) => !open && setCancelling(false)}
                title="Batalkan interview?"
                description="Kandidat akan diberitahu bahwa interview ini dibatalkan."
                confirmLabel="Batalkan"
                variant="destructive"
                confirmIcon={X}
                onConfirm={handleCancel}
            />
        </>
    );
}
