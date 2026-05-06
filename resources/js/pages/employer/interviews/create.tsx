import { Head, Link, router, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    ArrowLeft,
    Bot,
    Briefcase,
    CalendarIcon,
    Check,
    Clock,
    Info,
    Layers,
    Link as LinkIcon,
    Loader2,
    MapPin,
    MessageSquare,
    Save,
    Search,
    User as UserIcon,
    Users,
    Video,
    X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { InputField } from '@/components/form/input-field';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { TextareaField } from '@/components/form/textarea-field';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string };

type ApplicationItem = {
    id: number;
    candidate_name: string | null;
    candidate_email: string | null;
    candidate_avatar_url: string | null;
    job_id: number | null;
    job_title: string | null;
    status: string | null;
};

type AiTemplate = {
    id: number;
    name: string;
    mode: string;
    language: string;
    duration_minutes: number;
    question_count: number;
    questions_count: number;
    job_id: number | null;
    is_default: boolean;
    has_questions: boolean;
};

type Props = {
    applications: ApplicationItem[];
    preselectedIds: number[];
    options: {
        stages: Option[];
        modes: Option[];
        team: Option[];
        aiTemplates: AiTemplate[];
    };
    preset?: {
        mode?: string | null;
    };
};

const MODE_DESCRIPTION: Record<string, string> = {
    ai: 'Kandidat mengikuti wawancara berbasis AI di waktu yang fleksibel.',
    online: 'Video call lewat Google Meet, Zoom, atau platform lain.',
    onsite: 'Datang langsung ke kantor atau lokasi yang ditentukan.',
};

const MODE_ICON: Record<string, typeof Bot> = {
    ai: Bot,
    online: Video,
    onsite: MapPin,
};

const TIMEZONES = [
    { value: 'Asia/Jakarta', label: 'WIB · Jakarta' },
    { value: 'Asia/Makassar', label: 'WITA · Makassar' },
    { value: 'Asia/Jayapura', label: 'WIT · Jayapura' },
];

