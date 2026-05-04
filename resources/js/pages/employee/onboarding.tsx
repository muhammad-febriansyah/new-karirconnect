import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    FileText,
    Plus,
    Sparkles,
    Trash2,
    Upload,
    UserPen,
    X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { store as onboardingStore, parseCv as parseCvRoute } from '@/routes/employee/onboarding';

type Option = { value: string; label: string };
type CityOption = Option & { province_id: number };

type Props = {
    user: { name: string; email: string; phone: string | null };
    profile: {
        headline: string | null;
        about: string | null;
        date_of_birth: string | null;
        gender: string | null;
        province_id: number | null;
        city_id: number | null;
        current_position: string | null;
        experience_level: string | null;
        expected_salary_min: number | null;
        expected_salary_max: number | null;
        linkedin_url: string | null;
        portfolio_url: string | null;
        github_url: string | null;
        skill_ids: number[];
        primary_cv: { id: number; label: string; file_url: string | null } | null;
    };
    options: {
        genders: Option[];
        experience_levels: Option[];
        provinces: Option[];
        cities: CityOption[];
        skills: Option[];
    };
};

type WorkExperienceForm = {
    company_name: string;
    position: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    description: string;
};

type EducationForm = {
    institution: string;
    level: string;
    major: string;
    start_year: string;
    end_year: string;
    gpa: string;
};

type FormData = {
    phone: string;
    headline: string;
    about: string;
    date_of_birth: string;
    gender: string;
    province_id: string;
    city_id: string;
    current_position: string;
    experience_level: string;
    expected_salary_min: string;
    expected_salary_max: string;
    linkedin_url: string;
    portfolio_url: string;
    github_url: string;
    cv_id: number | null;
    skills: string[];
    work_experiences: WorkExperienceForm[];
    educations: EducationForm[];
};

type Step = 'method' | 'form' | 'review';

const emptyExperience = (): WorkExperienceForm => ({
    company_name: '',
    position: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
});

const emptyEducation = (): EducationForm => ({
    institution: '',
    level: '',
    major: '',
    start_year: '',
    end_year: '',
    gpa: '',
});

