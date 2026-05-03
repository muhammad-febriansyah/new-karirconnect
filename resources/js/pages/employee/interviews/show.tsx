import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Bot,
    Calendar,
    CalendarClock,
    CheckCircle2,
    Clock,
    ExternalLink,
    HelpCircle,
    Info,
    MapPin,
    Send,
    Timer,
    Trash2,
    Video,
    X,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { TextareaField } from '@/components/form/textarea-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

type RescheduleRequest = {
    id: number;
    status: string;
    reason: string;
    proposed_slots: string[];
    created_at: string | null;
};

type Props = {
    interview: {
        id: number;
        title: string;
        stage: string | null;
        mode: string | null;
        status: string | null;
        scheduled_at: string | null;
        duration_minutes: number;
        timezone: string;
        meeting_url: string | null;
        meeting_passcode: string | null;
        location_name: string | null;
        location_address: string | null;
        location_map_url: string | null;
        candidate_instructions: string | null;
        application_id: number | null;
        scheduled_by: string | null;
        job: { title: string | null; slug: string | null };
        company: { name: string | null; slug: string | null };
        reschedule_requests: RescheduleRequest[];
        my_response: string | null;
    };
};

const MODE_META: Record<string, { label: string; icon: typeof Video; tone: string; description: string }> = {
    online: {
        label: 'Online Meeting',
        icon: Video,
        tone: 'from-brand-blue to-brand-cyan',
        description: 'Wawancara akan dilakukan via video call.',
    },
    onsite: {
        label: 'Onsite Interview',
        icon: MapPin,
        tone: 'from-emerald-500 to-brand-cyan',
        description: 'Wawancara akan dilakukan langsung di kantor.',
    },
    ai: {
        label: 'AI Interview',
        icon: Bot,
        tone: 'from-violet-500 to-brand-blue',
        description: 'Wawancara otomatis dengan AI — bisa dilakukan kapan saja.',
    },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
    scheduled: { label: 'Terjadwal', className: 'border-blue-500/30 bg-blue-500/10 text-blue-700' },
    rescheduled: { label: 'Reschedule', className: 'border-amber-500/30 bg-amber-500/10 text-amber-700' },
    ongoing: { label: 'Berlangsung', className: 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue' },
    completed: { label: 'Selesai', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' },
    cancelled: { label: 'Dibatalkan', className: 'border-rose-500/30 bg-rose-500/10 text-rose-700' },
    no_show: { label: 'No-show', className: 'border-rose-500/30 bg-rose-500/10 text-rose-700' },
    expired: { label: 'Kadaluarsa', className: 'border-slate-500/30 bg-slate-500/10 text-slate-700' },
};

function useCountdown(target: string | null) {
    const [now, setNow] = useState<number>(() => Date.now());
    useEffect(() => {
        if (!target) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [target]);

    return useMemo(() => {
        if (!target) return null;
        const diff = new Date(target).getTime() - now;
        const isPast = diff < 0;
        const abs = Math.abs(diff);
        const days = Math.floor(abs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((abs % (1000 * 60)) / 1000);
        return { isPast, days, hours, minutes, seconds, totalMs: diff };
    }, [target, now]);
}

export default function EmployeeInterviewShow({ interview }: Props) {
    const [showReschedule, setShowReschedule] = useState(false);
    const reschedule = useForm({
        reason: '',
        proposed_slots: ['', ''] as string[],
    });

    const handleResponse = (response: 'accepted' | 'declined' | 'tentative') => {
        router.post(`/employee/interviews/${interview.id}/respond`, { response }, { preserveScroll: true });
    };

    const handleReschedule = (e: FormEvent) => {
        e.preventDefault();
        reschedule.post(`/employee/interviews/${interview.id}/reschedule`, {
            preserveScroll: true,
            onSuccess: () => {
                reschedule.reset();
                setShowReschedule(false);
            },
        });
    };

    const addSlot = () => {
        if (reschedule.data.proposed_slots.length >= 5) return;
        reschedule.setData('proposed_slots', [...reschedule.data.proposed_slots, '']);
    };

    const removeSlot = (idx: number) => {
        if (reschedule.data.proposed_slots.length <= 1) return;
        reschedule.setData(
            'proposed_slots',
            reschedule.data.proposed_slots.filter((_, i) => i !== idx),
        );
    };

    const mode = MODE_META[interview.mode ?? ''] ?? MODE_META.online;
    const status = STATUS_META[interview.status ?? ''] ?? { label: formatStatus(interview.status) ?? '-', className: 'border-slate-500/30 bg-slate-500/10 text-slate-700' };
    const countdown = useCountdown(interview.scheduled_at);
    const ModeIcon = mode.icon;

    const hasResponded = interview.my_response && interview.my_response !== 'pending';
    const isPastInterview = countdown?.isPast ?? false;
    const canTakeAction =
        !hasResponded &&
        !isPastInterview &&
        ['scheduled', 'rescheduled'].includes(interview.status ?? '');

    return (
        <>
            <Head title={interview.title} />

            <div className="space-y-5 p-4 sm:p-6">
                {/* ===== Hero ===== */}
                <Card className="relative overflow-hidden border-brand-blue/15">
                    <div
                        aria-hidden
                        className={cn(
                            'pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r opacity-15',
                            mode.tone,
                        )}
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-cyan/15 blur-3xl"
                    />
                    <CardContent className="relative space-y-5 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <div
                                className={cn(
                                    'flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg sm:size-20',
                                    mode.tone,
                                )}
                            >
                                <ModeIcon className="size-7 sm:size-9" />
                            </div>

                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className={cn('font-medium', status.className)}>
                                        <span className="mr-1 inline-block size-1.5 rounded-full bg-current" />
                                        {status.label}
                                    </Badge>
                                    <Badge variant="outline" className="font-medium">
                                        <Timer className="size-3" /> {interview.duration_minutes} mnt
                                    </Badge>
                                    {interview.stage && (
                                        <Badge variant="outline" className="font-medium">
                                            Tahap: {formatStatus(interview.stage)}
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                    {interview.title}
                                </h1>
                                {(interview.company.name || interview.job.title) && (
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                        {interview.company.name && (
                                            <span className="font-medium text-brand-navy">{interview.company.name}</span>
                                        )}
                                        {interview.job.title && interview.job.slug && (
                                            <Link
                                                href={`/jobs/${interview.job.slug}`}
                                                className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                                            >
                                                {interview.job.title}
                                                <ExternalLink className="size-3" />
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Countdown card */}
                        <div className="rounded-xl border border-brand-blue/20 bg-gradient-to-r from-brand-blue/8 via-brand-cyan/8 to-transparent p-4 sm:p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-blue">
                                        <CalendarClock className="size-3.5" /> Jadwal Wawancara
                                    </div>
                                    <div className="mt-1 text-lg font-bold text-brand-navy sm:text-xl">
                                        {interview.scheduled_at ? formatDateTime(interview.scheduled_at) : 'Belum dijadwalkan'}
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        {interview.timezone} · {mode.description}
                                    </div>
                                </div>

                                {countdown && interview.scheduled_at && (
                                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                                        {[
                                            { label: 'Hari', value: countdown.days },
                                            { label: 'Jam', value: countdown.hours },
                                            { label: 'Menit', value: countdown.minutes },
                                            { label: 'Detik', value: countdown.seconds },
                                        ].map((c) => (
                                            <div
                                                key={c.label}
                                                className={cn(
                                                    'flex min-w-[3rem] flex-col items-center rounded-lg border bg-background px-2 py-1.5 sm:min-w-[3.5rem]',
                                                    countdown.isPast
                                                        ? 'border-rose-500/30'
                                                        : 'border-brand-blue/20',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'font-mono text-xl font-bold tabular-nums sm:text-2xl',
                                                        countdown.isPast ? 'text-rose-600' : 'text-brand-blue',
                                                    )}
                                                >
                                                    {String(c.value).padStart(2, '0')}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    {c.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {countdown?.isPast && (
                                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">
                                    <AlertTriangle className="size-3.5" /> Wawancara sudah lewat dari waktu yang dijadwalkan.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ===== Body grid ===== */}
                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-5">
                        {/* Online meeting */}
                        {interview.mode === 'online' && (
                            <Card>
                                <CardContent className="space-y-3 p-5">
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                        <Video className="size-3.5" /> Online Meeting
                                    </h3>
                                    {interview.meeting_url ? (
                                        <>
                                            <Button
                                                asChild
                                                className="bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-sm hover:brightness-105"
                                            >
                                                <a href={interview.meeting_url} target="_blank" rel="noreferrer">
                                                    <Video className="size-4" /> Buka Meeting Link
                                                    <ExternalLink className="size-3.5" />
                                                </a>
                                            </Button>
                                            {interview.meeting_passcode && (
                                                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                                                    <span className="text-xs text-muted-foreground">Passcode:</span>
                                                    <code className="font-mono text-sm font-bold text-brand-navy">
                                                        {interview.meeting_passcode}
                                                    </code>
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                Pastikan kamera & mikrofon berfungsi sebelum sesi dimulai. Bergabunglah 5 menit lebih awal.
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            Link meeting belum tersedia. Tunggu konfirmasi recruiter.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Onsite location */}
                        {interview.mode === 'onsite' && (interview.location_name || interview.location_address) && (
                            <Card>
                                <CardContent className="space-y-3 p-5">
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                        <MapPin className="size-3.5" /> Lokasi Wawancara
                                    </h3>
                                    <div className="space-y-1">
                                        {interview.location_name && (
                                            <div className="font-bold text-brand-navy">{interview.location_name}</div>
                                        )}
                                        {interview.location_address && (
                                            <div className="text-sm leading-relaxed text-muted-foreground">
                                                {interview.location_address}
                                            </div>
                                        )}
                                    </div>
                                    {interview.location_map_url && (
                                        <Button asChild variant="outline" size="sm">
                                            <a href={interview.location_map_url} target="_blank" rel="noreferrer">
                                                <MapPin className="size-4" /> Buka di Google Maps
                                                <ExternalLink className="size-3.5" />
                                            </a>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* AI mode */}
                        {interview.mode === 'ai' && (
                            <Card className="border-violet-500/15 bg-gradient-to-br from-violet-500/5 to-brand-blue/5">
                                <CardContent className="space-y-3 p-5">
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700">
                                        <Bot className="size-3.5" /> AI Interview
                                    </h3>
                                    <p className="text-sm leading-relaxed text-foreground">
                                        Buka tab <strong>AI Interview Otomatis</strong> di dashboard untuk mengikuti sesi.
                                        Pastikan koneksi internet stabil dan ruangan tenang.
                                    </p>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="border-violet-500/30 text-violet-700 hover:bg-violet-500/10"
                                    >
                                        <Link href="/employee/ai-interviews">
                                            <Bot className="size-4" /> Mulai AI Interview
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Instructions */}
                        {interview.candidate_instructions && (
                            <Card>
                                <CardContent className="space-y-2 p-5">
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                        <Info className="size-3.5" /> Instruksi dari Recruiter
                                    </h3>
                                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                                        {interview.candidate_instructions}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Prep checklist */}
                        <Card>
                            <CardContent className="space-y-2 p-5">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    <CheckCircle2 className="size-3.5" /> Checklist Persiapan
                                </h3>
                                <ul className="space-y-2 text-sm text-foreground">
                                    {[
                                        'Pelajari kembali deskripsi lowongan & profil perusahaan.',
                                        'Siapkan 2-3 pertanyaan untuk recruiter.',
                                        interview.mode === 'online'
                                            ? 'Tes kamera, mikrofon, dan koneksi internet 30 menit sebelum mulai.'
                                            : interview.mode === 'onsite'
                                              ? 'Atur perjalanan agar tiba 15 menit lebih awal.'
                                              : 'Atur ruangan tenang dan pencahayaan cukup untuk sesi AI.',
                                        'Siapkan portofolio / hasil kerja yang relevan.',
                                        'Update CV terbaru jika ada perubahan.',
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-2.5">
                                            <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-brand-blue/30 bg-brand-blue/10 text-brand-blue">
                                                <CheckCircle2 className="size-2.5" />
                                            </span>
                                            <span className="text-sm leading-relaxed text-foreground">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Reschedule history */}
                        {interview.reschedule_requests.length > 0 && (
                            <Card>
                                <CardContent className="space-y-3 p-5">
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                        <Clock className="size-3.5" /> Riwayat Permintaan Reschedule
                                    </h3>
                                    <ul className="space-y-2.5">
                                        {interview.reschedule_requests.map((r) => (
                                            <li key={r.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {r.created_at ? formatDateTime(r.created_at) : '-'}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'font-medium',
                                                            r.status === 'approved'
                                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                                                                : r.status === 'rejected'
                                                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-700'
                                                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700',
                                                        )}
                                                    >
                                                        {formatStatus(r.status)}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1.5 text-sm text-foreground">{r.reason}</p>
                                                {r.proposed_slots.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {r.proposed_slots.map((slot) => (
                                                            <Badge
                                                                key={slot}
                                                                variant="outline"
                                                                className="font-mono text-[11px]"
                                                            >
                                                                <Calendar className="size-2.5" /> {formatDateTime(slot)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* ===== Sidebar ===== */}
                    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        {/* Response */}
                        <Card className="overflow-hidden border-brand-blue/15">
                            <div className="bg-gradient-to-r from-brand-blue/8 via-brand-cyan/8 to-transparent px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    <CheckCircle2 className="size-3.5" /> Konfirmasi Kehadiran
                                </div>
                            </div>
                            <CardContent className="space-y-3 p-4">
                                {hasResponded ? (
                                    <div className="space-y-2">
                                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Respons Anda
                                            </div>
                                            <Badge
                                                className={cn(
                                                    'mt-1 font-medium',
                                                    interview.my_response === 'accepted'
                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                                                        : interview.my_response === 'declined'
                                                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-700'
                                                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700',
                                                )}
                                                variant="outline"
                                            >
                                                {interview.my_response === 'accepted'
                                                    ? 'Diterima'
                                                    : interview.my_response === 'declined'
                                                      ? 'Ditolak'
                                                      : 'Tentatif'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Untuk mengubah respons atau usulkan jadwal lain, gunakan "Minta Reschedule".
                                        </p>
                                    </div>
                                ) : canTakeAction ? (
                                    <div className="space-y-2">
                                        <Button
                                            onClick={() => handleResponse('accepted')}
                                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 font-semibold shadow-sm hover:brightness-105"
                                        >
                                            <CheckCircle2 className="size-4" /> Terima Jadwal
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleResponse('tentative')}
                                            className="w-full"
                                        >
                                            <HelpCircle className="size-4" /> Mungkin Bisa
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleResponse('declined')}
                                            className="w-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                                        >
                                            <X className="size-4" /> Tolak
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Status saat ini tidak memerlukan konfirmasi.
                                    </p>
                                )}

                                {!hasResponded && canTakeAction && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-brand-blue hover:bg-brand-blue/8"
                                        onClick={() => setShowReschedule((s) => !s)}
                                    >
                                        <CalendarClock className="size-4" />
                                        {showReschedule ? 'Tutup form reschedule' : 'Minta Reschedule'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Reschedule form */}
                        {showReschedule && (
                            <Card>
                                <CardContent className="space-y-3 p-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                                        Usulkan Slot Baru
                                    </h3>
                                    <form onSubmit={handleReschedule} className="space-y-3">
                                        <TextareaField
                                            label="Alasan"
                                            required
                                            rows={3}
                                            placeholder="Mis: Bentrok dengan jadwal lain, sakit, dll."
                                            value={reschedule.data.reason}
                                            onChange={(e) => reschedule.setData('reason', e.target.value)}
                                            error={reschedule.errors.reason}
                                        />
                                        <div className="space-y-2">
                                            {reschedule.data.proposed_slots.map((slot, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <Label className="flex items-center justify-between text-xs">
                                                        <span>Slot #{idx + 1}</span>
                                                        {reschedule.data.proposed_slots.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSlot(idx)}
                                                                className="text-rose-500 hover:text-rose-700"
                                                            >
                                                                <Trash2 className="size-3" />
                                                            </button>
                                                        )}
                                                    </Label>
                                                    <Input
                                                        type="datetime-local"
                                                        value={slot}
                                                        onChange={(e) => {
                                                            const next = [...reschedule.data.proposed_slots];
                                                            next[idx] = e.target.value;
                                                            reschedule.setData('proposed_slots', next);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                            {reschedule.data.proposed_slots.length < 5 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={addSlot}
                                                    className="w-full text-brand-blue hover:bg-brand-blue/8"
                                                >
                                                    + Tambah slot
                                                </Button>
                                            )}
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-sm hover:brightness-105"
                                            disabled={reschedule.processing}
                                        >
                                            <Send className="size-4" /> Kirim Permintaan
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Detail */}
                        <Card>
                            <CardContent className="space-y-2.5 p-4 text-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    Detail Interview
                                </h3>
                                <DetailRow icon={Calendar} label="Mode" value={mode.label} />
                                <DetailRow icon={Timer} label="Durasi" value={`${interview.duration_minutes} menit`} />
                                <DetailRow icon={Clock} label="Zona Waktu" value={interview.timezone} />
                                {interview.scheduled_by && (
                                    <DetailRow icon={Info} label="Dijadwalkan oleh" value={interview.scheduled_by} />
                                )}
                            </CardContent>
                        </Card>

                        {/* Cross-link to application */}
                        {interview.application_id && (
                            <Card>
                                <CardContent className="p-4">
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Link href={`/employee/applications/${interview.application_id}`}>
                                            <ExternalLink className="size-3.5" /> Lihat Lamaran Terkait
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Video; label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5" /> {label}
            </span>
            <span className="text-right font-medium text-brand-navy">{value}</span>
        </div>
    );
}
