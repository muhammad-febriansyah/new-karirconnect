import { Head, useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { MoneyInput } from '@/components/form/money-input';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Options = {
    categories: Array<{ id: number; name: string; slug: string }>;
    cities: Array<{ id: number; name: string }>;
    experience_levels: Array<{ value: string; label: string }>;
};

type Props = {
    submission: null;
    options: Options;
};

export default function EmployeeSalarySubmissionForm({ options }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        job_title: '',
        job_category_id: '' as string | number,
        city_id: '' as string | number,
        experience_level: 'mid',
        experience_years: 3,
        employment_type: 'full_time',
        salary_idr: '' as string | number,
        bonus_idr: 0,
        is_anonymous: true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/employee/salary-submissions');
    };

    return (
        <>
            <Head title="Lapor Gaji" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Lapor Gaji Anonim"
                    description="Bantu kandidat lain mengetahui kisaran pasar yang adil. Data Anda dianonimkan."
                />

                <form onSubmit={submit} className="space-y-5">
                    <Section title="Posisi & Pengalaman">
                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2.5 md:col-span-2">
                                <Label className="leading-none">Jabatan</Label>
                                <Input value={data.job_title} onChange={(e) => setData('job_title', e.target.value)} placeholder="Senior Backend Engineer" />
                                {errors.job_title && <div className="text-xs text-destructive">{errors.job_title}</div>}
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Kategori</Label>
                                <Select value={String(data.job_category_id)} onValueChange={(v) => setData('job_category_id', Number(v) || '')}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                                    <SelectContent>
                                        {options.categories.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Kota</Label>
                                <Select value={String(data.city_id)} onValueChange={(v) => setData('city_id', Number(v) || '')}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kota" /></SelectTrigger>
                                    <SelectContent>
                                        {options.cities.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Level Pengalaman</Label>
                                <Select value={data.experience_level} onValueChange={(v) => setData('experience_level', v)}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih level pengalaman" /></SelectTrigger>
                                    <SelectContent>
                                        {options.experience_levels.map((l) => (
                                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Tahun Pengalaman</Label>
                                <Input type="number" min={0} max={40} value={data.experience_years} onChange={(e) => setData('experience_years', Number(e.target.value))} />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Tipe Kerja</Label>
                                <Select value={data.employment_type} onValueChange={(v) => setData('employment_type', v)}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tipe kerja" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full_time">Full-time</SelectItem>
                                        <SelectItem value="part_time">Part-time</SelectItem>
                                        <SelectItem value="contract">Kontrak</SelectItem>
                                        <SelectItem value="freelance">Freelance</SelectItem>
                                        <SelectItem value="internship">Magang</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </Section>

                    <Section title="Gaji">
                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2.5">
                                <Label className="leading-none">Gaji Pokok / bulan (IDR)</Label>
                                <MoneyInput
                                    value={data.salary_idr}
                                    onChange={(value) => setData('salary_idr', value ?? '')}
                                    placeholder="Rp 8.000.000"
                                />
                                {errors.salary_idr && <div className="text-xs text-destructive">{errors.salary_idr}</div>}
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Bonus / Tunjangan / bulan (opsional)</Label>
                                <MoneyInput
                                    value={data.bonus_idr}
                                    onChange={(value) => setData('bonus_idr', value ?? 0)}
                                    placeholder="Rp 1.000.000"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm md:col-span-2">
                                <input type="checkbox" checked={data.is_anonymous} onChange={(e) => setData('is_anonymous', e.target.checked)} />
                                Tampilkan secara anonim (direkomendasikan)
                            </label>
                        </div>
                    </Section>

                    <Button type="submit" disabled={processing}><Save className="size-4" /> Kirim Laporan</Button>
                </form>
            </div>
        </>
    );
}
