import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Send } from 'lucide-react';
import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { index as conversationsIndex } from '@/routes/conversations';
import { store as messagesStore } from '@/routes/conversations/messages';

type Participant = {
    user_id: number;
    name: string | null;
    avatar_url: string | null;
};

type MessageItem = {
    id: number;
    body: string;
    is_system: boolean;
    sent_by_me: boolean;
    sender: { id: number; name: string | null; avatar_url: string | null };
    sent_at: string | null;
};

type Props = {
    conversation: {
        id: number;
        type: 'direct' | 'interview';
        subject: string | null;
        participants: Participant[];
    };
    messages: MessageItem[];
};

export default function ConversationShow({ conversation, messages }: Props) {
    const form = useForm({ body: '' });
    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const node = scrollRef.current;
        if (node) {
            node.scrollTop = node.scrollHeight;
        }
    }, [messages.length]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!form.data.body.trim()) {
            return;
        }
        form.post(messagesStore(conversation.id).url, {
            preserveScroll: true,
            onSuccess: () => form.reset('body'),
        });
    };

    const handleKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            handleSubmit(event as unknown as FormEvent);
        }
    };

    const headerName = conversation.subject
        ?? conversation.participants.map((p) => p.name).filter(Boolean).join(', ')
        ?? `Percakapan #${conversation.id}`;

    return (
        <>
            <Head title={headerName} />

            <div className="flex min-h-[calc(100dvh-3rem)] flex-col p-3 sm:p-6">
                <header className="flex items-center gap-3 border-b pb-3 sm:pb-4">
                    <Link
                        href={conversationsIndex().url}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Kembali ke daftar pesan"
                    >
                        <ArrowLeft className="size-5" />
                    </Link>

                    <div className="flex -space-x-2">
                        {conversation.participants.slice(0, 3).map((p) => (
                            <Avatar key={p.user_id} className="size-9 border-2 border-background">
                                <AvatarImage src={p.avatar_url ?? undefined} alt={p.name ?? ''} />
                                <AvatarFallback>{(p.name ?? '?').slice(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        ))}
                    </div>

                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-base font-semibold leading-tight">{headerName}</h1>
                        <p className="text-xs text-muted-foreground">
                            {conversation.participants.length} peserta
                        </p>
                    </div>

                    {conversation.type === 'interview' && (
                        <Badge variant="outline">Interview</Badge>
                    )}
                </header>

                <div
                    ref={scrollRef}
                    className="flex-1 space-y-4 overflow-y-auto py-4"
                    aria-live="polite"
                >
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
                            <p className="text-sm font-medium">Mulai percakapan</p>
                            <p className="text-xs text-muted-foreground">
                                Kirim pesan pertama untuk membuka thread.
                            </p>
                        </div>
                    ) : (
                        messages.map((m) => (
                            <MessageBubble key={m.id} message={m} />
                        ))
                    )}
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="sticky bottom-0 mt-2 flex items-end gap-2 border-t bg-background pt-3"
                >
                    <Textarea
                        value={form.data.body}
                        onChange={(e) => form.setData('body', e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Tulis pesan… (⌘+Enter untuk kirim)"
                        rows={2}
                        className="min-h-[44px] resize-none"
                        aria-label="Tulis pesan"
                    />
                    <Button
                        type="submit"
                        disabled={form.processing || !form.data.body.trim()}
                        className="h-11 shrink-0"
                    >
                        <Send className="size-4" />
                        <span className="sr-only sm:not-sr-only sm:ml-1">Kirim</span>
                    </Button>
                </form>

                {form.errors.body && (
                    <p className="mt-1 text-xs text-destructive">{form.errors.body}</p>
                )}
            </div>
        </>
    );
}

function MessageBubble({ message }: { message: MessageItem }) {
    if (message.is_system) {
        return (
            <div className="flex justify-center">
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {message.body}
                </span>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex items-end gap-2',
                message.sent_by_me ? 'flex-row-reverse' : 'flex-row',
            )}
        >
            <Avatar className="size-7 shrink-0">
                <AvatarImage
                    src={message.sender.avatar_url ?? undefined}
                    alt={message.sender.name ?? ''}
                />
                <AvatarFallback>
                    {(message.sender.name ?? '?').slice(0, 1).toUpperCase()}
                </AvatarFallback>
            </Avatar>

            <div
                className={cn(
                    'max-w-[75%] space-y-1',
                    message.sent_by_me ? 'items-end' : 'items-start',
                )}
            >
                <div
                    className={cn(
                        'rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed',
                        message.sent_by_me
                            ? 'rounded-br-sm bg-primary text-primary-foreground'
                            : 'rounded-bl-sm bg-muted text-foreground',
                    )}
                >
                    {message.body}
                </div>
                {message.sent_at && (
                    <p
                        className={cn(
                            'px-1 text-[10px] tabular-nums text-muted-foreground',
                            message.sent_by_me ? 'text-right' : 'text-left',
                        )}
                    >
                        {formatDateTime(message.sent_at)}
                    </p>
                )}
            </div>
        </div>
    );
}
