import { Head, Link } from '@inertiajs/react';
import { Bot, Calendar, MapPin, Plus, Video } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';
import { create as interviewCreate } from '@/routes/employer/interviews';

type InterviewCard = {
    id: number;
    title: string;
    stage: string | null;
    mode: string | null;
    status: string | null;
    scheduled_at: string | null;
    candidate_name: string | null;
    job_title: string | null;
    job_slug: string | null;
};

type Column = {
    key: string;
    label: string;
    items: InterviewCard[];
};

type Props = {
    columns: Column[];
    filters: { status: string };
    statusOptions: { value: string; label: string }[];
};

const modeIcon = (mode: string | null) => {
    switch (mode) {
        case 'ai':
            return <Bot className="size-3.5" />;
        case 'online':
            return <Video className="size-3.5" />;
        case 'onsite':
            return <MapPin className="size-3.5" />;
        default:
            return <Calendar className="size-3.5" />;
    }
};

export default function InterviewsIndex({ columns }: Props) {
    return (
        <>
            <Head title="Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Interview"
                    description="Kelola jadwal interview kandidat dalam tampilan kanban."
                    actions={
                        <Button asChild>
                            <Link href={interviewCreate().url}>
                                <Plus className="size-4" /> Jadwalkan
                            </Link>
                        </Button>
                    }
                />

                <Section>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                        {columns.map((col) => (
                            <div key={col.key} className="flex min-w-[220px] flex-col gap-2">
                                <div className="flex items-center justify-between text-sm font-semibold">
                                    <span>{col.label}</span>
                                    <Badge variant="secondary">{col.items.length}</Badge>
                                </div>
                                {col.items.length === 0 ? (
                                    <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                                        Kosong
                                    </div>
                                ) : (
                                    col.items.map((item) => (
                                        <Card key={item.id} className="transition hover:shadow-sm">
                                            <CardContent className="space-y-2 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Link
                                                        href={`/employer/interviews/${item.id}`}
                                                        className="text-sm font-medium hover:underline"
                                                    >
                                                        {item.title}
                                                    </Link>
                                                    <Badge variant="outline" className="gap-1 text-xs">
                                                        {modeIcon(item.mode)}
                                                        {item.mode}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {item.candidate_name ?? '-'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {item.job_title}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs">
                                                    <Calendar className="size-3" />
                                                    {item.scheduled_at ? formatDateTime(item.scheduled_at) : '-'}
                                                </div>
                                                {item.stage && (
                                                    <Badge variant="secondary" className="text-xs">{item.stage}</Badge>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        ))}
                    </div>

                    {columns.every((c) => c.items.length === 0) && (
                        <EmptyState
                            title="Belum ada interview"
                            description="Mulai dengan menjadwalkan interview pertama dari salah satu pelamar."
                        />
                    )}
                </Section>
            </div>
        </>
    );
}
