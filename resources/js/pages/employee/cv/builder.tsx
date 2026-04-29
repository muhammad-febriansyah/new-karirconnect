import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Briefcase, FileText, GraduationCap, Loader2, Plus, Save, Sparkles, Trash2, User } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { update as cvBuilderUpdate } from '@/routes/employee/cv/builder';

type ExperienceItem = {
    company: string;
    position: string;
    period: string;
    description: string;
};

type EducationItem = {
    institution: string;
    major: string;
    period: string;
    gpa: string;
};

type CertificationItem = {
    name: string;
    issuer: string;
    year: string;
};

type BuilderData = {
    label: string;
    personal: {
        full_name: string;
        headline: string;
        email: string;
        phone: string;
        location: string;
        website: string;
    };
    summary: string;
    experiences: ExperienceItem[];
    educations: EducationItem[];
    skills: string[];
    certifications: CertificationItem[];
};

type Props = {
    data: Partial<BuilderData>;
};

const STEPS = [
    { key: 'personal', title: 'Data Pribadi', icon: User },
    { key: 'summary', title: 'Ringkasan', icon: Sparkles },
    { key: 'experiences', title: 'Pengalaman', icon: Briefcase },
    { key: 'educations', title: 'Pendidikan', icon: GraduationCap },
    { key: 'skills', title: 'Keahlian', icon: FileText },
    { key: 'certifications', title: 'Sertifikasi', icon: FileText },
] as const;

