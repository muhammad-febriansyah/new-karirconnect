import { Head, useForm } from '@inertiajs/react';
import { BadgeCheck, Building2, ImagePlus, Loader2, MapPin, Plus, Save, ScrollText, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { StatusBadge } from '@/components/feedback/status-badge';
import { ImageUploadField } from '@/components/form/image-upload-field';
import { InputField } from '@/components/form/input-field';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { SelectField } from '@/components/form/select-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { slugify } from '@/lib/slugify';
import { store as companyStore, update as companyUpdate } from '@/routes/employer/company';

type SelectOption = { value: string; label: string; province_id?: number };

type CompanyOffice = {
    id: number;
    label: string;
    province_id: number | null;
    city_id: number | null;
    address: string | null;
    contact_phone: string | null;
    map_url: string | null;
    is_headquarter: boolean;
};

type CompanyBadge = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    tone: string;
    is_active: boolean;
};

type CompanyPayload = {
    id: number;
    name: string;
    slug: string;
    tagline: string | null;
    logo_url: string | null;
    cover_url: string | null;
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
    culture: string | null;
    benefits: string | null;
    status: string | null;
    verification_status: string | null;
    offices: CompanyOffice[];
    badges: CompanyBadge[];
};

type Props = {
    company: CompanyPayload | null;
    options: {
        industries: SelectOption[];
        company_sizes: SelectOption[];
        provinces: SelectOption[];
        cities: SelectOption[];
    };
};

type OfficeFormItem = {
    id: number | null;
    label: string;
    province_id: string;
    city_id: string;
    address: string;
    contact_phone: string;
    map_url: string;
    is_headquarter: boolean;
};

const createOffice = (office?: Partial<CompanyOffice>): OfficeFormItem => ({
    id: office?.id ?? null,
    label: office?.label ?? '',
    province_id: office?.province_id ? String(office.province_id) : '',
    city_id: office?.city_id ? String(office.city_id) : '',
    address: office?.address ?? '',
    contact_phone: office?.contact_phone ?? '',
    map_url: office?.map_url ?? '',
    is_headquarter: office?.is_headquarter ?? false,
});

const tabLabels = {
    branding: 'Branding',
    identity: 'Informasi Dasar',
    locations: 'Lokasi',
    profile: 'Profil Perusahaan',
} as const;

type TabKey = keyof typeof tabLabels;

export default function CompanyEditPage({ company, options }: Props) {
    if (!company) {
        return <RegisterCompanyForm />;
    }

    return <EditCompanyForm company={company} options={options} />;
}

