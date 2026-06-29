import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    Briefcase,
    Building2,
    CheckCircle2,
    Clock,
    FileText,
    LayoutDashboard,
    MessageSquare,
    Search,
    ShieldCheck,
    Sparkles,
    Trash2,
    TrendingUp,
    Upload,
    Users,
    XCircle,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import AppLogo from '@/components/app-logo';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { document as documentRoute, finish as finishRoute, profile as profileRoute } from '@/routes/employer/onboarding';

type Option = { value: string; label: string };
type CityOption = Option & { province_id: number };

type Document = {
    id: number;
    document_type: string;
    original_name: string | null;
    status: string;
    uploaded_at: string | null;
    file_url: string | null;
};

type Props = {
    user: { name: string; email: string };
    company: {
        id: number;
        name: string;
        tagline: string | null;
        website: string | null;
        email: string | null;
        phone: string | null;
        industry_id: number | null;
        company_size_id: number | null;
        founded_year: number | null;
        province_id: number | null;
        city_id: number | null;
        address: string | null;
        about: string | null;
        logo_url: string | null;
        status: string | null;
        verification_status: string | null;
        onboarding_completed_at: string | null;
        documents: Document[];
    };
    options: {
        industries: Option[];
        company_sizes: Option[];
        provinces: Option[];
        cities: CityOption[];
        document_types: Option[];
    };
};

type Step = 'welcome' | 1 | 2 | 3;