export default function CvBuilderPage({ data }: Props) {
    const [step, setStep] = useState(0);

    const form = useForm<BuilderData>({
        label: 'CV Builder',
        personal: {
            full_name: data.personal?.full_name ?? '',
            headline: data.personal?.headline ?? '',
            email: data.personal?.email ?? '',
            phone: data.personal?.phone ?? '',
            location: data.personal?.location ?? '',
            website: data.personal?.website ?? '',
        },
        summary: data.summary ?? '',
        experiences: data.experiences ?? [],
        educations: data.educations ?? [],
        skills: data.skills ?? [],
        certifications: data.certifications ?? [],
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.post(cvBuilderUpdate().url, {
            preserveScroll: true,
        });
    };

    const setExperience = (index: number, key: keyof ExperienceItem, value: string) => {
        const next = [...form.data.experiences];
        next[index] = { ...next[index], [key]: value };
        form.setData('experiences', next);
    };
    const setEducation = (index: number, key: keyof EducationItem, value: string) => {
        const next = [...form.data.educations];
        next[index] = { ...next[index], [key]: value };
        form.setData('educations', next);
    };
    const setCertification = (index: number, key: keyof CertificationItem, value: string) => {
        const next = [...form.data.certifications];
        next[index] = { ...next[index], [key]: value };
        form.setData('certifications', next);
    };

    return (
        <>
            <Head title="CV Builder" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="CV Builder"
                    description="Susun CV profesional dalam beberapa langkah. Hasil otomatis di-generate sebagai PDF dan tersimpan di akun Anda."
                />

                <div className="flex flex-wrap gap-2">
                    {STEPS.map((s, idx) => {
                        const Icon = s.icon;
                        const active = idx === step;
                        return (
                            <button
                                type="button"
                                key={s.key}
                                onClick={() => setStep(idx)}
                                className={
                                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition '
                                    + (active
                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                        : 'border-border bg-card text-muted-foreground hover:bg-muted')
                                }
                            >
                                <Icon className="size-4" />
                                {idx + 1}. {s.title}
                            </button>
                        );
                    })}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {step === 0 && (
                        <Section title="Data Pribadi" description="Informasi kontak yang muncul di header CV.">
                            <div className="grid gap-5 md:grid-cols-2">
                                <InputField
                                    label="Nama Lengkap"
                                    required
                                    placeholder="Contoh: Budi Santoso"
                                    value={form.data.personal.full_name}
                                    onChange={(e) => form.setData('personal', { ...form.data.personal, full_name: e.target.value })}
                                    error={form.errors['personal.full_name'] as string | undefined}
                                />
                                <InputField
                                    label="Headline"
                                    placeholder="Contoh: Senior Backend Engineer"
                                    value={form.data.personal.headline}
                                    onChange={(e) => form.setData('personal', { ...form.data.personal, headline: e.target.value })}
                                    error={form.errors['personal.headline'] as string | undefined}
                                />
                                <InputField
                                    label="Email"
                                    type="email"
                                    placeholder="email@domain.com"
                                    value={form.data.personal.email}
                                    onChange={(e) => form.setData('personal', { ...form.data.personal, email: e.target.value })}
                                    error={form.errors['personal.email'] as string | undefined}
                                />
                                <InputField
                                    label="Telepon"
                                    placeholder="Contoh: 081234567890"
                                    value={form.data.personal.phone}
                                    onChange={(e) => form.setData('personal', { ...form.data.personal, phone: e.target.value })}
                                    error={form.errors['personal.phone'] as string | undefined}
                                />
                                <InputField
                                    label="Lokasi"
                                    placeholder="Contoh: Jakarta Selatan"
                                    value={form.data.personal.location}
                                    onChange={(e) => form.setData('personal', { ...form.data.personal, location: e.target.value })}
                                />
                                <InputField
                                    label="Website / Portfolio"
                                    placeholder="https://portfolio.saya"
                                    value={form.data.personal.website}
                                    onChange={(e) => form.setData('personal', { ...form.data.personal, website: e.target.value })}
                                    error={form.errors['personal.website'] as string | undefined}
                                />
                            </div>
                        </Section>
                    )}

                    {step === 1 && (
                        <Section title="Ringkasan Profesional" description="2-4 kalimat ringkas tentang siapa Anda dan nilai yang Anda bawa.">
                            <TextareaField
                                label="Ringkasan"
                                rows={6}
                                placeholder="Contoh: Backend engineer dengan 5+ tahun pengalaman membangun sistem skala besar dengan PHP & Go. Antusias mengoptimalkan performa & arsitektur."
                                value={form.data.summary}
                                onChange={(e) => form.setData('summary', e.target.value)}
                                error={form.errors.summary}
                            />
                        </Section>
                    )}

                    {step === 2 && (
                        <Section
                            title="Pengalaman Kerja"
                            description="Mulai dari pengalaman terbaru."
                            actions={
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => form.setData('experiences', [
                                        ...form.data.experiences,
                                        { company: '', position: '', period: '', description: '' },
                                    ])}
                                >
                                    <Plus className="size-4" /> Tambah
                                </Button>
                            }
                        >
                            {form.data.experiences.length === 0 && (
                                <p className="text-sm text-muted-foreground">Belum ada pengalaman. Klik "Tambah" untuk memulai.</p>
                            )}
                            <div className="space-y-4">
                                {form.data.experiences.map((exp, idx) => (
                                    <div key={idx} className="rounded-md border bg-muted/20 p-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <InputField
                                                label="Perusahaan"
                                                required
                                                placeholder="Contoh: PT KarirConnect Indonesia"
                                                value={exp.company}
                                                onChange={(e) => setExperience(idx, 'company', e.target.value)}
                                            />
                                            <InputField
                                                label="Posisi"
                                                required
                                                placeholder="Contoh: Backend Engineer"
                                                value={exp.position}
                                                onChange={(e) => setExperience(idx, 'position', e.target.value)}
                                            />
                                            <InputField
                                                label="Periode"
                                                placeholder="Contoh: Jan 2022 – Sekarang"
                                                value={exp.period}
                                                onChange={(e) => setExperience(idx, 'period', e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-3">
                                            <TextareaField
                                                label="Deskripsi & Pencapaian"
                                                rows={3}
                                                placeholder="Tuliskan tanggung jawab utama dan pencapaian terukur."
                                                value={exp.description}
                                                onChange={(e) => setExperience(idx, 'description', e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => form.setData('experiences', form.data.experiences.filter((_, i) => i !== idx))}
                                            >
                                                <Trash2 className="size-4" /> Hapus
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {step === 3 && (
                        <Section
                            title="Pendidikan"
                            actions={
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => form.setData('educations', [
                                        ...form.data.educations,
                                        { institution: '', major: '', period: '', gpa: '' },
                                    ])}
                                >
                                    <Plus className="size-4" /> Tambah
                                </Button>
                            }
                        >
                            {form.data.educations.length === 0 && (
                                <p className="text-sm text-muted-foreground">Belum ada pendidikan.</p>
                            )}
                            <div className="space-y-4">
                                {form.data.educations.map((edu, idx) => (
                                    <div key={idx} className="rounded-md border bg-muted/20 p-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <InputField
                                                label="Institusi"
                                                required
                                                placeholder="Contoh: Universitas Indonesia"
                                                value={edu.institution}
                                                onChange={(e) => setEducation(idx, 'institution', e.target.value)}
                                            />
                                            <InputField
                                                label="Jurusan"
                                                placeholder="Contoh: Teknik Informatika"
                                                value={edu.major}
                                                onChange={(e) => setEducation(idx, 'major', e.target.value)}
                                            />
                                            <InputField
                                                label="Periode"
                                                placeholder="2018 – 2022"
                                                value={edu.period}
                                                onChange={(e) => setEducation(idx, 'period', e.target.value)}
                                            />
                                            <InputField
                                                label="IPK"
                                                placeholder="3.75"
                                                value={edu.gpa}
                                                onChange={(e) => setEducation(idx, 'gpa', e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => form.setData('educations', form.data.educations.filter((_, i) => i !== idx))}
                                            >
                                                <Trash2 className="size-4" /> Hapus
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {step === 4 && (
                        <Section
                            title="Keahlian"
                            description="Tambahkan keyword skill (Enter untuk menambah)."
                        >
                            <SkillsEditor
                                value={form.data.skills}
                                onChange={(skills) => form.setData('skills', skills)}
                            />
                        </Section>
                    )}

                    {step === 5 && (
                        <Section
                            title="Sertifikasi"
                            actions={
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => form.setData('certifications', [
                                        ...form.data.certifications,
                                        { name: '', issuer: '', year: '' },
                                    ])}
                                >
                                    <Plus className="size-4" /> Tambah
                                </Button>
                            }
                        >
                            {form.data.certifications.length === 0 && (
                                <p className="text-sm text-muted-foreground">Belum ada sertifikasi.</p>
                            )}
                            <div className="space-y-4">
                                {form.data.certifications.map((cert, idx) => (
                                    <div key={idx} className="rounded-md border bg-muted/20 p-4">
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <InputField
                                                label="Nama Sertifikat"
                                                required
                                                placeholder="Contoh: AWS Certified Developer"
                                                value={cert.name}
                                                onChange={(e) => setCertification(idx, 'name', e.target.value)}
                                            />
                                            <InputField
                                                label="Penerbit"
                                                placeholder="Contoh: Amazon Web Services"
                                                value={cert.issuer}
                                                onChange={(e) => setCertification(idx, 'issuer', e.target.value)}
                                            />
                                            <InputField
                                                label="Tahun"
                                                placeholder="2024"
                                                value={cert.year}
                                                onChange={(e) => setCertification(idx, 'year', e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => form.setData('certifications', form.data.certifications.filter((_, i) => i !== idx))}
                                            >
                                                <Trash2 className="size-4" /> Hapus
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep((s) => Math.max(0, s - 1))}
                            disabled={step === 0}
                        >
                            <ArrowLeft className="size-4" /> Sebelumnya
                        </Button>

                        {step < STEPS.length - 1 ? (
                            <Button type="button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                                Berikutnya <ArrowRight className="size-4" />
                            </Button>
                        ) : (
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Simpan & Generate PDF
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}

function SkillsEditor({ value, onChange }: { value: string[]; onChange: (skills: string[]) => void }) {
    const [input, setInput] = useState('');

    const add = () => {
        const v = input.trim();
        if (v && !value.includes(v)) {
            onChange([...value, v]);
        }
        setInput('');
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {value.map((skill) => (
                    <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-sm"
                    >
                        {skill}
                        <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => onChange(value.filter((s) => s !== skill))}
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Ketik skill lalu tekan Enter (contoh: Laravel)"
                    className="flex h-9 flex-1 rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            add();
                        }
                    }}
                />
                <Button type="button" variant="outline" onClick={add}>
                    <Plus className="size-4" /> Tambah
                </Button>
            </div>
        </div>
    );
}
