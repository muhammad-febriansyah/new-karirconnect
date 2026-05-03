import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Archive,
    ArrowLeft,
    Bot,
    Briefcase,
    Compass,
    DollarSign,
    GraduationCap,
    Lightbulb,
    Loader2,
    MessageSquare,
    Paperclip,
    Plus,
    Search,
    Send,
    Sparkles,
    Target,
    X,
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

type SessionItem = {
    id: number;
    title: string;
    status: string;
    last_message_at: string | null;
    messages_count: number;
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
    last_message_at: string | null;
    messages: Message[];
};

type Props = {
    sessions: SessionItem[];
    activeSession: ActiveSession | null;
};

const SUGGESTIONS: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; prompt: string; tone: string }> = [
    {
        icon: Compass,
        title: 'Rencana Karier',
        prompt: 'Saya ingin pindah jalur karier ke bidang teknologi. Apa langkah konkret yang sebaiknya saya ambil dalam 6 bulan ke depan?',
        tone: 'from-sky-500/15 to-cyan-400/10 text-sky-700 ring-sky-500/20',
    },
    {
        icon: Target,
        title: 'Persiapan Interview',
        prompt: 'Saya akan interview untuk posisi Backend Engineer. Tolong buatkan daftar pertanyaan teknikal & behavioral yang umum keluar.',
        tone: 'from-violet-500/15 to-fuchsia-400/10 text-violet-700 ring-violet-500/20',
    },
    {
        icon: DollarSign,
        title: 'Negosiasi Gaji',
        prompt: 'Bagaimana cara menegosiasikan kenaikan gaji 20% saat counter-offer? Berikan skrip yang sopan tapi tegas.',
        tone: 'from-emerald-500/15 to-teal-400/10 text-emerald-700 ring-emerald-500/20',
    },
    {
        icon: GraduationCap,
        title: 'Skill Roadmap',
        prompt: 'Skill apa saja yang perlu saya kuasai dalam 1 tahun ke depan untuk jadi Senior Frontend Developer?',
        tone: 'from-amber-500/15 to-orange-400/10 text-amber-700 ring-amber-500/20',
    },
    {
        icon: Briefcase,
        title: 'Personal Branding',
        prompt: 'Bagaimana cara membangun personal brand di LinkedIn untuk profesi data analyst pemula?',
        tone: 'from-indigo-500/15 to-blue-400/10 text-indigo-700 ring-indigo-500/20',
    },
    {
        icon: Lightbulb,
        title: 'Self-Reflection',
        prompt: 'Saya merasa stuck di pekerjaan saat ini. Bantu saya melakukan refleksi karier dengan pertanyaan terstruktur.',
        tone: 'from-rose-500/15 to-pink-400/10 text-rose-700 ring-rose-500/20',
    },
];