export default function EmployeeOnboarding({ user, profile, options }: Props) {
    const [step, setStep] = useState<Step>('method');
    const [parseLoading, setParseLoading] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [uploadedCv, setUploadedCv] = useState<{ id: number; label: string; file_url: string | null } | null>(profile.primary_cv);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const skillOptions = useMemo(() => options.skills, [options.skills]);
    const skillLookup = useMemo(() => new Map(skillOptions.map((s) => [s.value, s.label])), [skillOptions]);

    const initialSkills = profile.skill_ids.map((id) => String(id));

    const form = useForm<FormData>({
        phone: user.phone ?? '',
        headline: profile.headline ?? '',
        about: profile.about ?? '',
        date_of_birth: profile.date_of_birth ?? '',
        gender: profile.gender ?? '',
        province_id: profile.province_id ? String(profile.province_id) : '',
        city_id: profile.city_id ? String(profile.city_id) : '',
        current_position: profile.current_position ?? '',
        experience_level: profile.experience_level ?? '',
        expected_salary_min: profile.expected_salary_min ? String(profile.expected_salary_min) : '',
        expected_salary_max: profile.expected_salary_max ? String(profile.expected_salary_max) : '',
        linkedin_url: profile.linkedin_url ?? '',
        portfolio_url: profile.portfolio_url ?? '',
        github_url: profile.github_url ?? '',
        cv_id: profile.primary_cv?.id ?? null,
        skills: initialSkills,
        work_experiences: [],
        educations: [],
    });

    const filteredCities = useMemo(() => {
        if (!form.data.province_id) return options.cities;
        return options.cities.filter((c) => String(c.province_id) === form.data.province_id);
    }, [options.cities, form.data.province_id]);

    const handlePickFile = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setParseError(null);
        setParseLoading(true);
        const t = toast.loading('Menganalisis CV…', { description: 'AI sedang membaca isi file Anda.' });

        try {
            const fd = new FormData();
            fd.append('cv_file', file);
            fd.append('label', file.name);

            const res = await fetch(parseCvRoute().url, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ??
                        decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
                    'X-XSRF-TOKEN':
                        decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
                },
            });

            const json = await res.json();

            if (!res.ok) {
                const message = json?.error ?? 'Gagal memproses CV.';
                setParseError(message);
                toast.error('Tidak dapat membaca CV', { id: t, description: message });
                return;
            }

            const parsed = json.parsed as {
                headline: string;
                about: string;
                phone: string;
                province_id: number | null;
                city_id: number | null;
                current_position: string;
                skill_ids: number[];
                work_experiences: Array<{
                    company_name: string;
                    position: string;
                    start_date: string | null;
                    end_date: string | null;
                    is_current: boolean;
                    description: string;
                }>;
                educations: Array<{
                    institution: string;
                    major: string;
                    level: string;
                    start_year: number | null;
                    end_year: number | null;
                    gpa: string;
                }>;
            };
            const cv = json.cv as { id: number; label: string; file_url: string | null };

            setUploadedCv(cv);

            form.setData((prev) => ({
                ...prev,
                cv_id: cv.id,
                phone: prev.phone || parsed.phone || '',
                headline: prev.headline || parsed.headline || '',
                about: prev.about || parsed.about || '',
                province_id: prev.province_id || (parsed.province_id ? String(parsed.province_id) : ''),
                city_id: prev.city_id || (parsed.city_id ? String(parsed.city_id) : ''),
                current_position: prev.current_position || parsed.current_position || '',
                skills: Array.from(new Set([...prev.skills, ...parsed.skill_ids.map((id) => String(id))])),
                work_experiences: parsed.work_experiences.map((e) => ({
                    company_name: e.company_name ?? '',
                    position: e.position ?? '',
                    start_date: e.start_date ?? '',
                    end_date: e.end_date ?? '',
                    is_current: !!e.is_current,
                    description: e.description ?? '',
                })),
                educations: parsed.educations.map((e) => ({
                    institution: e.institution ?? '',
                    level: e.level ?? '',
                    major: e.major ?? '',
                    start_year: e.start_year ? String(e.start_year) : '',
                    end_year: e.end_year ? String(e.end_year) : '',
                    gpa: e.gpa ?? '',
                })),
            }));

            toast.success('CV berhasil dianalisis', {
                id: t,
                description: 'Field di bawah sudah diisi otomatis. Silakan cek dan sempurnakan.',
            });
            setStep('form');
        } catch (err) {
            setParseError('Terjadi kesalahan jaringan saat mengunggah CV.');
            toast.error('Gagal mengunggah', {
                id: t,
                description: 'Coba lagi atau pilih opsi isi manual.',
            });
        } finally {
            setParseLoading(false);
        }
    };

    const startManual = () => {
        if (form.data.work_experiences.length === 0) {
            form.setData('work_experiences', [emptyExperience()]);
        }
        if (form.data.educations.length === 0) {
            form.setData('educations', [emptyEducation()]);
        }
        setStep('form');
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            province_id: d.province_id || null,
            city_id: d.city_id || null,
            gender: d.gender || null,
            experience_level: d.experience_level || null,
            date_of_birth: d.date_of_birth || null,
            expected_salary_min: d.expected_salary_min || null,
            expected_salary_max: d.expected_salary_max || null,
            linkedin_url: d.linkedin_url || null,
            portfolio_url: d.portfolio_url || null,
            github_url: d.github_url || null,
            phone: d.phone || null,
            skills: d.skills,
        }));
        form.post(onboardingStore().url, {
            preserveScroll: true,
            onError: () => {
                toast.error('Form belum lengkap', {
                    description: 'Periksa field yang ditandai merah.',
                });
            },
        });
    };

    const toggleSkill = (value: string) => {
        const current = new Set(form.data.skills);
        if (current.has(value)) current.delete(value);
        else current.add(value);
        form.setData('skills', Array.from(current));
    };

    return (
        <>
            <Head title="Lengkapi Profil" />

            <div className="px-4 py-8 sm:py-10">
                <div className="mx-auto max-w-3xl space-y-6">
                    <header className="space-y-3 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-blue ring-1 ring-brand-blue/15">
                            <Sparkles className="size-3" /> Hampir selesai
                        </span>
                        <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                            Halo {user.name.split(' ')[0]}, mari lengkapi profil Anda
                        </h1>
                        <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
                            Profil yang lengkap meningkatkan peluang Anda direkrut. Anda bisa upload CV
                            lalu kami isi otomatis, atau isi manual dari awal.
                        </p>
                    </header>

                    {step === 'method' && (
                        <MethodCards
                            uploadedCv={uploadedCv}
                            onPickFile={handlePickFile}
                            onManual={startManual}
                            parseLoading={parseLoading}
                            parseError={parseError}
                        />
                    )}

                    {step === 'form' && (
                        <form onSubmit={submit} className="space-y-6">
                            {uploadedCv && (
                                <Card className="border-emerald-200 bg-emerald-50/50">
                                    <CardContent className="flex items-center justify-between gap-3 p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                                <FileText className="size-5" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold text-emerald-900">
                                                    {uploadedCv.label}
                                                </p>
                                                <p className="text-xs text-emerald-700">
                                                    CV tersimpan dan akan dijadikan CV utama Anda.
                                                </p>
                                            </div>
                                        </div>
                                        {uploadedCv.file_url && (
                                            <a
                                                href={uploadedCv.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-semibold text-emerald-700 underline-offset-4 hover:underline"
                                            >
                                                Lihat
                                            </a>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            <SectionCard title="Informasi Dasar" description="Sapaan singkat tentang siapa Anda.">
                                <FieldGroup>
                                    <Field label="Nomor HP">
                                        <Input
                                            type="tel"
                                            value={form.data.phone}
                                            onChange={(e) => form.setData('phone', e.target.value)}
                                            placeholder="08xxxxxxxxx"
                                        />
                                        <InputError message={form.errors.phone} />
                                    </Field>
                                    <Field label="Headline / Tagline">
                                        <Input
                                            value={form.data.headline}
                                            onChange={(e) => form.setData('headline', e.target.value)}
                                            placeholder="Backend Engineer dengan 3 tahun pengalaman"
                                        />
                                        <InputError message={form.errors.headline} />
                                    </Field>
                                    <Field label="Tentang Saya" full>
                                        <Textarea
                                            rows={4}
                                            value={form.data.about}
                                            onChange={(e) => form.setData('about', e.target.value)}
                                            placeholder="Ceritakan secara singkat pengalaman dan tujuan karier Anda."
                                        />
                                        <InputError message={form.errors.about} />
                                    </Field>
                                    <Field label="Tanggal Lahir">
                                        <Input
                                            type="date"
                                            value={form.data.date_of_birth}
                                            onChange={(e) => form.setData('date_of_birth', e.target.value)}
                                        />
                                        <InputError message={form.errors.date_of_birth} />
                                    </Field>
                                    <Field label="Jenis Kelamin">
                                        <Select
                                            value={form.data.gender}
                                            onValueChange={(v) => form.setData('gender', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.genders.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={form.errors.gender} />
                                    </Field>
                                    <Field label="Provinsi">
                                        <Select
                                            value={form.data.province_id}
                                            onValueChange={(v) => {
                                                form.setData((prev) => ({
                                                    ...prev,
                                                    province_id: v,
                                                    city_id: '',
                                                }));
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih provinsi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.provinces.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={form.errors.province_id} />
                                    </Field>
                                    <Field label="Kota">
                                        <Select
                                            value={form.data.city_id}
                                            onValueChange={(v) => form.setData('city_id', v)}
                                            disabled={!form.data.province_id}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={form.data.province_id ? 'Pilih kota' : 'Pilih provinsi dulu'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredCities.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={form.errors.city_id} />
                                    </Field>
                                </FieldGroup>
                            </SectionCard>

                            <SectionCard title="Karier Saat Ini" description="Posisi dan ekspektasi gaji Anda saat ini.">
                                <FieldGroup>
                                    <Field label="Posisi Saat Ini">
                                        <Input
                                            value={form.data.current_position}
                                            onChange={(e) => form.setData('current_position', e.target.value)}
                                            placeholder="Backend Engineer"
                                        />
                                        <InputError message={form.errors.current_position} />
                                    </Field>
                                    <Field label="Level Pengalaman">
                                        <Select
                                            value={form.data.experience_level}
                                            onValueChange={(v) => form.setData('experience_level', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.experience_levels.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={form.errors.experience_level} />
                                    </Field>
                                    <Field label="Ekspektasi Gaji Min (IDR)">
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            value={form.data.expected_salary_min}
                                            onChange={(e) => form.setData('expected_salary_min', e.target.value)}
                                            placeholder="5000000"
                                        />
                                        <InputError message={form.errors.expected_salary_min} />
                                    </Field>
                                    <Field label="Ekspektasi Gaji Max (IDR)">
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            value={form.data.expected_salary_max}
                                            onChange={(e) => form.setData('expected_salary_max', e.target.value)}
                                            placeholder="8000000"
                                        />
                                        <InputError message={form.errors.expected_salary_max} />
                                    </Field>
                                </FieldGroup>
                            </SectionCard>

                            <SectionCard title="Pengalaman Kerja" description="Tambahkan minimal satu pengalaman terakhir.">
                                <div className="space-y-4">
                                    {form.data.work_experiences.map((exp, idx) => (
                                        <div key={idx} className="rounded-xl border border-border/60 bg-muted/30 p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy/70">
                                                    Pengalaman #{idx + 1}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        form.setData(
                                                            'work_experiences',
                                                            form.data.work_experiences.filter((_, i) => i !== idx),
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                                                >
                                                    <Trash2 className="size-3.5" /> Hapus
                                                </button>
                                            </div>
                                            <FieldGroup>
                                                <Field label="Perusahaan">
                                                    <Input
                                                        value={exp.company_name}
                                                        onChange={(e) => {
                                                            const next = [...form.data.work_experiences];
                                                            next[idx] = { ...exp, company_name: e.target.value };
                                                            form.setData('work_experiences', next);
                                                        }}
                                                    />
                                                </Field>
                                                <Field label="Posisi">
                                                    <Input
                                                        value={exp.position}
                                                        onChange={(e) => {
                                                            const next = [...form.data.work_experiences];
                                                            next[idx] = { ...exp, position: e.target.value };
                                                            form.setData('work_experiences', next);
                                                        }}
                                                    />
                                                </Field>
                                                <Field label="Tanggal Mulai">
                                                    <Input
                                                        type="date"
                                                        value={exp.start_date}
                                                        onChange={(e) => {
                                                            const next = [...form.data.work_experiences];
                                                            next[idx] = { ...exp, start_date: e.target.value };
                                                            form.setData('work_experiences', next);
                                                        }}
                                                    />
                                                </Field>
                                                <Field label="Tanggal Berakhir">
                                                    <Input
                                                        type="date"
                                                        value={exp.end_date}
                                                        disabled={exp.is_current}
                                                        onChange={(e) => {
                                                            const next = [...form.data.work_experiences];
                                                            next[idx] = { ...exp, end_date: e.target.value };
                                                            form.setData('work_experiences', next);
                                                        }}
                                                    />
                                                </Field>
                                                <Field full>
                                                    <label className="inline-flex items-center gap-2 text-sm">
                                                        <Checkbox
                                                            checked={exp.is_current}
                                                            onCheckedChange={(c) => {
                                                                const next = [...form.data.work_experiences];
                                                                next[idx] = {
                                                                    ...exp,
                                                                    is_current: !!c,
                                                                    end_date: c ? '' : exp.end_date,
                                                                };
                                                                form.setData('work_experiences', next);
                                                            }}
                                                        />
                                                        Saya masih bekerja di sini
                                                    </label>
                                                </Field>
                                                <Field label="Deskripsi" full>
                                                    <Textarea
                                                        rows={3}
                                                        value={exp.description}
                                                        onChange={(e) => {
                                                            const next = [...form.data.work_experiences];
                                                            next[idx] = { ...exp, description: e.target.value };
                                                            form.setData('work_experiences', next);
                                                        }}
                                                    />
                                                </Field>
                                            </FieldGroup>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            form.setData('work_experiences', [
                                                ...form.data.work_experiences,
                                                emptyExperience(),
                                            ])
                                        }
                                        className="w-full"
                                    >
                                        <Plus className="size-4" /> Tambah pengalaman
                                    </Button>
                                </div>
                            </SectionCard>

                            <SectionCard title="Pendidikan" description="Riwayat pendidikan terakhir Anda.">
                                <div className="space-y-4">
                                    {form.data.educations.map((edu, idx) => (
                                        <div key={idx} className="rounded-xl border border-border/60 bg-muted/30 p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy/70">
                                                    Pendidikan #{idx + 1}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        form.setData(
                                                            'educations',
                                                            form.data.educations.filter((_, i) => i !== idx),
                                                        );
                                                    }}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                                                >
                                                    <Trash2 className="size-3.5" /> Hapus
                                                </button>
                                            </div>
                                            <FieldGroup>
                                                <Field label="Institusi" full>
                                                    <Input
                                                        value={edu.institution}
                                                        onChange={(e) => {
                                                            const next = [...form.data.educations];
                                                            next[idx] = { ...edu, institution: e.target.value };
                                                            form.setData('educations', next);
                                                        }}
                                                    />
                                                </Field>
                                                <Field label="Jenjang">
                                                    <Input
                                                        value={edu.level}
                                                        onChange={(e) => {
                                                            const next = [...form.data.educations];
                                                            next[idx] = { ...edu, level: e.target.value };
                                                            form.setData('educations', next);
                                                        }}
                                                        placeholder="S1 / D3 / SMA"
                                                    />
                                                </Field>
                                                <Field label="Jurusan">
                                                    <Input
                                                        value={edu.major}
                                                        onChange={(e) => {
                                                            const next = [...form.data.educations];
                                                            next[idx] = { ...edu, major: e.target.value };
                                                            form.setData('educations', next);
                                                        }}
                                                    />
                                                </Field>
                                                <Field label="Tahun Mulai">
                                                    <Input
                                                        type="number"
                                                        value={edu.start_year}
                                                        onChange={(e) => {
                                                            const next = [...form.data.educations];
                                                            next[idx] = { ...edu, start_year: e.target.value };
                                                            form.setData('educations', next);
                                                        }}
                                                    />
                                                </Field>
                                                <Field label="Tahun Selesai">
                                                    <Input
                                                        type="number"
                                                        value={edu.end_year}
                                                        onChange={(e) => {
                                                            const next = [...form.data.educations];
                                                            next[idx] = { ...edu, end_year: e.target.value };
                                                            form.setData('educations', next);
                                                        }}
                                                    />
                                                </Field>
                                                <Field label="IPK (opsional)">
                                                    <Input
                                                        value={edu.gpa}
                                                        onChange={(e) => {
                                                            const next = [...form.data.educations];
                                                            next[idx] = { ...edu, gpa: e.target.value };
                                                            form.setData('educations', next);
                                                        }}
                                                        placeholder="3.50"
                                                    />
                                                </Field>
                                            </FieldGroup>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            form.setData('educations', [...form.data.educations, emptyEducation()])
                                        }
                                        className="w-full"
                                    >
                                        <Plus className="size-4" /> Tambah pendidikan
                                    </Button>
                                </div>
                            </SectionCard>

                            <SectionCard title="Skills" description="Pilih skill utama (rekomendasi minimal 3).">
                                <div className="space-y-3">
                                    {form.data.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {form.data.skills.map((id) => {
                                                const label = skillLookup.get(id) ?? id;
                                                return (
                                                    <Badge key={id} variant="secondary" className="gap-1">
                                                        {label}
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSkill(id)}
                                                            className="rounded-full hover:bg-muted-foreground/10"
                                                        >
                                                            <X className="size-3" />
                                                        </button>
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <SkillPicker
                                        options={skillOptions}
                                        selected={form.data.skills}
                                        onToggle={toggleSkill}
                                    />
                                </div>
                            </SectionCard>

                            <SectionCard title="Tautan Online (Opsional)" description="LinkedIn, portfolio, dan GitHub Anda.">
                                <FieldGroup>
                                    <Field label="LinkedIn URL" full>
                                        <Input
                                            type="url"
                                            value={form.data.linkedin_url}
                                            onChange={(e) => form.setData('linkedin_url', e.target.value)}
                                            placeholder="https://linkedin.com/in/anda"
                                        />
                                        <InputError message={form.errors.linkedin_url} />
                                    </Field>
                                    <Field label="Portfolio URL" full>
                                        <Input
                                            type="url"
                                            value={form.data.portfolio_url}
                                            onChange={(e) => form.setData('portfolio_url', e.target.value)}
                                            placeholder="https://portfolio-anda.com"
                                        />
                                        <InputError message={form.errors.portfolio_url} />
                                    </Field>
                                    <Field label="GitHub URL" full>
                                        <Input
                                            type="url"
                                            value={form.data.github_url}
                                            onChange={(e) => form.setData('github_url', e.target.value)}
                                            placeholder="https://github.com/anda"
                                        />
                                        <InputError message={form.errors.github_url} />
                                    </Field>
                                </FieldGroup>
                            </SectionCard>

                            <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep('method')}
                                    className="rounded-xl"
                                >
                                    <ArrowLeft className="size-4" /> Kembali
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="h-11 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan px-6 text-sm font-semibold shadow-md shadow-brand-blue/20 hover:brightness-105"
                                >
                                    {form.processing ? (
                                        <>
                                            <Spinner /> Menyimpan…
                                        </>
                                    ) : (
                                        <>
                                            Selesaikan Onboarding <ArrowRight className="size-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <p className="text-center text-xs text-muted-foreground">
                        Anda bisa keluar kapan saja —
                        <button
                            type="button"
                            onClick={() => router.post('/logout')}
                            className="ml-1 font-medium text-brand-blue hover:underline"
                        >
                            Logout
                        </button>
                    </p>
                </div>
            </div>
        </>
    );
}

function MethodCards({
    uploadedCv,
    onPickFile,
    onManual,
    parseLoading,
    parseError,
}: {
    uploadedCv: { id: number; label: string; file_url: string | null } | null;
    onPickFile: () => void;
    onManual: () => void;
    parseLoading: boolean;
    parseError: string | null;
}) {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <button
                    type="button"
                    onClick={onPickFile}
                    disabled={parseLoading}
                    className={cn(
                        'group rounded-2xl border-2 border-brand-blue/30 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5 p-6 text-left shadow-sm transition-all hover:border-brand-blue/60 hover:shadow-md',
                        parseLoading && 'opacity-60',
                    )}
                >
                    <div className="flex items-start gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-md shadow-brand-blue/20 transition-transform group-hover:scale-105">
                            {parseLoading ? <Spinner /> : <Upload className="size-6" />}
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-bold text-brand-navy">Upload CV (Rekomendasi)</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                AI kami akan otomatis mengisi profil dari CV Anda. Format PDF / DOC / DOCX, max 10 MB.
                            </p>
                            <div className="pt-2 text-xs font-semibold text-brand-blue">
                                {parseLoading ? 'Memproses…' : 'Pilih file →'}
                            </div>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={onManual}
                    disabled={parseLoading}
                    className="group rounded-2xl border border-border/70 bg-card p-6 text-left shadow-sm transition-all hover:border-brand-blue/40 hover:shadow-md"
                >
                    <div className="flex items-start gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors group-hover:bg-brand-blue/10 group-hover:text-brand-blue">
                            <UserPen className="size-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-bold text-brand-navy">Isi Manual</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Lengkapi formulir secara manual. Cocok jika Anda belum punya CV.
                            </p>
                            <div className="pt-2 text-xs font-semibold text-foreground/80">Mulai isi →</div>
                        </div>
                    </div>
                </button>
            </div>

            {parseError && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <p>{parseError}</p>
                </div>
            )}

            {uploadedCv && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <CheckCircle2 className="size-4" />
                    <span>
                        CV <span className="font-semibold">{uploadedCv.label}</span> sudah tersimpan.
                    </span>
                </div>
            )}
        </div>
    );
}

function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="space-y-1">
                    <h3 className="text-base font-bold tracking-tight text-brand-navy">{title}</h3>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
                {children}
            </CardContent>
        </Card>
    );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
    return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
    label,
    full,
    children,
}: {
    label?: string;
    full?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={cn('space-y-1.5', full && 'sm:col-span-2')}>
            {label && (
                <Label className="text-xs font-semibold uppercase tracking-wider text-brand-navy/80">
                    {label}
                </Label>
            )}
            {children}
        </div>
    );
}

function SkillPicker({
    options,
    selected,
    onToggle,
}: {
    options: Option[];
    selected: string[];
    onToggle: (value: string) => void;
}) {
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return options.slice(0, 30);
        return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 50);
    }, [options, query]);

    return (
        <div className="space-y-2">
            <Input
                placeholder="Cari skill, mis. PHP, React, Figma…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-2">
                {filtered.length === 0 && (
                    <span className="px-2 py-1 text-xs text-muted-foreground">Tidak ada skill cocok.</span>
                )}
                {filtered.map((o) => {
                    const active = selected.includes(o.value);
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => onToggle(o.value)}
                            className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                active
                                    ? 'border-brand-blue bg-brand-blue text-white'
                                    : 'border-border/70 bg-card hover:border-brand-blue/40 hover:bg-brand-blue/5',
                            )}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
