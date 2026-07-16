import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Award,
    Brain,
    Building2,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Crown,
    GraduationCap,
    Headphones,
    Lightbulb,
    MessageCircle,
    PlayCircle,
    Printer,
    Sparkles,
    Star,
    Target,
    ThumbsDown,
    ThumbsUp,
    Trophy,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { InterviewRadarChart } from '@/components/charts/interview-radar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';

type Props = {
    session: {
        id: number;
        job_title: string | null;
        company_name: string | null;
        company_logo_url: string | null;
        is_practice: boolean;
        duration_seconds: number | null;
        started_at: string | null;
        completed_at: string | null;
        recording_url: string | null;
        total_questions: number;
        answered_questions: number;
    };
    analysis: {
        status?: string;
        overall_score: number | null;
        fit_score: number | null;
        recommendation: string | null;
        summary: string;
        strengths: string[];
        weaknesses: string[];
        skill_assessment: Record<string, number>;
        communication_score: number | null;
        technical_score: number | null;
        problem_solving_score: number | null;
        culture_fit_score: number | null;
        red_flags: string[];
    } | null;
    analysis_pending?: boolean;
    responses: Array<{
        order_number: number;
        category: string;
        question: string;
        answer: string | null;
        ai_score: number | null;
        sub_scores: Record<string, number> | null;
        ai_feedback: string | null;
    }>;
};

const RECOMMENDATION_META: Record<
    string,
    { label: string; tone: 'success' | 'good' | 'neutral' | 'warning' | 'danger'; icon: typeof Crown }
> = {
    strong_hire: { label: 'Sangat Direkomendasikan', tone: 'success', icon: Crown },
    hire: { label: 'Direkomendasikan', tone: 'good', icon: ThumbsUp },
    lean_hire: { label: 'Cenderung Direkomendasikan', tone: 'good', icon: ThumbsUp },
    neutral: { label: 'Netral', tone: 'neutral', icon: Target },
    lean_no_hire: { label: 'Cenderung Tidak Direkomendasikan', tone: 'warning', icon: ThumbsDown },
    no_hire: { label: 'Tidak Direkomendasikan', tone: 'danger', icon: ThumbsDown },
    strong_no_hire: { label: 'Sangat Tidak Direkomendasikan', tone: 'danger', icon: ThumbsDown },
};

const TONE_STYLES = {
    success: {
        bg: 'from-emerald-500 to-teal-500',
        ring: 'ring-emerald-200',
        text: 'text-emerald-700',
        soft: 'bg-emerald-50',
    },
    good: {
        bg: 'from-sky-500 to-cyan-500',
        ring: 'ring-sky-200',
        text: 'text-sky-700',
        soft: 'bg-sky-50',
    },
    neutral: {
        bg: 'from-slate-500 to-slate-600',
        ring: 'ring-slate-200',
        text: 'text-slate-700',
        soft: 'bg-slate-50',
    },
    warning: {
        bg: 'from-amber-500 to-orange-500',
        ring: 'ring-amber-200',
        text: 'text-amber-700',
        soft: 'bg-amber-50',
    },
    danger: {
        bg: 'from-rose-500 to-red-500',
        ring: 'ring-rose-200',
        text: 'text-rose-700',
        soft: 'bg-rose-50',
    },
};

const CATEGORY_META: Record<string, { label: string; color: string }> = {
    opening: { label: 'Pembuka', color: 'bg-violet-100 text-violet-700' },
    technical: { label: 'Teknis', color: 'bg-sky-100 text-sky-700' },
    behavioral: { label: 'Perilaku', color: 'bg-emerald-100 text-emerald-700' },
    situational: { label: 'Situasional', color: 'bg-amber-100 text-amber-700' },
    culture: { label: 'Budaya Kerja', color: 'bg-pink-100 text-pink-700' },
    closing: { label: 'Penutup', color: 'bg-slate-100 text-slate-700' },
};

const scoreColor = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-teal-500';
    if (score >= 65) return 'from-sky-500 to-cyan-500';
    if (score >= 50) return 'from-amber-500 to-orange-500';
    return 'from-rose-500 to-red-500';
};

const scoreLabel = (score: number) => {
    if (score >= 80) return 'Sangat Baik';
    if (score >= 65) return 'Baik';
    if (score >= 50) return 'Cukup';
    return 'Perlu Ditingkatkan';
};

