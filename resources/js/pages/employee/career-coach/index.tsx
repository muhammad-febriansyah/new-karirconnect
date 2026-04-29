import { Head, Link, useForm } from '@inertiajs/react';
import { Bot, Plus, Send, Sparkles, User } from 'lucide-react';
import { type FormEvent } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type SessionItem = {
    id: number;
    title: string;
    status: string;
    last_message_at: string | null;
};

type Message = {
    id: number;
    role: string;
    content: string;
    created_at: string | null;
};

type ActiveSession = {
    id: number;
    title: string;
    status: string;
    messages: Message[];
};

type Props = {
    sessions: SessionItem[];
    activeSession: ActiveSession | null;
};

export default function CareerCoachIndex({ sessions, activeSession }: Props) {
    const newSession = useForm({ title: '' });
    const sendMessage = useForm({ message: '' });

    const onCreateSession = (e: FormEvent) => {
        e.preventDefault();
        newSession.post('/employee/career-coach', {
            preserveScroll: true,
            onSuccess: () => newSession.reset(),
        });
    };

    const onSendMessage = (e: FormEvent) => {
        e.preventDefault();
        if (!activeSession) return;
        sendMessage.post(`/employee/career-coach/${activeSession.id}/send`, {
            preserveScroll: true,
            onSuccess: () => sendMessage.reset(),
        });
    };

    return (
        <>
            <Head title="AI Career Coach" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="AI Career Coach"
                    description="Diskusikan rencana karier, persiapan interview, atau negosiasi gaji dengan coach AI."
                />

                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                    <aside className="space-y-3">
                        <Card>
                            <CardContent className="space-y-3 p-3">
                                <form onSubmit={onCreateSession} className="space-y-2">
                                    <Input
                                        placeholder="Judul sesi baru…"
                                        value={newSession.data.title}
                                        onChange={(e) => newSession.setData('title', e.target.value)}
                                    />
                                    <Button type="submit" size="sm" className="w-full" disabled={newSession.processing || newSession.data.title.trim().length === 0}>
                                        <Plus className="size-4" /> Sesi Baru
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="space-y-1 p-2">
                                {sessions.length === 0 ? (
                                    <p className="px-2 py-3 text-sm text-muted-foreground">Belum ada sesi</p>
                                ) : (
                                    sessions.map((s) => (
                                        <Link
                                            key={s.id}
                                            href={`/employee/career-coach/${s.id}`}
                                            className={`block rounded-md p-2 text-sm transition hover:bg-muted ${activeSession?.id === s.id ? 'bg-muted' : ''}`}
                                        >
                                            <div className="font-medium truncate">{s.title}</div>
                                            <div className="text-xs text-muted-foreground capitalize">{s.status}</div>
                                        </Link>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </aside>

                    <div className="flex min-h-[60vh] flex-col gap-3">
                        {!activeSession ? (
                            <EmptyState
                                title="Mulai Sesi Coaching"
                                description="Pilih sesi dari daftar di kiri atau buat sesi baru untuk memulai diskusi dengan AI Career Coach."
                            />
                        ) : (
                            <>
                                <Card className="flex-1">
                                    <CardContent className="flex h-full flex-col gap-3 p-4">
                                        <div className="flex items-center gap-2 border-b pb-3">
                                            <Sparkles className="size-4 text-primary" />
                                            <h2 className="font-semibold">{activeSession.title}</h2>
                                        </div>
                                        <div className="flex-1 space-y-3 overflow-auto">
                                            {activeSession.messages.length === 0 ? (
                                                <p className="text-center text-sm text-muted-foreground">Mulai chat dengan mengirim pertanyaan pertama Anda.</p>
                                            ) : (
                                                activeSession.messages.map((m) => (
                                                    <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                                                        {m.role !== 'user' && (
                                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                                <Bot className="size-4" />
                                                            </div>
                                                        )}
                                                        <div className={`max-w-xl rounded-2xl px-4 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                            {m.content}
                                                        </div>
                                                        {m.role === 'user' && (
                                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                                                <User className="size-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <form onSubmit={onSendMessage} className="flex gap-2">
                                    <TextareaField
                                        label=""
                                        rows={3}
                                        className="flex-1"
                                        placeholder="Tanyakan apa saja seputar karier Anda…"
                                        value={sendMessage.data.message}
                                        onChange={(e) => sendMessage.setData('message', e.target.value)}
                                        error={sendMessage.errors.message}
                                    />
                                    <Button type="submit" disabled={sendMessage.processing || sendMessage.data.message.trim().length === 0}>
                                        <Send className="size-4" /> Kirim
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
