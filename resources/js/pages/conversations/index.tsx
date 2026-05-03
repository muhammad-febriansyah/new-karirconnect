import { Head, Link } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { show as conversationsShow } from '@/routes/conversations';

type ConversationItem = {
    id: number;
    type: 'direct' | 'interview';
    subject: string | null;
    last_message_at: string | null;
    unread: boolean;
    counterpart: { id: number; name: string; avatar_url: string | null } | null;
    participant_count: number;
    last_message_preview: string | null;
};

type Paginator<T> = {
    data: T[];
    links?: unknown;
};

type Props = {
    conversations: Paginator<ConversationItem>;
    unreadCount: number;
};

export default function ConversationsIndex({ conversations, unreadCount }: Props) {
    return (
        <>
            <Head title="Pesan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Pesan"
                    description="Percakapan langsung dengan kandidat atau perusahaan."
                    actions={
                        unreadCount > 0 ? (
                            <Badge className="gap-1">
                                <span className="size-1.5 rounded-full bg-current" />
                                {unreadCount} belum dibaca
                            </Badge>
                        ) : null
                    }
                />

                {conversations.data.length === 0 ? (
                    <Card>
                        <CardContent className="p-8">
                            <EmptyState
                                icon={MessageCircle}
                                title="Belum ada percakapan"
                                description="Percakapan akan muncul di sini begitu Anda mulai chat dengan kandidat atau perusahaan."
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <ul className="divide-y rounded-xl border bg-card">
                        {conversations.data.map((c) => (
                            <li key={c.id}>
                                <Link
                                    href={conversationsShow(c.id).url}
                                    prefetch
                                    className={cn(
                                        'flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-none',
                                        c.unread && 'bg-primary/5',
                                    )}
                                >
                                    <Avatar className="size-11 shrink-0">
                                        <AvatarImage
                                            src={c.counterpart?.avatar_url ?? undefined}
                                            alt={c.counterpart?.name ?? 'Percakapan'}
                                        />
                                        <AvatarFallback>
                                            {(c.counterpart?.name ?? 'P').slice(0, 1).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p
                                                className={cn(
                                                    'truncate text-sm',
                                                    c.unread ? 'font-semibold' : 'font-medium',
                                                )}
                                            >
                                                {c.counterpart?.name ?? c.subject ?? `Percakapan #${c.id}`}
                                            </p>
                                            {c.last_message_at && (
                                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                                    {formatDateTime(c.last_message_at)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p
                                                className={cn(
                                                    'truncate text-xs',
                                                    c.unread
                                                        ? 'text-foreground/80'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {c.last_message_preview ?? <span className="italic">Belum ada pesan</span>}
                                            </p>
                                            {c.type === 'interview' && (
                                                <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[9px]">
                                                    Interview
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {c.unread && (
                                        <span
                                            className="ml-2 size-2 shrink-0 rounded-full bg-primary"
                                            aria-label="Belum dibaca"
                                        />
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
