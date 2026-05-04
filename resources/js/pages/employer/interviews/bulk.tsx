import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Bot, CalendarRange, CheckCircle2, Loader2, MapPin, Save, Search, Users, Video } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Option = { value: string; label: string };

type ApplicationRow = {
    id: number;
    candidate_name: string | null;
    candidate_email: string | null;
    candidate_avatar_url: string | null;
    job_id: number | null;
    job_title: string | null;
    status: string | null;
    current_stage: string | null;
};

type Props = {
    applications: ApplicationRow[];
    options: {
        stages: Option[];
        modes: Option[];
        team: Option[];
    };
    preselected_ids: number[];
};

const modeIcon = (mode: string) => {
    switch (mode) {
        case 'ai':
            return <Bot className="size-4" />;
        case 'online':
            return <Video className="size-4" />;
        case 'onsite':
            return <MapPin className="size-4" />;
        default:
            return null;
    }
};

const formatSlot = (date: Date, timezone: string) =>
    new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
    }).format(date);

const initials = (name: string | null) => {
    if (!name) return '?';
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() ?? '')
        .join('');
};

export default function InterviewBulk({ applications, options, preselected_ids }: Props) {
    const [selectedIds, setSelectedIds] = useState<number[]>(preselected_ids ?? []);
    const [search, setSearch] = useState('');
    const [jobFilter, setJobFilter] = useState<string>('all');

    const form = useForm({
        application_ids: preselected_ids ?? ([] as number[]),
        stage: 'hr',
        mode: 'online',
        title: 'Interview',
        start_at: '',
        duration_minutes: 30,
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
        interviewer_ids: [] as number[],
    });

    const fieldErrors = form.errors as Record<string, string | undefined>;

    const jobOptions = useMemo(() => {
        const map = new Map<string, string>();
        applications.forEach((app) => {
            if (app.job_id !== null && app.job_title) {
                map.set(String(app.job_id), app.job_title);
            }
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }, [applications]);

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return applications.filter((app) => {
            if (jobFilter !== 'all' && String(app.job_id ?? '') !== jobFilter) {
                return false;
            }
            if (keyword.length === 0) return true;
            const haystack = [app.candidate_name, app.candidate_email, app.job_title]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(keyword);
        });
    }, [applications, search, jobFilter]);

    const toggleOne = (id: number) => {
        const next = selectedIds.includes(id)
            ? selectedIds.filter((existing) => existing !== id)
            : [...selectedIds, id];
        setSelectedIds(next);
        form.setData('application_ids', next);
    };

    const toggleAllFiltered = () => {
        const filteredIds = filtered.map((app) => app.id);
        const allSelected = filteredIds.every((id) => selectedIds.includes(id));
        const next = allSelected
            ? selectedIds.filter((id) => !filteredIds.includes(id))
            : Array.from(new Set([...selectedIds, ...filteredIds]));
        setSelectedIds(next);
        form.setData('application_ids', next);
    };

    const toggleInterviewer = (userId: number) => {
        const next = form.data.interviewer_ids.includes(userId)
            ? form.data.interviewer_ids.filter((id) => id !== userId)
            : [...form.data.interviewer_ids, userId];
        form.setData('interviewer_ids', next);
    };

    const previewSlots = useMemo(() => {
        if (!form.data.start_at || selectedIds.length === 0) return [];
        const startMs = Date.parse(form.data.start_at);
        if (Number.isNaN(startMs)) return [];

        const slotMinutes = form.data.duration_minutes + form.data.gap_minutes;
        const selectedApps = selectedIds
            .map((id) => applications.find((app) => app.id === id))
            .filter((app): app is ApplicationRow => app !== undefined);

        return selectedApps.map((app, index) => {
            const offsetMinutes = form.data.group_mode ? 0 : index * slotMinutes;
            const slot = new Date(startMs + offsetMinutes * 60 * 1000);
            return {
                application: app,
                slot,
            };
        });
    }, [form.data.start_at, form.data.duration_minutes, form.data.gap_minutes, form.data.group_mode, selectedIds, applications]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/employer/interviews/bulk', {
            preserveScroll: false,
        });
    };

    const allFilteredSelected = filtered.length > 0 && filtered.every((app) => selectedIds.includes(app.id));

    return (
        <>
            <Head title="Jadwalkan Interview Serentak" />

            <form onSubmit={submit} className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Jadwalkan Interview Serentak"
                    description="Pilih beberapa kandidat lalu set jadwal sekaligus. Bisa slot beruntun atau group interview."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/employer/interviews">
                                    <ArrowLeft className="size-4" /> Kembali
                                </Link>
                            </Button>
                            <Button type="submit" disabled={form.processing || selectedIds.length === 0}>
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Jadwalkan {selectedIds.length > 0 ? `${selectedIds.length} Interview` : ''}
                            </Button>
                        </div>
                    }
                />

                {/* Step 1: Pilih Kandidat */}
                <Section
                    title="1. Pilih Kandidat"
                    description={`${selectedIds.length} dari ${applications.length} lamaran dipilih.`}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Cari kandidat / posisi…"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    className="h-9 rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm sm:w-64"
                                />
                            </div>
                            {jobOptions.length > 0 && (
                                <Select value={jobFilter} onValueChange={setJobFilter}>
                                    <SelectTrigger className="h-9 sm:w-56">
                                        <SelectValue placeholder="Filter posisi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua posisi</SelectItem>
                                        {jobOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <Button type="button" variant="outline" size="sm" onClick={toggleAllFiltered}>
                                {allFilteredSelected ? 'Batal Semua' : 'Pilih Semua (filter)'}
                            </Button>
                        </div>
                    }
                >
                    <div className="overflow-hidden rounded-md border">
                        <Table className="min-w-[720px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <input
                                            type="checkbox"
                                            checked={allFilteredSelected}
                                            onChange={toggleAllFiltered}
                                            aria-label="Pilih semua"
                                        />
                                    </TableHead>
                                    <TableHead>Kandidat</TableHead>
                                    <TableHead>Posisi</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                                            Tidak ada lamaran yang cocok dengan filter.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((app) => {
                                        const checked = selectedIds.includes(app.id);
                                        return (
                                            <TableRow
                                                key={app.id}
                                                className={checked ? 'bg-[color:#1080E0]/5' : ''}
                                                onClick={() => toggleOne(app.id)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleOne(app.id)}
                                                        aria-label={`Pilih ${app.candidate_name ?? 'kandidat'}`}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="size-9">
                                                            {app.candidate_avatar_url && (
                                                                <AvatarImage
                                                                    src={app.candidate_avatar_url}
                                                                    alt={app.candidate_name ?? ''}
                                                                />
                                                            )}
                                                            <AvatarFallback>{initials(app.candidate_name)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <div className="truncate font-medium">{app.candidate_name ?? '—'}</div>
                                                            <div className="truncate text-xs text-muted-foreground">
                                                                {app.candidate_email ?? '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{app.job_title ?? '—'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="capitalize">
                                                        {app.status ?? '—'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {fieldErrors.application_ids && (
                        <p className="mt-2 text-xs text-destructive">{fieldErrors.application_ids}</p>
                    )}
                </Section>

                {/* Step 2: Konfigurasi Jadwal */}
                <Section
                    title="2. Konfigurasi Jadwal"
                    description="Atur waktu mulai, durasi tiap interview, dan jeda antar slot. Berlaku untuk semua kandidat yang dipilih."
                >
                    <div className="grid gap-4 lg:grid-cols-2">
                        <InputField
                            label="Judul Interview"
                            value={form.data.title}
                            onChange={(event) => form.setData('title', event.target.value)}
                            error={fieldErrors.title}
                            required
                            placeholder="Mis. Interview HR — Backend Developer"
                        />
                        <div className="grid gap-2">
                            <Label>Tahap</Label>
                            <Select value={form.data.stage} onValueChange={(value) => form.setData('stage', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih tahap interview" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.stages.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {fieldErrors.stage && <p className="text-xs text-destructive">{fieldErrors.stage}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label>Mode</Label>
                            <Select value={form.data.mode} onValueChange={(value) => form.setData('mode', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.modes.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            <span className="inline-flex items-center gap-2">
                                                {modeIcon(option.value)}
                                                {option.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {fieldErrors.mode && <p className="text-xs text-destructive">{fieldErrors.mode}</p>}
                        </div>
                        <InputField
                            label="Zona Waktu"
                            value={form.data.timezone}
                            onChange={(event) => form.setData('timezone', event.target.value)}
                            description="Default: Asia/Jakarta. Boleh diubah ke zona kandidat."
                        />

                        <InputField
                            label="Mulai (slot pertama)"
                            type="datetime-local"
                            value={form.data.start_at}
                            onChange={(event) => form.setData('start_at', event.target.value)}
                            error={fieldErrors.start_at}
                            required
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <InputField
                                label="Durasi (menit)"
                                type="number"
                                min={15}
                                max={480}
                                value={form.data.duration_minutes}
                                onChange={(event) => form.setData('duration_minutes', Number(event.target.value))}
                                error={fieldErrors.duration_minutes}
                            />
                            <InputField
                                label="Jeda antar slot (menit)"
                                type="number"
                                min={0}
                                max={240}
                                value={form.data.gap_minutes}
                                onChange={(event) => form.setData('gap_minutes', Number(event.target.value))}
                                error={fieldErrors.gap_minutes}
                                disabled={form.data.group_mode}
                                description={form.data.group_mode ? 'Tidak berlaku di mode group.' : undefined}
                            />
                        </div>
                    </div>

                    <Card className="mt-4 border-slate-200/70 bg-slate-50/50">
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-[color:#1080E0]/10 text-[color:#1080E0]">
                                    <Users className="size-5" />
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold">Mode Group Interview</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Aktifkan jika semua kandidat di slot yang sama (jam sama, link/lokasi sama). Cocok untuk group/panel
                                        discussion.
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={form.data.group_mode}
                                onCheckedChange={(value) => form.setData('group_mode', value)}
                            />
                        </CardContent>
                    </Card>
                </Section>

                {/* Step 3: Detail mode-specific + Panelis */}
                <Section title="3. Detail Lokasi & Panelis" description="Berlaku sama untuk semua interview yang dijadwalkan.">
                    {form.data.mode === 'online' && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <InputField
                                label="Meeting URL"
                                placeholder="https://meet.google.com/abc-defg-hij"
                                value={form.data.meeting_url}
                                onChange={(event) => form.setData('meeting_url', event.target.value)}
                                error={fieldErrors.meeting_url}
                                description="Kosongkan untuk auto-generate Google Meet (jika OAuth aktif)."
                            />
                            <InputField
                                label="Passcode (opsional)"
                                value={form.data.meeting_passcode}
                                onChange={(event) => form.setData('meeting_passcode', event.target.value)}
                                error={fieldErrors.meeting_passcode}
                            />
                        </div>
                    )}

                    {form.data.mode === 'onsite' && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <InputField
                                label="Nama Lokasi"
                                placeholder="Kantor Pusat"
                                value={form.data.location_name}
                                onChange={(event) => form.setData('location_name', event.target.value)}
                                error={fieldErrors.location_name}
                                required
                            />
                            <InputField
                                label="Alamat Lokasi"
                                placeholder="Jl. Sudirman No. 1, Jakarta"
                                value={form.data.location_address}
                                onChange={(event) => form.setData('location_address', event.target.value)}
                                error={fieldErrors.location_address}
                                required
                            />
                            <InputField
                                label="Google Maps URL (opsional)"
                                placeholder="https://maps.google.com/..."
                                value={form.data.location_map_url}
                                onChange={(event) => form.setData('location_map_url', event.target.value)}
                                error={fieldErrors.location_map_url}
                            />
                        </div>
                    )}

                    {options.team.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <Label>Panelis (opsional)</Label>
                            <div className="flex flex-wrap gap-2">
                                {options.team.map((member) => {
                                    const userId = Number(member.value);
                                    const checked = form.data.interviewer_ids.includes(userId);
                                    return (
                                        <button
                                            key={member.value}
                                            type="button"
                                            onClick={() => toggleInterviewer(userId)}
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                                                checked
                                                    ? 'border-[color:#1080E0] bg-[color:#1080E0]/10 text-[color:#1080E0]'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            {checked && <CheckCircle2 className="size-3.5" />}
                                            {member.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <TextareaField
                            label="Instruksi untuk Kandidat"
                            rows={3}
                            value={form.data.candidate_instructions}
                            onChange={(event) => form.setData('candidate_instructions', event.target.value)}
                            error={fieldErrors.candidate_instructions}
                            description="Akan dikirim ke kandidat lewat email undangan."
                        />
                        <TextareaField
                            label="Catatan Internal (tidak terlihat kandidat)"
                            rows={3}
                            value={form.data.internal_notes}
                            onChange={(event) => form.setData('internal_notes', event.target.value)}
                            error={fieldErrors.internal_notes}
                        />
                    </div>

                    <label className="mt-4 flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.data.requires_confirmation}
                            onChange={(event) => form.setData('requires_confirmation', event.target.checked)}
                        />
                        Minta kandidat konfirmasi kehadiran
                    </label>
                </Section>

                {/* Preview slots */}
                {previewSlots.length > 0 && (
                    <Section
                        title="4. Preview Slot"
                        description={
                            form.data.group_mode
                                ? 'Mode group: semua kandidat di slot yang sama.'
                                : `Mode beruntun: durasi ${form.data.duration_minutes}m + jeda ${form.data.gap_minutes}m antar slot.`
                        }
                        actions={
                            <Badge variant="secondary">
                                <CalendarRange className="size-3" />
                                {previewSlots.length} interview
                            </Badge>
                        }
                    >
                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">#</TableHead>
                                        <TableHead>Kandidat</TableHead>
                                        <TableHead>Posisi</TableHead>
                                        <TableHead>Slot Mulai</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewSlots.map(({ application, slot }, index) => (
                                        <TableRow key={application.id}>
                                            <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{application.candidate_name ?? '—'}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {application.candidate_email ?? '—'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs">{application.job_title ?? '—'}</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {formatSlot(slot, form.data.timezone)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Section>
                )}

                <div className="sticky bottom-0 -mx-4 border-t bg-background/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-muted-foreground">
                            {selectedIds.length === 0
                                ? 'Pilih minimal 1 kandidat di atas untuk lanjut.'
                                : `${selectedIds.length} kandidat siap dijadwalkan.`}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/employer/interviews">Batal</Link>
                            </Button>
                            <Button type="submit" disabled={form.processing || selectedIds.length === 0 || !form.data.start_at}>
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Jadwalkan Sekarang
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
}

InterviewBulk.layout = {
    breadcrumbs: [
        { title: 'Interview', href: '/employer/interviews' },
        { title: 'Jadwalkan Serentak', href: '#' },
    ],
};
