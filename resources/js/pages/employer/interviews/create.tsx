import { Head, Link, useForm } from '@inertiajs/react';
import { Bot, Loader2, MapPin, Save, Video } from 'lucide-react';
import { type FormEvent } from 'react';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store as interviewStore } from '@/routes/employer/interviews';

type Option = { value: string; label: string };

type Props = {
    application: {
        id: number;
        candidate_name: string | null;
        job: { id: number | null; title: string | null };
    } | null;
    options: {
        stages: Option[];
        modes: Option[];
        team: Option[];
    };
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

export default function InterviewCreate({ application, options }: Props) {
    const form = useForm({
        application_id: application?.id ?? null,
        stage: 'hr',
        mode: 'online',
        title: application?.job.title ? `Interview ${application.job.title}` : '',
        scheduled_at: '',
        duration_minutes: 60,
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

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post(interviewStore().url);
    };

    return (
        <>
            <Head title="Jadwalkan Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Jadwalkan Interview"
                    description={application
                        ? `Untuk ${application.candidate_name} — ${application.job.title}`
                        : 'Pilih kandidat dari daftar pelamar lalu jadwalkan interview.'}
                />

                <form onSubmit={onSubmit} className="space-y-6">
                    {!application && (
                        <Section>
                            <p className="text-sm text-muted-foreground">
                                Buka <Link href="/employer/applicants" className="text-primary hover:underline">daftar pelamar</Link> dan tekan tombol "Jadwalkan Interview" untuk mengisi otomatis kandidat.
                            </p>
                        </Section>
                    )}

                    <Section title="Mode Interview">
                        <div className="grid gap-3 md:grid-cols-3">
                            {options.modes.map((mode) => (
                                <Card
                                    key={mode.value}
                                    className={`cursor-pointer transition ${form.data.mode === mode.value ? 'border-primary ring-2 ring-primary/30' : 'hover:border-muted-foreground'}`}
                                    onClick={() => form.setData('mode', mode.value)}
                                >
                                    <CardContent className="flex items-center gap-3 p-4">
                                        {modeIcon(mode.value)}
                                        <span className="font-medium">{mode.label}</span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </Section>

                    <Section title="Detail">
                        <div className="grid gap-4 md:grid-cols-2">
                            <InputField
                                label="Judul"
                                required
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                error={form.errors.title}
                            />
                            <div>
                                <Label className="mb-1 block">Tahap</Label>
                                <Select value={form.data.stage} onValueChange={(v) => form.setData('stage', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {options.stages.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <InputField
                                label="Tanggal & Waktu"
                                type="datetime-local"
                                required
                                value={form.data.scheduled_at}
                                onChange={(e) => form.setData('scheduled_at', e.target.value)}
                                error={form.errors.scheduled_at}
                            />
                            <InputField
                                label="Durasi (menit)"
                                type="number"
                                min={15}
                                max={480}
                                value={form.data.duration_minutes}
                                onChange={(e) => form.setData('duration_minutes', Number(e.target.value))}
                                error={form.errors.duration_minutes}
                            />
                        </div>
                    </Section>

                    {form.data.mode === 'online' && (
                        <Section title="Detail Online Meeting">
                            <div className="grid gap-4 md:grid-cols-2">
                                <InputField
                                    label="Meeting URL"
                                    placeholder="https://meet.google.com/abc-defg-hij — kosongkan agar dibuat otomatis"
                                    value={form.data.meeting_url}
                                    onChange={(e) => form.setData('meeting_url', e.target.value)}
                                    error={form.errors.meeting_url}
                                />
                                <InputField
                                    label="Passcode (opsional)"
                                    value={form.data.meeting_passcode}
                                    onChange={(e) => form.setData('meeting_passcode', e.target.value)}
                                />
                            </div>
                        </Section>
                    )}

                    {form.data.mode === 'onsite' && (
                        <Section title="Detail Lokasi Onsite">
                            <div className="grid gap-4 md:grid-cols-2">
                                <InputField
                                    label="Nama Lokasi"
                                    required
                                    value={form.data.location_name}
                                    onChange={(e) => form.setData('location_name', e.target.value)}
                                    error={form.errors.location_name}
                                />
                                <InputField
                                    label="Map URL (opsional)"
                                    value={form.data.location_map_url}
                                    onChange={(e) => form.setData('location_map_url', e.target.value)}
                                />
                                <div className="md:col-span-2">
                                    <TextareaField
                                        label="Alamat"
                                        required
                                        rows={3}
                                        value={form.data.location_address}
                                        onChange={(e) => form.setData('location_address', e.target.value)}
                                        error={form.errors.location_address}
                                    />
                                </div>
                            </div>
                        </Section>
                    )}

                    {form.data.mode === 'ai' && (
                        <Section>
                            <p className="text-sm text-muted-foreground">
                                AI Interview akan dijadwalkan otomatis. Kandidat menerima link sesi mandiri yang dapat
                                dimulai sebelum tenggat <span className="font-medium">{form.data.scheduled_at || '...'}</span>.
                            </p>
                        </Section>
                    )}

                    <Section title="Pesan untuk Kandidat (opsional)">
                        <TextareaField
                            label="Instruksi"
                            rows={4}
                            placeholder="Persiapan, dress code, dokumen yang dibawa…"
                            value={form.data.candidate_instructions}
                            onChange={(e) => form.setData('candidate_instructions', e.target.value)}
                        />
                    </Section>

                    <Section title="Catatan Internal (opsional)">
                        <TextareaField
                            label="Catatan Tim"
                            rows={3}
                            placeholder="Hanya untuk recruiter/interviewer…"
                            value={form.data.internal_notes}
                            onChange={(e) => form.setData('internal_notes', e.target.value)}
                        />
                    </Section>

                    <div className="flex justify-end gap-2">
                        <Button asChild variant="outline">
                            <Link href="/employer/interviews">Batal</Link>
                        </Button>
                        <Button type="submit" disabled={form.processing || !application}>
                            {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            Jadwalkan
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
