import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Briefcase,
    Building2,
    Check,
    CheckCheck,
    ExternalLink,
    Inbox,
    MessageSquare,
    Search,
    Send,
    User2,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInitials } from '@/hooks/use-initials';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';

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
    job_slug?: string | null;
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

export default function EmployeeMessagesIndex({ messages }: Props) {
    const getInitials = useInitials();
    const items = messages.data;
    const [activeId, setActiveId] = useState<number | null>(items[0]?.id ?? null);
    const [search, setSearch] = useState('');
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const filtered = useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(
            (m) =>
                (m.company_name ?? '').toLowerCase().includes(q) ||
                (m.sender_name ?? '').toLowerCase().includes(q) ||
                m.subject.toLowerCase().includes(q) ||
                m.body.toLowerCase().includes(q),
        );
    }, [items, search]);

    const active = useMemo(() => items.find((m) => m.id === activeId) ?? null, [items, activeId]);

    const stats = useMemo(() => {
        const total = items.length;
        const replied = items.filter((m) => Boolean(m.reply_body)).length;
        return { total, replied, unreplied: total - replied };
    }, [items]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [active?.id, active?.reply_body]);

    return (
        <>
            <Head title="Pesan Recruiter" />

            <div className="flex h-[calc(100svh-4rem)] flex-col bg-muted/20">
                <div className="grid flex-1 overflow-hidden lg:grid-cols-[340px_1fr]">
                    {/* ===== Sidebar ===== */}
                    <aside
                        className={cn(
                            'flex flex-col border-r border-border/60 bg-background',
                            active ? 'hidden lg:flex' : 'flex',
                        )}
                    >
                        {/* Sidebar header */}
                        <div className="border-b border-border/60 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h1 className="text-lg font-bold tracking-tight text-brand-navy">Pesan Recruiter</h1>
                                {stats.unreplied > 0 && (
                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan px-1.5 text-[10px] font-bold text-white">
                                        {stats.unreplied}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                                <Input
                                    type="search"
                                    placeholder="Cari perusahaan atau topik…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 rounded-lg border-border/60 bg-muted/30 pl-9 text-sm focus-visible:border-brand-blue/40 focus-visible:ring-2 focus-visible:ring-brand-blue/15"
                                />
                            </div>
                        </div>

                        {/* Conversation list */}
                        <div className="flex-1 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                                    <Inbox className="size-8 text-muted-foreground/40" />
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {items.length === 0 ? 'Belum ada pesan masuk' : 'Tidak ditemukan'}
                                    </p>
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
                                                            {m.company_logo && (
                                                                <AvatarImage
                                                                    src={m.company_logo}
                                                                    alt={m.company_name ?? ''}
                                                                    className="object-contain p-1"
                                                                />
                                                            )}
                                                            <AvatarFallback className="rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-xs font-bold text-white">
                                                                {getInitials(m.company_name ?? 'PT')}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {!isReplied && (
                                                            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-brand-blue" />
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
                                                                {m.company_name ?? 'Perusahaan'}
                                                            </span>
                                                            <span className="shrink-0 text-[10px] text-muted-foreground">
                                                                {formatRelative(m.sent_at)}
                                                            </span>
                                                        </div>
                                                        <p
                                                            className={cn(
                                                                'mt-0.5 truncate text-xs',
                                                                !isReplied ? 'font-medium text-foreground' : 'text-muted-foreground',
                                                            )}
                                                        >
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

                    {/* ===== Thread pane ===== */}
                    <section
                        className={cn(
                            'flex min-h-0 flex-col bg-background',
                            !active ? 'hidden lg:flex' : 'flex',
                        )}
                    >
                        {active ? (
                            <>
                                {/* Thread header */}
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
                                        {active.company_logo && (
                                            <AvatarImage
                                                src={active.company_logo}
                                                alt={active.company_name ?? ''}
                                                className="object-contain p-1"
                                            />
                                        )}
                                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-xs font-bold text-white">
                                            {getInitials(active.company_name ?? 'PT')}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            {active.company_slug ? (
                                                <Link
                                                    href={`/companies/${active.company_slug}`}
                                                    className="truncate text-sm font-bold text-brand-navy hover:text-brand-blue"
                                                >
                                                    {active.company_name ?? 'Perusahaan'}
                                                </Link>
                                            ) : (
                                                <span className="truncate text-sm font-bold text-brand-navy">
                                                    {active.company_name ?? 'Perusahaan'}
                                                </span>
                                            )}
                                            {active.company_slug && (
                                                <Link
                                                    href={`/companies/${active.company_slug}`}
                                                    className="text-muted-foreground hover:text-brand-blue"
                                                >
                                                    <ExternalLink className="size-3" />
                                                </Link>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                            {active.sender_name && (
                                                <span className="inline-flex items-center gap-1">
                                                    <User2 className="size-3" /> {active.sender_name}
                                                </span>
                                            )}
                                            {active.job_title && active.job_slug && (
                                                <Link
                                                    href={`/jobs/${active.job_slug}`}
                                                    className="inline-flex items-center gap-1 hover:text-brand-blue"
                                                >
                                                    <Briefcase className="size-3" /> {active.job_title}
                                                </Link>
                                            )}
                                            {active.job_title && !active.job_slug && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Briefcase className="size-3" /> {active.job_title}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Subject divider */}
                                <div className="border-b border-border/40 bg-muted/30 px-4 py-2.5 sm:px-6">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
                                        {active.subject}
                                    </p>
                                </div>

                                {/* Messages */}
                                <div
                                    ref={scrollRef}
                                    className="relative flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6"
                                    style={{
                                        backgroundImage:
                                            'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.04) 1px, transparent 0)',
                                        backgroundSize: '24px 24px',
                                    }}
                                >
                                    {/* Recruiter bubble */}
                                    <DateSeparator iso={active.sent_at} />
                                    <MessageBubble
                                        side="left"
                                        avatar={
                                            <Avatar className="size-8 rounded-lg">
                                                {active.company_logo && (
                                                    <AvatarImage
                                                        src={active.company_logo}
                                                        alt=""
                                                        className="object-contain p-0.5"
                                                    />
                                                )}
                                                <AvatarFallback className="rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan text-[10px] font-bold text-white">
                                                    {getInitials(active.company_name ?? 'PT')}
                                                </AvatarFallback>
                                            </Avatar>
                                        }
                                        name={active.sender_name ?? active.company_name ?? 'Recruiter'}
                                        time={formatTime(active.sent_at)}
                                        body={active.body}
                                    />

                                    {/* Candidate reply */}
                                    {active.reply_body && (
                                        <>
                                            <DateSeparator iso={active.replied_at} />
                                            <MessageBubble
                                                side="right"
                                                name="Anda"
                                                time={formatTime(active.replied_at)}
                                                body={active.reply_body}
                                                read
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Composer / replied notice */}
                                {active.reply_body ? (
                                    <div className="border-t border-border/60 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Check className="size-3.5 text-emerald-500" />
                                            Anda sudah membalas pesan ini pada {formatDateTime(active.replied_at)}.
                                            Tunggu balasan dari recruiter via email/sistem.
                                        </span>
                                    </div>
                                ) : (
                                    <Composer key={active.id} messageId={active.id} />
                                )}
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
                            ? 'rounded-bl-md bg-background ring-1 ring-border/60 text-foreground'
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

function Composer({ messageId }: { messageId: number }) {
    const { data, setData, post, processing, reset, errors } = useForm({ reply_body: '' });
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (data.reply_body.trim().length === 0) return;
        post(`/employee/messages/${messageId}/reply`, {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit(e as unknown as FormEvent);
        }
    };

    const autoResize = (el: HTMLTextAreaElement) => {
        el.style.height = 'auto';
        el.style.height = `${Math.min(160, el.scrollHeight)}px`;
    };

    return (
        <form onSubmit={submit} className="border-t border-border/60 bg-background p-3 sm:p-4">
            <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-muted/30 p-2 transition-colors focus-within:border-brand-blue/40 focus-within:bg-background focus-within:ring-2 focus-within:ring-brand-blue/15">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="Tulis balasan… (Enter kirim · Shift+Enter baris baru)"
                    value={data.reply_body}
                    onChange={(e) => {
                        setData('reply_body', e.target.value);
                        autoResize(e.target);
                    }}
                    onKeyDown={onKeyDown}
                    disabled={processing}
                    className="block flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground/60"
                    style={{ maxHeight: 160 }}
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={processing || data.reply_body.trim().length === 0}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan shadow-sm hover:brightness-105"
                    aria-label="Kirim balasan"
                >
                    <Send className="size-4" />
                </Button>
            </div>
            {errors.reply_body && (
                <p className="mt-1.5 text-xs text-rose-600">{errors.reply_body}</p>
            )}
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                Balasan akan dikirim ke recruiter dan tidak bisa diubah setelah terkirim.
            </p>
        </form>
    );
}

function EmptySelection({ total }: { total: number }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 text-brand-blue ring-1 ring-brand-blue/15">
                <MessageSquare className="size-7" />
            </div>
            <h2 className="text-base font-bold text-brand-navy">
                {total === 0 ? 'Belum ada pesan masuk' : 'Pilih pesan untuk dibaca'}
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
                {total === 0
                    ? 'Lengkapi profil dan publikasikan CV agar recruiter dapat menemukan dan menghubungi Anda secara langsung.'
                    : 'Klik salah satu percakapan di sebelah kiri untuk membaca pesan dan membalasnya.'}
            </p>
        </div>
    );
}
