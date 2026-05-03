import { Head, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Award,
    Briefcase,
    CheckCircle2,
    Eye,
    FileText,
    GraduationCap,
    Loader2,
    Plus,
    Save,
    ShieldCheck,
    Sparkles,
    Trash2,
    User,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { CvPreview } from '@/components/employee/cv-preview';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
    { key: 'certifications', title: 'Sertifikasi', icon: Award },
] as const;

type AtsCriterion = {
    key: string;
    label: string;
    score: number;
    max: number;
    hint: string;
    ok: boolean;
};

type AtsResult = {
    total: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    criteria: AtsCriterion[];
    tips: string[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const METRIC_RE = /\d+\s*(?:%|persen|x|kali|juta|miliar|jt|rb|hari|jam|bulan|tahun)|\$\s*\d|\brp\s*\d/i;
const ACTION_VERBS = ['memimpin', 'membangun', 'mengembangkan', 'mendesain', 'mengelola', 'meningkatkan', 'mengoptimalkan', 'membuat', 'merancang', 'menganalisa', 'menganalisis', 'led', 'built', 'developed', 'designed', 'managed', 'improved', 'optimized', 'created', 'launched', 'increased', 'reduced'];

function computeAts(data: BuilderData): AtsResult {
    const criteria: AtsCriterion[] = [];
    const tips: string[] = [];

    // 1. Personal Info (15)
    let personal = 0;
    if (data.personal.full_name.trim().length >= 3) personal += 5;
    if (data.personal.email.trim() && EMAIL_RE.test(data.personal.email)) personal += 3;
    if (data.personal.phone.trim().length >= 7) personal += 3;
    if (data.personal.location.trim()) personal += 2;
    if (data.personal.headline.trim().length >= 5) personal += 2;
    criteria.push({
        key: 'personal',
        label: 'Data Pribadi & Kontak',
        score: personal,
        max: 15,
        hint: personal === 15 ? 'Lengkap.' : 'Pastikan nama, email valid, nomor telepon, lokasi, dan headline terisi.',
        ok: personal >= 12,
    });
    if (personal < 15) {
        if (!EMAIL_RE.test(data.personal.email)) tips.push('Format email belum valid — recruiter ATS sering reject email tanpa "@".');
        if (!data.personal.headline.trim()) tips.push('Tambahkan headline (mis: "Senior Backend Engineer") — kata kunci pertama yang dicari recruiter.');
    }

    // 2. Summary (15)
    const summaryWords = data.summary.trim().split(/\s+/).filter(Boolean).length;
    let summary = 0;
    if (summaryWords >= 30) summary = 8;
    if (summaryWords >= 60) summary = 12;
    if (summaryWords >= 100) summary = 15;
    criteria.push({
        key: 'summary',
        label: 'Ringkasan Profesional',
        score: summary,
        max: 15,
        hint:
            summary === 15
                ? 'Panjang ideal (100+ kata).'
                : summaryWords === 0
                  ? 'Belum diisi.'
                  : `${summaryWords} kata — target 100+ kata untuk skor maksimal.`,
        ok: summary >= 12,
    });
    if (summary < 12) tips.push(`Ringkasan ideal 100+ kata. Sekarang ${summaryWords} kata. Sebut peran, tahun pengalaman, skill kunci, dan pencapaian terukur.`);

    // 3. Experiences (25)
    const expCount = data.experiences.filter((e) => e.company.trim() && e.position.trim()).length;
    const expWithDesc = data.experiences.filter((e) => e.description.trim().split(/\s+/).filter(Boolean).length >= 15).length;
    let experiences = 0;
    if (expCount >= 1) experiences += 8;
    if (expCount >= 2) experiences += 7;
    experiences += Math.min(10, expWithDesc * 5);
    criteria.push({
        key: 'experiences',
        label: 'Pengalaman Kerja',
        score: experiences,
        max: 25,
        hint:
            experiences === 25
                ? 'Lengkap dengan deskripsi detail.'
                : expCount === 0
                  ? 'Belum ada pengalaman kerja.'
                  : `${expCount} pengalaman, ${expWithDesc} dengan deskripsi cukup detail.`,
        ok: experiences >= 18,
    });
    if (expCount === 0) tips.push('Tambahkan minimal 1 pengalaman kerja — ATS prioritaskan kandidat dengan riwayat kerja.');
    else if (expWithDesc < expCount) tips.push('Lengkapi deskripsi pengalaman (min 15 kata per posisi). Jelaskan tanggung jawab + pencapaian.');

    // 4. Quantifiable metrics in experiences (10)
    const hasMetrics = data.experiences.some((e) => METRIC_RE.test(e.description));
    const metrics = hasMetrics ? 10 : 0;
    criteria.push({
        key: 'metrics',
        label: 'Pencapaian Terukur',
        score: metrics,
        max: 10,
        hint: hasMetrics ? 'Terdapat angka konkret di deskripsi.' : 'Belum ada angka/persentase di deskripsi.',
        ok: hasMetrics,
    });
    if (!hasMetrics) tips.push('Tambahkan metrik konkret di deskripsi (mis: "meningkatkan performa 40%", "mengelola 5 anggota tim", "menghemat Rp 100 juta/bulan").');

    // 5. Action verbs (5)
    const allDesc = data.experiences.map((e) => e.description.toLowerCase()).join(' ');
    const usedVerbs = ACTION_VERBS.filter((v) => allDesc.includes(v));
    const verbScore = Math.min(5, usedVerbs.length);
    criteria.push({
        key: 'verbs',
        label: 'Action Verbs',
        score: verbScore,
        max: 5,
        hint:
            usedVerbs.length === 0
                ? 'Belum ada kata kerja aksi (mis: memimpin, membangun, mengoptimalkan).'
                : `${usedVerbs.length} action verbs digunakan.`,
        ok: verbScore >= 3,
    });
    if (verbScore < 3) tips.push('Mulai bullet pengalaman dengan action verb (memimpin, membangun, mengelola, meningkatkan…) — ATS suka kata kerja kuat.');

    // 6. Education (10)
    const eduCount = data.educations.filter((e) => e.institution.trim()).length;
    const education = eduCount >= 1 ? (data.educations[0].major.trim() ? 10 : 7) : 0;
    criteria.push({
        key: 'education',
        label: 'Pendidikan',
        score: education,
        max: 10,
        hint: eduCount === 0 ? 'Belum ada pendidikan.' : education === 10 ? 'Lengkap.' : 'Tambahkan jurusan untuk skor maksimal.',
        ok: education >= 7,
    });
    if (eduCount === 0) tips.push('Tambahkan riwayat pendidikan terakhir.');

    // 7. Skills (15)
    let skills = 0;
    if (data.skills.length >= 5) skills = 10;
    if (data.skills.length >= 10) skills = 15;
    criteria.push({
        key: 'skills',
        label: 'Keahlian / Keyword',
        score: skills,
        max: 15,
        hint:
            skills === 15
                ? '10+ skill keyword — bagus untuk ATS matching.'
                : `${data.skills.length} skill — target 10+ untuk skor maksimal.`,
        ok: skills >= 10,
    });
    if (data.skills.length < 10) tips.push(`Tambah skill keyword (sekarang ${data.skills.length}). Target 10+ — ATS scan banyak keyword teknis & soft skill.`);

    // 8. Certifications (5)
    const certs = data.certifications.filter((c) => c.name.trim()).length >= 1 ? 5 : 0;
    criteria.push({
        key: 'certs',
        label: 'Sertifikasi',
        score: certs,
        max: 5,
        hint: certs === 5 ? 'Ada sertifikasi.' : 'Sertifikasi memperkuat kredibilitas.',
        ok: certs === 5,
    });

    const total = criteria.reduce((sum, c) => sum + c.score, 0);
    const grade: AtsResult['grade'] = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F';

    return { total, grade, criteria, tips };
}

const GRADE_TONE: Record<AtsResult['grade'], string> = {
    A: '#10B981', // emerald
    B: '#1080E0', // brand primary
    C: '#F59E0B', // amber
    D: '#FB7185', // rose-400
    F: '#E11D48', // rose-600
};

function CircularScore({ score, grade }: { score: number; grade: AtsResult['grade'] }) {
    const r = 52;
    const c = 2 * Math.PI * r;
    const offset = c - (score / 100) * c;
    const tone = GRADE_TONE[grade];
    return (
        <div className="relative">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                <defs>
                    <linearGradient id="atsGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#1080E0" />
                        <stop offset="100%" stopColor="#10C0E0" />
                    </linearGradient>
                </defs>
                <circle cx="70" cy="70" r={r} stroke="#E2E8F0" strokeWidth="10" fill="none" />
                <circle
                    cx="70"
                    cy="70"
                    r={r}
                    stroke={grade === 'A' || grade === 'B' ? 'url(#atsGrad)' : tone}
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-slate-900">{score}</div>
                <div className="text-xs uppercase tracking-wide text-slate-500">/ 100</div>
            </div>
            <div
                className="absolute -right-1 -top-1 flex size-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
                style={{ background: tone }}
            >
                {grade}
            </div>
        </div>
    );
}

function AtsPanel({ result }: { result: AtsResult }) {
    const label =
        result.grade === 'A'
            ? 'CV sangat ATS-friendly!'
            : result.grade === 'B'
              ? 'CV cukup baik, masih bisa ditingkatkan'
              : result.grade === 'C'
                ? 'Beberapa bagian perlu dilengkapi'
                : 'Banyak bagian penting belum diisi';

    return (
        <div className="space-y-3 lg:sticky lg:top-4">
            {/* Score card */}
            <Card
                className="relative overflow-hidden border-slate-200/70 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' }}
            >
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #10C0E0, transparent)' }}
                />
                <CardContent className="relative space-y-3 p-5 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <ShieldCheck className="size-3.5" /> ATS Score · Realtime
                    </div>
                    <div className="flex justify-center">
                        <CircularScore score={result.total} grade={result.grade} />
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{label}</div>
                    <p className="text-xs text-slate-500">
                        Skor ini estimasi seberapa CV-mu cocok untuk parsing ATS (Applicant Tracking System) — sistem otomatis yang dipakai HRD untuk scan CV sebelum dilihat manusia.
                    </p>
                </CardContent>
            </Card>

            {/* Breakdown */}
            <Card className="border-slate-200/70 shadow-sm">
                <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">Rincian Penilaian</h3>
                        <span className="text-xs text-slate-500">{result.criteria.filter((c) => c.ok).length}/{result.criteria.length} OK</span>
                    </div>
                    <ul className="space-y-2.5">
                        {result.criteria.map((c) => {
                            const pct = (c.score / c.max) * 100;
                            return (
                                <li key={c.key} className="space-y-1">
                                    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            {c.ok ? (
                                                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                                            ) : c.score === 0 ? (
                                                <AlertCircle className="size-4 shrink-0 text-rose-400" />
                                            ) : (
                                                <span className="size-4 shrink-0 rounded-full border-2 border-amber-400" />
                                            )}
                                            <span className="truncate font-medium text-slate-800">{c.label}</span>
                                        </div>
                                        <span className="shrink-0 text-xs font-mono text-slate-600">
                                            {c.score}/{c.max}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full transition-[width] duration-500"
                                            style={{
                                                width: `${pct}%`,
                                                background: c.ok
                                                    ? 'linear-gradient(90deg, #10B981, #34D399)'
                                                    : c.score === 0
                                                      ? '#FB7185'
                                                      : 'linear-gradient(90deg, #1080E0, #10C0E0)',
                                            }}
                                        />
                                    </div>
                                    <div className="pl-6 text-[11px] text-slate-500">{c.hint}</div>
                                </li>
                            );
                        })}
                    </ul>
                </CardContent>
            </Card>

            {/* Tips */}
            {result.tips.length > 0 && (
                <Card className="border-amber-200/60 bg-amber-50/40 shadow-sm">
                    <CardContent className="space-y-2 p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                            <Sparkles className="size-4" /> Saran Perbaikan
                        </h3>
                        <ul className="space-y-1.5 text-xs text-amber-800">
                            {result.tips.slice(0, 5).map((tip, i) => (
                                <li key={i} className="flex gap-2">
                                    <span className="mt-1 size-1 shrink-0 rounded-full bg-amber-600" />
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

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

    const atsResult = useMemo(() => computeAts(form.data), [form.data]);

    const submit = (event?: FormEvent) => {
        event?.preventDefault();

        // Drop empty repeater rows so partially-filled rows don't trigger
        // required-field validation errors the user can't easily find.
        form.transform((data) => ({
            ...data,
            experiences: data.experiences.filter(
                (e) => e.company.trim() !== '' || e.position.trim() !== '' || e.description.trim() !== '',
            ),
            educations: data.educations.filter((e) => e.institution.trim() !== ''),
            certifications: data.certifications.filter((c) => c.name.trim() !== ''),
            skills: data.skills.map((s) => s.trim()).filter(Boolean),
        }));

        form.post(cvBuilderUpdate().url, {
            preserveScroll: true,
            onError: (errors) => {
                const firstKey = Object.keys(errors)[0] ?? '';
                const stepIndex = STEPS.findIndex((s) =>
                    firstKey.startsWith(s.key) || (s.key === 'summary' && firstKey === 'summary'),
                );
                if (stepIndex >= 0) {
                    setStep(stepIndex);
                }
            },
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
                    description="Susun CV profesional. ATS Score di kanan terupdate realtime — pantau skor untuk pastikan CV lolos sistem otomatis HRD."
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    {/* Form area */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-2">
                            {STEPS.map((s, idx) => {
                                const Icon = s.icon;
                                const active = idx === step;
                                return (
                                    <button
                                        type="button"
                                        key={s.key}
                                        onClick={() => setStep(idx)}
                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                                            active
                                                ? 'border-transparent text-white shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                        style={active ? { background: 'linear-gradient(135deg, #1080E0, #10C0E0)' } : undefined}
                                    >
                                        <Icon className="size-4" />
                                        {idx + 1}. {s.title}
                                    </button>
                                );
                            })}
                        </div>

                        <form onSubmit={submit} className="space-y-6">
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
                                <Section
                                    title="Ringkasan Profesional"
                                    description="2-4 kalimat ringkas tentang siapa Anda dan nilai yang Anda bawa. Target 100+ kata untuk skor ATS maksimal."
                                >
                                    <TextareaField
                                        label="Ringkasan"
                                        rows={6}
                                        placeholder="Contoh: Backend engineer dengan 5+ tahun pengalaman membangun sistem skala besar dengan PHP & Go. Antusias mengoptimalkan performa & arsitektur."
                                        value={form.data.summary}
                                        onChange={(e) => form.setData('summary', e.target.value)}
                                        error={form.errors.summary}
                                    />
                                    <div className="mt-1 text-xs text-slate-500">
                                        {form.data.summary.trim().split(/\s+/).filter(Boolean).length} kata
                                    </div>
                                </Section>
                            )}

                            {step === 2 && (
                                <Section
                                    title="Pengalaman Kerja"
                                    description="Mulai dari pengalaman terbaru. Tambah angka konkret di deskripsi (mis: 'meningkatkan throughput 40%') untuk boost skor ATS."
                                    actions={
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                form.setData('experiences', [
                                                    ...form.data.experiences,
                                                    { company: '', position: '', period: '', description: '' },
                                                ])
                                            }
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
                                                        placeholder="Mulai dengan action verb. Tambah angka: 'Memimpin tim 5 orang membangun fitur X yang meningkatkan retensi 25%'."
                                                        value={exp.description}
                                                        onChange={(e) => setExperience(idx, 'description', e.target.value)}
                                                    />
                                                </div>
                                                <div className="mt-3 flex justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            form.setData('experiences', form.data.experiences.filter((_, i) => i !== idx))
                                                        }
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
                                            onClick={() =>
                                                form.setData('educations', [
                                                    ...form.data.educations,
                                                    { institution: '', major: '', period: '', gpa: '' },
                                                ])
                                            }
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
                                                        onClick={() =>
                                                            form.setData('educations', form.data.educations.filter((_, i) => i !== idx))
                                                        }
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
                                    description="Tambahkan keyword skill (Enter untuk menambah). Target 10+ untuk skor ATS maksimal."
                                >
                                    <SkillsEditor value={form.data.skills} onChange={(skills) => form.setData('skills', skills)} />
                                </Section>
                            )}

                            {step === 5 && (
                                <Section
                                    title="Sertifikasi"
                                    actions={
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                form.setData('certifications', [
                                                    ...form.data.certifications,
                                                    { name: '', issuer: '', year: '' },
                                                ])
                                            }
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
                                                        onClick={() =>
                                                            form.setData('certifications', form.data.certifications.filter((_, i) => i !== idx))
                                                        }
                                                    >
                                                        <Trash2 className="size-4" /> Hapus
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                                        disabled={step === 0}
                                        className="flex-1 sm:flex-none"
                                    >
                                        <ArrowLeft className="size-4" /> Sebelumnya
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                                        disabled={step === STEPS.length - 1}
                                        className="flex-1 sm:flex-none"
                                    >
                                        Berikutnya <ArrowRight className="size-4" />
                                    </Button>
                                </div>

                                <div className="text-xs text-slate-500">
                                    Step {step + 1} / {STEPS.length} · ATS Score: <span className="font-semibold">{atsResult.total}/100</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" className="flex-1 sm:flex-none">
                                                <Eye className="size-4" /> Preview
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent
                                            className="max-h-[92vh] max-w-[900px] overflow-hidden p-0 sm:max-w-[900px]"
                                            showCloseButton
                                        >
                                            <DialogHeader className="border-b bg-white px-5 py-3">
                                                <DialogTitle className="flex items-center gap-2 text-base">
                                                    <Eye className="size-4 text-slate-600" /> Preview CV — Realtime
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="max-h-[80vh] overflow-y-auto bg-slate-100 px-4 py-6 sm:px-8 sm:py-8">
                                                <CvPreview data={form.data} />
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="flex-1 text-white sm:flex-none"
                                        style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                    >
                                        {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                        {form.processing ? 'Menyimpan…' : 'Simpan & PDF'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* ATS panel — sticky on desktop */}
                    <AtsPanel result={atsResult} />
                </div>
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
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    type="text"
                    placeholder="Ketik skill lalu tekan Enter (contoh: Laravel, PostgreSQL, Leadership)"
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
                <Button type="button" variant="outline" onClick={add} className="w-full sm:w-auto">
                    <Plus className="size-4" /> Tambah
                </Button>
            </div>
        </div>
    );
}
