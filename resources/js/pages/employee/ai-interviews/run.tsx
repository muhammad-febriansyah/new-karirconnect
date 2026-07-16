import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Bot,
    Building2,
    Camera,
    CameraOff,
    CheckCircle2,
    GraduationCap,
    Info,
    Loader2,
    Mic,
    MicOff,
    PhoneOff,
    Radio,
    Send,
    Sparkles,
    Type,
    Volume2,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { TextareaField } from '@/components/form/textarea-field';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Question = {
    id: number;
    order_number: number;
    category: string;
    question: string;
    max_duration_seconds: number;
    answered: boolean;
};

type Props = {
    session: {
        id: number;
        status: string | null;
        mode: string | null;
        language: string | null;
        voice: string | null;
        job_title: string | null;
        company_name: string | null;
        company_logo_url: string | null;
        is_practice: boolean;
        total_questions: number;
        total_duration_seconds: number;
        current_index: number;
        recording_url: string | null;
    };
    questions: Question[];
    currentQuestion: {
        id: number;
        order_number: number;
        category: string;
        question: string;
        max_duration_seconds: number;
    } | null;
};

type SessionInfo = Props['session'];

function InterviewContextHeader({ session }: { session: SessionInfo }) {
    if (session.is_practice) {
        return (
            <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-r from-white via-sky-50/40 to-white p-4 shadow-xs sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                            style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                        >
                            <GraduationCap className="size-6" />
                        </div>
                        <div>
                            <div className="text-xs font-medium uppercase tracking-wider text-[color:#1080E0]">
                                Latihan Wawancara
                            </div>
                            <div className="text-base font-semibold text-slate-900">
                                Sesi Latihan dengan KarirConnect AI
                            </div>
                            <div className="text-xs text-slate-500">
                                Mode aman untuk persiapan — jawaban tidak dikirim ke perusahaan.
                            </div>
                        </div>
                    </div>
                    <Badge variant="secondary" className="self-start sm:self-auto">
                        <Sparkles className="size-3" /> Mode Latihan
                    </Badge>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {session.company_logo_url ? (
                            <img
                                src={session.company_logo_url}
                                alt={session.company_name ?? 'Logo perusahaan'}
                                className="size-full object-contain p-1"
                            />
                        ) : (
                            <Building2 className="size-7 text-slate-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Wawancara untuk
                        </div>
                        <div className="truncate text-base font-semibold text-slate-900">
                            {session.job_title ?? 'Posisi tidak diketahui'}
                        </div>
                        <div className="truncate text-xs text-slate-600">
                            {session.company_name ?? 'Perusahaan'}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-xs"
                        style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                    >
                        <Sparkles className="size-3.5" />
                        KarirConnect AI
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function AiInterviewRun(props: Props) {
    if (props.session.mode === 'voice') {
        return <VoiceRun {...props} />;
    }
    return <TextRun {...props} />;
}

const ANSWER_TARGET_MIN = 80; // chars — encourage more than a one-liner
const ANSWER_TARGET_GOOD = 250;

const CATEGORY_LABEL: Record<string, string> = {
    opening: 'Pembuka',
    technical: 'Teknis',
    behavioral: 'Perilaku',
    situational: 'Situasional',
    culture: 'Budaya',
    closing: 'Penutup',
};

function TextRun({ session, questions, currentQuestion }: Props) {
    const [submitting, setSubmitting] = useState(false);
    const form = useForm({ answer: '', duration_seconds: 0, paste_count: 0, focus_loss_count: 0 });

    // Soft integrity signals: count clipboard pastes and tab/window switches
    // while answering. These are surfaced to recruiters as hints, never used to
    // auto-reject a candidate.
    useEffect(() => {
        const onBlur = () => form.setData('focus_loss_count', (form.data.focus_loss_count ?? 0) + 1);
        window.addEventListener('blur', onBlur);
        return () => window.removeEventListener('blur', onBlur);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.focus_loss_count]);

    const onPaste = () => form.setData('paste_count', (form.data.paste_count ?? 0) + 1);

    const onSubmit = (e: FormEvent) => {
        if (!currentQuestion) return;
        e.preventDefault();
        setSubmitting(true);
        form.post(`/employee/ai-interviews/${session.id}/questions/${currentQuestion.id}/answer`, {
            preserveScroll: true,
            onFinish: () => {
                setSubmitting(false);
                form.reset('answer', 'paste_count', 'focus_loss_count');
            },
        });
    };

    const completeNow = () => {
        router.post(`/employee/ai-interviews/${session.id}/complete`, {});
    };

    const progressValue = (session.current_index / Math.max(session.total_questions, 1)) * 100;
    const charCount = form.data.answer.length;
    const wordCount = form.data.answer.trim().length === 0 ? 0 : form.data.answer.trim().split(/\s+/).length;
    const meetsMin = charCount >= ANSWER_TARGET_MIN;
    const meetsGood = charCount >= ANSWER_TARGET_GOOD;

    return (
        <>
            <Head title="Sesi AI Interview" />

            <div className="space-y-5 p-3 pb-24 sm:p-5 lg:p-6 lg:pb-6">
                <InterviewContextHeader session={session} />

                {/* Progress strip */}
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                                Pertanyaan {Math.min(session.current_index + 1, session.total_questions)} dari{' '}
                                {session.total_questions}
                            </div>
                            <div className="text-xs text-slate-500">
                                Jawab dengan tenang. Bisa lanjut kapan saja.
                            </div>
                        </div>
                        {session.current_index >= session.total_questions && (
                            <Button onClick={completeNow} size="sm" className="shrink-0">
                                <CheckCircle2 className="size-4" /> Selesaikan & Lihat Hasil
                            </Button>
                        )}
                    </div>
                    <Progress value={progressValue} className="mt-3" />

                    {/* Question chips */}
                    <ol className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
                        {questions.map((q, idx) => {
                            const active = currentQuestion?.id === q.id;
                            const done = q.answered;
                            return (
                                <li
                                    key={q.id}
                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                        active
                                            ? 'border-[color:#1080E0] bg-[color:#1080E0]/5 text-[color:#1080E0]'
                                            : done
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                              : 'border-slate-200 bg-white text-slate-500'
                                    }`}
                                >
                                    <span
                                        className={`flex size-4 items-center justify-center rounded-full text-[9px] font-bold ${
                                            active
                                                ? 'bg-gradient-to-br from-[#1080E0] to-[#10C0E0] text-white'
                                                : done
                                                  ? 'bg-emerald-500 text-white'
                                                  : 'bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {done ? <CheckCircle2 className="size-2.5" /> : idx + 1}
                                    </span>
                                    {CATEGORY_LABEL[q.category] ?? q.category}
                                </li>
                            );
                        })}
                    </ol>
                </div>

                {currentQuestion ? (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:grid-cols-[minmax(0,1fr)_340px]">
                        {/* Main */}
                        <div className="min-w-0 space-y-4">
                            {/* AI message bubble */}
                            <div className="flex items-start gap-3">
                                <div
                                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
                                    style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                >
                                    <Bot className="size-5" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                        <span className="font-semibold text-slate-700">KarirConnect AI</span>
                                        <Badge variant="secondary" className="capitalize">
                                            {CATEGORY_LABEL[currentQuestion.category] ?? currentQuestion.category}
                                        </Badge>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                                            <Radio className="size-3" /> Maks {currentQuestion.max_duration_seconds}s
                                        </span>
                                    </div>
                                    <div className="rounded-2xl rounded-tl-sm border border-slate-200/70 bg-white p-4 shadow-xs sm:p-5">
                                        <h2 className="text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl">
                                            {currentQuestion.question}
                                        </h2>
                                    </div>
                                </div>
                            </div>

                            {/* Answer composer */}
                            <form
                                id="ai-answer-form"
                                onSubmit={onSubmit}
                                className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs sm:p-5"
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-900" htmlFor="answer-input">
                                        Jawaban Anda
                                    </label>
                                    <span className="text-[11px] text-slate-500">
                                        Tulis natural seperti ngobrol — tidak harus formal.
                                    </span>
                                </div>
                                <textarea
                                    id="answer-input"
                                    rows={9}
                                    placeholder="Mulai dari pengalaman atau konteks yang relevan, lalu jelaskan apa yang Anda lakukan dan dampaknya…"
                                    value={form.data.answer}
                                    onChange={(e) => form.setData('answer', e.target.value)}
                                    onPaste={onPaste}
                                    className="block w-full resize-y rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3 text-sm leading-relaxed shadow-inner placeholder:text-slate-400 focus:border-[color:#1080E0]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:#1080E0]/15"
                                />
                                {form.errors.answer && (
                                    <p className="mt-1.5 text-xs text-rose-600">{form.errors.answer}</p>
                                )}

                                {/* Quality meter */}
                                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                        <span className="inline-flex items-center gap-1">
                                            <span
                                                className={`size-1.5 rounded-full ${
                                                    meetsGood
                                                        ? 'bg-emerald-500'
                                                        : meetsMin
                                                          ? 'bg-amber-500'
                                                          : 'bg-slate-300'
                                                }`}
                                            />
                                            <span
                                                className={
                                                    meetsGood
                                                        ? 'font-medium text-emerald-700'
                                                        : meetsMin
                                                          ? 'font-medium text-amber-700'
                                                          : ''
                                                }
                                            >
                                                {meetsGood
                                                    ? 'Detail bagus 🎯'
                                                    : meetsMin
                                                      ? 'Lanjutkan, sudah cukup'
                                                      : 'Tulis sedikit lagi'}
                                            </span>
                                        </span>
                                        <span className="hidden sm:inline">·</span>
                                        <span className="font-mono">
                                            {wordCount} kata · {charCount} karakter
                                        </span>
                                    </div>
                                    <div className="hidden sm:flex sm:justify-end">
                                        <Button
                                            type="submit"
                                            disabled={submitting || form.data.answer.trim().length === 0}
                                            className="text-white"
                                            style={{
                                                background: 'linear-gradient(135deg, #1080E0, #10C0E0)',
                                            }}
                                        >
                                            {submitting ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <Send className="size-4" />
                                            )}
                                            Kirim Jawaban
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Sidebar */}
                        <aside className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
                            <Card className="border-slate-200/70 shadow-xs">
                                <CardContent className="p-4">
                                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                                        Daftar Pertanyaan
                                    </h3>
                                    <ol className="space-y-1.5">
                                        {questions.map((q, idx) => {
                                            const active = currentQuestion?.id === q.id;
                                            return (
                                                <li
                                                    key={q.id}
                                                    className={`flex items-start gap-2.5 rounded-lg p-2 text-xs transition-colors ${
                                                        active ? 'bg-[color:#1080E0]/5' : ''
                                                    }`}
                                                >
                                                    <span
                                                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                                            q.answered
                                                                ? 'bg-emerald-500 text-white'
                                                                : active
                                                                  ? 'bg-gradient-to-br from-[#1080E0] to-[#10C0E0] text-white'
                                                                  : 'border border-slate-300 bg-white text-slate-500'
                                                        }`}
                                                    >
                                                        {q.answered ? <CheckCircle2 className="size-3" /> : idx + 1}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div
                                                            className={`text-[10px] font-semibold uppercase tracking-wider ${
                                                                active
                                                                    ? 'text-[color:#1080E0]'
                                                                    : q.answered
                                                                      ? 'text-emerald-700'
                                                                      : 'text-slate-500'
                                                            }`}
                                                        >
                                                            {CATEGORY_LABEL[q.category] ?? q.category}
                                                        </div>
                                                        <p
                                                            className={`mt-0.5 leading-snug ${
                                                                q.answered
                                                                    ? 'text-slate-400 line-through'
                                                                    : active
                                                                      ? 'font-medium text-slate-900'
                                                                      : 'text-slate-600'
                                                            }`}
                                                        >
                                                            {q.question.length > 80
                                                                ? `${q.question.slice(0, 80)}…`
                                                                : q.question}
                                                        </p>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200/70 bg-slate-50/60 shadow-xs">
                                <CardContent className="space-y-1.5 p-4 text-xs leading-relaxed text-slate-600">
                                    <div className="text-sm font-semibold text-slate-900">Tips Singkat</div>
                                    <p>· Mulai dari konteks: situasi, peran, dan masalah.</p>
                                    <p>· Jelaskan tindakan spesifik yang Anda ambil.</p>
                                    <p>· Tutup dengan hasil/dampak (angka kalau ada).</p>
                                    <p>· Jangan pakai bullet — paragraf alami lebih efektif.</p>
                                </CardContent>
                            </Card>
                        </aside>
                    </div>
                ) : (
                    <Card className="border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 shadow-xs">
                        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                                <CheckCircle2 className="size-7" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Semua pertanyaan selesai!
                                </h2>
                                <p className="mt-1 text-sm text-slate-600">
                                    Klik tombol di bawah untuk melihat analisis lengkap dari AI.
                                </p>
                            </div>
                            <Button onClick={completeNow} className="mt-1" size="lg">
                                <CheckCircle2 className="size-4" /> Selesaikan & Lihat Hasil
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Mobile sticky submit bar */}
                {currentQuestion && (
                    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/95 px-3 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur sm:hidden">
                        <Button
                            type="submit"
                            form="ai-answer-form"
                            disabled={submitting || form.data.answer.trim().length === 0}
                            className="h-11 w-full rounded-xl text-white"
                            style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                        >
                            {submitting ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            Kirim Jawaban
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

type TranscriptLine = { speaker: 'ai' | 'user'; text: string; questionIndex: number | null };

type CheckState = 'idle' | 'testing' | 'ok' | 'fail';

/**
 * Score how closely an AI utterance matches one of the listed interview
 * questions by significant-word overlap. Words shorter than 4 chars are
 * skipped (filler), and we ignore case + punctuation. Returns the index of
 * the best-matching question if score is >= 40%, otherwise -1.
 */
function findQuestionByContent(utterance: string, questions: Question[]): number {
    const normalize = (input: string) =>
        input
            .toLowerCase()
            .replace(/[.,?!:;"'()[\]{}]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length >= 4);

    const utteranceWords = new Set(normalize(utterance));
    if (utteranceWords.size === 0) return -1;

    let bestIdx = -1;
    let bestScore = 0;

    questions.forEach((question, idx) => {
        const qWords = normalize(question.question);
        if (qWords.length === 0) return;
        const matched = qWords.filter((word) => utteranceWords.has(word)).length;
        const score = matched / qWords.length;
        if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
        }
    });

    return bestScore >= 0.4 ? bestIdx : -1;
}

function VoiceRun({ session, questions }: Props) {
    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState(false);
    const [muted, setMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState<number | null>(null);
    const [finishing, setFinishing] = useState(false);
    const [confirmEndOpen, setConfirmEndOpen] = useState(false);
    const [aiSpeaking, setAiSpeaking] = useState(false);
    const [micLevel, setMicLevel] = useState(0);
    const [elapsedSec, setElapsedSec] = useState(0);

    // Pre-connect device check
    const [networkCheck, setNetworkCheck] = useState<CheckState>('idle');
    const [networkLatency, setNetworkLatency] = useState<number | null>(null);
    const [micCheck, setMicCheck] = useState<CheckState>('idle');
    const [previewMicLevel, setPreviewMicLevel] = useState(0);
    const [cameraCheck, setCameraCheck] = useState<CheckState>('idle');
    const [speakerCheck, setSpeakerCheck] = useState<CheckState>('idle');

    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const currentQRef = useRef<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);
    const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

    // Pre-check resources (reused on connect to avoid double-permission)
    const preCheckMicStreamRef = useRef<MediaStream | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const previewVideoRef = useRef<HTMLVideoElement | null>(null);
    const previewAudioCtxRef = useRef<AudioContext | null>(null);
    const previewAnalyserRef = useRef<AnalyserNode | null>(null);
    const previewRafRef = useRef<number | null>(null);

    const stopPreviewMicMonitor = useCallback(() => {
        if (previewRafRef.current !== null) {
            cancelAnimationFrame(previewRafRef.current);
            previewRafRef.current = null;
        }
        previewAudioCtxRef.current?.close().catch(() => undefined);
        previewAudioCtxRef.current = null;
        previewAnalyserRef.current = null;
        setPreviewMicLevel(0);
    }, []);

    const stopCameraPreview = useCallback(() => {
        cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
        if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
    }, []);

    const teardown = useCallback(() => {
        try {
            if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
        } catch {
            // ignore
        }
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        audioCtxRef.current?.close().catch(() => undefined);
        audioCtxRef.current = null;
        analyserRef.current = null;
        peerRef.current?.close();
        peerRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        dataChannelRef.current = null;
        stopPreviewMicMonitor();
        stopCameraPreview();
        preCheckMicStreamRef.current?.getTracks().forEach((t) => t.stop());
        preCheckMicStreamRef.current = null;
        setConnected(false);
        setMicLevel(0);
        setAiSpeaking(false);
    }, [stopCameraPreview, stopPreviewMicMonitor]);

    useEffect(() => {
        return () => teardown();
    }, [teardown]);

    useEffect(() => {
        if (!connected) return;
        const start = Date.now();
        setElapsedSec(0);
        const id = window.setInterval(() => {
            setElapsedSec(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => window.clearInterval(id);
    }, [connected]);

    useEffect(() => {
        const el = transcriptScrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [transcript]);

    const startMicMonitor = useCallback((stream: MediaStream) => {
        try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);
            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
            const buf = new Uint8Array(analyser.frequencyBinCount);
            const loop = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) sum += buf[i];
                const avg = sum / buf.length;
                setMicLevel(Math.min(1, avg / 80));
                rafRef.current = requestAnimationFrame(loop);
            };
            loop();
        } catch (err) {
            console.warn('[VoiceRun] mic monitor unavailable', err);
        }
    }, []);

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const runNetworkCheck = useCallback(async () => {
        setNetworkCheck('testing');
        setNetworkLatency(null);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setNetworkCheck('fail');
            return;
        }
        try {
            const t0 = performance.now();
            await fetch('/up', { cache: 'no-store', credentials: 'same-origin' });
            const ms = Math.round(performance.now() - t0);
            setNetworkLatency(ms);
            setNetworkCheck('ok');
        } catch {
            setNetworkCheck('fail');
        }
    }, []);

    useEffect(() => {
        runNetworkCheck();
    }, [runNetworkCheck]);

    const testMicrophone = useCallback(async () => {
        setMicCheck('testing');
        try {
            // Reuse previous stream if any (avoid double permission prompt)
            if (preCheckMicStreamRef.current) {
                preCheckMicStreamRef.current.getTracks().forEach((t) => t.stop());
                preCheckMicStreamRef.current = null;
                stopPreviewMicMonitor();
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            preCheckMicStreamRef.current = stream;

            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);
            previewAudioCtxRef.current = ctx;
            previewAnalyserRef.current = analyser;
            const buf = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
                if (!previewAnalyserRef.current) return;
                previewAnalyserRef.current.getByteFrequencyData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) sum += buf[i];
                setPreviewMicLevel(Math.min(1, sum / buf.length / 80));
                previewRafRef.current = requestAnimationFrame(tick);
            };
            tick();

            setMicCheck('ok');
        } catch (err) {
            console.warn('[VoiceRun] mic test failed', err);
            setMicCheck('fail');
        }
    }, [stopPreviewMicMonitor]);

    const testCamera = useCallback(async () => {
        setCameraCheck('testing');
        try {
            stopCameraPreview();
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
            cameraStreamRef.current = stream;
            // Wait one tick so the video element is mounted
            requestAnimationFrame(() => {
                if (previewVideoRef.current) {
                    previewVideoRef.current.srcObject = stream;
                    previewVideoRef.current.play().catch(() => undefined);
                }
            });
            setCameraCheck('ok');
        } catch (err) {
            console.warn('[VoiceRun] camera test failed', err);
            setCameraCheck('fail');
        }
    }, [stopCameraPreview]);

    const testSpeaker = useCallback(() => {
        setSpeakerCheck('testing');
        try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 523.25; // C5
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.75);
            setTimeout(() => {
                ctx.close().catch(() => undefined);
                setSpeakerCheck('ok');
            }, 800);
        } catch {
            setSpeakerCheck('fail');
        }
    }, []);

    const allRequiredChecksOk = networkCheck === 'ok' && micCheck === 'ok';

    const handleEvent = useCallback(
        (raw: string) => {
            let data: { type?: string; transcript?: string; delta?: string };
            try {
                data = JSON.parse(raw);
            } catch {
                return;
            }
            if (!data.type) return;

            if (data.type === 'response.created' || data.type === 'response.output_audio.delta') {
                setAiSpeaking(true);
            }
            if (data.type === 'response.done' || data.type === 'response.output_audio.done') {
                setAiSpeaking(false);
            }

            if (data.type === 'response.output_audio_transcript.done' && data.transcript) {
                const text = String(data.transcript).trim();
                if (!text) return;

                // Detect which question the AI is currently asking. Order of
                // strategies (most reliable first):
                //  1. Explicit "Q\d:" prefix from the system prompt.
                //  2. Fuzzy match: count significant-word overlap with each
                //     listed question; pick the best if >= 40% overlap.
                //  3. Heuristic advance: if AI emits a question-like utterance
                //     ("?" + decent length) but no match, assume it's the next
                //     unasked one — first question if we haven't started, else
                //     the next index after the current.
                let nextIdx: number | null = null;

                const prefixMatch = text.match(/^Q(\d+)/i);
                if (prefixMatch) {
                    const qNum = Number(prefixMatch[1]);
                    const idx = questions.findIndex((q) => q.order_number === qNum);
                    if (idx >= 0) {
                        nextIdx = idx;
                    }
                }

                if (nextIdx === null) {
                    const fuzzy = findQuestionByContent(text, questions);
                    if (fuzzy >= 0) {
                        nextIdx = fuzzy;
                    }
                }

                if (
                    nextIdx === null &&
                    text.includes('?') &&
                    text.length > 25 &&
                    questions.length > 0
                ) {
                    if (currentQRef.current === null) {
                        nextIdx = 0;
                    } else if (currentQRef.current < questions.length - 1) {
                        nextIdx = currentQRef.current + 1;
                    }
                }

                if (nextIdx !== null) {
                    currentQRef.current = nextIdx;
                    setCurrentQIndex(nextIdx);
                }

                setTranscript((prev) => [...prev, { speaker: 'ai', text, questionIndex: currentQRef.current }]);
            }

            if (data.type === 'conversation.item.input_audio_transcription.completed' && data.transcript) {
                const text = String(data.transcript).trim();
                if (!text) return;
                setTranscript((prev) => [...prev, { speaker: 'user', text, questionIndex: currentQRef.current }]);
            }
        },
        [questions],
    );

    const connect = async () => {
        setError(null);
        setConnecting(true);
        try {
            const csrfToken =
                document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
                document.cookie
                    .split('; ')
                    .find((row) => row.startsWith('XSRF-TOKEN='))
                    ?.split('=')[1] ??
                '';

            const secretRes = await fetch(`/employee/ai-interviews/${session.id}/client-secret`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(csrfToken),
                },
                credentials: 'same-origin',
            });
            const secretPayload = await secretRes.json();
            if (!secretRes.ok || !secretPayload.client_secret) {
                throw new Error(secretPayload.message ?? 'Gagal mendapat token voice AI.');
            }

            // Reuse pre-check mic stream if already obtained — avoids double permission prompt
            stopPreviewMicMonitor();
            stopCameraPreview();
            let stream: MediaStream;
            if (preCheckMicStreamRef.current && preCheckMicStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live')) {
                stream = preCheckMicStreamRef.current;
                preCheckMicStreamRef.current = null;
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            localStreamRef.current = stream;
            startMicMonitor(stream);

            const peer = new RTCPeerConnection();
            peerRef.current = peer;

            peer.ontrack = (event) => {
                const remoteStream = event.streams[0];
                if (remoteAudioRef.current && remoteStream) {
                    remoteAudioRef.current.srcObject = remoteStream;
                    remoteAudioRef.current.play().catch(() => undefined);
                }
            };

            stream.getTracks().forEach((track) => peer.addTrack(track, stream));

            const dc = peer.createDataChannel('karirconnect-events');
            dataChannelRef.current = dc;
            dc.onmessage = (event) => handleEvent(String(event.data));

            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${secretPayload.client_secret}`,
                    'Content-Type': 'application/sdp',
                },
            });
            if (!sdpRes.ok) throw new Error('Koneksi WebRTC OpenAI gagal.');

            await peer.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });

            // Start recording for archive
            try {
                const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
                const recorder = new MediaRecorder(stream, { mimeType: mime });
                recordedChunksRef.current = [];
                recorder.ondataavailable = (ev) => ev.data.size > 0 && recordedChunksRef.current.push(ev.data);
                recorder.start(1000);
                recorderRef.current = recorder;
            } catch (recErr) {
                console.warn('[VoiceRun] MediaRecorder unavailable', recErr);
            }

            setConnected(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal koneksi voice AI.');
            teardown();
        } finally {
            setConnecting(false);
        }
    };

    const toggleMute = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const next = !muted;
        stream.getAudioTracks().forEach((t) => (t.enabled = !next));
        setMuted(next);
    };

    const finish = async () => {
        setFinishing(true);
        try {
            // Stop recording and wait for last chunks
            const recorder = recorderRef.current;
            if (recorder && recorder.state === 'recording') {
                await new Promise<void>((resolve) => {
                    recorder.onstop = () => resolve();
                    recorder.stop();
                });
            }

            // Upload archive
            if (recordedChunksRef.current.length > 0) {
                const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                const fd = new FormData();
                fd.append('recording', blob, `session-${session.id}.webm`);
                const csrfToken =
                    document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
                    document.cookie
                        .split('; ')
                        .find((row) => row.startsWith('XSRF-TOKEN='))
                        ?.split('=')[1] ??
                    '';
                await fetch(`/employee/ai-interviews/${session.id}/recording`, {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin',
                    headers: { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken), Accept: 'application/json' },
                }).catch(() => undefined);
            }

            // Build per-question answers from transcript: concat user lines tagged to each questionIndex
            const answers: Record<number, string> = {};
            transcript.forEach((line) => {
                if (line.speaker !== 'user' || line.questionIndex === null) return;
                const q = questions[line.questionIndex];
                if (!q) return;
                answers[q.id] = (answers[q.id] ?? '') + (answers[q.id] ? ' ' : '') + line.text;
            });

            const liveTranscript = transcript
                .map((l) => `${l.speaker === 'ai' ? 'AI' : 'Kandidat'}: ${l.text}`)
                .join('\n');

            teardown();

            router.post(`/employee/ai-interviews/${session.id}/voice-submit`, {
                answers,
                live_transcript: liveTranscript,
            });
        } finally {
            setFinishing(false);
        }
    };

    return (
        <>
            <Head title="Sesi AI Voice Interview" />

            <div className="space-y-5 p-4 sm:p-6">
                <InterviewContextHeader session={session} />

                <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

                {!connected && !connecting && (
                    <DeviceCheckPanel
                        sessionId={session.id}
                        networkCheck={networkCheck}
                        networkLatency={networkLatency}
                        micCheck={micCheck}
                        previewMicLevel={previewMicLevel}
                        cameraCheck={cameraCheck}
                        speakerCheck={speakerCheck}
                        onRecheckNetwork={runNetworkCheck}
                        onTestMic={testMicrophone}
                        onTestCamera={testCamera}
                        onTestSpeaker={testSpeaker}
                        previewVideoRef={previewVideoRef}
                        canStart={allRequiredChecksOk}
                        error={error}
                        onStart={connect}
                    />
                )}

                {connecting && (
                    <Card className="border-slate-200/70 shadow-xs">
                        <CardContent className="flex flex-col items-center gap-3 p-8">
                            <Loader2 className="size-6 animate-spin text-[color:#1080E0]" />
                            <div className="text-sm text-slate-600">Menghubungkan ke AI...</div>
                        </CardContent>
                    </Card>
                )}

                {connected && (
                    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                        <div className="space-y-4">
                            {/* Hero stage — video-call style */}
                            <div
                                className="relative overflow-hidden rounded-3xl border border-slate-800/40 shadow-2xl"
                                style={{
                                    background:
                                        'radial-gradient(ellipse at 30% 20%, rgba(16,128,224,0.35) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(16,192,224,0.25) 0%, transparent 50%), linear-gradient(135deg, #0b1224 0%, #0a1a3a 50%, #08172e 100%)',
                                }}
                            >
                                {/* Top status strip */}
                                <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/20 px-4 py-2.5 backdrop-blur">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                                            Live
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-xs text-white/90 ring-1 ring-white/10">
                                            <Radio className="size-3" />
                                            {formatTime(elapsedSec)}
                                        </span>
                                        <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/90 ring-1 ring-white/10 sm:inline-flex">
                                            {currentQIndex !== null
                                                ? `Pertanyaan ${currentQIndex + 1}/${questions.length}`
                                                : `${questions.length} pertanyaan`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/70">
                                        <Sparkles className="size-3.5" />
                                        KarirConnect AI
                                    </div>
                                </div>

                                {/* Stage */}
                                <div className="relative flex min-h-[420px] flex-col items-center justify-center px-6 py-10 sm:py-14">
                                    {/* Decorative blur orbs */}
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full opacity-25 blur-3xl"
                                        style={{ background: 'radial-gradient(circle, #10C0E0, transparent)' }}
                                    />
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute -bottom-32 -left-32 size-[28rem] rounded-full opacity-20 blur-3xl"
                                        style={{ background: 'radial-gradient(circle, #1080E0, transparent)' }}
                                    />

                                    {/* AI Avatar with multi-ring pulsing */}
                                    <div className="relative flex items-center justify-center">
                                        {aiSpeaking && (
                                            <>
                                                <span
                                                    className="absolute size-64 animate-ping rounded-full opacity-20"
                                                    style={{ background: 'radial-gradient(circle, #10C0E0, transparent 70%)' }}
                                                />
                                                <span
                                                    className="absolute size-48 animate-pulse rounded-full opacity-30"
                                                    style={{ background: 'radial-gradient(circle, #1080E0, transparent 70%)' }}
                                                />
                                            </>
                                        )}
                                        <div className="absolute size-40 rounded-full bg-white/5 ring-1 ring-white/10" />
                                        <div className="absolute size-32 rounded-full bg-white/10 ring-1 ring-white/15" />
                                        <div
                                            className={`relative flex size-28 items-center justify-center rounded-full text-white shadow-2xl transition-transform duration-500 ${aiSpeaking ? 'scale-110' : 'scale-100'}`}
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, #1080E0 0%, #10C0E0 50%, #001060 100%)',
                                                boxShadow:
                                                    '0 20px 60px -10px rgba(16,128,224,0.6), 0 0 0 1px rgba(255,255,255,0.1) inset',
                                            }}
                                        >
                                            <Bot className="size-12" />
                                            {aiSpeaking && (
                                                <span className="absolute -bottom-1.5 -right-1.5 flex size-8 items-center justify-center rounded-full bg-white shadow ring-2 ring-[color:#10C0E0]">
                                                    <Sparkles className="size-4 text-[color:#1080E0]" />
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* AI status caption */}
                                    <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/15 backdrop-blur">
                                        <span
                                            className={`size-1.5 shrink-0 rounded-full ${aiSpeaking ? 'animate-pulse bg-[color:#10C0E0]' : 'bg-emerald-400'}`}
                                        />
                                        <span className="leading-none">
                                            {aiSpeaking ? 'AI sedang bicara…' : 'Giliranmu menjawab'}
                                        </span>
                                    </div>

                                    {/* Current question caption (Zoom-like) */}
                                    {currentQIndex !== null && questions[currentQIndex] && (
                                        <div className="mt-6 max-w-2xl rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-center backdrop-blur">
                                            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-white/60">
                                                {questions[currentQIndex].category}
                                            </div>
                                            <div className="text-base font-medium leading-relaxed text-white sm:text-lg">
                                                {questions[currentQIndex].question}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mic visualizer */}
                                    <div className="mt-6 w-full max-w-md">
                                        <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/60">
                                            <span className="inline-flex items-center gap-1.5">
                                                {muted ? (
                                                    <MicOff className="size-3 text-rose-300" />
                                                ) : (
                                                    <Mic className="size-3 text-[color:#10C0E0]" />
                                                )}
                                                {muted ? 'Mic dimatikan' : 'Suara kamu'}
                                            </span>
                                            <span className="font-mono text-[10px] text-white/40">
                                                {Math.round(micLevel * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                                            <div
                                                className="h-full rounded-full transition-[width] duration-75"
                                                style={{
                                                    width: `${Math.min(100, micLevel * 100)}%`,
                                                    background: muted
                                                        ? 'rgba(255,255,255,0.2)'
                                                        : 'linear-gradient(90deg, #1080E0, #10C0E0)',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Floating action bar — video-call style */}
                                <div className="relative flex items-center justify-center gap-3 border-t border-white/10 bg-black/30 px-4 py-4 backdrop-blur">
                                    <button
                                        type="button"
                                        onClick={toggleMute}
                                        className={`flex size-12 items-center justify-center rounded-full transition ${
                                            muted
                                                ? 'bg-rose-500 text-white shadow-lg hover:bg-rose-600'
                                                : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15'
                                        }`}
                                        aria-label={muted ? 'Aktifkan mic' : 'Matikan mic'}
                                        title={muted ? 'Aktifkan mic' : 'Matikan mic'}
                                    >
                                        {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmEndOpen(true)}
                                        disabled={finishing}
                                        className="flex h-12 items-center gap-2 rounded-full bg-rose-500 px-5 font-semibold text-white shadow-lg transition hover:bg-rose-600 disabled:opacity-60"
                                    >
                                        {finishing ? (
                                            <Loader2 className="size-5 animate-spin" />
                                        ) : (
                                            <PhoneOff className="size-5" />
                                        )}
                                        Akhiri Sesi
                                    </button>
                                </div>
                            </div>

                            {/* Closing banner — appears when all questions have been asked */}
                            {currentQIndex !== null && currentQIndex >= questions.length - 1 && (
                                <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40">
                                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                                <CheckCircle2 className="size-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">
                                                    Semua pertanyaan sudah ditanyakan
                                                </div>
                                                <p className="text-xs text-slate-600">
                                                    AI akan segera menutup sesi. Tunggu sapaan penutup, lalu klik{' '}
                                                    <strong>Akhiri Sesi</strong> untuk melihat hasil analisis lengkap.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => setConfirmEndOpen(true)}
                                            disabled={finishing}
                                            className="shrink-0"
                                        >
                                            {finishing ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="size-4" />
                                            )}
                                            Selesaikan & Lihat Hasil
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Live transcript */}
                            <Card className="border-slate-200/70 shadow-xs">
                                <CardContent className="p-4">
                                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-sm font-semibold text-slate-900">Transcript Live</div>
                                        <span className="text-xs text-slate-500">{transcript.length} pesan</span>
                                    </div>
                                    <div
                                        ref={transcriptScrollRef}
                                        className="max-h-[440px] space-y-3 overflow-y-auto rounded-lg bg-slate-50/40 p-3"
                                    >
                                        {transcript.length === 0 && (
                                            <div className="flex h-32 items-center justify-center text-xs text-slate-500">
                                                AI akan segera menyapa. Transcript muncul di sini secara real-time.
                                            </div>
                                        )}
                                        {transcript.map((line, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-end gap-2 ${line.speaker === 'ai' ? '' : 'flex-row-reverse'}`}
                                            >
                                                {line.speaker === 'ai' ? (
                                                    <div
                                                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
                                                        style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                                    >
                                                        <Bot className="size-3.5" />
                                                    </div>
                                                ) : (
                                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                                                        K
                                                    </div>
                                                )}
                                                <div
                                                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-xs ${
                                                        line.speaker === 'ai'
                                                            ? 'rounded-bl-sm bg-white text-slate-800 ring-1 ring-slate-200'
                                                            : 'rounded-br-sm text-white'
                                                    }`}
                                                    style={
                                                        line.speaker === 'user'
                                                            ? { background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }
                                                            : undefined
                                                    }
                                                >
                                                    {line.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right rail: question stepper */}
                        <aside className="space-y-4">
                            <Card className="border-slate-200/70 shadow-xs">
                                <CardContent className="p-4">
                                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <h3 className="text-sm font-semibold text-slate-900">Progres Pertanyaan</h3>
                                        <span className="text-xs text-slate-500">
                                            {(currentQIndex ?? -1) + 1}/{questions.length}
                                        </span>
                                    </div>
                                    <Progress
                                        value={
                                            currentQIndex !== null
                                                ? ((currentQIndex + 1) / Math.max(questions.length, 1)) * 100
                                                : 0
                                        }
                                    />
                                    <ol className="mt-4 space-y-2.5">
                                        {questions.map((q, idx) => {
                                            const done = currentQIndex !== null && idx < currentQIndex;
                                            const active = currentQIndex === idx;
                                            return (
                                                <li
                                                    key={q.id}
                                                    className={`flex gap-3 rounded-lg p-2 transition ${active ? 'bg-[color:#1080E0]/5' : ''}`}
                                                >
                                                    <div className="flex shrink-0 items-center">
                                                        {done ? (
                                                            <CheckCircle2 className="size-5 text-emerald-500" />
                                                        ) : active ? (
                                                            <span
                                                                className="flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                                                                style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                                            >
                                                                {q.order_number}
                                                            </span>
                                                        ) : (
                                                            <span className="flex size-5 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500">
                                                                {q.order_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className={`text-xs font-medium uppercase tracking-wide ${active ? 'text-[color:#1080E0]' : 'text-slate-500'}`}>
                                                            {q.category}
                                                        </div>
                                                        <div className={`mt-0.5 text-xs leading-snug ${done ? 'text-slate-400 line-through' : active ? 'text-slate-900' : 'text-slate-600'}`}>
                                                            {q.question.length > 60 ? `${q.question.slice(0, 60)}…` : q.question}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200/70 bg-slate-50/50 shadow-xs">
                                <CardContent className="space-y-1 p-4 text-xs text-slate-600">
                                    <div className="font-semibold text-slate-700">Tips</div>
                                    <p>· Bicara natural, AI auto-deteksi kapan kamu selesai</p>
                                    <p>· Boleh interrupt AI kalau ingin lanjut</p>
                                    <p>· Tarik napas dulu sebelum jawaban panjang</p>
                                </CardContent>
                            </Card>
                        </aside>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={confirmEndOpen}
                onOpenChange={(open) => !finishing && setConfirmEndOpen(open)}
                title="Akhiri sesi sekarang?"
                description={
                    currentQIndex !== null && currentQIndex >= questions.length - 1
                        ? 'Semua pertanyaan sudah ditanyakan. AI akan menganalisis jawabanmu — proses sekitar 30 detik. Lanjutkan?'
                        : 'Beberapa pertanyaan belum dijawab. AI tetap akan menganalisis jawaban yang ada. Yakin akhiri sekarang?'
                }
                confirmLabel={finishing ? 'Menganalisis…' : 'Akhiri & Lihat Hasil'}
                confirmIcon={finishing ? Loader2 : CheckCircle2}
                onConfirm={async () => {
                    await finish();
                }}
            />
        </>
    );
}

type DeviceCheckPanelProps = {
    sessionId: number;
    networkCheck: CheckState;
    networkLatency: number | null;
    micCheck: CheckState;
    previewMicLevel: number;
    cameraCheck: CheckState;
    speakerCheck: CheckState;
    onRecheckNetwork: () => void;
    onTestMic: () => void;
    onTestCamera: () => void;
    onTestSpeaker: () => void;
    previewVideoRef: React.RefObject<HTMLVideoElement | null>;
    canStart: boolean;
    error: string | null;
    onStart: () => void;
};

function StatusPill({ state }: { state: CheckState }) {
    if (state === 'ok') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="size-3" /> Siap
            </span>
        );
    }
    if (state === 'fail') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                <AlertCircle className="size-3" /> Gagal
            </span>
        );
    }
    if (state === 'testing') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                <Loader2 className="size-3 animate-spin" /> Mengecek
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            Belum diuji
        </span>
    );
}

function DeviceCheckPanel({
    sessionId,
    networkCheck,
    networkLatency,
    micCheck,
    previewMicLevel,
    cameraCheck,
    speakerCheck,
    onRecheckNetwork,
    onTestMic,
    onTestCamera,
    onTestSpeaker,
    previewVideoRef,
    canStart,
    error,
    onStart,
}: DeviceCheckPanelProps) {
    const [switchingMode, setSwitchingMode] = useState(false);

    const switchToText = () => {
        if (!confirm('Beralih ke mode teks? Kandidat akan mengetik jawaban alih-alih bicara. Perubahan ini tidak bisa dibatalkan untuk sesi ini.')) {
            return;
        }
        setSwitchingMode(true);
        router.post(
            `/employee/ai-interviews/${sessionId}/switch-to-text`,
            {},
            {
                preserveScroll: false,
                onFinish: () => setSwitchingMode(false),
            },
        );
    };

    const networkLabel =
        networkCheck === 'ok'
            ? networkLatency !== null
                ? networkLatency < 80
                    ? 'Stabil'
                    : networkLatency < 200
                      ? 'Cukup'
                      : 'Lambat'
                : 'Online'
            : networkCheck === 'fail'
              ? 'Offline / tidak terhubung'
              : 'Mengecek koneksi…';

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card className="relative overflow-hidden border-slate-200/70 shadow-xs">
                <span
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                />
                <CardContent className="space-y-5 p-6">
                    <div className="flex items-start gap-4">
                        <div
                            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                            style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                        >
                            <Mic className="size-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Persiapan Voice Interview</h2>
                            <p className="text-sm text-slate-600">
                                Cek perangkat & koneksi sebelum mulai biar sesi lancar tanpa kendala. AI akan menanyakan pertanyaan satu per satu — kamu jawab pakai suara biasa.
                            </p>
                        </div>
                    </div>

                    {/* Noise / mic fallback */}
                    {micCheck === 'fail' ? (
                        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2 text-sm text-amber-900">
                                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                <div>
                                    <div className="font-semibold">Mic tidak bisa diakses?</div>
                                    <div className="text-xs">Kamu bisa lanjut wawancara dalam mode teks (mengetik jawaban) tanpa kehilangan progress.</div>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={switchToText}
                                disabled={switchingMode}
                                className="shrink-0"
                            >
                                {switchingMode ? <Loader2 className="size-4 animate-spin" /> : <Type className="size-4" />}
                                Lanjut dengan Mode Teks
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2 text-xs text-slate-600">
                                <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
                                <span>Lingkungan bising atau mic bermasalah? Kamu bisa beralih ke mode teks kapan saja sebelum mulai.</span>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={switchToText}
                                disabled={switchingMode}
                                className="shrink-0 text-slate-700"
                            >
                                {switchingMode ? <Loader2 className="size-4 animate-spin" /> : <Type className="size-4" />}
                                Beralih ke Teks
                            </Button>
                        </div>
                    )}

                    <div className="space-y-3">
                        {/* Network */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex size-10 items-center justify-center rounded-lg ${networkCheck === 'fail' ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'}`}
                                    >
                                        {networkCheck === 'fail' ? <WifiOff className="size-5" /> : <Wifi className="size-5" />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">Jaringan Internet</div>
                                        <div className="text-xs text-slate-500">
                                            {networkLabel}
                                            {networkLatency !== null && networkCheck === 'ok' ? ` · ping ${networkLatency} ms` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusPill state={networkCheck} />
                                    <Button size="sm" variant="ghost" onClick={onRecheckNetwork} disabled={networkCheck === 'testing'}>
                                        Cek Ulang
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Microphone */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex flex-1 items-center gap-3">
                                    <div className={`flex size-10 items-center justify-center rounded-lg ${micCheck === 'fail' ? 'bg-rose-50 text-rose-600' : micCheck === 'ok' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                                        {micCheck === 'fail' ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-semibold text-slate-900">Mikrofon</div>
                                            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">Wajib</span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {micCheck === 'idle' && 'Klik tombol di kanan, lalu coba bicara — bar harus bergerak.'}
                                            {micCheck === 'testing' && 'Bicara sebentar — pastikan bar di bawah bergerak.'}
                                            {micCheck === 'ok' && 'Mic terdeteksi & berfungsi. Tetap bicara untuk verifikasi.'}
                                            {micCheck === 'fail' && 'Mic tidak bisa diakses. Cek izin browser & device.'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <StatusPill state={micCheck} />
                                    <Button
                                        size="sm"
                                        onClick={onTestMic}
                                        disabled={micCheck === 'testing'}
                                        className={micCheck === 'ok' ? undefined : 'text-white'}
                                        style={
                                            micCheck === 'ok'
                                                ? undefined
                                                : { background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }
                                        }
                                        variant={micCheck === 'ok' ? 'outline' : 'default'}
                                    >
                                        {micCheck === 'ok' ? 'Test Ulang' : 'Test Mic'}
                                    </Button>
                                </div>
                            </div>
                            {(micCheck === 'testing' || micCheck === 'ok') && (
                                <div className="mt-3 space-y-1">
                                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full transition-[width] duration-75"
                                            style={{
                                                width: `${Math.min(100, previewMicLevel * 100)}%`,
                                                background: 'linear-gradient(90deg, #1080E0, #10C0E0)',
                                            }}
                                        />
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {previewMicLevel > 0.05 ? 'Mic mendeteksi suara ✓' : 'Coba bicara untuk lihat level…'}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Camera */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`flex size-10 items-center justify-center rounded-lg ${cameraCheck === 'fail' ? 'bg-rose-50 text-rose-600' : cameraCheck === 'ok' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                                        {cameraCheck === 'fail' ? <CameraOff className="size-5" /> : <Camera className="size-5" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-semibold text-slate-900">Kamera</div>
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Opsional</span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {cameraCheck === 'idle' && 'Cek kamera biar terbiasa dengan setup interview formal.'}
                                            {cameraCheck === 'testing' && 'Mengaktifkan kamera…'}
                                            {cameraCheck === 'ok' && 'Kamera aktif — preview ada di kanan.'}
                                            {cameraCheck === 'fail' && 'Kamera tidak bisa diakses. Sesi voice tetap bisa dilanjut.'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusPill state={cameraCheck} />
                                    <Button size="sm" variant="outline" onClick={onTestCamera} disabled={cameraCheck === 'testing'}>
                                        {cameraCheck === 'ok' ? 'Aktifkan Ulang' : 'Aktifkan Kamera'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Speaker */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`flex size-10 items-center justify-center rounded-lg ${speakerCheck === 'ok' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                                        <Volume2 className="size-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-semibold text-slate-900">Speaker</div>
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Opsional</span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {speakerCheck === 'idle' && 'Klik untuk dengar nada test (1 detik). Pastikan volume tidak silent.'}
                                            {speakerCheck === 'testing' && 'Memutar nada…'}
                                            {speakerCheck === 'ok' && 'Speaker OK — kamu seharusnya mendengar nada tadi.'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusPill state={speakerCheck} />
                                    <Button size="sm" variant="outline" onClick={onTestSpeaker} disabled={speakerCheck === 'testing'}>
                                        {speakerCheck === 'ok' ? 'Putar Lagi' : 'Test Speaker'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <div>{error}</div>
                        </div>
                    )}

                    <div className="flex flex-col items-stretch gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-slate-500">
                            {canStart ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                    <CheckCircle2 className="size-3.5" /> Semua wajib siap. Klik mulai untuk konek ke AI.
                                </span>
                            ) : (
                                <span>Cek jaringan & mic minimal harus berhasil sebelum mulai.</span>
                            )}
                        </div>
                        <Button
                            size="lg"
                            disabled={!canStart}
                            onClick={onStart}
                            className="text-white"
                            style={canStart ? { background: 'linear-gradient(135deg, #1080E0, #10C0E0)' } : undefined}
                        >
                            <Sparkles className="size-4" />
                            Mulai Sesi Voice
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <aside className="space-y-3">
                {/* Self-view: prominent camera preview ala video call */}
                <Card className="overflow-hidden border-slate-200/70 shadow-xs">
                    <div className="relative aspect-video bg-slate-950">
                        {cameraCheck === 'ok' ? (
                            <>
                                <video
                                    ref={previewVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="size-full object-cover"
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                                <div className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                                    Preview kamu
                                </div>
                                <div className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                                    <Camera className="size-3" />
                                    Live
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                                <div className="flex size-12 items-center justify-center rounded-full bg-slate-800/80 ring-1 ring-white/10">
                                    {cameraCheck === 'fail' ? (
                                        <CameraOff className="size-5 text-rose-400" />
                                    ) : (
                                        <Camera className="size-5 text-slate-300" />
                                    )}
                                </div>
                                <div className="text-xs font-semibold text-slate-200">
                                    {cameraCheck === 'fail'
                                        ? 'Kamera tidak terdeteksi'
                                        : 'Kamera belum aktif'}
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    {cameraCheck === 'fail'
                                        ? 'Cek izin browser & coba lagi.'
                                        : 'Aktifkan kamera untuk lihat preview di sini.'}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="border-slate-200/70 bg-slate-50/50 shadow-xs">
                    <CardContent className="space-y-2 p-4 text-xs text-slate-600">
                        <div className="text-sm font-semibold text-slate-900">Tips Sebelum Mulai</div>
                        <ul className="space-y-1.5">
                            <li>· Pakai headset/earphone biar suara AI tidak terdengar balik ke mic (echo).</li>
                            <li>· Cari ruangan tenang — AI auto-deteksi giliran bicara via deteksi suara.</li>
                            <li>· Bicara natural & jelas; tarik napas dulu kalau jawaban panjang.</li>
                            <li>· Boleh interrupt AI kalau kamu sudah punya jawaban.</li>
                            <li>· Sesi direkam (audio) untuk arsip — bisa diputar ulang di halaman hasil.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/70 shadow-xs">
                    <CardContent className="space-y-2 p-4 text-xs text-slate-600">
                        <div className="text-sm font-semibold text-slate-900">Yang akan terjadi</div>
                        <ol className="ml-4 list-decimal space-y-1">
                            <li>AI menyapa singkat lalu langsung tanya Q1.</li>
                            <li>Kamu jawab — AI lanjut otomatis ke Q berikutnya.</li>
                            <li>Setelah pertanyaan terakhir, AI menutup sesi.</li>
                            <li>Klik "Akhiri Sesi" → AI menganalisis jawaban → halaman hasil.</li>
                        </ol>
                    </CardContent>
                </Card>
            </aside>
        </div>
    );
}
