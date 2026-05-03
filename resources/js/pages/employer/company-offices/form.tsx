import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2, Save, Star } from 'lucide-react';
import { useMemo, type FormEvent } from 'react';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

type Option = { value: string; label: string };
type CityOption = Option & { province_id: number };

type Office = {
    id: number;
    label: string;
    province_id: number | null;
    city_id: number | null;
    address: string | null;
    contact_phone: string | null;
    map_url: string | null;
    is_headquarter: boolean;
} | null;

type Props = {
    mode: 'create' | 'edit';
    company: { id: number; name: string };
    office: Office;
    options: {
        provinces: Option[];
        cities: CityOption[];
    };
};

export default function EmployerCompanyOfficeForm({ mode, company, office, options }: Props) {
    const isEdit = mode === 'edit';

    const { data, setData, processing, errors, reset } = useForm({
        label: office?.label ?? '',
        province_id: office?.province_id ? String(office.province_id) : '',
        city_id: office?.city_id ? String(office.city_id) : '',
        address: office?.address ?? '',
        contact_phone: office?.contact_phone ?? '',
        map_url: office?.map_url ?? '',
        is_headquarter: office?.is_headquarter ?? false,
    });

    const filteredCities = useMemo(
        () => options.cities.filter((c) => !data.province_id || String(c.province_id) === data.province_id),
        [options.cities, data.province_id],
    );

    const handleProvinceChange = (value: string) => {
        setData((prev) => ({
            ...prev,
            province_id: value,
            city_id: prev.city_id && options.cities.find((c) => String(c.value) === prev.city_id)?.province_id === Number(value) ? prev.city_id : '',
        }));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const payload = {
            ...data,
            province_id: data.province_id ? Number(data.province_id) : null,
            city_id: data.city_id ? Number(data.city_id) : null,
        };
        if (isEdit && office) {
            router.patch(`/employer/company-offices/${office.id}`, payload, {
                onSuccess: () => reset(),
            });
        } else {
            router.post('/employer/company-offices', payload);
        }
    };

    return (
        <>
            <Head title={isEdit ? `Edit ${office?.label ?? 'Lokasi'}` : 'Tambah Lokasi Kantor'} />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={isEdit ? `Edit Lokasi: ${office?.label ?? '-'}` : 'Tambah Lokasi Kantor'}
                    description={`Lokasi kantor ${company.name}.`}
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/employer/company-offices">
                                <ArrowLeft className="size-4" /> Kembali
                            </Link>
                        </Button>
                    }
                />

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                        <Section title="Informasi Lokasi">
                            <div className="space-y-4">
                                <InputField
                                    id="label"
                                    label="Nama lokasi"
                                    required
                                    value={data.label}
                                    onChange={(e) => setData('label', e.target.value)}
                                    placeholder="Contoh: Kantor Jakarta"
                                    error={errors.label}
                                />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <SelectField
                                        id="province_id"
                                        label="Provinsi"
                                        placeholder="Pilih provinsi"
                                        value={data.province_id}
                                        onValueChange={handleProvinceChange}
                                        options={options.provinces}
                                        error={errors.province_id}
                                    />
                                    <SelectField
                                        id="city_id"
                                        label="Kota"
                                        placeholder={data.province_id ? 'Pilih kota' : 'Pilih provinsi dulu'}
                                        disabled={!data.province_id}
                                        value={data.city_id}
                                        onValueChange={(v) => setData('city_id', v)}
                                        options={filteredCities}
                                        error={errors.city_id}
                                    />
                                </div>

                                <TextareaField
                                    id="address"
                                    label="Alamat lengkap"
                                    rows={3}
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder="Jalan, nomor, kelurahan, kecamatan, kode pos"
                                    error={errors.address}
                                />
                            </div>
                        </Section>

                        <Section title="Kontak & Peta">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InputField
                                    id="contact_phone"
                                    label="Telepon"
                                    type="tel"
                                    value={data.contact_phone}
                                    onChange={(e) => setData('contact_phone', e.target.value)}
                                    placeholder="+62 21 ..."
                                    error={errors.contact_phone}
                                />
                                <InputField
                                    id="map_url"
                                    label="Tautan Google Maps"
                                    type="url"
                                    value={data.map_url}
                                    onChange={(e) => setData('map_url', e.target.value)}
                                    placeholder="https://maps.google.com/..."
                                    error={errors.map_url}
                                />
                            </div>
                        </Section>
                    </div>

                    <aside className="space-y-4">
                        <Card>
                            <CardContent className="space-y-4 p-5">
                                <div className="flex items-start gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Star className="size-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold">Kantor Pusat</div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            Hanya satu lokasi yang boleh ditandai sebagai kantor pusat. Tanda ini akan otomatis dipindah jika kamu memilih lokasi lain.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                                    <span className="text-sm font-medium">Tandai sebagai kantor pusat</span>
                                    <Switch
                                        checked={data.is_headquarter}
                                        onCheckedChange={(checked) => setData('is_headquarter', checked)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <Button type="submit" disabled={processing} className="w-full">
                                    {processing ? (
                                        <Building2 className="size-4 animate-pulse" />
                                    ) : (
                                        <Save className="size-4" />
                                    )}
                                    {isEdit ? 'Simpan Perubahan' : 'Tambah Lokasi'}
                                </Button>
                            </CardContent>
                        </Card>
                    </aside>
                </form>
            </div>
        </>
    );
}
