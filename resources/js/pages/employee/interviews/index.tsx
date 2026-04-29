import { Head, Link } from '@inertiajs/react';
import { Bot, Calendar, MapPin, Video } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';

type Interview = {
    id: number;
    title: string;
    stage: string | null;
    mode: string | null;
    status: string | null;
    scheduled_at: string | null;
    duration_minutes: number;
    meeting_url: string | null;
    job: { title: string | null; slug: string | null };
    company: { name: string | null; slug: string | null };
};

type Props = {
    interviews: Interview[];
};

const modeIcon = (mode: string | null) => {
    switch (mode) {
        case 'ai':
            return <Bot className="size-4" />;
        case 'online':
            return <Video className="size-4" />;
        case 'onsite':
            return <MapPin className="size-4" />;
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

export default function EmployeeInterviewsIndex({ interviews }: Props) {
    return (
        <>
            <Head title="Interview Saya" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Interview Saya"
                    description="Kelola jadwal interview Anda dari berbagai perusahaan."
                />

                <Section>
                    {interviews.length === 0 ? (
                        <EmptyState
                            title="Belum ada interview terjadwal"
                            description="Tunggu undangan dari recruiter setelah lamaran Anda di-shortlist."
                        />
                    ) : (
                        <div className="grid gap-3">
                            {interviews.map((i) => (
                                <Card key={i.id} className="transition hover:shadow-md">
                                    <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
                                        <div className="flex size-10 items-center justify-center rounded-md border bg-muted">
                                            {modeIcon(i.mode)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Link href={`/employee/interviews/${i.id}`} className="text-base font-semibold hover:underline">
                                                {i.title}
                                            </Link>
                                            <div className="text-sm text-muted-foreground">
                                                {i.company.name} · {i.job.title}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="size-4 text-muted-foreground" />
                                                {i.scheduled_at ? formatDateTime(i.scheduled_at) : '-'}
                                                <Badge variant="secondary">{i.duration_minutes} mnt</Badge>
                                            </div>
                                        </div>
                                        <StatusBadge tone={statusTone(i.status) as never}>{i.status}</StatusBadge>
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
