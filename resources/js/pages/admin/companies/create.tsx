import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { create as adminCompaniesCreate, index as adminCompaniesIndex, store as adminCompaniesStore } from '@/routes/admin/companies';

type Industry = { id: number; name: string };
type CompanySize = { id: number; name: string; employee_range: string };

type Props = {
    industries: Industry[];
    companySizes: CompanySize[];
};

export default function AdminCompanyCreate({ industries, companySizes }: Props) {
    const { data, setData, processing, errors } = useForm({
        owner_name: '',
        owner_email: '',
        owner_phone: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        website: '',
        industry_id: '',
        company_size_id: '',
        mark_verified: true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        router.post(adminCompaniesStore().url, data);
    };

    return (
        <>
            <Head title="Tambah Akun Perusahaan" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Tambah Akun Perusahaan"
                    description="Buatkan akun perekrut secara manual. Akun langsung aktif & siap memasang lowongan."
                    actions={
                        <Button asChild variant="outline">
                            <Link href={adminCompaniesIndex().url}>
                                <ArrowLeft className="size-4" /> Kembali
                            </Link>
                        </Button>
                    }
                />

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <div className="space-y-4">
                        <Section title="Akun Owner" description="Kredensial login untuk pihak perusahaan. Bagikan password ini ke mereka.">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InputField
                                    id="owner_name"
                                    label="Nama owner/PIC"
                                    required
                                    value={data.owner_name}
                                    onChange={(e) => setData('owner_name', e.target.value)}
                                    placeholder="Budi Santoso"
                                    error={errors.owner_name}
                                />
                                <InputField
                                    id="owner_email"
                                    label="Email owner/PIC"
                                    type="email"
                                    required
                                    value={data.owner_email}
                                    onChange={(e) => setData('owner_email', e.target.value)}
                                    placeholder="hr@perusahaan.co.id"
                                    description="Dipakai untuk login. Email sudah otomatis terverifikasi."
                                    error={errors.owner_email}
                                />
                                <InputField
                                    id="owner_phone"
                                    label="Telepon owner/PIC"
                                    value={data.owner_phone}
                                    onChange={(e) => setData('owner_phone', e.target.value)}
                                    placeholder="+62 812 3456 7890"
                                    error={errors.owner_phone}
                                />
                                <InputField
                                    id="password"
                                    label="Password"
                                    type="text"
                                    required
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Minimal 8 karakter"
                                    description="Minimal 8 karakter. Dibuat oleh admin lalu diserahkan ke perusahaan."
                                    error={errors.password}
                                />
                            </div>
                        </Section>

                        <Section title="Profil Perusahaan" description="Detail lain bisa dilengkapi perusahaan sendiri nanti.">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InputField
                                    id="name"
                                    label="Nama perusahaan"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="PT Maju Bersama"
                                    error={errors.name}
                                />
                                <InputField
                                    id="website"
                                    label="Website"
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                    placeholder="https://perusahaan.co.id"
                                    error={errors.website}
                                />
                                <InputField
                                    id="email"
                                    label="Email perusahaan"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="info@perusahaan.co.id"
                                    error={errors.email}
                                />
                                <InputField
                                    id="phone"
                                    label="Telepon perusahaan"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+62 21 5555 0000"
                                    error={errors.phone}
                                />
                                <SelectField
                                    id="industry_id"
                                    label="Industri"
                                    value={data.industry_id}
                                    onValueChange={(v) => setData('industry_id', v)}
                                    options={industries.map((i) => ({ value: String(i.id), label: i.name }))}
                                    error={errors.industry_id}
                                />
                                <SelectField
                                    id="company_size_id"
                                    label="Ukuran perusahaan"
                                    value={data.company_size_id}
                                    onValueChange={(v) => setData('company_size_id', v)}
                                    options={companySizes.map((s) => ({ value: String(s.id), label: `${s.name} (${s.employee_range})` }))}
                                    error={errors.company_size_id}
                                />
                            </div>
                        </Section>
                    </div>

                    <aside className="space-y-4">
                        <Card>
                            <CardContent className="space-y-4 p-5">
                                <h3 className="text-sm font-semibold">Status Akun</h3>
                                <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium">Tandai terverifikasi</div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            Beri lencana "Verified" + langsung aktif. Matikan jika ingin sekadar disetujui tanpa lencana.
                                        </p>
                                    </div>
                                    <Switch checked={data.mark_verified} onCheckedChange={(c) => setData('mark_verified', c)} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Akun dibuat dengan status <span className="font-medium text-foreground">disetujui</span>, jadi perusahaan
                                    bisa langsung memasang lowongan tanpa menunggu review.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <Button type="submit" disabled={processing} className="w-full">
                                    <Save className="size-4" /> Buat Akun Perusahaan
                                </Button>
                            </CardContent>
                        </Card>
                    </aside>
                </form>
            </div>
        </>
    );
}

AdminCompanyCreate.layout = {
    breadcrumbs: [
        { title: 'Perusahaan', href: adminCompaniesIndex().url },
        { title: 'Tambah Akun', href: adminCompaniesCreate().url },
    ],
};