const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} detik`;
    return secs === 0 ? `${mins} menit` : `${mins}m ${secs}s`;
};

export default function AiInterviewResult({ session, analysis, analysis_pending, responses }: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'questions'>('overview');
    const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

    // Analysis runs in a background queue job; poll until it lands so the
    // candidate doesn't have to refresh manually.
    useEffect(() => {
        if (!analysis_pending) return;
        const timer = window.setInterval(() => {
            router.reload({ only: ['analysis', 'analysis_pending', 'responses', 'session'] });
        }, 4000);
        return () => window.clearInterval(timer);
    }, [analysis_pending]);

    const needsReview = analysis?.status === 'needs_review';
    const recommendation = analysis ? RECOMMENDATION_META[analysis.recommendation ?? 'neutral'] ?? RECOMMENDATION_META.neutral : null;
    const recTone = recommendation ? TONE_STYLES[recommendation.tone] : TONE_STYLES.neutral;

    const subScoreEntries = useMemo(() => {
        if (!analysis) return [];
        return [
            { key: 'communication', label: 'Komunikasi', icon: MessageCircle, score: analysis.communication_score },
            { key: 'technical', label: 'Teknis', icon: Brain, score: analysis.technical_score },
            { key: 'problem_solving', label: 'Problem Solving', icon: Lightbulb, score: analysis.problem_solving_score },
            { key: 'culture_fit', label: 'Culture Fit', icon: Users, score: analysis.culture_fit_score },
        ].filter((entry) => entry.score !== null) as Array<{ key: string; label: string; icon: typeof Brain; score: number }>;
    }, [analysis]);

    const skillEntries = useMemo(() => {
        if (!analysis?.skill_assessment) return [];
        return Object.entries(analysis.skill_assessment)
            .map(([key, value]) => ({ key, value }))
            .sort((a, b) => b.value - a.value);
    }, [analysis]);

    const questionStats = useMemo(() => {
        const scored = responses.filter((r) => r.ai_score !== null);
        const avgScore = scored.length === 0 ? 0 : Math.round(scored.reduce((sum, r) => sum + (r.ai_score ?? 0), 0) / scored.length);
        const highest = scored.reduce((max, r) => ((r.ai_score ?? 0) > (max?.ai_score ?? 0) ? r : max), scored[0]);
        const lowest = scored.reduce((min, r) => ((r.ai_score ?? 0) < (min?.ai_score ?? 0) ? r : min), scored[0]);
        return { avgScore, highest, lowest };
    }, [responses]);

    const toggleQuestion = (orderNumber: number) => {
        setExpandedQuestions((prev) => {
            const next = new Set(prev);
            if (next.has(orderNumber)) next.delete(orderNumber);
            else next.add(orderNumber);
            return next;
        });
    };

    const expandAll = () => setExpandedQuestions(new Set(responses.map((r) => r.order_number)));
    const collapseAll = () => setExpandedQuestions(new Set());

    return (
        <>
            <Head title="Hasil AI Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Header context */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/employee/ai-interviews">
                                <ArrowLeft className="size-4" /> Kembali
                            </Link>
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="hidden sm:inline-flex"
                        >
                            <Printer className="size-4" /> Cetak / PDF
                        </Button>
                    </div>
                </div>

                {/* HERO SECTION */}
                <div
                    className="relative overflow-hidden rounded-3xl border border-slate-200/70 shadow-xl"
                    style={{
                        background:
                            'radial-gradient(ellipse at top right, rgba(16,128,224,0.12) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(16,192,224,0.10) 0%, transparent 55%), linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
                    }}
                >
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full opacity-30 blur-3xl"
                        style={{ background: 'radial-gradient(circle, #10C0E0, transparent)' }}
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -bottom-32 -left-32 size-96 rounded-full opacity-20 blur-3xl"
                        style={{ background: 'radial-gradient(circle, #1080E0, transparent)' }}
                    />

                    <div className="relative p-5 sm:p-6 lg:p-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                                {session.is_practice ? (
                                    <div
                                        className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
                                        style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                    >
                                        <GraduationCap className="size-7" />
                                    </div>
                                ) : session.company_logo_url ? (
                                    <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                                        <img
                                            src={session.company_logo_url}
                                            alt={session.company_name ?? ''}
                                            className="size-full object-contain p-1"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                                        <Building2 className="size-6 text-slate-400" />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                        {session.is_practice ? 'Hasil Latihan Wawancara' : 'Hasil Wawancara AI'}
                                    </div>
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                        {session.job_title ?? 'Sesi Wawancara'}
                                    </h1>
                                    {session.company_name && !session.is_practice && (
                                        <div className="text-sm text-slate-600">{session.company_name}</div>
                                    )}
                                </div>
                            </div>
                            {session.is_practice && (
                                <Badge variant="secondary" className="gap-1 self-start">
                                    <Sparkles className="size-3" /> Mode Latihan
                                </Badge>
                            )}
                        </div>

                        {/* Meta strip */}
                        <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 sm:gap-3">
                            <MetaPill icon={Clock} label="Durasi" value={formatDuration(session.duration_seconds)} />
                            <MetaPill
                                icon={MessageCircle}
                                label="Pertanyaan Terjawab"
                                value={`${session.answered_questions}/${session.total_questions}`}
                            />
                            <MetaPill
                                icon={CheckCircle2}
                                label="Selesai"
                                value={session.completed_at ? formatDateTime(session.completed_at) : '—'}
                            />
                            <MetaPill
                                icon={Headphones}
                                label="Rekaman"
                                value={session.recording_url ? 'Tersedia' : 'Tidak ada'}
                            />
                        </div>

                        {analysis && (
                            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
                                <ScoreOrb
                                    label="Overall Score"
                                    score={analysis.overall_score}
                                    icon={Trophy}
                                    description={scoreLabel(analysis.overall_score)}
                                />
                                <ScoreOrb
                                    label="Fit Score"
                                    score={analysis.fit_score}
                                    icon={Target}
                                    description={scoreLabel(analysis.fit_score)}
                                />
                                <Card className={cn('border-0 shadow-xs', recTone.soft)}>
                                    <CardContent className="flex h-full flex-col justify-between gap-3 p-5">
                                        <div className="flex items-center gap-2">
                                            <Award className={cn('size-4', recTone.text)} />
                                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                                                Rekomendasi AI
                                            </span>
                                        </div>
                                        <div>
                                            <div
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1.5 text-sm font-semibold text-white shadow-xs',
                                                    recTone.bg,
                                                )}
                                            >
                                                {recommendation && <recommendation.icon className="size-4" />}
                                                {recommendation?.label ?? 'Netral'}
                                            </div>
                                            <p className="mt-2 text-xs text-slate-600">
                                                Berdasarkan analisis jawaban dan kecocokan dengan posisi.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

                {!analysis ? (
                    session.is_practice ? (
                        <Card>
                            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                                <div className="flex size-12 items-center justify-center rounded-full bg-sky-50">
                                    <Sparkles className="size-6 animate-pulse text-sky-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Analisis sedang diproses</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        AI sedang menganalisis jawabanmu. Halaman ini akan diperbarui otomatis saat
                                        hasil siap.
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                                    Refresh
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white">
                            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="size-7" />
                                </div>
                                <div className="max-w-xl space-y-2">
                                    <h3 className="text-lg font-semibold text-slate-900">Wawancara berhasil dikirim</h3>
                                    <p className="text-sm leading-relaxed text-slate-600">
                                        Terima kasih sudah menyelesaikan sesi wawancara AI. Hasil dan analisis lengkap
                                        akan langsung dikirim ke recruiter
                                        {session.company_name ? <> di <span className="font-medium text-slate-800">{session.company_name}</span></> : null}
                                        {' '}untuk ditinjau. Recruiter akan menghubungimu lewat email atau notifikasi
                                        jika lolos ke tahap berikutnya.
                                    </p>
                                </div>
                                <div className="grid w-full max-w-xl gap-2 text-left text-xs text-slate-600 sm:grid-cols-2">
                                    <div className="flex items-start gap-2 rounded-lg bg-white p-3 shadow-xs ring-1 ring-emerald-100">
                                        <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                        <span>Skor & feedback bersifat rahasia dan hanya dilihat recruiter, bukan kandidat.</span>
                                    </div>
                                    <div className="flex items-start gap-2 rounded-lg bg-white p-3 shadow-xs ring-1 ring-emerald-100">
                                        <Clock className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                        <span>Status lamaran &amp; jadwal interview lanjutan dapat dipantau di halaman lamaran.</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2 pt-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/employee/applications">Lihat Lamaran Saya</Link>
                                    </Button>
                                    <Button asChild size="sm">
                                        <Link href="/employee/ai-interviews">Kembali ke Daftar Wawancara</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                ) : needsReview ? (
                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                <AlertTriangle className="size-6" />
                            </div>
                            <div className="max-w-md space-y-1">
                                <h3 className="text-base font-semibold text-slate-900">Analisis perlu tinjauan manual</h3>
                                <p className="text-sm text-slate-600">
                                    Sistem AI belum bisa menyelesaikan analisis otomatis untuk sesi ini. Jawabanmu
                                    tersimpan dengan aman dan dapat ditinjau langsung pada tab per-pertanyaan di bawah.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
                            <TabsTrigger value="overview">
                                <Sparkles className="size-4" />
                                Ringkasan
                            </TabsTrigger>
                            <TabsTrigger value="breakdown">
                                <Brain className="size-4" />
                                Breakdown Skor
                            </TabsTrigger>
                            <TabsTrigger value="questions">
                                <MessageCircle className="size-4" />
                                Per Pertanyaan ({responses.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB: Overview */}
                        <TabsContent value="overview" className="mt-5 space-y-5">
                            <Card className="border-slate-200/70">
                                <CardContent className="space-y-3 p-5 sm:p-6">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                        <Sparkles className="size-4 text-[color:#1080E0]" />
                                        Ringkasan AI
                                    </div>
                                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                                        {analysis.summary || 'Belum ada ringkasan tersedia.'}
                                    </p>
                                </CardContent>
                            </Card>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
                                    <CardContent className="space-y-3 p-5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                                <ThumbsUp className="size-5" />
                                            </div>
                                            <div className="text-sm font-semibold text-slate-900">Kekuatan</div>
                                            <Badge variant="secondary" className="ml-auto">
                                                {analysis.strengths.length}
                                            </Badge>
                                        </div>
                                        {analysis.strengths.length === 0 ? (
                                            <p className="text-sm text-slate-500">Belum teridentifikasi.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {analysis.strengths.map((s, i) => (
                                                    <li key={i} className="flex items-start gap-2 rounded-lg bg-white p-3 shadow-xs ring-1 ring-emerald-100">
                                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                                        <span className="text-sm text-slate-700">{s}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-amber-100 bg-gradient-to-br from-amber-50/40 to-white">
                                    <CardContent className="space-y-3 p-5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                                <Lightbulb className="size-5" />
                                            </div>
                                            <div className="text-sm font-semibold text-slate-900">Area Pengembangan</div>
                                            <Badge variant="secondary" className="ml-auto">
                                                {analysis.weaknesses.length}
                                            </Badge>
                                        </div>
                                        {analysis.weaknesses.length === 0 ? (
                                            <p className="text-sm text-slate-500">Belum teridentifikasi.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {analysis.weaknesses.map((w, i) => (
                                                    <li key={i} className="flex items-start gap-2 rounded-lg bg-white p-3 shadow-xs ring-1 ring-amber-100">
                                                        <Target className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                                        <span className="text-sm text-slate-700">{w}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {analysis.red_flags.length > 0 && (
                                <Card className="border-rose-200 bg-gradient-to-r from-rose-50 to-white">
                                    <CardContent className="space-y-3 p-5">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="size-5 text-rose-600" />
                                            <div className="text-sm font-semibold text-rose-900">Red Flags</div>
                                        </div>
                                        <ul className="space-y-2">
                                            {analysis.red_flags.map((rf, i) => (
                                                <li
                                                    key={i}
                                                    className="flex items-start gap-2 rounded-lg bg-white p-3 text-sm text-rose-800 shadow-xs ring-1 ring-rose-200"
                                                >
                                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                                    <span>{rf}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )}

                            {session.recording_url && (
                                <Card>
                                    <CardContent className="space-y-3 p-5">
                                        <div className="flex items-center gap-2">
                                            <PlayCircle className="size-5 text-[color:#1080E0]" />
                                            <div className="text-sm font-semibold text-slate-900">Rekaman Sesi</div>
                                        </div>
                                        <audio controls className="w-full" src={session.recording_url}>
                                            Browser kamu tidak mendukung pemutar audio.
                                        </audio>
                                        <p className="text-xs text-slate-500">
                                            Putar ulang untuk evaluasi cara bicara, intonasi, dan kelancaran jawabanmu.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* TAB: Breakdown */}
                        <TabsContent value="breakdown" className="mt-5 space-y-5">
                            {subScoreEntries.length > 0 && (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {subScoreEntries.map((entry) => (
                                        <SubScoreCard
                                            key={entry.key}
                                            icon={entry.icon}
                                            label={entry.label}
                                            score={entry.score}
                                        />
                                    ))}
                                </div>
                            )}

                            <Card>
                                <CardContent className="p-5 sm:p-6">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Brain className="size-5 text-[color:#1080E0]" />
                                        <div className="text-sm font-semibold text-slate-900">Radar Profil Kompetensi</div>
                                    </div>
                                    <InterviewRadarChart
                                        scores={{
                                            technical: analysis.technical_score,
                                            communication: analysis.communication_score,
                                            problem_solving: analysis.problem_solving_score,
                                            culture_fit: analysis.culture_fit_score,
                                        }}
                                    />
                                </CardContent>
                            </Card>

                            {skillEntries.length > 0 && (
                                <Card>
                                    <CardContent className="space-y-4 p-5 sm:p-6">
                                        <div className="flex items-center gap-2">
                                            <Star className="size-5 text-amber-500" />
                                            <div className="text-sm font-semibold text-slate-900">Penilaian Skill Detail</div>
                                            <Badge variant="secondary" className="ml-auto">
                                                {skillEntries.length} skill
                                            </Badge>
                                        </div>
                                        <div className="space-y-3">
                                            {skillEntries.map((entry) => (
                                                <div key={entry.key} className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-2 text-sm">
                                                        <span className="font-medium capitalize text-slate-700">
                                                            {entry.key.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="font-mono text-xs font-semibold text-slate-900">
                                                            {entry.value}/100
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                        <div
                                                            className={cn(
                                                                'h-full rounded-full bg-gradient-to-r transition-all',
                                                                scoreColor(entry.value),
                                                            )}
                                                            style={{ width: `${Math.max(0, Math.min(100, entry.value))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {responses.some((r) => r.ai_score !== null) && (
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <StatTile
                                        label="Rata-rata per Soal"
                                        value={`${questionStats.avgScore}`}
                                        accent="#1080E0"
                                        icon={Target}
                                    />
                                    {questionStats.highest && (
                                        <StatTile
                                            label="Soal Tertinggi"
                                            value={`${questionStats.highest.ai_score}`}
                                            sublabel={`Q${questionStats.highest.order_number} · ${CATEGORY_META[questionStats.highest.category]?.label ?? questionStats.highest.category}`}
                                            accent="#10b981"
                                            icon={Trophy}
                                        />
                                    )}
                                    {questionStats.lowest && (
                                        <StatTile
                                            label="Soal Terlemah"
                                            value={`${questionStats.lowest.ai_score}`}
                                            sublabel={`Q${questionStats.lowest.order_number} · ${CATEGORY_META[questionStats.lowest.category]?.label ?? questionStats.lowest.category}`}
                                            accent="#f59e0b"
                                            icon={Lightbulb}
                                        />
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* TAB: Per Pertanyaan */}
                        <TabsContent value="questions" className="mt-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-slate-500">
                                    Klik tiap pertanyaan untuk lihat jawaban & feedback lengkap.
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={collapseAll}>
                                        Tutup Semua
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={expandAll}>
                                        Buka Semua
                                    </Button>
                                </div>
                            </div>
                            {responses.map((r) => {
                                const expanded = expandedQuestions.has(r.order_number);
                                const cat = CATEGORY_META[r.category] ?? { label: r.category, color: 'bg-slate-100 text-slate-700' };
                                return (
                                    <Card key={r.order_number} className="overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => toggleQuestion(r.order_number)}
                                            className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-slate-50"
                                        >
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-50 font-mono text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                                                {r.order_number}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                            cat.color,
                                                        )}
                                                    >
                                                        {cat.label}
                                                    </span>
                                                    {r.ai_score !== null && (
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2 py-0.5 text-[11px] font-semibold text-white',
                                                                scoreColor(r.ai_score),
                                                            )}
                                                        >
                                                            <Star className="size-3" />
                                                            {r.ai_score}/100
                                                        </span>
                                                    )}
                                                    {!r.answer && (
                                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                                            Tidak dijawab
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm font-medium text-slate-900">{r.question}</div>
                                            </div>
                                            <div className="shrink-0 self-center text-slate-400">
                                                {expanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                                            </div>
                                        </button>

                                        {expanded && (
                                            <div className="border-t bg-slate-50/40 p-4 sm:p-5">
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                            Jawaban Kamu
                                                        </div>
                                                        {r.answer ? (
                                                            <p className="whitespace-pre-line rounded-lg bg-white p-3 text-sm text-slate-800 ring-1 ring-slate-200">
                                                                {r.answer}
                                                            </p>
                                                        ) : (
                                                            <p className="rounded-lg bg-white p-3 text-sm italic text-slate-400 ring-1 ring-slate-200">
                                                                Tidak ada jawaban yang tercatat.
                                                            </p>
                                                        )}
                                                    </div>

                                                    {r.ai_feedback && (
                                                        <div>
                                                            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                                <Sparkles className="size-3" /> Feedback AI
                                                            </div>
                                                            <p className="whitespace-pre-line rounded-lg bg-gradient-to-br from-sky-50 to-white p-3 text-sm text-slate-700 ring-1 ring-sky-100">
                                                                {r.ai_feedback}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {r.sub_scores && Object.keys(r.sub_scores).length > 0 && (
                                                        <div>
                                                            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                                Sub-Skor
                                                            </div>
                                                            <div className="grid gap-2 sm:grid-cols-2">
                                                                {Object.entries(r.sub_scores).map(([key, val]) => (
                                                                    <div key={key} className="space-y-1">
                                                                        <div className="flex items-center justify-between text-xs">
                                                                            <span className="capitalize text-slate-600">
                                                                                {key.replace(/_/g, ' ')}
                                                                            </span>
                                                                            <span className="font-mono font-semibold text-slate-900">
                                                                                {val}
                                                                            </span>
                                                                        </div>
                                                                        <Progress value={val} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </TabsContent>
                    </Tabs>
                )}

                <p className="text-center text-xs text-slate-400">
                    {session.completed_at
                        ? `Selesai pada ${formatDateTime(session.completed_at)}`
                        : 'Sesi belum selesai'}
                </p>
            </div>
        </>
    );
}

function MetaPill({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 backdrop-blur">
            <Icon className="size-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
                <div className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
                <div className="truncate text-xs font-semibold text-slate-800">{value}</div>
            </div>
        </div>
    );
}

function ScoreOrb({
    label,
    score,
    icon: Icon,
    description,
}: {
    label: string;
    score: number;
    icon: typeof Trophy;
    description: string;
}) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const safeScore = Math.max(0, Math.min(100, score));
    const offset = circumference - (safeScore / 100) * circumference;

    return (
        <Card className="border-slate-200/70">
            <CardContent className="flex items-center gap-4 p-5">
                <div className="relative flex size-24 shrink-0 items-center justify-center">
                    <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            fill="none"
                            stroke="url(#scoreGradient)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                        <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1080E0" />
                                <stop offset="100%" stopColor="#10C0E0" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="relative flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold tracking-tight text-slate-900">{score}</span>
                        <span className="text-[9px] font-medium uppercase text-slate-400">/100</span>
                    </div>
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <Icon className="size-4 text-[color:#1080E0]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">{label}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{description}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function SubScoreCard({
    icon: Icon,
    label,
    score,
}: {
    icon: typeof Brain;
    label: string;
    score: number;
}) {
    return (
        <Card>
            <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            'flex size-8 items-center justify-center rounded-lg bg-gradient-to-br text-white',
                            scoreColor(score),
                        )}
                    >
                        <Icon className="size-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">{label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">{score}</span>
                    <span className="text-xs font-medium text-slate-400">/100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={cn('h-full rounded-full bg-gradient-to-r transition-all', scoreColor(score))}
                        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                    />
                </div>
                <div className="text-[11px] text-slate-500">{scoreLabel(score)}</div>
            </CardContent>
        </Card>
    );
}

function StatTile({
    label,
    value,
    sublabel,
    accent,
    icon: Icon,
}: {
    label: string;
    value: string;
    sublabel?: string;
    accent: string;
    icon: typeof Trophy;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                >
                    <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
                    <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
                    {sublabel && <div className="truncate text-xs text-slate-500">{sublabel}</div>}
                </div>
            </CardContent>
        </Card>
    );
}