export default function EmployerOnboarding({ user, company, options }: Props) {
    const [step, setStep] = useState<Step>(company.onboarding_completed_at ? 3 : 'welcome');

    const form = useForm({
        name: company.name,
        tagline: company.tagline ?? '',
        website: company.website ?? '',
        email: company.email ?? '',
        phone: company.phone ?? '',
        industry_id: company.industry_id ? String(company.industry_id) : '',
        company_size_id: company.company_size_id ? String(company.company_size_id) : '',
        founded_year: company.founded_year ? String(company.founded_year) : '',
        province_id: company.province_id ? String(company.province_id) : '',
        city_id: company.city_id ? String(company.city_id) : '',
        address: company.address ?? '',
        about: company.about ?? '',
        logo: null as File | null,
    });

    const filteredCities = useMemo(() => {
        if (!form.data.province_id) return options.cities;
        return options.cities.filter((c) => String(c.province_id) === form.data.province_id);
    }, [options.cities, form.data.province_id]);

    const submitProfile = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            industry_id: d.industry_id || null,
            company_size_id: d.company_size_id || null,
            province_id: d.province_id || null,
            city_id: d.city_id || null,
            founded_year: d.founded_year || null,
        }));
        form.post(profileRoute().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Profil tersimpan', {
                    description: 'Lanjut ke verifikasi dokumen.',
                });
                setStep(2);
            },
            onError: () => {
                toast.error('Form belum lengkap', {
                    description: 'Cek field yang ditandai merah.',
                });
            },
        });
    };

    const finish = () => {
        router.post(finishRoute().url, {}, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={step === 'welcome' ? 'Selamat Datang' : 'Onboarding Perusahaan'} />

            <div className="px-4 py-8 sm:py-10">
                <div className={cn('mx-auto space-y-6', step === 'welcome' ? 'max-w-6xl' : 'max-w-3xl')}>
                    {step === 'welcome' && (
                        <WelcomeNote
                            name={user.name}
                            companyName={company.name}
                            onStart={() => setStep(1)}
                        />
                    )}

                    {step !== 'welcome' && (
                        <>
                            <header className="space-y-3 text-center">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-blue ring-1 ring-brand-blue/15">
                                    <Sparkles className="size-3" /> Setup Perusahaan
                                </span>
                                <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                                    Halo {user.name.split(' ')[0]}, mari siapkan profil perusahaan
                                </h1>
                                <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
                                    Lengkapi profil perusahaan & unggah dokumen verifikasi. Tim kami akan
                                    review dalam 1×24 jam sebelum Anda bisa posting lowongan.
                                </p>
                            </header>

                            <Stepper step={step} />
                        </>
                    )}

                    {step === 1 && (
                        <form onSubmit={submitProfile} className="space-y-5">
                            <SectionCard
                                title="Profil Perusahaan"
                                description="Informasi dasar yang akan ditampilkan ke kandidat."
                            >
                                <FieldGroup>
                                    <Field label="Nama Perusahaan" full>
                                        <Input
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            required
                                        />
                                        <InputError message={form.errors.name} />
                                    </Field>
                                    <Field label="Tagline" full>
                                        <Input
                                            value={form.data.tagline}
                                            onChange={(e) => form.setData('tagline', e.target.value)}
                                            placeholder="Misi singkat perusahaan Anda"
                                        />
                                        <InputError message={form.errors.tagline} />
                                    </Field>
                                    <Field label="Industri">
                                        <Select
                                            value={form.data.industry_id}
                                            onValueChange={(v) => form.setData('industry_id', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih industri" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.industries.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={form.errors.industry_id} />
                                    </Field>
                                    <Field label="Ukuran Perusahaan">
                                        <Select
                                            value={form.data.company_size_id}
                                            onValueChange={(v) => form.setData('company_size_id', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih ukuran" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {options.company_sizes.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={form.errors.company_size_id} />
                                    </Field>
                                    <Field label="Tahun Berdiri">
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            value={form.data.founded_year}
                                            onChange={(e) => form.setData('founded_year', e.target.value)}
                                            placeholder="2015"
                                        />
                                        <InputError message={form.errors.founded_year} />
                                    </Field>
                                    <Field label="Website">
                                        <Input
                                            type="url"
                                            value={form.data.website}
                                            onChange={(e) => form.setData('website', e.target.value)}
                                            placeholder="https://perusahaan.com"
                                        />
                                        <InputError message={form.errors.website} />
                                    </Field>
                                </FieldGroup>
                            </SectionCard>

                            <SectionCard title="Lokasi & Kontak">
                                <FieldGroup>
                                    <Field label="Provinsi">
                                        <Select
                                            value={form.data.province_id}
                                            onValueChange={(v) =>
                                                form.setData((prev) => ({
                                                    ...prev,
                                                    province_id: v,
                                                    city_id: '',
                                                }))
                                            }
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
                                    <Field label="Alamat Lengkap" full>
                                        <Textarea
                                            rows={2}
                                            value={form.data.address}
                                            onChange={(e) => form.setData('address', e.target.value)}
                                            placeholder="Jl. Contoh No. 1, Jakarta Selatan"
                                        />
                                        <InputError message={form.errors.address} />
                                    </Field>
                                    <Field label="Email Kontak">
                                        <Input
                                            type="email"
                                            value={form.data.email}
                                            onChange={(e) => form.setData('email', e.target.value)}
                                            placeholder="hr@perusahaan.com"
                                        />
                                        <InputError message={form.errors.email} />
                                    </Field>
                                    <Field label="Nomor Telepon">
                                        <Input
                                            type="tel"
                                            value={form.data.phone}
                                            onChange={(e) => form.setData('phone', e.target.value)}
                                            placeholder="021-1234567"
                                        />
                                        <InputError message={form.errors.phone} />
                                    </Field>
                                </FieldGroup>
                            </SectionCard>

                            <SectionCard title="Tentang & Brand">
                                <FieldGroup>
                                    <Field label="Tentang Perusahaan" full>
                                        <Textarea
                                            rows={5}
                                            value={form.data.about}
                                            onChange={(e) => form.setData('about', e.target.value)}
                                            placeholder="Cerita singkat tentang misi, produk, dan budaya perusahaan."
                                        />
                                        <InputError message={form.errors.about} />
                                    </Field>
                                    <Field label="Logo Perusahaan" full>
                                        <LogoUpload
                                            currentUrl={company.logo_url}
                                            file={form.data.logo}
                                            onChange={(file) => form.setData('logo', file)}
                                        />
                                        <InputError message={form.errors.logo} />
                                    </Field>
                                </FieldGroup>
                            </SectionCard>

                            <div className="sticky bottom-4 flex justify-end gap-2 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur">
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
                                            Simpan & Lanjut <ArrowRight className="size-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}

                    {step === 2 && (
                        <DocumentsStep
                            documents={company.documents}
                            documentTypes={options.document_types}
                            onBack={() => setStep(1)}
                            onFinish={() => setStep(3)}
                        />
                    )}

                    {step === 3 && (
                        <FinishStep company={company} onFinalize={finish} />
                    )}
                </div>
            </div>
        </>
    );
}

const WELCOME_FEATURES = [
    {
        icon: Briefcase,
        title: 'Pasang lowongan dengan cepat',
        description: 'Buat dan publikasikan lowongan dengan mudah agar langsung dilirik kandidat terbaik.',
        tone: 'bg-brand-blue/10 text-brand-blue',
    },
    {
        icon: Search,
        title: 'Smart candidate matching',
        description: 'Dapatkan rekomendasi kandidat yang paling sesuai dengan kebutuhan posisi Anda.',
        tone: 'bg-emerald-100 text-emerald-600',
    },
    {
        icon: LayoutDashboard,
        title: 'Kelola lamaran dalam satu dashboard',
        description: 'Review CV, shortlist, dan kelola proses seleksi secara terstruktur di satu tempat.',
        tone: 'bg-violet-100 text-violet-600',
    },
    {
        icon: MessageSquare,
        title: 'Komunikasi lebih cepat',
        description: 'Hubungi kandidat langsung dari platform tanpa berpindah aplikasi.',
        tone: 'bg-amber-100 text-amber-600',
    },
    {
        icon: BarChart3,
        title: 'Pantau aktivitas rekrutmen',
        description: 'Lihat performa lowongan dan perkembangan rekrutmen secara real-time.',
        tone: 'bg-sky-100 text-sky-600',
    },
    {
        icon: ShieldCheck,
        title: 'Aman & terpercaya',
        description: 'Data perusahaan dan kandidat terlindungi dengan sistem terverifikasi.',
        tone: 'bg-rose-100 text-rose-600',
    },
] as const;

const WELCOME_STEPS = [
    { icon: Building2, label: 'Lengkapi Profil' },
    { icon: ShieldCheck, label: 'Verifikasi' },
    { icon: Briefcase, label: 'Posting Loker' },
    { icon: Users, label: 'Kelola Pelamar' },
] as const;

function WelcomeNote({
    name,
    companyName,
    onStart,
}: {
    name: string;
    companyName: string;
    onStart: () => void;
}) {
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
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl">
                            Selamat datang, <span className="text-brand-blue">{name.split(' ')[0]}!</span> 👋
                        </h1>
                        <p className="text-base font-semibold text-brand-navy/80">{companyName}</p>
                    </div>
                    <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                        Terima kasih telah bergabung di KarirConnect. Platform kami siap membantu Anda menemukan
                        kandidat terbaik dengan lebih cepat, mudah, dan tepat.
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {WELCOME_FEATURES.map((feature) => (
                            <div
                                key={feature.title}
                                className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                            >
                                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', feature.tone)}>
                                    <feature.icon className="size-5" />
                                </span>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-brand-navy">{feature.title}</p>
                                    <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: illustration + steps */}
                <div className="space-y-5">
                    <WelcomeIllustration />

                    <Card className="border-border/70 shadow-sm">
                        <CardContent className="space-y-5 p-5 sm:p-6">
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold tracking-tight text-brand-navy">4 Langkah Mudah</h2>
                                <p className="text-sm text-muted-foreground">
                                    Lengkapi profil perusahaan untuk membuka semua fitur perekrut dan mulai memasang lowongan.
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
                                Hanya butuh beberapa menit untuk mulai merekrut.
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
                        <p className="text-sm font-bold text-brand-navy">Mulai temukan talenta terbaik untuk perusahaan Anda.</p>
                        <p className="text-sm text-muted-foreground">
                            Perusahaan dengan profil lengkap & terverifikasi lebih dipercaya kandidat.
                        </p>
                    </div>
                </div>
                <Button
                    type="button"
                    onClick={onStart}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold"
                >
                    Mulai Sekarang <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}

function WelcomeIllustration() {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-brand-blue/10 via-brand-cyan/5 to-transparent p-6">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-brand-cyan/15 blur-2xl" />
            <div className="absolute bottom-4 left-6 text-brand-blue/40">
                <Search className="size-5" />
            </div>

            <div className="relative mx-auto max-w-xs space-y-3">
                {/* mock candidate cards */}
                {[0, 1].map((card) => (
                    <div key={card} className="rounded-2xl border border-border/60 bg-card p-4 shadow-md">
                        <div className="flex items-center gap-3">
                            <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white">
                                <Users className="size-5" />
                            </span>
                            <div className="flex-1 space-y-1.5">
                                <span className="block h-2.5 w-28 rounded-full bg-brand-navy/80" />
                                <span className="block h-2 w-20 rounded-full bg-muted-foreground/30" />
                            </div>
                            <CheckCircle2 className="size-5 text-emerald-500" />
                        </div>
                    </div>
                ))}

                {/* floating badges */}
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-brand-navy shadow-sm">
                        <Briefcase className="size-4 text-brand-blue" /> Posting loker
                    </span>
                    <span className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold text-brand-navy shadow-sm">
                        <Search className="size-4 text-brand-cyan" /> Cari talenta
                    </span>
                </div>
            </div>
        </div>
    );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
    const items = [
        { id: 1, label: 'Profil Perusahaan', icon: Building2 },
        { id: 2, label: 'Verifikasi Dokumen', icon: ShieldCheck },
        { id: 3, label: 'Selesai', icon: CheckCircle2 },
    ] as const;

    return (
        <ol className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
            {items.map((item, idx) => {
                const Icon = item.icon;
                const isActive = step === item.id;
                const isDone = step > item.id;
                return (
                    <li key={item.id} className="flex flex-1 items-center gap-2">
                        <div
                            className={cn(
                                'flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors',
                                isDone && 'bg-emerald-100 text-emerald-700',
                                isActive && 'bg-brand-blue text-white shadow-md shadow-brand-blue/30',
                                !isActive && !isDone && 'bg-muted text-muted-foreground',
                            )}
                        >
                            {isDone ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Langkah {item.id}
                            </div>
                            <div
                                className={cn(
                                    'truncate text-sm font-semibold',
                                    isActive ? 'text-brand-navy' : 'text-foreground/70',
                                )}
                            >
                                {item.label}
                            </div>
                        </div>
                        {idx < items.length - 1 && (
                            <span className="hidden h-px flex-1 bg-border sm:block" />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

function DocumentsStep({
    documents,
    documentTypes,
    onBack,
    onFinish,
}: {
    documents: Document[];
    documentTypes: Option[];
    onBack: () => void;
    onFinish: () => void;
}) {
    const [docType, setDocType] = useState<string>('nib');
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handlePickFile = () => fileRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setUploading(true);
        const t = toast.loading('Mengunggah dokumen…');

        router.post(
            documentRoute().url,
            { document_type: docType, file },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Dokumen terunggah', {
                        id: t,
                        description: 'Status awal: menunggu review admin.',
                    });
                },
                onError: (errors) => {
                    const msg = Object.values(errors).flat()[0] ?? 'Gagal mengunggah.';
                    toast.error('Upload gagal', { id: t, description: msg });
                },
                onFinish: () => setUploading(false),
            },
        );
    };

    return (
        <div className="space-y-5">
            <SectionCard
                title="Verifikasi Dokumen"
                description="Unggah salah satu dokumen badan usaha (NIB / SIUP / Akta / NPWP). Format PDF, JPG, atau PNG, maks 5 MB."
            >
                <div className="space-y-4">
                    <FieldGroup>
                        <Field label="Jenis Dokumen" full>
                            <Select value={docType} onValueChange={setDocType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {documentTypes.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldGroup>

                    <button
                        type="button"
                        onClick={handlePickFile}
                        disabled={uploading}
                        className={cn(
                            'flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-blue/30 bg-brand-blue/5 px-6 py-8 text-sm font-medium text-brand-blue transition-all hover:border-brand-blue/60 hover:bg-brand-blue/10',
                            uploading && 'opacity-60',
                        )}
                    >
                        {uploading ? <Spinner /> : <Upload className="size-5" />}
                        {uploading ? 'Mengunggah…' : 'Pilih file dokumen'}
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            </SectionCard>

            <SectionCard
                title={`Dokumen Tersimpan (${documents.length})`}
                description="Anda bisa unggah ulang jika ditolak admin."
            >
                {documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                        Belum ada dokumen. Upload minimal satu untuk verifikasi.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {documents.map((doc) => (
                            <li
                                key={doc.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                                        <FileText className="size-5" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            {doc.original_name ?? doc.document_type.toUpperCase()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {doc.document_type.toUpperCase()} ·{' '}
                                            {doc.uploaded_at
                                                ? new Date(doc.uploaded_at).toLocaleDateString('id-ID')
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                                <DocStatusBadge status={doc.status} />
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>

            <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" onClick={onBack} className="rounded-xl">
                    <ArrowLeft className="size-4" /> Kembali
                </Button>
                <Button
                    type="button"
                    onClick={onFinish}
                    disabled={documents.length === 0}
                    className="h-11 rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan px-6 text-sm font-semibold shadow-md shadow-brand-blue/20 hover:brightness-105"
                >
                    Lanjut <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}

function FinishStep({ company, onFinalize }: { company: Props['company']; onFinalize: () => void }) {
    return (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 shadow-sm">
            <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="flex flex-col items-center text-center">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                        <ShieldCheck className="size-7" />
                    </span>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-900">
                        Onboarding selesai!
                    </h2>
                    <p className="mt-1 max-w-md text-sm text-emerald-800/80">
                        Profil perusahaan & dokumen Anda sudah masuk antrian review tim admin
                        KarirConnect. Estimasi review: 1×24 jam.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="space-y-2 p-4">
                            <div className="flex items-center gap-2 text-amber-900">
                                <Clock className="size-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    Status sementara
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-amber-900">
                                Menunggu Persetujuan
                            </p>
                            <p className="text-xs text-amber-800/80">
                                Anda belum bisa posting lowongan & akses talent search hingga admin
                                meng-approve.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-brand-blue/30 bg-brand-blue/5">
                        <CardContent className="space-y-2 p-4">
                            <div className="flex items-center gap-2 text-brand-blue">
                                <CheckCircle2 className="size-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    Sudah aktif
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-brand-navy">
                                Profil & Dashboard
                            </p>
                            <p className="text-xs text-brand-navy/70">
                                Anda bisa edit profil, kelola tim, dan cek status verifikasi kapan saja.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {company.onboarding_completed_at ? (
                    <Button
                        type="button"
                        onClick={() => router.visit('/dashboard')}
                        className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan text-sm font-semibold"
                    >
                        Ke Dashboard <ArrowRight className="size-4" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={onFinalize}
                        className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-blue to-brand-cyan text-sm font-semibold"
                    >
                        Selesaikan & Ke Dashboard <ArrowRight className="size-4" />
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function LogoUpload({
    currentUrl,
    file,
    onChange,
}: {
    currentUrl: string | null;
    file: File | null;
    onChange: (file: File | null) => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const previewUrl = file ? URL.createObjectURL(file) : currentUrl;

    return (
        <div className="flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted">
                {previewUrl ? (
                    <img src={previewUrl} alt="Logo" className="size-full object-cover" />
                ) : (
                    <Building2 className="size-7 text-muted-foreground" />
                )}
            </div>
            <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" onClick={() => ref.current?.click()}>
                    <Upload className="size-4" /> {previewUrl ? 'Ganti Logo' : 'Unggah Logo'}
                </Button>
                {file && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                    >
                        <Trash2 className="size-3" /> Hapus pilihan
                    </button>
                )}
                <input
                    ref={ref}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                />
            </div>
        </div>
    );
}

function DocStatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
        pending: { label: 'Menunggu Review', cls: 'bg-amber-100 text-amber-800', icon: Clock },
        approved: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
        rejected: { label: 'Ditolak', cls: 'bg-rose-100 text-rose-700', icon: XCircle },
    };
    const meta = map[status] ?? map.pending;
    const Icon = meta.icon;
    return (
        <Badge variant="secondary" className={cn('gap-1 border-0', meta.cls)}>
            <Icon className="size-3" /> {meta.label}
        </Badge>
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
