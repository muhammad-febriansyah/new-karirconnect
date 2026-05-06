import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Briefcase,
    CheckCheck,
    Inbox,
    Mail,
    MapPin,
    MessageSquare,
    Search,
    Send,
    User2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useInitials } from '@/hooks/use-initials';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';

type MessageItem = {
    id: number;
    candidate_name: string | null;
    candidate_email: string | null;
    candidate_headline: string | null;
    candidate_city: string | null;
    candidate_profile_id: number | null;
    sender_name: string | null;
    subject: string;
    body: string;
    status: string;
    job_title: string | null;
    job_slug: string | null;
    sent_at: string | null;
    replied_at: string | null;
    reply_body: string | null;
};

type Paginator<T> = {
    data: T[];
};

type Props = {
    messages: Paginator<MessageItem>;
    stats: { total: number; replied: number };
};

const formatRelative = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Baru saja';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}j`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}h`;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

const formatTime = (iso: string | null): string => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Hari ini';
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

export default function EmployerOutreachIndex({ messages, stats }: Props) {
    const getInitials = useInitials();
    const items = messages.data;
    const [activeId, setActiveId] = useState<number | null>(items[0]?.id ?? null);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(
            (m) =>
                (m.candidate_name ?? '').toLowerCase().includes(q) ||
                (m.candidate_email ?? '').toLowerCase().includes(q) ||
                m.subject.toLowerCase().includes(q) ||
                m.body.toLowerCase().includes(q),
        );
    }, [items, search]);

    const active = useMemo(() => items.find((m) => m.id === activeId) ?? null, [items, activeId]);

    return (
        <>
            <Head title="Outreach Kandidat" />

            <div className="flex h-[calc(100svh-4rem)] flex-col bg-muted/20">
                <div className="grid flex-1 overflow-hidden lg:grid-cols-[360px_1fr]">
                    <aside
                        className={cn(
                            'flex flex-col border-r border-border/60 bg-background',
                            active ? 'hidden lg:flex' : 'flex',
                        )}
                    >
                        <div className="border-b border-border/60 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h1 className="text-lg font-bold tracking-tight text-brand-navy">Outreach Kandidat</h1>
                                <Badge variant="secondary" className="rounded-full">
                                    {stats.total}
                                </Badge>
                            </div>

                            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg border border-border/60 bg-muted/30 p-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Terkirim
                                    </p>
                                    <p className="mt-0.5 text-base font-bold tabular-nums text-brand-navy">
                                        {stats.total}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                                        Dibalas
                                    </p>
                                    <p className="mt-0.5 text-base font-bold tabular-nums text-emerald-700">
                                        {stats.replied}
                                    </p>
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                                <Input
                                    type="search"
                                    placeholder="Cari kandidat atau topik…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 rounded-lg border-border/60 bg-muted/30 pl-9 text-sm focus-visible:border-brand-blue/40 focus-visible:ring-2 focus-visible:ring-brand-blue/15"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                                    <Inbox className="size-8 text-muted-foreground/40" />
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {items.length === 0 ? 'Belum ada outreach terkirim' : 'Tidak ditemukan'}
                                    </p>
                                    {items.length === 0 && (
                                        <Button asChild variant="outline" size="sm" className="mt-2">
                                            <Link href="/employer/talent-search">Cari Kandidat</Link>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <ul className="divide-y divide-border/40">
                                    {filtered.map((m) => {
                                        const isReplied = Boolean(m.reply_body);
                                        const isActive = m.id === activeId;
                                        return (
                                            <li key={m.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveId(m.id)}
                                                    className={cn(
                                                        'group flex w-full items-start gap-3 p-3.5 text-left transition-colors',
                                                        isActive
                                                            ? 'bg-brand-blue/8 ring-inset ring-1 ring-brand-blue/15'
                                                            : 'hover:bg-muted/40',
                                                    )}
                                                >
                                                    <div className="relative shrink-0">
                                                        <Avatar className="size-11 rounded-xl">
                                                            <AvatarFallback className="rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-xs font-bold text-white">
                                                                {getInitials(m.candidate_name ?? '?')}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {isReplied && (
                                                            <span
                                                                aria-label="Sudah dibalas"
                                                                className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-background bg-emerald-500"
                                                            >
                                                                <CheckCheck className="size-2.5 text-white" />
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-baseline justify-between gap-2">
                                                            <span
                                                                className={cn(
                                                                    'truncate text-sm font-semibold',
                                                                    isActive ? 'text-brand-blue' : 'text-brand-navy',
                                                                )}
                                                            >
                                                                {m.candidate_name ?? 'Kandidat'}
                                                            </span>
                                                            <span className="shrink-0 text-[10px] text-muted-foreground">
                                                                {formatRelative(m.sent_at)}
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                                                            {m.subject}
                                                        </p>
                                                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                            {isReplied ? (
                                                                <>
                                                                    <CheckCheck className="mr-1 inline size-3 text-emerald-500" />
                                                                    {m.reply_body}
                                                                </>
                                                            ) : (
                                                                m.body
                                                            )}
                                                        </p>
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </aside>

                    <section
                        className={cn(
                            'flex min-h-0 flex-col bg-background',
                            !active ? 'hidden lg:flex' : 'flex',
                        )}
                    >
                        {active ? (
                            <>
                                <div className="flex items-center gap-3 border-b border-border/60 bg-background px-4 py-3 sm:px-6">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setActiveId(null)}
                                        className="lg:hidden"
                                        aria-label="Kembali ke daftar"
                                    >
                                        <ArrowLeft className="size-4" />
                                    </Button>

                                    <Avatar className="size-10 shrink-0 rounded-xl">
                                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-xs font-bold text-white">
                                            {getInitials(active.candidate_name ?? '?')}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            {active.candidate_profile_id ? (
                                                <Link
                                                    href={`/employer/talent-search/${active.candidate_profile_id}`}
                                                    className="truncate text-sm font-bold text-brand-navy hover:text-brand-blue"
                                                >
                                                    {active.candidate_name ?? 'Kandidat'}
                                                </Link>
                                            ) : (
                                                <span className="truncate text-sm font-bold text-brand-navy">
                                                    {active.candidate_name ?? 'Kandidat'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                            {active.candidate_headline && (
                                                <span className="inline-flex items-center gap-1">
                                                    <User2 className="size-3" /> {active.candidate_headline}
                                                </span>
                                            )}
                                            {active.candidate_city && (
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin className="size-3" /> {active.candidate_city}
                                                </span>
                                            )}
                                            {active.candidate_email && (
                                                <a
                                                    href={`mailto:${active.candidate_email}`}
                                                    className="inline-flex items-center gap-1 hover:text-brand-blue"
                                                >
                                                    <Mail className="size-3" /> {active.candidate_email}
                                                </a>
                                            )}
                                            {active.job_title && active.job_slug && (
                                                <Link
                                                    href={`/jobs/${active.job_slug}`}
                                                    className="inline-flex items-center gap-1 hover:text-brand-blue"
                                                >
                                                    <Briefcase className="size-3" /> {active.job_title}
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <Badge
                                        variant={active.reply_body ? 'default' : 'secondary'}
                                        className={cn(
                                            'shrink-0',
                                            active.reply_body && 'bg-emerald-500 hover:bg-emerald-500/90',
                                        )}
                                    >
                                        {active.reply_body ? 'Dibalas' : 'Menunggu balasan'}
                                    </Badge>
                                </div>

                                <div className="border-b border-border/40 bg-muted/30 px-4 py-2.5 sm:px-6">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
                                        {active.subject}
                                    </p>
                                </div>

                                <div
                                    className="relative flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6"
                                    style={{
                                        backgroundImage:
                                            'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.04) 1px, transparent 0)',
                                        backgroundSize: '24px 24px',
                                    }}
                                >
                                    <DateSeparator iso={active.sent_at} />
                                    <MessageBubble
                                        side="right"
                                        name={active.sender_name ?? 'Anda'}
                                        time={formatTime(active.sent_at)}
                                        body={active.body}
                                        read={Boolean(active.reply_body)}
                                    />

                                    {active.reply_body && (
                                        <>
                                            <DateSeparator iso={active.replied_at} />
                                            <MessageBubble
                                                side="left"
                                                avatar={
                                                    <Avatar className="size-8 rounded-lg">
                                                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan text-[10px] font-bold text-white">
                                                            {getInitials(active.candidate_name ?? '?')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                }
                                                name={active.candidate_name ?? 'Kandidat'}
                                                time={formatTime(active.replied_at)}
                                                body={active.reply_body}
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="border-t border-border/60 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
                                    {active.reply_body ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <CheckCheck className="size-3.5 text-emerald-500" />
                                            Kandidat telah membalas pada {formatDateTime(active.replied_at)}.
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Send className="size-3.5" />
                                            Pesan terkirim. Anda akan diberi tahu saat kandidat membalas.
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <EmptySelection total={items.length} />
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

function DateSeparator({ iso }: { iso: string | null }) {
    if (!iso) return null;
    return (
        <div className="flex items-center justify-center py-1.5">
            <span className="rounded-full bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground shadow-sm ring-1 ring-border/60">
                {formatDateLabel(iso)}
            </span>
        </div>
    );
}

function MessageBubble({
    side,
    avatar,
    name,
    time,
    body,
    read = false,
}: {
    side: 'left' | 'right';
    avatar?: React.ReactNode;
    name: string;
    time: string;
    body: string;
    read?: boolean;
}) {
    const isLeft = side === 'left';
    return (
        <div className={cn('flex items-end gap-2', !isLeft && 'flex-row-reverse')}>
            {avatar && <div className="shrink-0">{avatar}</div>}
            <div className={cn('flex max-w-[75%] flex-col gap-1', !isLeft && 'items-end')}>
                <span className="px-1 text-[10px] font-medium text-muted-foreground">{name}</span>
                <div
                    className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                        isLeft
                            ? 'rounded-bl-md bg-background text-foreground ring-1 ring-border/60'
                            : 'rounded-br-md bg-gradient-to-br from-brand-blue to-brand-cyan text-white',
                    )}
                >
                    <p className="whitespace-pre-line break-words">{body}</p>
                    <div
                        className={cn(
                            'mt-1 flex items-center gap-1 text-[10px]',
                            isLeft ? 'text-muted-foreground/70' : 'text-white/70',
                        )}
                    >
                        <span>{time}</span>
                        {!isLeft && (
                            <CheckCheck className={cn('size-3', read ? 'text-cyan-200' : 'text-white/60')} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptySelection({ total }: { total: number }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 text-brand-blue ring-1 ring-brand-blue/15">
                <MessageSquare className="size-7" />
            </div>
            <h2 className="text-base font-bold text-brand-navy">
                {total === 0 ? 'Belum ada outreach terkirim' : 'Pilih pesan untuk dibaca'}
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
                {total === 0
                    ? 'Mulai dari Talent Search untuk menemukan kandidat dan mengirim pesan langsung kepada mereka.'
                    : 'Klik salah satu pesan di sebelah kiri untuk membaca isi dan balasan kandidat.'}
            </p>
            {total === 0 && (
                <Card className="mt-3 border-dashed">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                            <Send className="size-4" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-brand-navy">Cari kandidat</p>
                            <p className="text-xs text-muted-foreground">
                                Temukan kandidat & kirim outreach langsung dari halaman profil mereka.
                            </p>
                        </div>
                        <Button asChild size="sm" className="ml-auto">
                            <Link href="/employer/talent-search">Talent Search</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