const formatRelative = (iso: string | null) => {
    if (!iso) return '';
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'baru saja';
    if (min < 60) return `${min}m lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}j lalu`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}h lalu`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

const formatTimestamp = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export default function CareerCoachIndex({ sessions, activeSession }: Props) {
    const [filter, setFilter] = useState<'active' | 'archived'>('active');
    const [search, setSearch] = useState('');
    const [draftMessage, setDraftMessage] = useState('');
    const startSession = useForm({ title: '', message: '', attachment: null as File | null });
    const sendMessage = useForm({ message: '', attachment: null as File | null });

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const homeFileRef = useRef<HTMLInputElement | null>(null);
    const chatFileRef = useRef<HTMLInputElement | null>(null);
    const homeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    const filteredSessions = useMemo(() => {
        const base = sessions.filter((s) => (filter === 'active' ? s.status !== 'archived' : s.status === 'archived'));
        const q = search.trim().toLowerCase();
        if (!q) return base;
        return base.filter((s) => s.title.toLowerCase().includes(q));
    }, [sessions, filter, search]);

    const activeCount = useMemo(() => sessions.filter((s) => s.status !== 'archived').length, [sessions]);
    const archivedCount = useMemo(() => sessions.filter((s) => s.status === 'archived').length, [sessions]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [activeSession?.messages.length, sendMessage.processing]);

    const autoResize = (el: HTMLTextAreaElement, max = 160) => {
        el.style.height = 'auto';
        el.style.height = `${Math.min(max, el.scrollHeight)}px`;
    };

    const onStartSessionFromHome = (e: FormEvent) => {
        e.preventDefault();
        if (draftMessage.trim().length === 0 && !startSession.data.attachment) return;
        startSession.transform(() => ({
            message: draftMessage || 'Tolong review CV saya dan beri saran perbaikan.',
            title: '',
            attachment: startSession.data.attachment,
        }));
        startSession.post('/employee/career-coach', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setDraftMessage('');
                startSession.reset();
                if (homeFileRef.current) homeFileRef.current.value = '';
                if (homeTextareaRef.current) homeTextareaRef.current.style.height = 'auto';
            },
        });
    };

    const onSendMessage = (e: FormEvent) => {
        e.preventDefault();
        if (!activeSession || (sendMessage.data.message.trim().length === 0 && !sendMessage.data.attachment)) return;
        sendMessage.transform((data) => ({
            ...data,
            message: data.message.trim() || 'Tolong review CV saya dan beri saran perbaikan.',
        }));
        sendMessage.post(`/employee/career-coach/${activeSession.id}/send`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                sendMessage.reset();
                if (textareaRef.current) textareaRef.current.style.height = 'auto';
                if (chatFileRef.current) chatFileRef.current.value = '';
            },
        });
    };

    const onChatKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage(e as unknown as FormEvent);
        }
    };

    const onHomeKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onStartSessionFromHome(e as unknown as FormEvent);
        }
    };

    const useSuggestion = (prompt: string) => {
        setDraftMessage(prompt);
        startSession.transform(() => ({ message: prompt, title: '', attachment: null }));
        startSession.post('/employee/career-coach', {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    const handleHomeFile = (event: ChangeEvent<HTMLInputElement>) => {
        startSession.setData('attachment', event.target.files?.[0] ?? null);
    };

    const handleChatFile = (event: ChangeEvent<HTMLInputElement>) => {
        sendMessage.setData('attachment', event.target.files?.[0] ?? null);
    };

    const archiveSession = () => {
        if (!activeSession) return;
        if (!confirm('Arsipkan sesi ini? Sesi akan tetap bisa dilihat di tab Diarsipkan.')) return;
        router.post(`/employee/career-coach/${activeSession.id}/archive`, {}, { preserveScroll: true });
    };

    const isArchived = activeSession?.status === 'archived';

    return (
        <>
            <Head title="AI Career Coach" />

            <div className="flex h-[calc(100dvh-4rem)] flex-col bg-slate-50/40 sm:h-[calc(100dvh-4.5rem)]">
                {/* Page header strip */}
                <div className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div
                                className="flex size-9 items-center justify-center rounded-xl text-white shadow-sm"
                                style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                            >
                                <Sparkles className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base font-semibold text-slate-900 sm:text-lg">AI Career Coach</h1>
                                <p className="hidden text-xs text-slate-500 sm:block">
                                    Diskusikan rencana karier, persiapan interview, atau negosiasi gaji.
                                </p>
                            </div>
                        </div>
                        <Button
                            asChild
                            size="sm"
                            className="text-white shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                        >
                            <Link href="/employee/career-coach">
                                <Plus className="size-4" />
                                <span className="hidden sm:inline">Sesi Baru</span>
                                <span className="sm:hidden">Baru</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Two-pane layout */}
                <div className="flex min-h-0 flex-1">
                    {/* Sidebar — list */}
                    <aside
                        className={`flex w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-[320px] lg:w-[340px] ${activeSession ? 'hidden md:flex' : 'flex'}`}
                    >
                        {/* Search + filter tabs */}
                        <div className="space-y-2 border-b border-slate-100 p-3">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari sesi..."
                                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => setFilter('active')}
                                    className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 transition ${filter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Aktif
                                    <span
                                        className={`rounded-full px-1.5 text-[10px] ${filter === 'active' ? 'bg-slate-100 text-slate-700' : 'bg-white/70 text-slate-500'}`}
                                    >
                                        {activeCount}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilter('archived')}
                                    className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 transition ${filter === 'archived' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Diarsipkan
                                    <span
                                        className={`rounded-full px-1.5 text-[10px] ${filter === 'archived' ? 'bg-slate-100 text-slate-700' : 'bg-white/70 text-slate-500'}`}
                                    >
                                        {archivedCount}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Sessions list */}
                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                            {filteredSessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                                    <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        <MessageSquare className="size-4" />
                                    </div>
                                    <div className="text-sm font-medium text-slate-700">
                                        {search
                                            ? 'Tidak ditemukan'
                                            : filter === 'active'
                                                ? 'Belum ada sesi'
                                                : 'Belum ada arsip'}
                                    </div>
                                    <div className="mt-1 max-w-[220px] text-xs text-slate-500">
                                        {search
                                            ? `Tidak ada sesi dengan kata "${search}".`
                                            : filter === 'active'
                                                ? 'Mulai dengan kirim pesan atau pilih saran di kanan.'
                                                : 'Sesi yang Anda arsipkan akan muncul di sini.'}
                                    </div>
                                </div>
                            ) : (
                                <ul className="space-y-1">
                                    {filteredSessions.map((s) => {
                                        const isActive = activeSession?.id === s.id;
                                        return (
                                            <li key={s.id}>
                                                <Link
                                                    href={`/employee/career-coach/${s.id}`}
                                                    preserveScroll
                                                    className={`group flex items-start gap-3 rounded-xl p-2.5 text-sm transition ${
                                                        isActive
                                                            ? 'bg-gradient-to-br from-[color:#1080E0]/10 to-[color:#10C0E0]/5 ring-1 ring-[color:#1080E0]/30'
                                                            : 'hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div
                                                        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                                            isActive ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 group-hover:bg-white group-hover:ring-1 group-hover:ring-slate-200'
                                                        }`}
                                                        style={
                                                            isActive
                                                                ? { background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }
                                                                : undefined
                                                        }
                                                    >
                                                        <Sparkles className="size-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`min-w-0 flex-1 truncate font-medium ${isActive ? 'text-slate-900' : 'text-slate-800'}`}>
                                                                {s.title}
                                                            </div>
                                                            {s.last_message_at && (
                                                                <div className="shrink-0 text-[10px] text-slate-400">
                                                                    {formatRelative(s.last_message_at)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                                                            <span className="inline-flex items-center gap-1">
                                                                <MessageSquare className="size-3" /> {s.messages_count} pesan
                                                            </span>
                                                            {s.status === 'archived' && (
                                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-px text-[10px] text-slate-500">
                                                                    <Archive className="size-2.5" /> arsip
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Sidebar tip footer */}
                        <div className="border-t border-slate-100 p-3">
                            <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600">
                                <span className="font-medium text-slate-700">Tips:</span> Tekan{' '}
                                <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">Enter</kbd>{' '}
                                untuk kirim,{' '}
                                <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">Shift</kbd>+
                                <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">Enter</kbd>{' '}
                                baris baru.
                            </div>
                        </div>
                    </aside>

                    {/* Main pane — chat */}
                    <main className={`flex min-h-0 flex-1 flex-col bg-white ${activeSession ? 'flex' : 'hidden md:flex'}`}>
                        {!activeSession ? (
                            // Empty state hero
                            <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
                                <div className="w-full max-w-3xl space-y-8">
                                    <div className="text-center">
                                        <div
                                            className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl text-white shadow-lg"
                                            style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                        >
                                            <Bot className="size-7" />
                                        </div>
                                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                            Ada yang bisa saya bantu?
                                        </h2>
                                        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                                            Tanyakan rencana karier, persiapan interview, negosiasi gaji, atau upload CV untuk direview AI.
                                        </p>
                                    </div>

                                    <form onSubmit={onStartSessionFromHome} className="space-y-2">
                                        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition focus-within:border-slate-300 focus-within:shadow-md focus-within:ring-2 focus-within:ring-slate-100">
                                            {startSession.data.attachment && (
                                                <div className="mb-2 flex max-w-full items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
                                                    <Paperclip className="size-3.5 shrink-0" />
                                                    <span className="truncate">{startSession.data.attachment.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            startSession.setData('attachment', null);
                                                            if (homeFileRef.current) homeFileRef.current.value = '';
                                                        }}
                                                        className="ml-auto rounded-full p-1 text-slate-500 hover:bg-white hover:text-slate-900"
                                                        aria-label="Hapus lampiran"
                                                    >
                                                        <X className="size-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                            <textarea
                                                ref={homeTextareaRef}
                                                rows={2}
                                                placeholder="Tuliskan pertanyaan Anda di sini..."
                                                value={draftMessage}
                                                onChange={(e) => {
                                                    setDraftMessage(e.target.value);
                                                    autoResize(e.target, 200);
                                                }}
                                                onKeyDown={onHomeKeyDown}
                                                disabled={startSession.processing}
                                                className="block max-h-52 min-h-[3.5rem] w-full resize-none bg-transparent px-2 py-2 text-base text-slate-900 outline-none placeholder:text-slate-400"
                                            />
                                            <div className="flex items-center justify-between gap-2 pt-1">
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        ref={homeFileRef}
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.txt"
                                                        className="hidden"
                                                        onChange={handleHomeFile}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="gap-1.5 rounded-full text-slate-600"
                                                        onClick={() => homeFileRef.current?.click()}
                                                        aria-label="Upload CV"
                                                    >
                                                        <Paperclip className="size-4" />
                                                        <span className="hidden sm:inline">Lampirkan CV</span>
                                                    </Button>
                                                </div>
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        startSession.processing ||
                                                        (draftMessage.trim().length === 0 && !startSession.data.attachment)
                                                    }
                                                    className="gap-1.5 rounded-full text-white"
                                                    style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                                >
                                                    {startSession.processing ? (
                                                        <>
                                                            <Loader2 className="size-4 animate-spin" /> Mengirim...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="size-4" /> Kirim
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                        {(startSession.errors.message || startSession.errors.attachment) && (
                                            <div className="text-center text-xs text-rose-600">
                                                {startSession.errors.message || startSession.errors.attachment}
                                            </div>
                                        )}
                                        <p className="text-center text-[11px] text-slate-400">
                                            Tekan{' '}
                                            <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">Enter</kbd>{' '}
                                            untuk kirim, atau pilih topik di bawah.
                                        </p>
                                    </form>

                                    <div>
                                        <div className="mb-3 flex items-center gap-2">
                                            <Sparkles className="size-3.5 text-slate-500" />
                                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Mulai dengan topik populer
                                            </span>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {SUGGESTIONS.map((s) => (
                                                <button
                                                    key={s.title}
                                                    type="button"
                                                    onClick={() => useSuggestion(s.prompt)}
                                                    disabled={startSession.processing}
                                                    className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                                                >
                                                    <div
                                                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${s.tone}`}
                                                    >
                                                        <s.icon className="size-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                                                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{s.prompt}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Thread header */}
                                <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-3 py-3 sm:px-5">
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="icon"
                                        className="md:hidden"
                                        aria-label="Kembali ke daftar"
                                    >
                                        <Link href="/employee/career-coach">
                                            <ArrowLeft className="size-4" />
                                        </Link>
                                    </Button>
                                    <div
                                        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                        style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                    >
                                        <Bot className="size-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="truncate font-semibold text-slate-900">{activeSession.title}</h2>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span>{activeSession.messages.length} pesan</span>
                                            {activeSession.last_message_at && (
                                                <span>· update {formatRelative(activeSession.last_message_at)}</span>
                                            )}
                                            {isArchived && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                                    <Archive className="size-3" /> diarsipkan
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {!isArchived && (
                                        <Button size="sm" variant="ghost" onClick={archiveSession} className="hidden sm:inline-flex">
                                            <Archive className="size-4" /> Arsip
                                        </Button>
                                    )}
                                    {!isArchived && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={archiveSession}
                                            className="sm:hidden"
                                            aria-label="Arsipkan sesi"
                                        >
                                            <Archive className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Messages */}
                                <div
                                    ref={scrollRef}
                                    className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5"
                                    style={{
                                        backgroundImage:
                                            'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.04) 1px, transparent 0)',
                                        backgroundSize: '20px 20px',
                                    }}
                                >
                                    <div className="mx-auto max-w-3xl space-y-5">
                                        {activeSession.messages.length === 0 && !sendMessage.processing && (
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <div
                                                    className="mb-3 flex size-12 items-center justify-center rounded-2xl text-white shadow"
                                                    style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                                >
                                                    <Sparkles className="size-6" />
                                                </div>
                                                <div className="text-sm font-semibold text-slate-900">Sesi siap dimulai</div>
                                                <div className="mt-1 max-w-sm text-xs text-slate-500">
                                                    Kirim pesan pertama untuk memulai. AI akan menjawab dengan rekomendasi praktis.
                                                </div>
                                            </div>
                                        )}

                                        {activeSession.messages.map((m) => {
                                            const isUser = m.role === 'user';
                                            return (
                                                <div key={m.id} className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                                                    {isUser ? (
                                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                                                            K
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                                                            style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                                        >
                                                            <Bot className="size-4" />
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[75%] ${
                                                            isUser
                                                                ? 'rounded-br-md text-white'
                                                                : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200'
                                                        }`}
                                                        style={
                                                            isUser
                                                                ? { background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }
                                                                : undefined
                                                        }
                                                    >
                                                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                                                        {m.created_at && (
                                                            <div className={`mt-1 text-[10px] ${isUser ? 'text-white/80' : 'text-slate-400'}`}>
                                                                {formatTimestamp(m.created_at)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {sendMessage.processing && (
                                            <div className="flex items-end gap-2">
                                                <div
                                                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                                                    style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                                >
                                                    <Bot className="size-4" />
                                                </div>
                                                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                                                    <div className="flex gap-1">
                                                        <span
                                                            className="size-1.5 animate-bounce rounded-full bg-slate-400"
                                                            style={{ animationDelay: '0ms' }}
                                                        />
                                                        <span
                                                            className="size-1.5 animate-bounce rounded-full bg-slate-400"
                                                            style={{ animationDelay: '150ms' }}
                                                        />
                                                        <span
                                                            className="size-1.5 animate-bounce rounded-full bg-slate-400"
                                                            style={{ animationDelay: '300ms' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Composer */}
                                <div className="border-t border-slate-100 bg-white px-3 py-3 sm:px-5 sm:py-4">
                                    {isArchived ? (
                                        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                                            <Archive className="size-4 shrink-0 text-slate-500" />
                                            <span>Sesi ini sudah diarsipkan.</span>
                                            <Button asChild size="sm" variant="outline" className="ml-auto">
                                                <Link href="/employee/career-coach">
                                                    <Plus className="size-3.5" /> Sesi baru
                                                </Link>
                                            </Button>
                                        </div>
                                    ) : (
                                        <form onSubmit={onSendMessage}>
                                            <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-slate-300 focus-within:shadow-md focus-within:ring-2 focus-within:ring-slate-100">
                                                {sendMessage.data.attachment && (
                                                    <div className="mb-2 flex max-w-full items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
                                                        <Paperclip className="size-3.5 shrink-0" />
                                                        <span className="truncate">{sendMessage.data.attachment.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                sendMessage.setData('attachment', null);
                                                                if (chatFileRef.current) chatFileRef.current.value = '';
                                                            }}
                                                            className="ml-auto rounded-full p-1 text-slate-500 hover:bg-white hover:text-slate-900"
                                                            aria-label="Hapus lampiran"
                                                        >
                                                            <X className="size-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                                <textarea
                                                    ref={textareaRef}
                                                    rows={1}
                                                    placeholder="Tanyakan apa saja..."
                                                    value={sendMessage.data.message}
                                                    onChange={(e) => {
                                                        sendMessage.setData('message', e.target.value);
                                                        autoResize(e.target);
                                                    }}
                                                    onKeyDown={onChatKeyDown}
                                                    disabled={sendMessage.processing}
                                                    className="block max-h-40 w-full resize-none bg-transparent px-2 py-2 text-base text-slate-900 outline-none placeholder:text-slate-400"
                                                />
                                                <div className="flex items-center justify-between gap-2 pt-1">
                                                    <input
                                                        ref={chatFileRef}
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.txt"
                                                        className="hidden"
                                                        onChange={handleChatFile}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-full text-slate-600"
                                                        onClick={() => chatFileRef.current?.click()}
                                                        aria-label="Upload CV"
                                                    >
                                                        <Paperclip className="size-5" />
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        size="icon"
                                                        disabled={
                                                            sendMessage.processing ||
                                                            (sendMessage.data.message.trim().length === 0 && !sendMessage.data.attachment)
                                                        }
                                                        className="rounded-full text-white shadow-sm"
                                                        style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                                    >
                                                        {sendMessage.processing ? (
                                                            <Loader2 className="size-4 animate-spin" />
                                                        ) : (
                                                            <Send className="size-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                            {(sendMessage.errors.message || sendMessage.errors.attachment) && (
                                                <div className="mx-auto mt-1.5 max-w-3xl text-xs text-rose-600">
                                                    {sendMessage.errors.message || sendMessage.errors.attachment}
                                                </div>
                                            )}
                                        </form>
                                    )}
                                </div>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
}
