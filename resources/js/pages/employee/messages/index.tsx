import { Head, useForm } from '@inertiajs/react';
import { Mail, Reply } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/format-date';

type MessageItem = {
    id: number;
    company_name: string | null;
    company_slug: string | null;
    company_logo: string | null;
    sender_name: string | null;
    subject: string;
    body: string;
    status: string;
    job_title: string | null;
    sent_at: string | null;
    replied_at: string | null;
    reply_body: string | null;
};

type Paginator<T> = {
    data: T[];
};

type Props = {
    messages: Paginator<MessageItem>;
};

function ReplyForm({ messageId }: { messageId: number }) {
    const { data, setData, post, processing, reset } = useForm({ reply_body: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/employee/messages/${messageId}/reply`, {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <form onSubmit={submit} className="mt-2 space-y-2">
            <Textarea
                value={data.reply_body}
                onChange={(e) => setData('reply_body', e.target.value)}
                placeholder="Balas pesan ini..."
                rows={3}
            />
            <Button type="submit" size="sm" disabled={processing}>
                <Reply className="size-4" /> Kirim
            </Button>
        </form>
    );
}

export default function EmployeeMessagesIndex({ messages }: Props) {
    const [activeReply, setActiveReply] = useState<number | null>(null);

    return (
        <>
            <Head title="Pesan Recruiter" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Pesan dari Recruiter" description="Pesan langsung dari perusahaan untuk Anda." />

                <Section>
                    {messages.data.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
                                <Mail className="size-8" />
                                <div>Belum ada pesan masuk.</div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {messages.data.map((m) => (
                                <Card key={m.id}>
                                    <CardContent className="space-y-2 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <div className="font-semibold">{m.subject}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {m.company_name ?? 'Perusahaan'}{m.sender_name ? ` · ${m.sender_name}` : ''}
                                                    {m.job_title ? ` · ${m.job_title}` : ''}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="capitalize">{m.status}</Badge>
                                                {m.sent_at && <span className="text-xs text-muted-foreground">{formatDateTime(m.sent_at)}</span>}
                                            </div>
                                        </div>
                                        <p className="rounded bg-muted/40 p-2 text-sm whitespace-pre-line">{m.body}</p>

                                        {m.reply_body ? (
                                            <div className="rounded border-l-2 border-primary bg-primary/5 p-2 text-sm">
                                                <div className="text-xs text-muted-foreground">Balasan Anda · {m.replied_at ? formatDateTime(m.replied_at) : ''}</div>
                                                <p className="whitespace-pre-line">{m.reply_body}</p>
                                            </div>
                                        ) : (
                                            <div>
                                                {activeReply === m.id ? (
                                                    <ReplyForm messageId={m.id} />
                                                ) : (
                                                    <Button size="sm" variant="outline" onClick={() => setActiveReply(m.id)}>
                                                        <Reply className="size-4" /> Balas
                                                    </Button>
                                                )}
                                            </div>
                                        )}
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
