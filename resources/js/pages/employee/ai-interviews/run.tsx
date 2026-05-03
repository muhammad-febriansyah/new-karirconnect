import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Bot,
    Camera,
    CameraOff,
    CheckCircle2,
    Loader2,
    Mic,
    MicOff,
    PhoneOff,
    Send,
    Sparkles,
    Volume2,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
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
        is_practice: boolean;
        total_questions: number;
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

export default function AiInterviewRun(props: Props) {
    if (props.session.mode === 'voice') {
        return <VoiceRun {...props} />;
    }
    return <TextRun {...props} />;
}

function TextRun({ session, questions, currentQuestion }: Props) {
    const [submitting, setSubmitting] = useState(false);
    const form = useForm({ answer: '', duration_seconds: 0 });

    const onSubmit = (e: FormEvent) => {
        if (!currentQuestion) return;
        e.preventDefault();
        setSubmitting(true);
        form.post(`/employee/ai-interviews/${session.id}/questions/${currentQuestion.id}/answer`, {
            preserveScroll: true,
            onFinish: () => {
                setSubmitting(false);
                form.reset('answer');
            },
        });
    };

    const completeNow = () => {
        router.post(`/employee/ai-interviews/${session.id}/complete`, {});
    };

    const progressValue = (session.current_index / Math.max(session.total_questions, 1)) * 100;

    return (
        <>
            <Head title="Sesi AI Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={session.is_practice ? 'Latihan AI Interview' : `AI Interview: ${session.job_title ?? '-'}`}
                    description={`Pertanyaan ${session.current_index + 1} dari ${session.total_questions}`}
                    actions={
                        session.current_index >= session.total_questions ? (
                            <Button onClick={completeNow}>
                                <CheckCircle2 className="size-4" /> Selesaikan & Lihat Hasil
                            </Button>
                        ) : null
                    }
                />

                <Progress value={progressValue} />

                {currentQuestion ? (
                    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                        <Section>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Bot className="size-5 text-primary" />
                                    <Badge variant="secondary">{currentQuestion.category}</Badge>
                                    <Badge variant="outline">Maks {currentQuestion.max_duration_seconds}s</Badge>
                                </div>
                                <h2 className="text-xl font-semibold leading-relaxed">{currentQuestion.question}</h2>
                            </div>

                            <form onSubmit={onSubmit} className="mt-6 space-y-4">
                                <TextareaField
                                    label="Jawaban Anda"
                                    rows={8}
                                    placeholder="Tulis jawaban Anda di sini."
                                    value={form.data.answer}
                                    onChange={(e) => form.setData('answer', e.target.value)}
                                    error={form.errors.answer}
                                />
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="text-xs text-muted-foreground">{form.data.answer.length} karakter</span>
                                    <Button type="submit" disabled={submitting || form.data.answer.trim().length === 0}>
                                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                        Kirim Jawaban
                                    </Button>
                                </div>
                            </form>
                        </Section>

                        <aside className="space-y-3">
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <h3 className="text-sm font-semibold">Daftar Pertanyaan</h3>
                                    <ol className="space-y-1 text-sm">
                                        {questions.map((q) => (
                                            <li key={q.id} className="flex items-center gap-2">
                                                {q.answered ? (
                                                    <CheckCircle2 className="size-3.5 text-success" />
                                                ) : (
                                                    <span className="size-3.5 rounded-full border border-muted-foreground/40" />
                                                )}
                                                <span className={q.answered ? 'text-muted-foreground line-through' : ''}>
                                                    {q.order_number}. {q.category}
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                </CardContent>
                            </Card>
                        </aside>
                    </div>
                ) : (
                    <Section>
                        <div className="text-center">
                            <CheckCircle2 className="mx-auto size-10 text-success" />
                            <h2 className="mt-3 text-lg font-semibold">Semua pertanyaan selesai!</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Klik tombol di bawah untuk melihat analisis lengkap dari AI.</p>
                            <Button className="mt-4" onClick={completeNow}>
                                <CheckCircle2 className="size-4" /> Selesaikan & Lihat Hasil
                            </Button>
                        </div>
                    </Section>
                )}
            </div>
        </>
    );
}

type TranscriptLine = { speaker: 'ai' | 'user'; text: string; questionIndex: number | null };

type CheckState = 'idle' | 'testing' | 'ok' | 'fail';

function VoiceRun({ session, questions }: Props) {
    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState(false);
    const [muted, setMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState<number | null>(null);
    const [finishing, setFinishing] = useState(false);
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

                const match = text.match(/^Q(\d+)/i);
                if (match) {
                    const qNum = Number(match[1]);
                    const idx = questions.findIndex((q) => q.order_number === qNum);
                    if (idx >= 0) {
                        currentQRef.current = idx;
                        setCurrentQIndex(idx);
                    }
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

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={session.is_practice ? 'Latihan Voice AI Interview' : `Voice AI Interview: ${session.job_title ?? '-'}`}
                    description={`${session.total_questions} pertanyaan · Mode realtime voice`}
                />

                <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

                {!connected && !connecting && (
                    <DeviceCheckPanel
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
                    <Card className="border-slate-200/70 shadow-sm">
                        <CardContent className="flex flex-col items-center gap-3 p-8">
                            <Loader2 className="size-6 animate-spin text-[color:#1080E0]" />
                            <div className="text-sm text-slate-600">Menghubungkan ke AI...</div>
                        </CardContent>
                    </Card>
                )}

                {connected && (
                    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                        <div className="space-y-4">
                            {/* Hero: AI orb + status */}
                            <Card
                                className="relative overflow-hidden border-slate-200/70 shadow-sm"
                                style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' }}
                            >
                                <CardContent className="relative p-6">
                                    {/* Decorative gradient ring */}
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-20 blur-3xl"
                                        style={{ background: 'radial-gradient(circle, #10C0E0, transparent)' }}
                                    />
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full opacity-10 blur-3xl"
                                        style={{ background: 'radial-gradient(circle, #1080E0, transparent)' }}
                                    />

                                    <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                                        {/* AI orb with pulsing rings */}
                                        <div className="relative flex shrink-0 items-center justify-center">
                                            {aiSpeaking && (
                                                <>
                                                    <span
                                                        className="absolute size-32 animate-ping rounded-full opacity-30"
                                                        style={{ background: 'radial-gradient(circle, #10C0E0, transparent 70%)' }}
                                                    />
                                                    <span
                                                        className="absolute size-24 animate-pulse rounded-full opacity-40"
                                                        style={{ background: 'radial-gradient(circle, #1080E0, transparent 70%)' }}
                                                    />
                                                </>
                                            )}
                                            <div
                                                className={`relative flex size-20 items-center justify-center rounded-full text-white shadow-lg transition-transform ${aiSpeaking ? 'scale-105' : ''}`}
                                                style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0, #001060)' }}
                                            >
                                                <Bot className="size-9" />
                                                {aiSpeaking && (
                                                    <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-white shadow ring-2 ring-[color:#10C0E0]">
                                                        <Sparkles className="size-3 text-[color:#1080E0]" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3 text-center sm:text-left">
                                            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                                                    Terhubung
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
                                                    {formatTime(elapsedSec)}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                                                    {currentQIndex !== null ? `Pertanyaan ${currentQIndex + 1}/${questions.length}` : `${questions.length} pertanyaan`}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                                    {aiSpeaking ? 'AI sedang bicara…' : 'Giliranmu menjawab'}
                                                </div>
                                                {currentQIndex !== null && questions[currentQIndex] ? (
                                                    <div className="mt-1 text-base font-semibold leading-snug text-slate-900">
                                                        {questions[currentQIndex].question}
                                                    </div>
                                                ) : (
                                                    <div className="mt-1 text-sm text-slate-600">AI sedang menyapa…</div>
                                                )}
                                            </div>

                                            {/* Mic level meter */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    {muted ? <MicOff className="size-3.5 text-rose-500" /> : <Mic className="size-3.5 text-[color:#1080E0]" />}
                                                    <span>{muted ? 'Mic dimatikan' : 'Mic aktif'}</span>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full transition-[width] duration-75"
                                                        style={{
                                                            width: `${Math.min(100, micLevel * 100)}%`,
                                                            background: muted
                                                                ? '#cbd5e1'
                                                                : 'linear-gradient(90deg, #1080E0, #10C0E0)',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action bar */}
                                    <div className="relative mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={toggleMute}
                                            className={muted ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : ''}
                                        >
                                            {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                                            {muted ? 'Aktifkan Mic' : 'Matikan Mic'}
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={finish} disabled={finishing}>
                                            {finishing ? <Loader2 className="size-4 animate-spin" /> : <PhoneOff className="size-4" />}
                                            Akhiri Sesi
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Live transcript */}
                            <Card className="border-slate-200/70 shadow-sm">
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
                                                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
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
                                                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
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
                            <Card className="border-slate-200/70 shadow-sm">
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

                            <Card className="border-slate-200/70 bg-slate-50/50 shadow-sm">
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
        </>
    );
}

type DeviceCheckPanelProps = {
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
            <Card className="relative overflow-hidden border-slate-200/70 shadow-sm">
                <span
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                />
                <CardContent className="space-y-5 p-6">
                    <div className="flex items-start gap-4">
                        <div
                            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
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
                                            {cameraCheck === 'ok' && 'Kamera aktif — preview di bawah.'}
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
                            {cameraCheck === 'ok' && (
                                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                                    <video
                                        ref={previewVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="aspect-video w-full object-cover"
                                    />
                                </div>
                            )}
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
                <Card className="border-slate-200/70 bg-slate-50/50 shadow-sm">
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

                <Card className="border-slate-200/70 shadow-sm">
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