function RegisterCompanyForm() {
    const form = useForm({
        name: '',
        industry_id: '',
        company_size_id: '',
        website: '',
        email: '',
        phone: '',
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.post(companyStore().url, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Daftarkan Perusahaan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Daftarkan Perusahaan"
                    description="Lengkapi data perusahaan Anda. Setelah dikirim, admin akan meninjau dan menyetujui akun perusahaan."
                />

                <Section>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <InputField
                            label="Nama Perusahaan"
                            required
                            placeholder="Contoh: PT KarirConnect Indonesia"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            error={form.errors.name}
                        />
                        <div className="grid gap-5 md:grid-cols-2">
                            <InputField
                                label="Website"
                                placeholder="https://perusahaan.com"
                                value={form.data.website}
                                onChange={(e) => form.setData('website', e.target.value)}
                                error={form.errors.website}
                            />
                            <InputField
                                label="Email Perusahaan"
                                type="email"
                                placeholder="hr@perusahaan.com"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                error={form.errors.email}
                            />
                            <InputField
                                label="Telepon"
                                placeholder="021-12345678"
                                value={form.data.phone}
                                onChange={(e) => form.setData('phone', e.target.value)}
                                error={form.errors.phone}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Daftarkan
                            </Button>
                        </div>
                    </form>
                </Section>
            </div>
        </>
    );
}

function EditCompanyForm({ company, options }: { company: CompanyPayload; options: Props['options'] }) {
    const [slugTouched, setSlugTouched] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('branding');
    const initialOffices = company.offices.length > 0 ? company.offices.map((office) => createOffice(office)) : [createOffice({ is_headquarter: true })];

    const form = useForm({
        name: company.name,
        slug: company.slug,
        tagline: company.tagline ?? '',
        website: company.website ?? '',
        email: company.email ?? '',
        phone: company.phone ?? '',
        industry_id: company.industry_id ? String(company.industry_id) : '',
        company_size_id: company.company_size_id ? String(company.company_size_id) : '',
        founded_year: company.founded_year ?? '',
        province_id: company.province_id ? String(company.province_id) : '',
        city_id: company.city_id ? String(company.city_id) : '',
        address: company.address ?? '',
        about: company.about ?? '',
        culture: company.culture ?? '',
        benefits: company.benefits ?? '',
        offices: initialOffices,
        logo: null as File | null,
        cover: null as File | null,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, _method: 'patch' }));
        form.post(companyUpdate().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () =>
                form.setData({
                    ...form.data,
                    logo: null,
                    cover: null,
                }),
        });
    };

    const setOffice = (index: number, patch: Partial<OfficeFormItem>) => {
        form.setData('offices', form.data.offices.map((office, currentIndex) => (currentIndex === index ? { ...office, ...patch } : office)));
    };

    const addOffice = () => {
        form.setData('offices', [...form.data.offices, createOffice()]);
    };

    const removeOffice = (index: number) => {
        const next = form.data.offices.filter((_, currentIndex) => currentIndex !== index);

        if (next.length > 0 && !next.some((office) => office.is_headquarter)) {
            next[0] = { ...next[0], is_headquarter: true };
        }

        form.setData('offices', next);
    };

    const setHeadquarter = (index: number) => {
        form.setData('offices', form.data.offices.map((office, currentIndex) => ({
            ...office,
            is_headquarter: currentIndex === index,
        })));
    };

    return (
        <>
            <Head title={`Edit ${company.name}`} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={company.name}
                    description="Kelola informasi yang akan dilihat pelamar di profil perusahaan."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <StatusBadge tone={company.status === 'approved' ? 'success' : company.status === 'suspended' ? 'destructive' : 'warning'}>
                                {company.status}
                            </StatusBadge>
                            <StatusBadge tone={company.verification_status === 'verified' ? 'success' : 'muted'}>
                                {company.verification_status}
                            </StatusBadge>
                        </div>
                    }
                />

                {company.badges.length > 0 && (
                    <Section title="Badge Perusahaan" description="Lencana ini muncul berdasarkan status atau aktivitas perusahaan.">
                        <div className="flex flex-wrap gap-2">
                            {company.badges
                                .filter((badge) => badge.is_active)
                                .map((badge) => (
                                    <StatusBadge key={badge.id} tone={(badge.tone as Parameters<typeof StatusBadge>[0]['tone']) ?? 'secondary'}>
                                        <BadgeCheck className="mr-1 size-3.5" />
                                        {badge.name}
                                    </StatusBadge>
                                ))}
                        </div>
                    </Section>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="overflow-hidden border-border/70 shadow-sm">
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle>Editor Profil Perusahaan</CardTitle>
                            <CardDescription>
                                Susun profil perusahaan per bagian agar lebih cepat diedit tanpa perlu scroll panjang.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 p-4 sm:p-6">
                            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="gap-4">
                                <TabsList className="flex w-full flex-wrap justify-start overflow-x-auto">
                                    <TabsTrigger value="branding">
                                        <ImagePlus className="size-4" />
                                        Branding
                                    </TabsTrigger>
                                    <TabsTrigger value="identity">
                                        <Building2 className="size-4" />
                                        Informasi Dasar
                                    </TabsTrigger>
                                    <TabsTrigger value="locations">
                                        <MapPin className="size-4" />
                                        Lokasi
                                    </TabsTrigger>
                                    <TabsTrigger value="profile">
                                        <ScrollText className="size-4" />
                                        Profil Perusahaan
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="branding" className="space-y-6">
                                    <Section
                                        title="Branding"
                                        description="Kelola logo dan cover agar tampilan profil perusahaan terasa profesional."
                                    >
                                        <div className="grid gap-5 2xl:grid-cols-2">
                                            <ImageUploadField
                                                label="Logo"
                                                description="Format PNG/JPG/WEBP/SVG. Cocok untuk identitas utama perusahaan."
                                                value={form.data.logo}
                                                existingUrl={company.logo_url}
                                                onChange={(file) => form.setData('logo', file)}
                                                error={form.errors.logo}
                                            />
                                            <ImageUploadField
                                                label="Cover"
                                                description="Banner halaman perusahaan untuk memperkuat first impression."
                                                value={form.data.cover}
                                                existingUrl={company.cover_url}
                                                onChange={(file) => form.setData('cover', file)}
                                                error={form.errors.cover}
                                            />
                                        </div>
                                    </Section>
                                </TabsContent>

                                <TabsContent value="identity" className="space-y-6">
                                    <Section
                                        title="Informasi Dasar"
                                        description="Data inti perusahaan yang akan membantu kandidat mengenali brand Anda."
                                    >
                                        <div className="grid gap-5 md:grid-cols-2">
                                            <InputField
                                                label="Nama Perusahaan"
                                                required
                                                value={form.data.name}
                                                onChange={(e) => {
                                                    const nextName = e.target.value;
                                                    form.setData('name', nextName);

                                                    if (!slugTouched) {
                                                        form.setData('slug', slugify(nextName));
                                                    }
                                                }}
                                                error={form.errors.name}
                                            />
                                            <InputField
                                                label="Slug"
                                                value={form.data.slug}
                                                onChange={(e) => {
                                                    form.setData('slug', e.target.value);
                                                    setSlugTouched(true);
                                                }}
                                                error={form.errors.slug}
                                            />
                                            <InputField
                                                label="Tagline"
                                                placeholder="Singkat dan jelas"
                                                value={form.data.tagline}
                                                onChange={(e) => form.setData('tagline', e.target.value)}
                                                error={form.errors.tagline}
                                            />
                                            <InputField
                                                label="Website"
                                                placeholder="https://perusahaan.com"
                                                value={form.data.website}
                                                onChange={(e) => form.setData('website', e.target.value)}
                                                error={form.errors.website}
                                            />
                                            <InputField
                                                label="Email Perusahaan"
                                                type="email"
                                                value={form.data.email}
                                                onChange={(e) => form.setData('email', e.target.value)}
                                                error={form.errors.email}
                                            />
                                            <InputField
                                                label="Telepon"
                                                value={form.data.phone}
                                                onChange={(e) => form.setData('phone', e.target.value)}
                                                error={form.errors.phone}
                                            />
                                            <SelectField
                                                label="Industri"
                                                value={form.data.industry_id}
                                                onValueChange={(value) => form.setData('industry_id', value)}
                                                options={options.industries}
                                                error={form.errors.industry_id}
                                            />
                                            <SelectField
                                                label="Ukuran Perusahaan"
                                                value={form.data.company_size_id}
                                                onValueChange={(value) => form.setData('company_size_id', value)}
                                                options={options.company_sizes}
                                                error={form.errors.company_size_id}
                                            />
                                            <InputField
                                                label="Tahun Berdiri"
                                                type="number"
                                                value={String(form.data.founded_year ?? '')}
                                                onChange={(e) => form.setData('founded_year', e.target.value === '' ? '' : Number(e.target.value))}
                                                error={form.errors.founded_year}
                                            />
                                            <SelectField
                                                label="Provinsi"
                                                value={form.data.province_id}
                                                onValueChange={(value) => {
                                                    form.setData('province_id', value);
                                                    form.setData('city_id', '');
                                                }}
                                                options={options.provinces}
                                                error={form.errors.province_id}
                                            />
                                            <SelectField
                                                label="Kota"
                                                value={form.data.city_id}
                                                onValueChange={(value) => form.setData('city_id', value)}
                                                options={options.cities.filter((city) => !form.data.province_id || String(city.province_id) === form.data.province_id)}
                                                error={form.errors.city_id}
                                            />
                                            <TextareaField
                                                label="Alamat Utama"
                                                rows={2}
                                                className="md:col-span-2"
                                                value={form.data.address}
                                                onChange={(e) => form.setData('address', e.target.value)}
                                                error={form.errors.address}
                                            />
                                        </div>
                                    </Section>
                                </TabsContent>

                                <TabsContent value="locations" className="space-y-6">
                                    <Section
                                        title="Lokasi Kantor"
                                        description="Tambahkan kantor pusat dan cabang yang ingin ditampilkan di profil perusahaan."
                                        actions={
                                            <Button type="button" variant="outline" onClick={addOffice}>
                                                <Plus className="size-4" />
                                                Tambah Kantor
                                            </Button>
                                        }
                                    >
                                        <div className="space-y-4">
                                            {form.data.offices.map((office, index) => {
                                                const cityOptions = options.cities.filter((city) => !office.province_id || String(city.province_id) === office.province_id);

                                                return (
                                                    <div key={office.id ?? `new-${index}`} className="rounded-xl border bg-background p-4 shadow-sm">
                                                        <div className="mb-4 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="size-4 text-muted-foreground" />
                                                                <span className="font-medium">Kantor {index + 1}</span>
                                                                {office.is_headquarter && (
                                                                    <StatusBadge tone="primary">Pusat</StatusBadge>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {!office.is_headquarter && (
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => setHeadquarter(index)}>
                                                                        Jadikan Pusat
                                                                    </Button>
                                                                )}
                                                                {form.data.offices.length > 1 && (
                                                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeOffice(index)}>
                                                                        <Trash2 className="size-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="grid gap-4 md:grid-cols-2">
                                                            <InputField
                                                                label="Label Kantor"
                                                                value={office.label}
                                                                onChange={(e) => setOffice(index, { label: e.target.value })}
                                                                error={form.errors[`offices.${index}.label` as keyof typeof form.errors] as string | undefined}
                                                            />
                                                            <InputField
                                                                label="Telepon Kantor"
                                                                value={office.contact_phone}
                                                                onChange={(e) => setOffice(index, { contact_phone: e.target.value })}
                                                                error={form.errors[`offices.${index}.contact_phone` as keyof typeof form.errors] as string | undefined}
                                                            />
                                                            <SelectField
                                                                label="Provinsi"
                                                                value={office.province_id}
                                                                onValueChange={(value) => setOffice(index, { province_id: value, city_id: '' })}
                                                                options={options.provinces}
                                                                error={form.errors[`offices.${index}.province_id` as keyof typeof form.errors] as string | undefined}
                                                            />
                                                            <SelectField
                                                                label="Kota"
                                                                value={office.city_id}
                                                                onValueChange={(value) => setOffice(index, { city_id: value })}
                                                                options={cityOptions}
                                                                error={form.errors[`offices.${index}.city_id` as keyof typeof form.errors] as string | undefined}
                                                            />
                                                            <InputField
                                                                label="Link Peta"
                                                                value={office.map_url}
                                                                onChange={(e) => setOffice(index, { map_url: e.target.value })}
                                                                error={form.errors[`offices.${index}.map_url` as keyof typeof form.errors] as string | undefined}
                                                            />
                                                            <div className="flex items-end">
                                                                <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={office.is_headquarter}
                                                                        onChange={() => setHeadquarter(index)}
                                                                        className="size-4 rounded border-input"
                                                                    />
                                                                    Jadikan kantor pusat
                                                                </label>
                                                            </div>
                                                            <TextareaField
                                                                label="Alamat Kantor"
                                                                rows={2}
                                                                className="md:col-span-2"
                                                                value={office.address}
                                                                onChange={(e) => setOffice(index, { address: e.target.value })}
                                                                error={form.errors[`offices.${index}.address` as keyof typeof form.errors] as string | undefined}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Section>
                                </TabsContent>

                                <TabsContent value="profile" className="space-y-6">
                                    <Section title="Tentang Perusahaan">
                                        <RichTextEditor
                                            label="Tentang"
                                            placeholder="Ceritakan tentang perusahaan Anda."
                                            value={form.data.about}
                                            onChange={(value) => form.setData('about', value)}
                                            error={form.errors.about}
                                        />
                                    </Section>

                                    <Section title="Budaya">
                                        <RichTextEditor
                                            label="Culture"
                                            placeholder="Nilai dan cara kerja yang membuat perusahaan Anda unik."
                                            value={form.data.culture}
                                            onChange={(value) => form.setData('culture', value)}
                                            error={form.errors.culture}
                                        />
                                    </Section>

                                    <Section title="Benefit">
                                        <RichTextEditor
                                            label="Benefit Karyawan"
                                            placeholder="Mis. asuransi, WFH, training, bonus tahunan."
                                            value={form.data.benefits}
                                            onChange={(value) => form.setData('benefits', value)}
                                            error={form.errors.benefits}
                                        />
                                    </Section>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    <div className="sticky bottom-4 z-10 flex justify-end">
                        <div className="flex items-center gap-3 rounded-2xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
                            <div className="hidden text-right sm:block">
                                <div className="text-sm font-medium">Perubahan siap disimpan</div>
                                <div className="text-xs text-muted-foreground">Tab aktif: {tabLabels[activeTab]}</div>
                            </div>
                            <Button type="submit" disabled={form.processing} size="lg">
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Simpan Perubahan
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
