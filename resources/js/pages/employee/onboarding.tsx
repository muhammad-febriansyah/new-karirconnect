import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Briefcase,
    Camera,
    CheckCircle2,
    FileText,
    Plus,
    Search,
    Send,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Trash2,
    UserRound,
    X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import AppLogo from '@/components/app-logo';
import { DatePickerField } from '@/components/form/date-picker-field';
import { SelectControl } from '@/components/form/select-control';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { store as onboardingStore } from '@/routes/employee/onboarding';

type Option = { value: string; label: string };
type CityOption = Option & { province_id: number };

type Props = {
    user: { name: string; email: string; phone: string | null; avatar_url: string | null };
    profile: {
        headline: string | null;
        about: string | null;
        date_of_birth: string | null;
        gender: string | null;
        province_id: number | null;
        city_id: number | null;
        current_position: string | null;
        experience_level: string | null;
        linkedin_url: string | null;
        portfolio_url: string | null;
        github_url: string | null;
        skill_ids: number[];
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
    avatar: File | null;
    phone: string;
    headline: string;
    about: string;
    date_of_birth: string;
    gender: string;
    province_id: string;
    city_id: string;
    current_position: string;
    experience_level: string;
    linkedin_url: string;
    portfolio_url: string;
    github_url: string;
    skills: string[];
    work_experiences: WorkExperienceForm[];
    educations: EducationForm[];
};

type Step = 'welcome' | 'form';

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
    const [step, setStep] = useState<Step>('welcome');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const skillOptions = useMemo(() => options.skills, [options.skills]);
    const skillLookup = useMemo(() => new Map(skillOptions.map((s) => [s.value, s.label])), [skillOptions]);

    const initialSkills = profile.skill_ids.map((id) => String(id));

    const form = useForm<FormData>({
        avatar: null,
        phone: user.phone ?? '',
        headline: profile.headline ?? '',
        about: profile.about ?? '',
        date_of_birth: profile.date_of_birth ?? '',
        gender: profile.gender ?? '',
        province_id: profile.province_id ? String(profile.province_id) : '',
        city_id: profile.city_id ? String(profile.city_id) : '',
        current_position: profile.current_position ?? '',
        experience_level: profile.experience_level ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        portfolio_url: profile.portfolio_url ?? '',
        github_url: profile.github_url ?? '',
        skills: initialSkills,
        work_experiences: [],
        educations: [],
    });

    const filteredCities = useMemo(() => {
        if (!form.data.province_id) return options.cities;
        return options.cities.filter((c) => String(c.province_id) === form.data.province_id);
    }, [options.cities, form.data.province_id]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        form.setData('avatar', file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const startForm = () => {
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
            linkedin_url: d.linkedin_url || null,
            portfolio_url: d.portfolio_url || null,
            github_url: d.github_url || null,
            phone: d.phone || null,
            skills: d.skills,
        }));
        form.post(onboardingStore().url, {
            preserveScroll: true,
            onError: () => {
                toast.error('Profil belum lengkap', {
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

    const firstName = user.name.split(' ')[0];

    return (
        <>
            <Head title={step === 'welcome' ? 'Selamat Datang' : 'Lengkapi Profil'} />

            <div className="px-4 py-8 sm:py-10">
                <div className={cn('mx-auto space-y-6', step === 'welcome' ? 'max-w-6xl' : 'max-w-3xl')}>
                    {step === 'welcome' && <WelcomeNote name={user.name} onStart={startForm} />}

                    {step === 'form' && (
                        <>
                            <header className="space-y-3 text-center">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-blue ring-1 ring-brand-blue/15">
                                    <Sparkles className="size-3" /> Langkah terakhir
                                </span>
                                <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                                    Lengkapi profil Anda, {firstName}
                                </h1>
                                <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
                                    Profil ini yang dilihat perusahaan saat menelusuri kandidat. Setelah disimpan,
                                    semua menu KarirConnect akan terbuka untuk Anda.
                                </p>
                            </header>

                            <form onSubmit={submit} className="space-y-6">
                                <SectionCard title="Foto Profil" description="Foto opsional, tetapi profil berfoto lebih dipercaya recruiter.">
                                    <div className="flex items-center gap-5">
                                        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-border">
                                            {avatarPreview ? (
                                                <img src={avatarPreview} alt="Foto profil" className="size-full object-cover" />
                                            ) : (
                                                <Camera className="size-7 text-muted-foreground" />
                                            )}
                                        </span>
                                        <div className="space-y-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => avatarInputRef.current?.click()}
                                                className="rounded-xl"
                                            >
                                                <Camera className="size-4" /> {avatarPreview ? 'Ganti foto' : 'Unggah foto'}
                                            </Button>
                                            <p className="text-xs text-muted-foreground">JPG, PNG, atau WEBP. Maks 4 MB.</p>
                                            <InputError message={form.errors.avatar} />
                                        </div>
                                    </div>
                                </SectionCard>

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
                                            <DatePickerField
                                                value={form.data.date_of_birth}
                                                onChange={(value) => form.setData('date_of_birth', value)}
                                                placeholder="Pilih tanggal lahir"
                                            />
                                            <InputError message={form.errors.date_of_birth} />
                                        </Field>
                                        <Field label="Jenis Kelamin">
                                            <SelectControl
                                                value={form.data.gender}
                                                onValueChange={(v) => form.setData('gender', v)}
                                                options={options.genders}
                                                placeholder="Pilih"
                                            />
                                            <InputError message={form.errors.gender} />
                                        </Field>
                                        <Field label="Provinsi">
                                            <SelectControl
                                                value={form.data.province_id}
                                                onValueChange={(v) => {
                                                    form.setData((prev) => ({
                                                        ...prev,
                                                        province_id: v,
                                                        city_id: '',
                                                    }));
                                                }}
                                                options={options.provinces}
                                                placeholder="Pilih provinsi"
                                                searchPlaceholder="Cari provinsi…"
                                            />
                                            <InputError message={form.errors.province_id} />
                                        </Field>
                                        <Field label="Kota">
                                            <SelectControl
                                                value={form.data.city_id}
                                                onValueChange={(v) => form.setData('city_id', v)}
                                                disabled={!form.data.province_id}
                                                options={filteredCities}
                                                placeholder={form.data.province_id ? 'Pilih kota' : 'Pilih provinsi dulu'}
                                                searchPlaceholder="Cari kota…"
                                            />
                                            <InputError message={form.errors.city_id} />
                                        </Field>
                                    </FieldGroup>
                                </SectionCard>

                                <SectionCard title="Karier Saat Ini" description="Posisi dan level pengalaman Anda saat ini.">
                                    <FieldGroup>
                                        <Field label="Posisi Saat Ini (jika sedang aktif bekerja)">
                                            <Input
                                                value={form.data.current_position}
                                                onChange={(e) => form.setData('current_position', e.target.value)}
                                                placeholder="Backend Engineer"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Kosongkan jika Anda sedang tidak aktif bekerja.
                                            </p>
                                            <InputError message={form.errors.current_position} />
                                        </Field>
                                        <Field label="Level Pengalaman">
                                            <SelectControl
                                                value={form.data.experience_level}
                                                onValueChange={(v) => form.setData('experience_level', v)}
                                                options={options.experience_levels}
                                                placeholder="Pilih level"
                                            />
                                            <InputError message={form.errors.experience_level} />
                                        </Field>
                                    </FieldGroup>
                                </SectionCard>

                                <SectionCard
                                    title="Pengalaman Kerja (jika Anda pernah bekerja)"
                                    description="Lewati jika Anda fresh graduate atau belum ada pengalaman kerja."
                                >
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
                                                            placeholder="Masukan nama perusahaan"
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
                                                            placeholder="Masukan posisi"
                                                        />
                                                    </Field>
                                                    <Field label="Tanggal Mulai">
                                                        <DatePickerField
                                                            value={exp.start_date}
                                                            onChange={(value) => {
                                                                const next = [...form.data.work_experiences];
                                                                next[idx] = { ...exp, start_date: value };
                                                                form.setData('work_experiences', next);
                                                            }}
                                                        />
                                                    </Field>
                                                    <Field label="Tanggal Berakhir">
                                                        <DatePickerField
                                                            value={exp.end_date}
                                                            disabled={exp.is_current}
                                                            onChange={(value) => {
                                                                const next = [...form.data.work_experiences];
                                                                next[idx] = { ...exp, end_date: value };
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

                                <SectionCard title="Pendidikan" description="Riwayat pendidikan terakhir Anda (opsional).">
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
                                                            placeholder="Masukan nama institusi"
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
                                                            placeholder="Masukan jenjang pendidikan"
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
                                                            placeholder="Masukan jurusan"
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
                                                            placeholder="Masukan tahun mulai"
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
                                                            placeholder="Masukan tahun selesai"
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

                                <SectionCard title="Skills" description="Pilih minimal satu skill utama (rekomendasi minimal 3).">
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
                                        <InputError message={form.errors.skills} />
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

                                <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setStep('welcome')}
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
                                                Simpan & Buka Semua Menu <ArrowRight className="size-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </>
                    )}

                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
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

const WELCOME_FEATURES = [
    {
        icon: Briefcase,
        title: 'Temukan ribuan loker terverifikasi',
        description: 'Lowongan kerja terbaru dari berbagai perusahaan terpercaya di seluruh Indonesia.',
        tone: 'bg-brand-blue/10 text-brand-blue',
    },
    {
        icon: UserRound,
        title: 'Bangun profil profesional',
        description: 'Buat profil dan CV terbaikmu untuk menarik perhatian perusahaan rekruter.',
        tone: 'bg-emerald-100 text-emerald-600',
    },
    {
        icon: FileText,
        title: 'Pantau lamaran dan peluangmu',
        description: 'Kelola semua lamaranmu dan pantau peluang karier dalam satu tempat.',
        tone: 'bg-violet-100 text-violet-600',
    },
] as const;

const WELCOME_STEPS = [
    { icon: UserRound, label: 'Data Diri' },
    { icon: FileText, label: 'Upload CV' },
    { icon: Search, label: 'Cari Lowongan' },
    { icon: Send, label: 'Lamar Pekerjaan' },
] as const;

function WelcomeNote({ name, onStart }: { name: string; onStart: () => void }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <AppLogo />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left: greeting + feature cards */}
                <div className="space-y-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                        <Sparkles className="size-3" /> Selamat Datang!
                    </span>
                    <h1 className="text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl">
                        Selamat Datang di KarirConnect, <span className="text-brand-blue">{name}!</span>
                    </h1>
                    <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                        Platform pencarian kerja karya anak bangsa yang akan membantumu menemukan peluang terbaik dan
                        mengembangkan kariermu.
                    </p>

                    <div className="space-y-3">
                        {WELCOME_FEATURES.map((feature) => (
                            <div
                                key={feature.title}
                                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-xs"
                            >
                                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', feature.tone)}>
                                    <feature.icon className="size-5" />
                                </span>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-brand-navy">{feature.title}</p>
                                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: illustration + steps */}
                <div className="space-y-5">
                    <WelcomeIllustration />

                    <Card className="border-border/60 shadow-xs">
                        <CardContent className="space-y-5 p-5 sm:p-6">
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold tracking-tight text-brand-navy">4 Langkah Mudah</h2>
                                <p className="text-sm text-muted-foreground">
                                    Lengkapi profilmu untuk membuka semua fitur dan meningkatkan peluangmu dilirik
                                    perusahaan.
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                {WELCOME_STEPS.map((stepItem, idx) => (
                                    <div key={stepItem.label} className="flex flex-1 items-center">
                                        <div className="flex flex-col items-center gap-1.5 text-center">
                                            <span className="relative flex size-11 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                                                <stepItem.icon className="size-5" />
                                                <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white">
                                                    {idx + 1}
                                                </span>
                                            </span>
                                            <span className="text-[11px] font-semibold leading-tight text-brand-navy/80">
                                                {stepItem.label}
                                            </span>
                                        </div>
                                        {idx < WELCOME_STEPS.length - 1 && (
                                            <span className="mx-1 hidden h-px flex-1 bg-border sm:block" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <Button
                                type="button"
                                onClick={onStart}
                                className="h-12 w-full rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan text-sm font-semibold shadow-md shadow-brand-blue/20 hover:brightness-105"
                            >
                                Lengkapi Profil Sekarang <ArrowRight className="size-4" />
                            </Button>

                            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                                <ShieldCheck className="size-3.5 text-emerald-600" />
                                Aman &amp; terpercaya. Data kamu hanya dapat dilihat oleh perusahaan.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom banner */}
            <div className="flex flex-col gap-3 rounded-2xl border border-brand-blue/20 bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white">
                        <TrendingUp className="size-5" />
                    </span>
                    <div>
                        <p className="text-sm font-bold text-brand-navy">Tingkatkan peluangmu hingga 2x lebih besar!</p>
                        <p className="text-sm text-muted-foreground">
                            Kandidat dengan profil lengkap memiliki peluang dipanggil interview lebih tinggi.
                        </p>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onStart}
                    className="shrink-0 rounded-xl border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5"
                >
                    Pelajari Selengkapnya
                </Button>
            </div>
        </div>
    );
}

function WelcomeIllustration() {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-brand-blue/10 via-brand-cyan/5 to-transparent p-6">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-brand-cyan/15 blur-2xl" />
            <div className="absolute bottom-4 left-6 text-brand-blue/40">
                <Sparkles className="size-5" />
            </div>

            <div className="relative mx-auto max-w-xs space-y-3">
                {/* mock profile card */}
                <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-md">
                    <div className="flex items-center gap-3">
                        <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white">
                            <UserRound className="size-6" />
                        </span>
                        <div className="space-y-1.5">
                            <span className="block h-2.5 w-28 rounded-full bg-brand-navy/80" />
                            <span className="block h-2 w-20 rounded-full bg-muted-foreground/30" />
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        {[0, 1, 2].map((row) => (
                            <div key={row} className="flex items-center gap-2">
                                <CheckCircle2 className="size-4 text-emerald-500" />
                                <span className="block h-2 flex-1 rounded-full bg-muted" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* floating badges */}
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-brand-navy shadow-xs">
                        <Briefcase className="size-4 text-brand-blue" /> Loker baru
                    </span>
                    <span className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-brand-navy shadow-xs">
                        <Search className="size-4 text-brand-cyan" /> Cari kerja
                    </span>
                </div>
            </div>
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
        <Card className="border-border/60 shadow-xs">
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
                                    : 'border-border/60 bg-card hover:border-brand-blue/40 hover:bg-brand-blue/5',
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