export default function InterviewCreate({ applications, preselectedIds, options, preset }: Props) {
    const [selectedIds, setSelectedIds] = useState<number[]>(preselectedIds);
    const [search, setSearch] = useState('');

    // Auto-derive job filter from the preselected applicant. If the URL preset a
    // candidate, narrow the list to that job by default — recruiter can switch
    // back to "all" via the dropdown.
    const initialJobFilter = useMemo(() => {
        if (preselectedIds.length === 0) return 'all';
        const first = applications.find((a) => a.id === preselectedIds[0]);
        return first?.job_id != null ? String(first.job_id) : 'all';
    }, [applications, preselectedIds]);

    const [jobFilter, setJobFilter] = useState<string>(initialJobFilter);

    // Unique jobs derived from applications list — for the dropdown.
    const jobOptions = useMemo(() => {
        const seen = new Map<number, string>();
        applications.forEach((a) => {
            if (a.job_id != null && a.job_title && !seen.has(a.job_id)) {
                seen.set(a.job_id, a.job_title);
            }
        });
        return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
    }, [applications]);

    const form = useForm({
        stage: 'hr',
        mode: preset?.mode ?? 'online',
        title: '',
        scheduled_at: '',
        duration_minutes: 60,
        gap_minutes: 5,
        group_mode: false,
        timezone: 'Asia/Jakarta',
        candidate_instructions: '',
        internal_notes: '',
        requires_confirmation: true,
        meeting_url: '',
        meeting_passcode: '',
        location_name: '',
        location_address: '',
        location_map_url: '',
        ai_template_id: null as number | null,
    });

    const filteredApplications = useMemo(() => {
        const q = search.trim().toLowerCase();
        return applications.filter((a) => {
            // Always keep already-selected items visible so user doesn't lose them
            // when narrowing the filter.
            if (selectedIds.includes(a.id)) return true;

            if (jobFilter !== 'all' && String(a.job_id ?? '') !== jobFilter) return false;
            if (!q) return true;
            return (
                (a.candidate_name ?? '').toLowerCase().includes(q)
                || (a.candidate_email ?? '').toLowerCase().includes(q)
                || (a.job_title ?? '').toLowerCase().includes(q)
            );
        });
    }, [applications, search, jobFilter, selectedIds]);

    const selectedApps = useMemo(
        () => applications.filter((a) => selectedIds.includes(a.id)),
        [applications, selectedIds],
    );

    const isBulk = selectedIds.length > 1;

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (selectedIds.length === 0) return;

        if (isBulk) {
            router.post(
                '/employer/interviews/bulk',
                {
                    application_ids: selectedIds,
                    stage: form.data.stage,
                    mode: form.data.mode,
                    title: form.data.title,
                    start_at: form.data.scheduled_at,
                    duration_minutes: form.data.duration_minutes,
                    gap_minutes: form.data.gap_minutes,
                    group_mode: form.data.group_mode,
                    timezone: form.data.timezone,
                    candidate_instructions: form.data.candidate_instructions,
                    internal_notes: form.data.internal_notes,
                    requires_confirmation: form.data.requires_confirmation,
                    meeting_url: form.data.meeting_url,
                    meeting_passcode: form.data.meeting_passcode,
                    location_name: form.data.location_name,
                    location_address: form.data.location_address,
                    location_map_url: form.data.location_map_url,
                    ai_template_id: form.data.ai_template_id,
                },
                {
                    onError: (errors) => {
                        Object.entries(errors).forEach(([k, v]) =>
                            form.setError(k as keyof typeof form.data, String(v)),
                        );
                    },
                },
            );
            return;
        }

        // Single — use existing single-store endpoint.
        router.post(
            '/employer/interviews',
            { ...form.data, application_id: selectedIds[0] },
            {
                onError: (errors) => {
                    Object.entries(errors).forEach(([k, v]) =>
                        form.setError(k as keyof typeof form.data, String(v)),
                    );
                },
            },
        );
    };

    const completion = useMemo(() => {
        const checks = [
            selectedIds.length > 0,
            Boolean(form.data.title.trim()),
            Boolean(form.data.scheduled_at),
            form.data.mode === 'online'
                ? Boolean(form.data.meeting_url.trim())
                : form.data.mode === 'onsite'
                  ? Boolean(form.data.location_address.trim() || form.data.location_name.trim())
                  : true,
        ];
        const done = checks.filter(Boolean).length;
        return Math.round((done / checks.length) * 100);
    }, [form.data, selectedIds]);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    return (
        <>
            <Head title="Jadwalkan Interview" />

            <div className="space-y-5 p-3 pb-24 sm:p-5 lg:p-6 lg:pb-6">
                {/* ===== Header ===== */}
                <div className="flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <Link
                            href="/employer/interviews"
                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-blue"
                        >
                            <ArrowLeft className="size-3" /> Kembali ke Jadwal Interview
                        </Link>
                        <h1 className="mt-1 text-xl font-bold tracking-tight text-brand-navy sm:text-2xl lg:text-3xl">
                            Jadwalkan Interview
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Pilih satu atau beberapa kandidat sekaligus untuk dijadwalkan.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-end">
                        {isBulk && (
                            <Badge variant="default" className="gap-1 bg-brand-blue">
                                <Layers className="size-3" /> Bulk · {selectedIds.length}
                            </Badge>
                        )}
                        <Badge variant="secondary">{completion}% lengkap</Badge>
                    </div>
                </div>

                <form
                    id="schedule-interview-form"
                    onSubmit={onSubmit}
                    className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[minmax(0,1fr)_360px]"
                >
                    {/* ===== Main column ===== */}
                    <div className="min-w-0 space-y-5">
                        {/* Candidate picker */}
                        <FormCard
                            icon={Users}
                            title="Pilih Kandidat"
                            description="Pilih satu atau beberapa pelamar untuk dijadwalkan sekaligus."
                            badge={selectedIds.length > 0 ? `${selectedIds.length} terpilih` : undefined}
                        >
                            {applications.length === 0 ? (
                                <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                                    <Info className="mt-0.5 size-4 shrink-0" />
                                    <p>
                                        Belum ada pelamar aktif. Lamaran yang sudah ditolak / mundur / hired tidak
                                        muncul di sini.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Selected pills */}
                                    {selectedApps.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 rounded-lg border border-brand-blue/15 bg-brand-blue/5 p-2">
                                            {selectedApps.map((app) => (
                                                <SelectedPill
                                                    key={app.id}
                                                    name={app.candidate_name ?? '—'}
                                                    onRemove={() => toggleSelect(app.id)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Filter + search */}
                                    <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                                        <Select value={jobFilter} onValueChange={setJobFilter}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Filter lowongan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    Semua Lowongan ({applications.length})
                                                </SelectItem>
                                                {jobOptions.map((j) => (
                                                    <SelectItem key={j.id} value={String(j.id)}>
                                                        {j.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                                            <Input
                                                type="search"
                                                placeholder="Cari nama atau email…"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="h-9 pl-9"
                                            />
                                        </div>
                                    </div>

                                    {jobFilter !== 'all' && (
                                        <button
                                            type="button"
                                            onClick={() => setJobFilter('all')}
                                            className="inline-flex items-center gap-1.5 self-start rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-[11px] font-medium text-brand-blue hover:bg-brand-blue/10"
                                        >
                                            <Briefcase className="size-3" />
                                            Filter:{' '}
                                            {jobOptions.find((j) => String(j.id) === jobFilter)?.title}
                                            <X className="size-3" />
                                        </button>
                                    )}

                                    <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-muted/10 p-1.5">
                                        {filteredApplications.length === 0 ? (
                                            <p className="p-4 text-center text-xs text-muted-foreground">
                                                Tidak ada hasil.
                                            </p>
                                        ) : (
                                            filteredApplications.map((app) => (
                                                <CandidateRow
                                                    key={app.id}
                                                    app={app}
                                                    selected={selectedIds.includes(app.id)}
                                                    onToggle={() => toggleSelect(app.id)}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </FormCard>

                        {/* Mode selector */}
                        <FormCard icon={Bot} title="Mode Interview" description="Pilih cara wawancara dilakukan.">
                            <div className="grid gap-2.5 sm:grid-cols-3">
                                {options.modes.map((mode) => {
                                    const checked = form.data.mode === mode.value;
                                    const Icon = MODE_ICON[mode.value] ?? Bot;
                                    return (
                                        <button
                                            type="button"
                                            key={mode.value}
                                            onClick={() => form.setData('mode', mode.value)}
                                            className={cn(
                                                'group flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all sm:p-4',
                                                checked
                                                    ? 'border-brand-blue/50 bg-brand-blue/5 ring-1 ring-brand-blue/15'
                                                    : 'border-border/60 hover:border-brand-blue/30 hover:bg-muted/30',
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'flex size-8 items-center justify-center rounded-lg',
                                                        checked
                                                            ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white'
                                                            : 'bg-muted text-foreground/70',
                                                    )}
                                                >
                                                    <Icon className="size-4" />
                                                </span>
                                                <span
                                                    className={cn(
                                                        'text-sm font-semibold',
                                                        checked ? 'text-brand-blue' : 'text-brand-navy',
                                                    )}
                                                >
                                                    {mode.label}
                                                </span>
                                                {checked && <Check className="ml-auto size-4 text-brand-blue" />}
                                            </div>
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                {MODE_DESCRIPTION[mode.value] ?? ''}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </FormCard>

                        {/* AI template picker — only when mode=ai */}
                        {form.data.mode === 'ai' && (
                            <AiTemplatePicker
                                templates={options.aiTemplates}
                                selectedId={form.data.ai_template_id}
                                onSelect={(id) => form.setData('ai_template_id', id)}
                                error={(form.errors as Record<string, string>).ai_template_id}
                                jobIdFilter={
                                    selectedApps.length > 0 && selectedApps[0].job_id != null
                                        ? selectedApps[0].job_id
                                        : null
                                }
                            />
                        )}

                        {/* Detail */}
                        <FormCard
                            icon={CalendarIcon}
                            title="Detail Jadwal"
                            description="Judul, tahap, waktu, dan durasi interview."
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <InputField
                                        label="Judul"
                                        required
                                        placeholder="Contoh: Interview HR Performance Marketing"
                                        value={form.data.title}
                                        onChange={(e) => form.setData('title', e.target.value)}
                                        error={form.errors.title}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Tahap</Label>
                                    <Select value={form.data.stage} onValueChange={(v) => form.setData('stage', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih tahap interview" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.stages.map((s) => (
                                                <SelectItem key={s.value} value={s.value}>
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">
                                        Durasi <span className="font-normal text-muted-foreground">(menit)</span>
                                    </Label>
                                    <Select
                                        value={String(form.data.duration_minutes)}
                                        onValueChange={(v) => form.setData('duration_minutes', Number(v))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[15, 30, 45, 60, 75, 90, 120].map((m) => (
                                                <SelectItem key={m} value={String(m)}>
                                                    {m} menit
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="md:col-span-2">
                                    <DateTimePicker
                                        label={isBulk ? 'Mulai (kandidat pertama)' : 'Tanggal & Waktu'}
                                        required
                                        value={form.data.scheduled_at}
                                        onChange={(v) => form.setData('scheduled_at', v)}
                                        error={form.errors.scheduled_at}
                                    />
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs font-semibold">Zona Waktu</Label>
                                    <Select
                                        value={form.data.timezone}
                                        onValueChange={(v) => form.setData('timezone', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIMEZONES.map((tz) => (
                                                <SelectItem key={tz.value} value={tz.value}>
                                                    {tz.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </FormCard>

                        {/* Bulk options */}
                        {isBulk && (
                            <FormCard
                                icon={Layers}
                                title="Opsi Bulk"
                                description="Atur penjadwalan untuk beberapa kandidat sekaligus."
                            >
                                <div className="space-y-4">
                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30">
                                        <Switch
                                            checked={form.data.group_mode}
                                            onCheckedChange={(v) => form.setData('group_mode', Boolean(v))}
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-brand-navy">
                                                Group Mode
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {form.data.group_mode
                                                    ? 'Semua kandidat akan dijadwalkan di slot waktu yang sama (mis. group interview).'
                                                    : 'Sequential: setiap kandidat mendapat slot berbeda dengan jeda di antara mereka.'}
                                            </p>
                                        </div>
                                    </label>

                                    {!form.data.group_mode && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">
                                                Jeda antar slot{' '}
                                                <span className="font-normal text-muted-foreground">(menit)</span>
                                            </Label>
                                            <Select
                                                value={String(form.data.gap_minutes)}
                                                onValueChange={(v) => form.setData('gap_minutes', Number(v))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[0, 5, 10, 15, 30, 60].map((m) => (
                                                        <SelectItem key={m} value={String(m)}>
                                                            {m === 0 ? 'Tanpa jeda' : `${m} menit`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </FormCard>
                        )}

                        {/* Mode-specific details */}
                        {form.data.mode === 'online' && (
                            <FormCard
                                icon={Video}
                                title="Detail Online Meeting"
                                description="Tempelkan link meeting (Google Meet, Zoom, dll) yang sudah Anda buat."
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <InputField
                                            label="Meeting URL"
                                            required
                                            placeholder="https://meet.google.com/abc-defg-hij"
                                            value={form.data.meeting_url}
                                            onChange={(e) => form.setData('meeting_url', e.target.value)}
                                            error={form.errors.meeting_url}
                                            description="Buat ruang meeting di Google Meet / Zoom dulu, lalu salin URL-nya ke sini."
                                        />
                                    </div>
                                    <InputField
                                        label="Passcode"
                                        placeholder="Opsional"
                                        value={form.data.meeting_passcode}
                                        onChange={(e) => form.setData('meeting_passcode', e.target.value)}
                                    />
                                </div>
                            </FormCard>
                        )}

                        {form.data.mode === 'onsite' && (
                            <FormCard
                                icon={MapPin}
                                title="Detail Lokasi"
                                description="Alamat lengkap dan link map untuk memudahkan kandidat."
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <InputField
                                        label="Nama Lokasi"
                                        placeholder="Kantor Pusat / Co-working"
                                        value={form.data.location_name}
                                        onChange={(e) => form.setData('location_name', e.target.value)}
                                        error={form.errors.location_name}
                                    />
                                    <InputField
                                        label="Google Maps URL"
                                        placeholder="https://maps.google.com/..."
                                        value={form.data.location_map_url}
                                        onChange={(e) => form.setData('location_map_url', e.target.value)}
                                    />
                                    <div className="md:col-span-2">
                                        <TextareaField
                                            label="Alamat Lengkap"
                                            rows={3}
                                            placeholder="Jl. Sudirman No. 1, Lt. 5, Jakarta Pusat 10220"
                                            value={form.data.location_address}
                                            onChange={(e) => form.setData('location_address', e.target.value)}
                                            error={form.errors.location_address}
                                        />
                                    </div>
                                </div>
                            </FormCard>
                        )}

                        {form.data.mode === 'ai' && (
                            <FormCard
                                icon={Bot}
                                title="AI Interview"
                                description="Kandidat akan menjalani wawancara otomatis berbasis AI sesuai jadwal."
                            >
                                <div className="flex items-start gap-3 rounded-lg border border-brand-blue/15 bg-brand-blue/5 p-3 text-xs text-brand-navy">
                                    <Info className="mt-0.5 size-4 shrink-0 text-brand-blue" />
                                    <p className="leading-relaxed">
                                        Tidak perlu link meeting. Sistem akan mengirim invitation berisi tautan unik ke
                                        kandidat untuk memulai sesi AI Interview di waktu yang dijadwalkan.
                                    </p>
                                </div>
                            </FormCard>
                        )}

                        {/* Messaging */}
                        <FormCard
                            icon={MessageSquare}
                            title="Pesan untuk Kandidat"
                            badge="Opsional"
                            description="Instruksi yang dikirim bersama undangan."
                        >
                            <RichTextEditor
                                placeholder="Persiapan, dress code, dokumen yang dibawa…"
                                value={form.data.candidate_instructions}
                                onChange={(html) => form.setData('candidate_instructions', html)}
                                error={form.errors.candidate_instructions}
                            />
                        </FormCard>

                        <FormCard
                            icon={UserIcon}
                            title="Catatan Internal"
                            badge="Opsional"
                            description="Hanya terlihat oleh tim recruiter, tidak dikirim ke kandidat."
                        >
                            <TextareaField
                                rows={3}
                                placeholder="Hal-hal yang perlu diingat tim internal…"
                                value={form.data.internal_notes}
                                onChange={(e) => form.setData('internal_notes', e.target.value)}
                                error={form.errors.internal_notes}
                            />
                        </FormCard>
                    </div>

                    {/* ===== Sidebar ===== */}
                    <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
                        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-brand-navy">Ringkasan</h3>
                                <Badge variant="secondary" className="text-[10px]">
                                    {completion}%
                                </Badge>
                            </div>
                            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan transition-all"
                                    style={{ width: `${completion}%` }}
                                />
                            </div>

                            <ul className="space-y-2 text-xs">
                                <ChecklistItem
                                    done={selectedIds.length > 0}
                                    label={
                                        selectedIds.length === 0
                                            ? 'Pilih kandidat'
                                            : selectedIds.length === 1
                                              ? '1 kandidat'
                                              : `${selectedIds.length} kandidat (bulk)`
                                    }
                                />
                                <ChecklistItem done={Boolean(form.data.title.trim())} label="Judul" />
                                <ChecklistItem
                                    done={Boolean(form.data.scheduled_at)}
                                    label="Tanggal & waktu"
                                />
                                <ChecklistItem
                                    done={
                                        form.data.mode === 'online'
                                            ? Boolean(form.data.meeting_url.trim())
                                            : form.data.mode === 'onsite'
                                              ? Boolean(
                                                    form.data.location_address.trim()
                                                        || form.data.location_name.trim(),
                                                )
                                              : true
                                    }
                                    label={
                                        form.data.mode === 'online'
                                            ? 'Meeting URL'
                                            : form.data.mode === 'onsite'
                                              ? 'Detail lokasi'
                                              : 'AI Interview siap'
                                    }
                                />
                            </ul>

                            <Button
                                type="submit"
                                disabled={form.processing || selectedIds.length === 0}
                                size="lg"
                                className="mt-5 hidden h-11 w-full rounded-xl bg-brand-blue hover:bg-brand-blue/90 lg:flex"
                            >
                                {form.processing ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Save className="size-4" />
                                )}
                                {isBulk ? `Simpan Bulk (${selectedIds.length})` : 'Simpan Jadwal'}
                            </Button>
                            <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="mt-1.5 hidden h-9 w-full lg:flex"
                            >
                                <Link href="/employer/interviews">Batal</Link>
                            </Button>
                        </div>

                        {/* Mini-preview */}
                        {(form.data.title || form.data.scheduled_at) && (
                            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <CalendarIcon className="size-4" />
                                    </span>
                                    <h3 className="text-sm font-bold text-brand-navy">Preview Undangan</h3>
                                </div>
                                <div className="mt-3 space-y-1.5 text-xs">
                                    {form.data.title && (
                                        <p className="break-words font-semibold text-brand-navy">{form.data.title}</p>
                                    )}
                                    {form.data.scheduled_at && (
                                        <p className="flex items-center gap-1.5 text-muted-foreground">
                                            <Clock className="size-3.5 shrink-0" />
                                            {formatScheduleLabel(form.data.scheduled_at)} · {form.data.duration_minutes}{' '}
                                            menit
                                        </p>
                                    )}
                                    {form.data.mode && (
                                        <p className="flex items-center gap-1.5 text-muted-foreground">
                                            <Briefcase className="size-3.5 shrink-0" />
                                            {options.modes.find((m) => m.value === form.data.mode)?.label}
                                        </p>
                                    )}
                                    {form.data.mode === 'online' && form.data.meeting_url && (
                                        <p className="flex min-w-0 items-center gap-1.5 text-brand-blue">
                                            <LinkIcon className="size-3.5 shrink-0" />
                                            <span className="truncate">{form.data.meeting_url}</span>
                                        </p>
                                    )}
                                    {form.data.mode === 'onsite'
                                        && (form.data.location_address || form.data.location_name) && (
                                            <p className="flex min-w-0 items-start gap-1.5 text-muted-foreground">
                                                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                                                <span className="break-words">
                                                    {[form.data.location_name, form.data.location_address]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </span>
                                            </p>
                                        )}
                                    {isBulk && (
                                        <p className="flex items-center gap-1.5 text-muted-foreground">
                                            <Users className="size-3.5 shrink-0" />
                                            {form.data.group_mode
                                                ? `${selectedIds.length} kandidat di slot yang sama`
                                                : `${selectedIds.length} kandidat sekuensial · jeda ${form.data.gap_minutes} menit`}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </aside>
                </form>

                {/* Mobile sticky submit bar */}
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-3 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
                    <div className="mx-auto flex max-w-3xl items-center gap-2">
                        <Button asChild variant="outline" className="h-11 flex-1 rounded-xl">
                            <Link href="/employer/interviews">Batal</Link>
                        </Button>
                        <Button
                            type="submit"
                            form="schedule-interview-form"
                            disabled={form.processing || selectedIds.length === 0}
                            className="h-11 flex-[2] rounded-xl bg-brand-blue hover:bg-brand-blue/90"
                        >
                            {form.processing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            {isBulk ? `Simpan (${selectedIds.length})` : 'Simpan Jadwal'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

function CandidateRow({
    app,
    selected,
    onToggle,
}: {
    app: ApplicationItem;
    selected: boolean;
    onToggle: () => void;
}) {
    const getInitials = useInitials();
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',
                selected ? 'bg-brand-blue/10 ring-1 ring-brand-blue/20' : 'hover:bg-background',
            )}
        >
            <span
                className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border',
                    selected
                        ? 'border-brand-blue bg-brand-blue text-white'
                        : 'border-border/60 bg-background',
                )}
            >
                {selected && <Check className="size-3" />}
            </span>
            <Avatar className="size-9 shrink-0 rounded-lg">
                {app.candidate_avatar_url && (
                    <AvatarImage src={app.candidate_avatar_url} alt={app.candidate_name ?? ''} />
                )}
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan text-[10px] font-bold text-white">
                    {getInitials(app.candidate_name ?? '?')}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-navy">
                    {app.candidate_name ?? 'Kandidat'}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    {app.job_title && (
                        <span className="inline-flex items-center gap-1">
                            <Briefcase className="size-3" /> {app.job_title}
                        </span>
                    )}
                    {app.candidate_email && <span className="truncate">{app.candidate_email}</span>}
                </div>
            </div>
            {app.status && (
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                    {app.status.replace('_', ' ')}
                </Badge>
            )}
        </button>
    );
}

function SelectedPill({ name, onRemove }: { name: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-xs font-medium text-brand-navy ring-1 ring-brand-blue/20">
            {name}
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Hapus ${name}`}
                className="text-muted-foreground hover:text-destructive"
            >
                <X className="size-3" />
            </button>
        </span>
    );
}

function DateTimePicker({
    label,
    required,
    value,
    onChange,
    error,
}: {
    label: string;
    required?: boolean;
    value: string;
    onChange: (next: string) => void;
    error?: string;
}) {
    const [open, setOpen] = useState(false);
    const parsed = parseScheduledAt(value);
    const date = parsed?.date;
    const time = parsed?.time ?? '09:00';

    const emit = (nextDate: Date | undefined, nextTime: string) => {
        if (!nextDate) {
            onChange('');
            return;
        }
        onChange(`${format(nextDate, 'yyyy-MM-dd')}T${nextTime}`);
    };

    const display = date
        ? `${format(date, 'EEEE, d MMM yyyy', { locale: idLocale })} · ${time}`
        : null;

    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
                {label}
                {required && <span className="ml-0.5 text-destructive">*</span>}
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition-colors hover:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20',
                            !display && 'text-muted-foreground',
                            error && 'border-destructive',
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <CalendarIcon className="size-4 shrink-0 text-brand-blue" />
                            <span className="truncate">{display ?? 'Pilih tanggal & waktu'}</span>
                        </span>
                        <Clock className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-auto max-w-[calc(100vw-1.5rem)] overflow-hidden p-0"
                >
                    <Calendar
                        mode="single"
                        locale={idLocale}
                        selected={date}
                        defaultMonth={date}
                        onSelect={(d) => emit(d, time)}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        captionLayout="dropdown"
                        className="border-b"
                    />
                    <div className="flex items-center gap-2 p-3">
                        <Clock className="size-4 shrink-0 text-muted-foreground" />
                        <Input
                            type="time"
                            value={time}
                            step={300}
                            onChange={(e) => emit(date ?? new Date(), e.target.value)}
                            className="h-9 flex-1"
                        />
                        <Button
                            type="button"
                            size="sm"
                            className="h-9 shrink-0"
                            onClick={() => setOpen(false)}
                        >
                            Selesai
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

function FormCard({
    icon: Icon,
    title,
    description,
    badge,
    children,
}: {
    icon: typeof Bot;
    title: string;
    description?: string;
    badge?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
            <header className="flex items-start gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                    <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold tracking-tight text-brand-navy">{title}</h2>
                        {badge && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
                                {badge}
                            </Badge>
                        )}
                    </div>
                    {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
                </div>
            </header>
            <div className="p-4 sm:p-5">{children}</div>
        </section>
    );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
    return (
        <li className="flex items-center gap-2">
            <span
                className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-emerald-500 text-white' : 'border border-border/60 bg-background',
                )}
            >
                {done && <Check className="size-3" />}
            </span>
            <span className={cn('flex-1 break-words', done ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
            </span>
        </li>
    );
}

function parseScheduledAt(value: string): { date: Date; time: string } | null {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
    if (!match) return null;
    const [, ymd, hm] = match;
    const [y, m, d] = ymd.split('-').map(Number);
    return { date: new Date(y, m - 1, d), time: hm };
}

function formatScheduleLabel(value: string): string {
    const parsed = parseScheduledAt(value);
    if (!parsed) return value;
    return `${format(parsed.date, 'EEE, d MMM yyyy', { locale: idLocale })} ${parsed.time}`;
}

function AiTemplatePicker({
    templates,
    selectedId,
    onSelect,
    error,
    jobIdFilter,
}: {
    templates: AiTemplate[];
    selectedId: number | null;
    onSelect: (id: number | null) => void;
    error?: string;
    jobIdFilter: number | null;
}) {
    const usable = templates.filter((t) => t.has_questions);
    const empty = templates.filter((t) => !t.has_questions);
    const selected = templates.find((t) => t.id === selectedId) ?? null;

    // Soft preference: if the selected applicant's job has a matching template,
    // surface those first — but the recruiter can still pick any.
    const sorted = [...usable].sort((a, b) => {
        const aPref = jobIdFilter != null && a.job_id === jobIdFilter ? 0 : 1;
        const bPref = jobIdFilter != null && b.job_id === jobIdFilter ? 0 : 1;
        if (aPref !== bPref) return aPref - bPref;
        return a.name.localeCompare(b.name);
    });

    if (templates.length === 0) {
        return (
            <FormCard icon={Bot} title="Template AI Interview" description="Wajib ada template berisi bank pertanyaan sebelum lanjut.">
                <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900">
                    <p className="font-semibold">Belum ada template AI Interview.</p>
                    <p className="mt-1 text-amber-800">
                        Buat template + tulis bank pertanyaan dulu di halaman Template AI Interview, lalu kembali ke sini.
                    </p>
                    <Button asChild className="mt-3" size="sm">
                        <Link href="/employer/ai-interview-templates">Buat Template Sekarang</Link>
                    </Button>
                </div>
            </FormCard>
        );
    }

    return (
        <FormCard
            icon={Bot}
            title="Template AI Interview"
            description="Pilih template — pertanyaan di template ini akan diajukan ke kandidat."
            badge={selected ? selected.mode === 'voice' ? 'Voice AI' : 'Mode Teks' : undefined}
        >
            <div className="space-y-3">
                {sorted.length === 0 ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-sm text-amber-900">
                        Semua template belum punya pertanyaan. Tambahkan minimal 1 pertanyaan di Template AI Interview.
                        <Button asChild variant="outline" size="sm" className="mt-2">
                            <Link href="/employer/ai-interview-templates">Buka Template</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                        {sorted.map((t) => {
                            const checked = selectedId === t.id;
                            const matchJob = jobIdFilter != null && t.job_id === jobIdFilter;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => onSelect(t.id)}
                                    className={cn(
                                        'relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition',
                                        checked
                                            ? 'border-brand-blue/50 bg-brand-blue/5 ring-1 ring-brand-blue/20'
                                            : 'border-border/60 hover:border-brand-blue/30 hover:bg-muted/30',
                                    )}
                                >
                                    <div className="flex w-full items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span
                                                className={cn(
                                                    'flex size-7 shrink-0 items-center justify-center rounded-lg',
                                                    t.mode === 'voice'
                                                        ? 'bg-violet-100 text-violet-700'
                                                        : 'bg-sky-100 text-sky-700',
                                                )}
                                            >
                                                <Bot className="size-4" />
                                            </span>
                                            <span className="truncate text-sm font-semibold text-brand-navy">
                                                {t.name}
                                            </span>
                                        </div>
                                        {checked && <Check className="size-4 text-brand-blue" />}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                        <Badge variant="outline" className="h-5 gap-1 px-1.5">
                                            {t.mode === 'voice' ? 'Voice AI' : 'Teks'}
                                        </Badge>
                                        <Badge variant="outline" className="h-5 gap-1 px-1.5">
                                            {t.questions_count} pertanyaan
                                        </Badge>
                                        <Badge variant="outline" className="h-5 gap-1 px-1.5">
                                            {t.duration_minutes} mnt
                                        </Badge>
                                        {t.is_default && (
                                            <Badge className="h-5 gap-1 px-1.5">Default</Badge>
                                        )}
                                        {matchJob && (
                                            <Badge variant="outline" className="h-5 border-emerald-300 bg-emerald-50 px-1.5 text-emerald-700">
                                                Cocok lowongan
                                            </Badge>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {empty.length > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/40 px-3 py-2 text-xs text-amber-800">
                        <Info className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                            {empty.length} template lain belum bisa dipakai karena belum ada pertanyaan.{' '}
                            <Link href="/employer/ai-interview-templates" className="font-medium underline">
                                Lengkapi di sini
                            </Link>
                            .
                        </span>
                    </div>
                )}

                {selected?.mode === 'voice' && (
                    <div className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs text-violet-800">
                        <Info className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                            Mode voice akan diawali dengan sapaan ramah dari AI sebelum masuk ke pertanyaan. Jika mic
                            kandidat bermasalah, mereka bisa beralih ke mode teks otomatis di halaman wawancara.
                        </span>
                    </div>
                )}

                {error && <p className="text-xs text-rose-600">{error}</p>}
            </div>
        </FormCard>
    );
}
