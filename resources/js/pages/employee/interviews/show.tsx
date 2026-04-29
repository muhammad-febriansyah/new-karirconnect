import { Head, router, useForm } from '@inertiajs/react';
import { Bot, Calendar, CheckCircle2, ExternalLink, HelpCircle, MapPin, Send, Video, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { StatusBadge } from '@/components/feedback/status-badge';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTime } from '@/lib/format-date';

type RescheduleRequest = {
    id: number;
    status: string;
    reason: string;
    proposed_slots: string[];
    created_at: string | null;
};

type Props = {
    interview: {
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
        job: { title: string | null; slug: string | null };
        company: { name: string | null };
        reschedule_requests: RescheduleRequest[];
        my_response: string | null;
    };
};

const modeIcon = (mode: string | null) => {
    switch (mode) {
        case 'ai':
            return <Bot className="size-5" />;
        case 'online':
            return <Video className="size-5" />;
        case 'onsite':
            return <MapPin className="size-5" />;
        default:
            return null;
    }
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

export default function EmployeeInterviewShow({ interview }: Props) {
    const [showReschedule, setShowReschedule] = useState(false);
    const reschedule = useForm({
        reason: '',
        proposed_slots: ['', ''] as string[],
    });

    const handleResponse = (response: 'accepted' | 'declined' | 'tentative') => {
        router.post(`/employee/interviews/${interview.id}/respond`, { response }, { preserveScroll: true });
    };

    const handleReschedule = (e: FormEvent) => {
        e.preventDefault();
        reschedule.post(`/employee/interviews/${interview.id}/reschedule`, {
            preserveScroll: true,
            onSuccess: () => {
                reschedule.reset();
                setShowReschedule(false);
            },
        });
    };

    return (
        <>
            <Head title={interview.title} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={interview.title}
                    description={`${interview.company.name} · ${interview.job.title}`}
                    actions={<StatusBadge tone={statusTone(interview.status) as never}>{interview.status}</StatusBadge>}
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        <Section title="Detail">
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="size-4 text-muted-foreground" />
                                    {interview.scheduled_at ? formatDateTime(interview.scheduled_at) : '-'} ({interview.timezone})
                                </div>
                                <div className="flex items-center gap-2">
                                    {modeIcon(interview.mode)}
                                    <span>{interview.mode === 'online' ? 'Online Meeting' : interview.mode === 'onsite' ? 'Onsite' : 'AI Interview'}</span>
                                    <Badge variant="secondary">{interview.duration_minutes} mnt</Badge>
                                </div>
                                {interview.stage && <Badge variant="outline">Tahap: {interview.stage}</Badge>}
                            </div>
                        </Section>

                        {interview.mode === 'online' && interview.meeting_url && (
                            <Section title="Online Meeting">
                                <div className="space-y-2">
                                    <Button asChild>
                                        <a href={interview.meeting_url} target="_blank" rel="noreferrer">
                                            <Video className="size-4" /> Buka Meeting Link
                                            <ExternalLink className="size-3.5" />
                                        </a>
                                    </Button>
                                    {interview.meeting_passcode && (
                                        <p className="text-sm text-muted-foreground">Passcode: <span className="font-mono">{interview.meeting_passcode}</span></p>
                                    )}
                                </div>
                            </Section>
                        )}

                        {interview.mode === 'onsite' && (
                            <Section title="Lokasi">
                                <div className="space-y-1 text-sm">
                                    <div className="font-medium">{interview.location_name}</div>
                                    <div className="text-muted-foreground">{interview.location_address}</div>
                                    {interview.location_map_url && (
                                        <Button asChild variant="outline" size="sm">
                                            <a href={interview.location_map_url} target="_blank" rel="noreferrer">
                                                <MapPin className="size-4" /> Buka Peta
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </Section>
                        )}

                        {interview.candidate_instructions && (
                            <Section title="Instruksi dari Recruiter">
                                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{interview.candidate_instructions}</p>
                            </Section>
                        )}

                        {interview.reschedule_requests.length > 0 && (
                            <Section title="Permintaan Reschedule Anda">
                                <ul className="space-y-2 text-sm">
                                    {interview.reschedule_requests.map((r) => (
                                        <li key={r.id} className="rounded border p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">{r.created_at ? formatDateTime(r.created_at) : '-'}</span>
                                                <Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>{r.status}</Badge>
                                            </div>
                                            <p className="mt-1">{r.reason}</p>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}
                    </div>

                    <aside className="space-y-4">
                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <h3 className="text-sm font-semibold">Konfirmasi Kehadiran</h3>
                                {interview.my_response && interview.my_response !== 'pending' ? (
                                    <Badge>{interview.my_response}</Badge>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <Button onClick={() => handleResponse('accepted')}>
                                            <CheckCircle2 className="size-4" /> Terima
                                        </Button>
                                        <Button variant="outline" onClick={() => handleResponse('tentative')}>
                                            <HelpCircle className="size-4" /> Mungkin
                                        </Button>
                                        <Button variant="outline" onClick={() => handleResponse('declined')}>
                                            <X className="size-4" /> Tolak
                                        </Button>
                                    </div>
                                )}
                                <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowReschedule((s) => !s)}>
                                    {showReschedule ? 'Tutup' : 'Minta Reschedule'}
                                </Button>
                            </CardContent>
                        </Card>

                        {showReschedule && (
                            <Card>
                                <CardContent className="space-y-3 p-4">
                                    <h3 className="text-sm font-semibold">Usulkan Slot Baru</h3>
                                    <form onSubmit={handleReschedule} className="space-y-3">
                                        <TextareaField
                                            label="Alasan"
                                            required
                                            rows={3}
                                            value={reschedule.data.reason}
                                            onChange={(e) => reschedule.setData('reason', e.target.value)}
                                            error={reschedule.errors.reason}
                                        />
                                        {reschedule.data.proposed_slots.map((slot, idx) => (
                                            <div key={idx}>
                                                <Label className="mb-1 block">Slot #{idx + 1}</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={slot}
                                                    onChange={(e) => {
                                                        const next = [...reschedule.data.proposed_slots];
                                                        next[idx] = e.target.value;
                                                        reschedule.setData('proposed_slots', next);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                        <Button type="submit" className="w-full" disabled={reschedule.processing}>
                                            <Send className="size-4" /> Kirim Permintaan
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}
