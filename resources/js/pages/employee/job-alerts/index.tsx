import { Head, router, useForm } from '@inertiajs/react';
import { Bell, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { MoneyInput } from '@/components/form/money-input';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

type Alert = {
    id: number;
    name: string;
    keyword: string | null;
    category: string | null;
    city: string | null;
    experience_level: string | null;
    employment_type: string | null;
    work_arrangement: string | null;
    salary_min: number | null;
    frequency: string;
    is_active: boolean;
    last_sent_at: string | null;
    total_matches_sent: number;
};

type Options = {
    categories: Array<{ id: number; name: string }>;
    cities: Array<{ id: number; name: string }>;
    experience_levels: Array<{ value: string; label: string }>;
    frequencies: Array<{ value: string; label: string }>;
};

type Props = {
    filters: {
        search: string;
    };
    alerts: {
        data: Alert[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
        from: number | null;
        to: number | null;
    };
    options: Options;
};

const idr = (v: number | null) => (v == null ? '-' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v));

function AlertForm({ options, onDone }: { options: Options; onDone: () => void }) {
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        keyword: '',
        job_category_id: '' as number | '',
        city_id: '' as number | '',
        experience_level: '',
        employment_type: '',
        work_arrangement: '',
        salary_min: '' as number | '',
        frequency: 'daily',
        is_active: true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/employee/job-alerts', { onSuccess: () => {
 reset(); onDone(); 
} });
    };

    return (
        <Card>
            <CardContent className="p-4">
                <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2.5 md:col-span-2">
                        <Label className="leading-none">Nama Alert</Label>
                        <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Backend Engineer Jakarta" />
                        {errors.name && <div className="text-xs text-destructive">{errors.name}</div>}
                    </div>
                    <div className="space-y-2.5 md:col-span-2">
                        <Label className="leading-none">Keyword</Label>
                        <Input value={data.keyword} onChange={(e) => setData('keyword', e.target.value)} placeholder="Laravel, PHP, backend" />
                    </div>
                    <div className="space-y-2.5">
                        <Label className="leading-none">Kategori</Label>
                        <Select value={String(data.job_category_id)} onValueChange={(v) => setData('job_category_id', Number(v) || '')}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                            <SelectContent>
                                {options.categories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2.5">
                        <Label className="leading-none">Kota</Label>
                        <Select value={String(data.city_id)} onValueChange={(v) => setData('city_id', Number(v) || '')}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kota" /></SelectTrigger>
                            <SelectContent>
                                {options.cities.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2.5">
                        <Label className="leading-none">Level</Label>
                        <Select value={data.experience_level} onValueChange={(v) => setData('experience_level', v)}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Semua" /></SelectTrigger>
                            <SelectContent>
                                {options.experience_levels.map((l) => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2.5">
                        <Label className="leading-none">Tipe Kerja</Label>
                        <Select value={data.employment_type} onValueChange={(v) => setData('employment_type', v)}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Semua" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="full_time">Full-time</SelectItem>
                                <SelectItem value="part_time">Part-time</SelectItem>
                                <SelectItem value="contract">Kontrak</SelectItem>
                                <SelectItem value="freelance">Freelance</SelectItem>
                                <SelectItem value="internship">Magang</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2.5">
                        <Label className="leading-none">Gaji Minimum (IDR)</Label>
                        <MoneyInput
                            value={data.salary_min}
                            onChange={(value) => setData('salary_min', value ?? '')}
                            placeholder="Rp 8.000.000"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <Label className="leading-none">Frekuensi</Label>
                        <Select value={data.frequency} onValueChange={(v) => setData('frequency', v)}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Pilih frekuensi notifikasi" /></SelectTrigger>
                            <SelectContent>
                                {options.frequencies.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        <Button type="submit" disabled={processing}>
                            <Plus className="size-4" /> Simpan Alert
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function EmployeeJobAlertsIndex({ alerts, options, filters }: Props) {
    const [showForm, setShowForm] = useState(alerts.data.length === 0);
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');

    const toggle = (alert: Alert) => {
        router.patch(`/employee/job-alerts/${alert.id}`, { ...alert, is_active: !alert.is_active }, { preserveScroll: true });
    };
    const sendNow = (id: number) => router.post(`/employee/job-alerts/${id}/dispatch`, {}, { preserveScroll: true });
    const remove = (id: number) => {
        router.delete(`/employee/job-alerts/${id}`, { preserveScroll: true });
        setConfirmId(null);
    };
    const onSubmitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get('/employee/job-alerts', { search }, { preserveScroll: true, preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Job Alerts" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Job Alerts"
                    description="Kami akan mengirim notifikasi saat lowongan baru cocok dengan kriteria Anda."
                    actions={
                        <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
                            <Plus className="size-4" /> {showForm ? 'Tutup form' : 'Tambah Alert'}
                        </Button>
                    }
                />

                {showForm && <AlertForm options={options} onDone={() => setShowForm(false)} />}

                <Section title={`${alerts.total} alert tersimpan`}>
                    <form onSubmit={onSubmitSearch} className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama alert, keyword, kategori, atau kota"
                            className="md:max-w-md"
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button type="submit" variant="outline">Cari</Button>
                            {search !== '' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setSearch('');
                                        router.get('/employee/job-alerts', { search: '' }, { preserveScroll: true, preserveState: true, replace: true });
                                    }}
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </form>
                    {alerts.data.length === 0 ? (
                        <EmptyState
                            icon={Bell}
                            title="Belum ada alert"
                            description="Buat alert pertama untuk mendapatkan notifikasi lowongan yang relevan."
                        />
                    ) : (
                        <div className="overflow-hidden rounded-lg border">
                            <Table className="min-w-[980px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Alert</TableHead>
                                        <TableHead>Kriteria</TableHead>
                                        <TableHead>Frekuensi</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Terakhir Dikirim</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {alerts.data.map((a) => (
                                        <TableRow key={a.id}>
                                            <TableCell>
                                                <div className="font-semibold">{a.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {a.total_matches_sent} match terkirim
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-muted-foreground">
                                                    {[a.keyword, a.category, a.city, a.experience_level, a.employment_type].filter(Boolean).join(' · ') || 'Semua lowongan'}
                                                </div>
                                                {a.salary_min && <div className="text-xs">Min gaji: {idr(a.salary_min)}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize">{a.frequency}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {a.is_active ? <Badge>Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {a.last_sent_at ? formatDateTime(a.last_sent_at) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => sendNow(a.id)}>
                                                        <Send className="size-4" /> Kirim sekarang
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => toggle(a)}>
                                                        <Pencil className="size-4" /> {a.is_active ? 'Pause' : 'Aktifkan'}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(a.id)} aria-label="Hapus alert">
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>{alerts.from ?? 0}–{alerts.to ?? 0} dari {alerts.total}</span>
                        <div className="flex flex-wrap gap-1">
                            {alerts.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, undefined, { preserveScroll: true, preserveState: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                </Section>
            </div>

            <ConfirmDialog
                open={confirmId !== null}
                onOpenChange={(v) => !v && setConfirmId(null)}
                title="Hapus alert?"
                description="Notifikasi otomatis untuk alert ini akan berhenti."
                confirmLabel="Hapus"
                onConfirm={() => confirmId !== null && remove(confirmId)}
            />
        </>
    );
}
